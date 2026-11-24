import asyncHandler from 'express-async-handler';
import Tournament from '../models/tournamentModel.js';
import { changeRoundTimer, readRoundTimer } from '../services/roundTimer.js';
import { notifyRoundTimer } from '../services/tournamentLive.js';

const validId = value => typeof value === 'string' && /^[a-f\\d]{24}$/i.test(value);
const fail = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
};

async function loadRound(req) {
  if (!validId(req.params.id)) fail(404, 'הטורניר לא נמצא');
  const tournament = await Tournament.findOne({
    _id: req.params.id,
    type: req.timerType,
    engineVersion: 'swiss-v1',
    source: 'live',
  });
  if (!tournament) fail(404, 'הטורניר לא נמצא');
  const number = Number(req.params.roundNumber);
  if (!Number.isInteger(number) || number < 1) fail(404, 'הסבב לא נמצא');
  const roundIndex = tournament.rounds.findIndex(round => round.number === number);
  if (roundIndex < 0) fail(404, 'הסבב לא נמצא');
  return { tournament, roundIndex, round: tournament.rounds[roundIndex], number };
}

const dto = (number, timer, now) => ({
  roundNumber: number,
  timer: readRoundTimer(timer),
  serverTime: now.toISOString(),
});

export const getRoundTimer = asyncHandler(async (req, res) => {
  const { tournament, number } = await loadRound(req);
  res.json(dto(number, tournament.roundTimers?.get(String(number)), new Date()));
});

export const updateRoundTimer = asyncHandler(async (req, res) => {
  const { tournament, roundIndex, number } = await loadRound(req);
  if (tournament.phase !== 'running' || tournament.status !== 'upcoming' ||
      roundIndex !== tournament.rounds.length - 1)
    fail(409, 'ניתן להפעיל טיימר רק בסבב הפעיל האחרון');

  const storedTimer = tournament.roundTimers?.get(String(number));
  const current = readRoundTimer(storedTimer);
  if (!Number.isInteger(req.body.expectedTimerVersion) ||
      req.body.expectedTimerVersion !== current.version)
    fail(409, 'הטיימר עודכן ממכשיר אחר. יש לרענן את הטיימר');

  const now = new Date();
  let next;
  try {
    next = changeRoundTimer(current, req.body.action, req.body.durationSeconds, now);
  } catch (error) {
    fail(400, error.message);
  }

  const timerPath = `roundTimers.${number}`;
  const storedVersion = storedTimer?.version;
  const updated = await Tournament.findOneAndUpdate({
    _id: tournament._id,
    type: req.timerType,
    engineVersion: 'swiss-v1',
    source: 'live',
    phase: 'running',
    status: 'upcoming',
    [`rounds.${roundIndex}.number`]: number,
    [`rounds.${roundIndex + 1}`]: { $exists: false },
    [`${timerPath}.version`]: storedVersion == null ? { $exists: false } : storedVersion,
  }, {
    $set: { [timerPath]: next },
    // Timer changes must not invalidate open pairing drafts or independent
    // result saves; timer.version is its own optimistic concurrency guard.
  }, { new: true, runValidators: true });

  if (!updated) fail(409, 'הסבב או הטיימר השתנו במקביל. יש לרענן את העמוד');
  const payload = dto(number, updated.roundTimers?.get(String(number)), new Date());
  notifyRoundTimer(req, updated, payload);
  res.json(payload);
});
