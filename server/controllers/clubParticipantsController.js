import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import Tournament from '../models/tournamentModel.js';
import Player from '../models/playerModel.js';
import User from '../models/userModel.js';
import { clubRegistrationOpen, isClubTournament } from '../../shared/tournamentDomain.js';
import { notifyTournament } from '../services/tournamentLive.js';

function fail(statusCode, message, code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (code) error.code = code;
  throw error;
}
const isId = value => typeof value === 'string' &&
  /^[a-f0-9]{24}$/i.test(value) && mongoose.isValidObjectId(value);

async function getClub(id) {
  if (!isId(id)) fail(404, 'טורניר לא נמצא');
  const tournament = await Tournament.findById(id);
  if (!tournament) fail(404, 'טורניר לא נמצא');
  if (!isClubTournament(tournament)) fail(409, 'ניהול משתתפי חוגים בלבד');
  return tournament;
}

// Legacy User signups and Player signups are one logical list in the UI.
// Neither route nor source is part of a child's displayed identity.
async function registeredRoster(tournament) {
  const userIds = tournament.participants.map(entry => String(entry.user));
  const users = await User.find({ _id: { $in: userIds } })
    .select('name username player role');
  const userById = new Map(users.map(user => [String(user._id), user]));
  const reverseLinks = await Player.find({ user: { $in: userIds } })
    .select('firstName lastName city user playerType');
  const reverseByUser = new Map(reverseLinks.map(p => [String(p.user), p]));
  const playerIds = [
    ...tournament.clubRegistrations.map(entry => entry.player),
    ...users.map(user => user.player).filter(Boolean),
  ];
  const players = await Player.find({ _id: { $in: playerIds } })
    .select('firstName lastName city playerType user');
  const byPlayerId = new Map([...players, ...reverseLinks].map(p => [String(p._id), p]));
  const registered = tournament.participants.map(entry => {
    const user = userById.get(String(entry.user));
    const linkedPlayer = (user?.player && byPlayerId.get(String(user.player))) ||
      reverseByUser.get(String(entry.user));
    return {
      key: 'user:' + entry.user, source: 'user', registrationId: String(entry.user),
      playerId: linkedPlayer ? String(linkedPlayer._id) : null,
      name: linkedPlayer ? (linkedPlayer.firstName + ' ' + linkedPlayer.lastName).trim() :
        (user?.name || user?.username || 'משתתף ישן ללא שחקן מקושר'),
      city: linkedPlayer?.city || '',
      registeredAt: entry.registeredAt,
      needsPlayerLink: !linkedPlayer,
    };
  });
  for (const entry of tournament.clubRegistrations) {
    const player = byPlayerId.get(String(entry.player));
    registered.push({
      key: 'player:' + entry.player, source: 'player', registrationId: String(entry.player),
      playerId: String(entry.player),
      name: player ? (player.firstName + ' ' + player.lastName).trim() : entry.nameSnapshot,
      city: player?.city || entry.citySnapshot || '',
      registeredAt: entry.registeredAt,
      needsPlayerLink: false,
    });
  }
  registered.sort((a, b) => new Date(a.registeredAt) - new Date(b.registeredAt));
  const registeredPlayerIds = new Set(registered.map(row => row.playerId).filter(Boolean));
  return { registered, registeredPlayerIds };
}

export const getClubParticipants = asyncHandler(async (req, res) => {
  const tournament = await getClub(req.params.id);
  const { registered, registeredPlayerIds } = await registeredRoster(tournament);
  const staffUsers = await User.find({ role: { $in: ['admin', 'judge'] } })
    .select('_id player');
  const excludedUsers = new Set(staffUsers.map(user => String(user._id)));
  const excludedPlayerIds = new Set(staffUsers.map(user => String(user.player)).filter(Boolean));
  const availablePlayers = await Player.find({
    playerType: 'quarterly', isActive: true,
    _id: { $nin: [...registeredPlayerIds, ...excludedPlayerIds] },
  }).select('firstName lastName city user').sort({ firstName: 1, lastName: 1, _id: 1 });
  res.set('Cache-Control', 'no-store');
  res.json({
    registered,
    available: clubRegistrationOpen(tournament) ? availablePlayers
      .filter(player => !player.user || !excludedUsers.has(String(player.user)))
      .map(player => ({
        id: String(player._id),
        name: (player.firstName + ' ' + player.lastName).trim(),
        city: player.city || '',
      })) : [],
    canAdd: clubRegistrationOpen(tournament),
  });
});

export const addClubParticipant = asyncHandler(async (req, res) => {
  const tournament = await getClub(req.params.id);
  if (!clubRegistrationOpen(tournament)) fail(409, 'ההרשמה לטורניר נסגרה');
  const { playerId } = req.body;
  if (!isId(playerId)) fail(400, 'מזהה שחקן לא תקין');
  const player = await Player.findById(playerId);
  if (!player || !player.isActive || player.playerType !== 'quarterly')
    fail(409, 'ניתן להוסיף רק שחקן חוג פעיל');
  const linkedUsers = await User.find({
    $or: [{ player: player._id }, ...(player.user ? [{ _id: player.user }] : [])],
  }).select('_id role');
  if (linkedUsers.some(user => ['admin', 'judge'].includes(user.role)))
    fail(409, 'לא ניתן לרשום אנשי צוות כשחקנים');
  if (tournament.clubRegistrations.some(entry => String(entry.player) === playerId) ||
      tournament.participants.some(entry => linkedUsers.some(user => String(user._id) === String(entry.user))))
    fail(409, 'השחקן כבר רשום לטורניר', 'ALREADY_REGISTERED');
  const updated = await Tournament.findOneAndUpdate({
    _id: tournament._id, revision: tournament.revision,
    type: { $in: [null, 'quarterly'] },
    engineVersion: { $ne: 'swiss-v1' }, phase: { $nin: ['running', 'completed'] },
    status: 'upcoming',
    'clubRegistrations.player': { $ne: player._id },
    'participants.user': { $nin: linkedUsers.map(user => user._id) },
  }, {
    $push: { clubRegistrations: {
      player: player._id,
      nameSnapshot: (player.firstName + ' ' + player.lastName).trim(),
      citySnapshot: player.city || '', registeredAt: new Date(),
    } },
    $inc: { currentParticipants: 1, revision: 1, __v: 1 },
  }, { new: true, runValidators: true });
  if (!updated) fail(409, 'רשימת המשתתפים השתנתה. רעננו ונסו שוב', 'STALE_REVISION');
  notifyTournament(req, updated);
  res.status(201).json({ message: 'השחקן צורף לטורניר' });
});

export const removeClubParticipant = asyncHandler(async (req, res) => {
  const tournament = await getClub(req.params.id);
  if (!clubRegistrationOpen(tournament))
    fail(409, 'לא ניתן להסיר משתתפים לאחר שהטורניר התחיל');
  const { source, registrationId } = req.params;
  if (!isId(registrationId) || !['user', 'player'].includes(source))
    fail(400, 'מזהה רישום לא תקין');
  const entry = source === 'user'
    ? tournament.participants.find(row => String(row.user) === registrationId)
    : tournament.clubRegistrations.find(row => String(row.player) === registrationId);
  if (!entry) fail(404, 'משתתף לא נמצא בטורניר');
  const path = source === 'user' ? 'participants' : 'clubRegistrations';
  const identity = source === 'user' ? 'user' : 'player';
  const updated = await Tournament.findOneAndUpdate({
    _id: tournament._id, revision: tournament.revision,
    type: { $in: [null, 'quarterly'] },
    engineVersion: { $ne: 'swiss-v1' },
    phase: { $nin: ['running', 'completed'] }, status: 'upcoming',
    [path + '.' + identity]: new mongoose.Types.ObjectId(registrationId),
  }, {
    $pull: { [path]: { [identity]: new mongoose.Types.ObjectId(registrationId) } },
    $inc: { currentParticipants: -1, revision: 1, __v: 1 },
  }, { new: true, runValidators: true });
  if (!updated) fail(409, 'רשימת המשתתפים השתנתה. רעננו ונסו שוב', 'STALE_REVISION');
  notifyTournament(req, updated);
  res.json({ message: 'המשתתף הוסר מהטורניר' });
});
