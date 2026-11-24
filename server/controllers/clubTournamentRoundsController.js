import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import Tournament from '../models/tournamentModel.js';
import Player from '../models/playerModel.js';
import User from '../models/userModel.js';
import { generatePairings, SWISS_POLICY } from '../services/swiss.js';
import { notifyTournament } from '../services/tournamentLive.js';
import { createRoundTimer } from '../services/roundTimer.js';

const fail = (statusCode, message, code) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (code) error.code = code;
  throw error;
};

export const startClubTournament = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id) || !/^[a-f0-9]{24}$/i.test(req.params.id))
    fail(404, 'טורניר לא נמצא');
  const tournament = await Tournament.findById(req.params.id);
  if (!tournament) fail(404, 'טורניר לא נמצא');
  if (!['quarterly', null].includes(tournament.type))
    fail(409, 'ניתן להתחיל כאן טורניר חוגים בלבד', 'NOT_CLUB_TOURNAMENT');
  if (tournament.engineVersion === 'swiss-v1' || tournament.rounds.length ||
      tournament.phase === 'running') {
    fail(409, 'הטורניר כבר התחיל. יש לפתוח את עמוד ניהול הסבבים', 'ALREADY_STARTED');
  }
  if (tournament.status !== 'upcoming' || tournament.results.length || tournament.finalStandings.length)
    fail(409, 'לא ניתן להתחיל טורניר שהסתיים או שכבר נשמרו לו תוצאות', 'NOT_STARTABLE');

  // Registrations without a canonical Player identity cannot be paired.
  // Never silently discard old User participants or create duplicate children.
  const userIds = tournament.participants.map(row => row.user);
  const users = await User.find({ _id: { $in: userIds } }).select('player');
  const userPlayers = new Map(users.map(user => [String(user._id), user.player && String(user.player)]));
  const unlinked = userIds.filter(id => !userPlayers.get(String(id)));
  if (unlinked.length)
    fail(409, 'יש ' + unlinked.length + ' משתתפים ישנים ללא שחקן מקושר. יש לשייך אותם לשחקנים לפני התחלת הטורניר', 'UNLINKED_PARTICIPANTS');

  const ids = [
    ...tournament.clubRegistrations.map(row => String(row.player)),
    ...userIds.map(id => userPlayers.get(String(id))),
  ];
  if (new Set(ids).size !== ids.length)
    fail(409, 'יש משתתפים כפולים ברישום. יש לתקן לפני ההגרלה', 'DUPLICATE_PARTICIPANTS');
  if (ids.length < 2)
    fail(409, 'נדרשים לפחות שני שחקני חוגים רשומים כדי להתחיל', 'NOT_ENOUGH_PLAYERS');

  const players = await Player.find({ _id: { $in: ids }, isActive: true, playerType: 'quarterly' });
  if (players.length !== ids.length)
    fail(409, 'נמצא שחקן חסר, לא פעיל או שחקן נבחרת ברישום. יש לתקן לפני ההגרלה', 'INELIGIBLE_PLAYERS');

  const byId = new Map(players.map(player => [String(player._id), player]));
  const snapshots = ids.map(id => {
    const player = byId.get(id);
    return {
      player: player._id,
      nameSnapshot: player.firstName + ' ' + player.lastName,
      citySnapshot: player.city || '',
    };
  });
  // Shuffle is server-side and happens only once. A concurrent start cannot
  // append a second first round because this transition is revision-guarded.
  const matches = generatePairings(snapshots, [], req.app.get('tournamentRandom'));
  const round = {
    number: 1,
    matches,
    createdAt: new Date(),
    createdBy: req.user._id,
    timer: createRoundTimer(),
  };
  const updated = await Tournament.findOneAndUpdate({
    _id: tournament._id,
    type: { $in: [null, 'quarterly'] },
    engineVersion: { $ne: 'swiss-v1' },
    status: 'upcoming',
    phase: { $nin: ['running', 'completed'] },
    revision: tournament.revision,
    'rounds.0': { $exists: false },
    'results.0': { $exists: false },
  }, {
    $set: {
      type: 'quarterly',
      engineVersion: 'swiss-v1',
      scoringPolicy: SWISS_POLICY,
      source: 'live',
      phase: 'running',
      playerParticipants: snapshots,
      nextRoundParticipantIds: ids.map(id => byId.get(id)._id),
      rounds: [round],
      currentParticipants: ids.length,
    },
    // Also invalidate in-flight legacy .save() calls using Mongoose __v.
    $inc: { revision: 1, __v: 1 },
  }, { new: true, runValidators: true });
  if (!updated)
    fail(409, 'הטורניר או המשתתפים השתנו במקביל. רעננו את הרשימה ונסו שוב', 'STALE_REVISION');
  notifyTournament(req, updated);
  res.status(201).json({ id: updated.id, roundNumber: 1 });
});
