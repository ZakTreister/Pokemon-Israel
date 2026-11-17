import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import Tournament from '../models/tournamentModel.js';
import Player, { normalizeField } from '../models/playerModel.js';
import User from '../models/userModel.js';
import { notifyTournament } from '../services/tournamentLive.js';

const validId = (id) => typeof id === 'string' && mongoose.isValidObjectId(id) && /^[0-9a-f]{24}$/i.test(id);
const fail = (status, message, code) => {
  const error = new Error(message);
  error.statusCode = status;
  if (code) error.code = code;
  throw error;
};
const display = (player) => ({
  id: String(player._id),
  firstName: player.firstName,
  lastName: player.lastName,
  city: player.city || '',
  birthYear: player.birthYear ?? null,
  playerType: player.playerType,
});
const clean = (body) => {
  const { firstName, lastName, city = '', birthYear = null } = body;
  if (![firstName, lastName, city].every((value) => typeof value === 'string'))
    fail(400, 'פרטי השחקן אינם תקינים');
  const result = {
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    city: city.trim(),
    birthYear: birthYear === '' || birthYear === null ? null : Number(birthYear),
  };
  if (!result.firstName || !result.lastName || result.firstName.length > 100 ||
      result.lastName.length > 100 || result.city.length > 100)
    fail(400, 'שם פרטי ושם משפחה נדרשים (עד 100 תווים)');
  if (result.birthYear !== null && (!Number.isInteger(result.birthYear) ||
      result.birthYear < 1900 || result.birthYear > new Date().getFullYear()))
    fail(400, 'שנת לידה אינה תקינה');
  return result;
};
const summary = (tournament) => ({
  id: String(tournament._id),
  title: tournament.title,
  phase: tournament.phase,
  status: tournament.status,
  type: tournament.type,
  revision: tournament.revision,
  maxParticipants: tournament.maxParticipants,
  currentParticipants: tournament.currentParticipants,
});
const eligible = (tournament) => tournament.engineVersion === 'swiss-v1' &&
  tournament.source === 'live' &&
  tournament.status === 'upcoming' &&
  ['setup', 'running'].includes(tournament.phase) &&
  tournament.type === 'team_internal';
const load = async (id) => {
  if (!validId(id)) fail(404, 'טורניר לא נמצא');
  const tournament = await Tournament.findById(id);
  if (!tournament) fail(404, 'טורניר לא נמצא');
  // Legacy tournaments store User references, not Player references.
  // Never inject a Player into their participant array.
  if (!eligible(tournament)) fail(409, 'רישום QR זמין כעת לטורניר פנימי חי בלבד');
  return tournament;
};
const getPlayer = async (id, tournament) => {
  if (!validId(id)) fail(400, 'מזהה שחקן לא תקין');
  const player = await Player.findById(id);
  if (!player) fail(404, 'שחקן לא נמצא');
  if (player.playerType !== 'team' || !player.isActive ||
      String(player.team) !== String(tournament.team))
    fail(409, 'ניתן לצרף רק שחקן פעיל מהנבחרת של הטורניר');
  return player;
};
async function findSimilar(input, teamId, excludeId) {
  // Keep the query bounded to a single team's roster and escape user input.
  const esc = (value) => normalizeField(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const first = esc(input.firstName);
  const last = esc(input.lastName);
  const matches = await Player.find({
    playerType: 'team', team: teamId, isActive: true,
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    $or: [
      { normalizedFirstName: first, normalizedLastName: last },
      { firstName: new RegExp('^' + first.slice(0, Math.min(first.length, 3)), 'i'),
        lastName: new RegExp('^' + last.slice(0, Math.min(last.length, 3)), 'i') },
    ],
  }).select('firstName lastName city birthYear playerType').limit(10);
  return matches.map(display);
}

export const qrRegistrationPreview = asyncHandler(async (req, res) => {
  const tournament = await load(req.params.id);
  let player = null;
  if (req.query.playerId) player = await getPlayer(req.query.playerId, tournament);
  res.set('Cache-Control', 'no-store');
  res.json({ tournament: summary(tournament), player: player ? display(player) : null });
});

export const qrRegistrationDuplicates = asyncHandler(async (req, res) => {
  const tournament = await load(req.params.id);
  const input = clean(req.query);
  res.set('Cache-Control', 'no-store');
  res.json({ matches: await findSimilar(input, tournament.team) });
});

export const qrRegisterPlayer = asyncHandler(async (req, res) => {
  const tournament = await load(req.params.id);
  const input = clean(req.body);
  const { playerId, allowDuplicate, updateExisting } = req.body;
  if (playerId !== undefined && !validId(playerId)) fail(400, 'מזהה שחקן לא תקין');
  if (!Number.isInteger(req.body.expectedRevision) ||
      req.body.expectedRevision !== tournament.revision)
    fail(409, 'הטורניר עודכן. יש לרענן ולאשר מחדש', 'STALE_REVISION');

  let player = playerId ? await getPlayer(playerId, tournament) : null;
  const previouslyRegistered = (id) =>
    tournament.playerParticipants.some(p => String(p.player) === String(id)) &&
    (tournament.nextRoundParticipantIds || []).some(p => String(p) === String(id));
  if (player && previouslyRegistered(player._id))
    fail(409, 'השחקן כבר רשום לטורניר', 'ALREADY_REGISTERED');
  if (!player) {
    const matches = await findSimilar(input, tournament.team);
    if (matches.length && allowDuplicate !== true)
      return res.status(409).json({ code: 'PLAYER_DUPLICATE', message: 'נמצאו שחקנים דומים', matches });
  }

  if (tournament.nextRoundParticipantIds?.length >= tournament.maxParticipants)
    fail(409, 'הטורניר מלא');

  let created = false;
  if (!player) {
    player = await Player.create({
      ...input, playerType: 'team', team: tournament.team, isActive: true, user: null,
    });
    created = true;
  }

  const edited = !created && ['firstName', 'lastName', 'city', 'birthYear']
    .some(key => (player[key] ?? null) !== (input[key] ?? null));
  if (edited && updateExisting !== true) fail(409, 'יש לאשר עדכון של פרטי שחקן קיים');

  const participantIds = (tournament.nextRoundParticipantIds ??
    tournament.playerParticipants.map(p => p.player)).map(String);
  if (participantIds.includes(String(player._id))) {
    if (created) await Player.deleteOne({ _id: player._id });
    fail(409, 'השחקן כבר רשום לסיבוב הבא', 'ALREADY_REGISTERED');
  }

  const historical = tournament.playerParticipants.some(p => String(p.player) === String(player._id));
  const updated = await Tournament.findOneAndUpdate({
    _id: tournament._id, engineVersion: 'swiss-v1', source: 'live',
    status: 'upcoming', phase: { $in: ['setup', 'running'] },
    revision: tournament.revision,
    'nextRoundParticipantIds': { $ne: player._id },
  }, {
    ...(!historical ? { $push: { playerParticipants: {
      player: player._id,
      nameSnapshot: input.firstName + ' ' + input.lastName,
      citySnapshot: input.city,
    } } } : {}),
    $set: { nextRoundParticipantIds: [...participantIds, player._id] },
    $inc: { revision: 1, currentParticipants: historical ? 0 : 1 },
  }, { new: true, runValidators: true });

  if (!updated) {
    if (created) await Player.deleteOne({ _id: player._id });
    fail(409, 'הטורניר עודכן במקביל. רעננו ונסו שוב', 'STALE_REVISION');
  }

  // Editing a previously existing Player is a deliberate global-profile edit.
  // Do not alter a linked account silently. A failure is surfaced, not hidden.
  if (edited) {
    const before = {
      firstName: player.firstName, lastName: player.lastName,
      city: player.city, birthYear: player.birthYear,
    };
    const linkedUser = player.user ? await User.findById(player.user) : null;
    const beforeUserName = linkedUser?.name;
    try {
      Object.assign(player, input);
      await player.save();
      if (linkedUser && (before.firstName !== input.firstName || before.lastName !== input.lastName)) {
        linkedUser.name = input.firstName + ' ' + input.lastName;
        await linkedUser.save();
      }
    } catch (error) {
      try {
        Object.assign(player, before);
        await player.save();
        if (linkedUser && linkedUser.name !== beforeUserName) {
          linkedUser.name = beforeUserName;
          await linkedUser.save();
        }
      } catch (rollbackError) {
        fail(500, 'השחקן צורף אך עדכון הפרופיל נכשל וגם השחזור נכשל. נדרשת בדיקת מנהל');
      }
      fail(409, 'השחקן צורף, אך עדכון הפרטים נכשל. בדקו את פרופיל השחקן');
    }
  }
  notifyTournament(req, updated);
  res.status(201).json({
    player: display(player),
    tournament: summary(updated),
    created,
    alreadyInHistory: historical,
  });
});
