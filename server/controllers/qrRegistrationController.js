import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import Tournament from '../models/tournamentModel.js';
import Player, { normalizeField } from '../models/playerModel.js';
import User from '../models/userModel.js';
import { notifyTournament } from '../services/tournamentLive.js';
import { clubRegistrationOpen } from '../../shared/tournamentDomain.js';

const validId = (value) =>
  typeof value === 'string' && /^[a-f0-9]{24}$/i.test(value) && mongoose.isValidObjectId(value);
const fail = (statusCode, message, code) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (code) error.code = code;
  throw error;
};
const escapeRegExp = (value) => value.replace(/[.*+?^$(){}|[\]\\]/g, '\\$&');
const displayPlayer = (player) => ({
  id: String(player._id), firstName: player.firstName, lastName: player.lastName,
  city: player.city || '', birthYear: player.birthYear ?? null, playerType: player.playerType,
});
const summary = (tournament) => ({
  id: String(tournament._id), title: tournament.title,
  status: tournament.status, type: tournament.type || 'quarterly',
  revision: tournament.revision, maxParticipants: tournament.maxParticipants,
  currentParticipants: tournament.currentParticipants,
});
const parseFields = (input) => {
  const { firstName, lastName, city = '', birthYear = null } = input;
  if (![firstName, lastName, city].every(value => typeof value === 'string'))
    fail(400, 'פרטי השחקן אינם תקינים');
  const fields = {
    firstName: firstName.trim(), lastName: lastName.trim(), city: city.trim(),
    birthYear: birthYear === null || birthYear === '' ? null : Number(birthYear),
  };
  if (!fields.firstName || !fields.lastName ||
      fields.firstName.length > 50 || fields.lastName.length > 50 ||
      fields.city.length > 100)
    fail(400, 'שם פרטי ושם משפחה נדרשים (עד 50 תווים)');
  if (fields.birthYear !== null && (!Number.isInteger(fields.birthYear) ||
      fields.birthYear < 1900 || fields.birthYear > new Date().getFullYear()))
    fail(400, 'שנת לידה לא תקינה');
  return fields;
};
async function loadClubTournament(id) {
  if (!validId(id)) fail(404, 'טורניר לא נמצא');
  const tournament = await Tournament.findById(id);
  if (!tournament) fail(404, 'טורניר לא נמצא');
  // null is the legacy spelling for an ordinary club/quarterly tournament.
  if ((tournament.type !== 'quarterly' && tournament.type !== null) ||
      tournament.engineVersion === 'swiss-v1')
    fail(409, 'רישום QR מיועד לטורנירי חוגים בלבד', 'UNSUPPORTED_TOURNAMENT');
  if (!clubRegistrationOpen(tournament))
    fail(409, 'רישום לטורניר חוגים זמין עד סוף יום הטורניר', 'REGISTRATION_CLOSED');
  return tournament;
}
async function loadClubPlayer(id) {
  if (!validId(id)) fail(400, 'מזהה שחקן אינו תקין');
  const player = await Player.findById(id);
  if (!player) fail(404, 'שחקן לא נמצא');
  if (player.playerType !== 'quarterly' || !player.isActive)
    fail(409, 'שחקן נבחרת אינו רשאי להירשם לטורניר חוגים', 'INVALID_PLAYER_TYPE');
  return player;
}
async function rejectMatchingTeamIdentity(fields) {
  // A forged new-player QR must not bypass an existing team membership.
  // Exact normalized name, optionally refined by city, requires staff resolution
  // outside this registration flow rather than creating a second Player identity.
  const match = await Player.exists({
    playerType: 'team', isActive: true,
    normalizedFirstName: normalizeField(fields.firstName),
    normalizedLastName: normalizeField(fields.lastName),
    ...(fields.city ? { normalizedCity: normalizeField(fields.city) } : {}),
  });
  if (match)
    fail(409, 'קיים שחקן נבחרת בעל פרטים זהים. שחקני נבחרת אינם יכולים להירשם לטורנירי חוגים', 'TEAM_PLAYER_NOT_ELIGIBLE');
}
async function findSimilar(fields) {
  // Only regular club Players qualify; do not suggest All-Stars team players.
  const first = escapeRegExp(normalizeField(fields.firstName));
  const last = escapeRegExp(normalizeField(fields.lastName));
  const prefix = value => value.slice(0, Math.min(3, value.length));
  const matches = await Player.find({
    playerType: 'quarterly', isActive: true,
    $or: [
      { normalizedFirstName: new RegExp('^' + first, 'i'), normalizedLastName: new RegExp('^' + last, 'i') },
      { normalizedFirstName: new RegExp('^' + prefix(first), 'i'), normalizedLastName: new RegExp('^' + prefix(last), 'i') },
    ],
  }).select('firstName lastName city birthYear playerType').limit(20);
  return matches
    .sort((a, b) => {
      const rank = player => Number(normalizeField(player.firstName) === normalizeField(fields.firstName)) +
        Number(normalizeField(player.lastName) === normalizeField(fields.lastName)) +
        Number(!!fields.city && normalizeField(player.city) === normalizeField(fields.city));
      return rank(b) - rank(a);
    })
    .slice(0, 10).map(displayPlayer);
}
async function alreadyRegistered(tournament, player) {
  if (tournament.clubRegistrations.some(row => String(row.player) === String(player._id)))
    return true;
  // Prevent a Player already represented by an older User registration
  // from being entered a second time via the new QR path.
  const linkedUser = player.user
    ? await User.findById(player.user).select('_id')
    : await User.findOne({ player: player._id }).select('_id');
  return !!linkedUser && tournament.participants.some(row =>
    String(row.user) === String(linkedUser._id));
}
export const qrRegistrationPreview = asyncHandler(async (req, res) => {
  const tournament = await loadClubTournament(req.params.id);
  const player = req.query.playerId ? await loadClubPlayer(req.query.playerId) : null;
  res.set('Cache-Control', 'no-store');
  res.json({ tournament: summary(tournament), player: player ? displayPlayer(player) : null });
});
export const qrRegistrationDuplicates = asyncHandler(async (req, res) => {
  await loadClubTournament(req.params.id);
  const fields = parseFields(req.query);
  await rejectMatchingTeamIdentity(fields);
  res.set('Cache-Control', 'no-store');
  res.json({ matches: await findSimilar(fields) });
});
export const qrRegisterPlayer = asyncHandler(async (req, res) => {
  const tournament = await loadClubTournament(req.params.id);
  const fields = parseFields(req.body);
  const playerId = req.body.playerId;
  if (playerId !== undefined && !validId(playerId)) fail(400, 'מזהה שחקן אינו תקין');
  if (!Number.isInteger(req.body.expectedRevision) ||
      tournament.revision !== req.body.expectedRevision)
    fail(409, 'הטורניר עודכן. יש לרענן ולאשר מחדש', 'STALE_REVISION');
  let player = playerId ? await loadClubPlayer(playerId) : null;
  if (player && await alreadyRegistered(tournament, player))
    fail(409, 'השחקן כבר רשום לטורניר', 'ALREADY_REGISTERED');
  if (!player) {
    await rejectMatchingTeamIdentity(fields);
    const matches = await findSimilar(fields);
    if (matches.length && req.body.allowDuplicate !== true)
      return res.status(409).json({
        code: 'PLAYER_DUPLICATE', message: 'נמצאו שחקנים בעלי שמות דומים', matches,
      });
  }
  const changed = player && ['firstName', 'lastName', 'city', 'birthYear']
    .some(key => (player[key] ?? null) !== (fields[key] ?? null));
  if (changed && req.body.updateExisting !== true)
    fail(409, 'יש לאשר במפורש עדכון פרטי שחקן קיים');

  let created = false;
  if (!player) {
    player = await Player.create({
      ...fields, playerType: 'quarterly', team: null, user: null,
      isActive: true,
      // City is intentionally optional in a scanned registration link.
      registrationSource: fields.city ? null : 'qr-club',
    });
    created = true;
  }

  let updated;
  try {
    updated = await Tournament.findOneAndUpdate({
      _id: tournament._id, deletedAt: null,
      type: { $in: [null, 'quarterly'] },
      engineVersion: { $ne: 'swiss-v1' },
      status: 'upcoming', revision: tournament.revision,
      'clubRegistrations.player': { $ne: player._id },
    }, {
      $push: {
        clubRegistrations: {
          player: player._id,
          nameSnapshot: fields.firstName + ' ' + fields.lastName,
          citySnapshot: fields.city, registeredAt: new Date(),
        },
      },
      $inc: { currentParticipants: 1, revision: 1, __v: 1 },
    }, { new: true, runValidators: true });
  } catch (error) {
    if (created) await Player.deleteOne({ _id: player._id });
    throw error;
  }
  if (!updated) {
    if (created) await Player.deleteOne({ _id: player._id });
    fail(409, 'הרישום לא בוצע: הטורניר השתנה או שהשחקן כבר צורף', 'STALE_REVISION');
  }

  if (changed) {
    const before = {
      firstName: player.firstName, lastName: player.lastName,
      city: player.city, birthYear: player.birthYear,
      registrationSource: player.registrationSource,
    };
    const linkedUser = player.user ? await User.findById(player.user) : await User.findOne({ player: player._id });
    const formerUserName = linkedUser?.name;
    try {
      Object.assign(player, fields);
      if (!fields.city) player.registrationSource = 'qr-club';
      await player.save();
      if (linkedUser && (fields.firstName !== before.firstName || fields.lastName !== before.lastName)) {
        linkedUser.name = fields.firstName + ' ' + fields.lastName;
        await linkedUser.save();
      }
    } catch (error) {
      let profileRestored = false;
      let enrollmentRestored = false;
      try {
        Object.assign(player, before);
        await player.save();
        if (linkedUser && linkedUser.name !== formerUserName) {
          linkedUser.name = formerUserName;
          await linkedUser.save();
        }
        profileRestored = true;
      } catch { /* Explicitly report reconciliation requirement below. */ }
      try {
        const rolledBack = await Tournament.findOneAndUpdate({
          _id: updated._id, revision: updated.revision, status: 'upcoming',
        }, {
          $pull: { clubRegistrations: { player: player._id } },
          $inc: { currentParticipants: -1, revision: 1, __v: 1 },
        });
        enrollmentRestored = !!rolledBack;
      } catch { /* Explicitly report reconciliation requirement below. */ }
      if (!profileRestored || !enrollmentRestored)
        fail(500, 'חלק מהשינויים נשמרו. נדרשת בדיקת מנהל לפני ניסיון נוסף');
      fail(409, 'עדכון השחקן נכשל והרישום בוטל. נסו שוב');
    }
  }
  notifyTournament(req, updated);
  res.status(201).json({
    player: displayPlayer(player), tournament: summary(updated), created,
  });
});
