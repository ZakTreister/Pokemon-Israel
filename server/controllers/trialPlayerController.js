import asyncHandler from 'express-async-handler';
import Tournament from '../models/tournamentModel.js';
import Team from '../models/teamModel.js';
import Player from '../models/playerModel.js';
import { withRosterLocks } from '../services/rosterLock.js';
import { likelyPlayers } from '../services/playerDuplicates.js';
import { playerNumber as normalizePlayerNumber } from '../services/playerNumber.js';
import { notifyTournament } from '../services/tournamentLive.js';
import { serialize, ENGINE } from './internalTournamentController.js';

const validId = value => typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);
const fail = (status, message, code) => {
  const error = new Error(message);
  error.statusCode = status;
  if (code) error.code = code;
  throw error;
};
const openTournament = async id => {
  if (!validId(id)) fail(404, 'טורניר לא נמצא');
  const tournament = await Tournament.findOne({ _id: id, type: 'team_internal',
    engineVersion: ENGINE, source: 'live', phase: { $in: ['setup', 'running'] },
    status: 'upcoming' });
  if (!tournament) fail(409, 'אפשר לצרף שחקן ניסיון רק לטורניר פנימי פעיל');
  return tournament;
};
const asCandidate = player => ({ id: player.id, firstName: player.firstName,
  lastName: player.lastName, city: player.city || '' });

export const trialPlayerCandidates = asyncHandler(async (req, res) => {
  await openTournament(req.params.id);
  const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 80) : '';
  if (search.length < 2) return res.json([]);
  const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const rows = await Player.find({
    playerType: 'team', isActive: true, team: null,
    $or: [{ firstName: new RegExp(escaped, 'i') }, { lastName: new RegExp(escaped, 'i') }],
  }).select('firstName lastName city').sort({ firstName: 1, lastName: 1 }).limit(15);
  res.json(rows.map(asCandidate));
});

export const addTrialPlayer = asyncHandler(async (req, res) => {
  // A judge can perform only this tightly scoped trial intake during a live
  // tournament. Normal player/team creation and permanent roster mutations
  // remain admin-only.
  const initial = await openTournament(req.params.id);
  const { expectedRevision, playerId, firstName, lastName, city = '' } = req.body;
  if (!Number.isInteger(expectedRevision) || expectedRevision < 0)
    fail(400, 'יש לשלוח את גרסת הטורניר');
  const existing = playerId !== undefined;
  if (existing && !validId(playerId)) fail(400, 'שחקן לא חוקי');
  if (!existing && (
    typeof firstName !== 'string' || !firstName.trim() || firstName.trim().length > 50 ||
    typeof lastName !== 'string' || !lastName.trim() || lastName.trim().length > 50 ||
    typeof city !== 'string' || city.length > 100
  )) fail(400, 'שם פרטי ושם משפחה הם חובה, עיר היא שדה רשות');
  const output = await withRosterLocks([initial.team], async () => {
    const tournament = await openTournament(req.params.id);
    if (tournament.revision !== expectedRevision)
      fail(409, 'הטורניר השתנה. יש לרענן ולנסות שוב', 'STALE_REVISION');
    if (tournament.nextRoundParticipantIds?.length >= 128)
      fail(409, 'הטורניר הגיע למספר המשתתפים המרבי');
    if (!(await Team.findOne({ _id: tournament.team, isActive: true })))
      fail(409, 'הנבחרת אינה פעילה');
    let player;
    let created = false;
    let priorStatus;
    if (existing) {
      player = await Player.findOne({ _id: playerId, team: null, playerType: 'team', isActive: true });
      if (!player) fail(409, 'ניתן לצרף לניסיון רק שחקן נבחרת פנוי שאינו משויך לנבחרת אחרת');
      priorStatus = player.teamMembershipStatus;
      player = await Player.findOneAndUpdate(
        { _id: playerId, team: null, playerType: 'team', isActive: true },
        { $set: { team: tournament.team, teamMembershipStatus: 'trial' } },
        { new: true },
      );
      if (!player) fail(409, 'השחקן שויך לנבחרת אחרת. יש לרענן');
    } else {
      const matches = await likelyPlayers({ firstName, lastName, city }, 'team');
      if (matches.length) {
        res.status(409).json({
          code: 'PLAYER_DUPLICATE',
          message: 'נמצא שחקן קיים עם פרטים דומים. בחר שחקן פנוי במקום ליצור כפילות.',
          matches: matches.filter(p => !p.team).map(asCandidate),
        });
        return null;
      }
      player = await Player.create({
        firstName: firstName.trim(), lastName: lastName.trim(), city: city.trim(),
        playerType: 'team', team: tournament.team, teamMembershipStatus: 'trial',
        isActive: true, user: null,
      });
      created = true;
    }
    if (!player) return null;
    const id = player.id;
    const participants = tournament.playerParticipants.map(p => p.toObject());
    const added = !participants.some(p => String(p.player) === id);
    if (added) participants.push({
      player: player._id,
      nameSnapshot: `${player.firstName} ${player.lastName}`,
      citySnapshot: player.city || '',
    });
    const next = [...new Set([
      ...(tournament.nextRoundParticipantIds ?? tournament.playerParticipants.map(p => p.player)).map(String),
      id,
    ])];
    if (next.length > 128) fail(409, 'ניתן לשתף עד 128 שחקנים');
    try {
      const updated = await Tournament.findOneAndUpdate({
        _id: tournament._id, revision: expectedRevision, engineVersion: ENGINE,
        phase: { $in: ['setup', 'running'] }, status: 'upcoming',
      }, {
        $set: { playerParticipants: participants, nextRoundParticipantIds: next, currentParticipants: next.length },
        $inc: { revision: 1 },
      }, { new: true, runValidators: true });
      if (!updated) fail(409, 'הטורניר עודכן בינתיים; יש לרענן', 'STALE_REVISION');
      notifyTournament(req, updated);
      return { tournament: serialize(updated), player: asCandidate(player) };
    } catch (error) {
      // Standalone Mongo has no multi-document transaction. Revert an intake
      // that did not attach to the tournament; no round could reference it.
      if (created) await Player.deleteOne({ _id: player._id });
      else await Player.findOneAndUpdate({ _id: player._id, team: tournament.team,
        teamMembershipStatus: 'trial' }, { $set: { team: null, teamMembershipStatus: priorStatus } });
      throw error;
    }
  });
  if (output) res.status(201).json(output);
});

export const resolveTrialPlayer = asyncHandler(async (req, res) => {
  const { teamId, playerId } = req.params;
  if (!validId(teamId) || !validId(playerId)) fail(404, 'שחקן לא נמצא');
  const { action } = req.body;
  if (!['confirm', 'dismiss'].includes(action)) fail(400, 'פעולה לא חוקית');
  const player = await withRosterLocks([teamId], async () => {
    const current = await Player.findOne({ _id: playerId, team: teamId,
      playerType: 'team', isActive: true, teamMembershipStatus: 'trial' });
    if (!current) fail(409, 'השחקן כבר אינו שחקן ניסיון בנבחרת');
    if (action === 'dismiss') {
      // Current-round matches remain immutable. Dismissal is permitted after
      // the live tournament closes, so no future-round roster race is possible.
      const live = await Tournament.exists({ team: teamId, type: 'team_internal',
        engineVersion: ENGINE, source: 'live', status: 'upcoming',
        phase: { $in: ['setup', 'running'] } });
      if (live) fail(409, 'כדי להסיר שחקן ניסיון יש לסיים תחילה את הטורניר הפעיל');
      return Player.findOneAndUpdate({ _id: playerId, team: teamId,
        teamMembershipStatus: 'trial' },
        { $set: { team: null, teamMembershipStatus: 'dismissed' } },
        { new: true });
    }
    const playerNumber = normalizePlayerNumber(req.body.playerNumber, true);
    if (!playerNumber) fail(400, 'מספר שחקן נדרש לקליטה קבועה');
    return Player.findOneAndUpdate({ _id: playerId, team: teamId,
      teamMembershipStatus: 'trial' },
      { $set: { teamMembershipStatus: 'permanent', playerNumber } }, { new: true });
  });
  if (!player) fail(409, 'סטטוס השחקן השתנה. נא לרענן');
  res.json(player);
});
