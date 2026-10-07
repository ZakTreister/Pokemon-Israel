import { notifyTournament } from '../services/tournamentLive.js';
import asyncHandler from "express-async-handler";
import Tournament from "../models/tournamentModel.js";
import Team from "../models/teamModel.js";
import Player from "../models/playerModel.js";
import {
  calculateStandings,
  generatePairings,
  validateScore,
  SWISS_POLICY,
} from "../services/swiss.js";
import { withRosterLocks } from "../services/rosterLock.js";

export const ENGINE = "swiss-v1";
// One explicit, ongoing competition cycle. It does not advance with the date or
// badge Season. A future admin reset can open a new key without deleting history.
export const COMPETITION_YEAR = "stage-a-initial";
const fail = (statusCode, message, code) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (code) error.code = code;
  throw error;
};
const validId = (value) =>
  typeof value === "string" && /^[a-f\d]{24}$/i.test(value);
const snapshot = (player) => ({
  player: player._id,
  nameSnapshot: `${player.firstName} ${player.lastName}`,
  citySnapshot: player.city || "",
});
const serialize = (tournament) => ({
  ...tournament.toJSON(),
  standings:
    tournament.phase === "completed"
      ? tournament.finalStandings
      : calculateStandings(tournament.playerParticipants, tournament.rounds),
});
async function load(req) {
  if (!validId(req.params.id)) fail(404, "טורניר לא נמצא");
  const tournament = await Tournament.findOne({
    _id: req.params.id,
    engineVersion: ENGINE,
  });
  if (!tournament) fail(404, "טורניר לא נמצא");
  return tournament;
}
function revision(req, tournament) {
  if (
    req.user.role === "judge" &&
    (tournament.phase === "completed" ||
      tournament.status === "completed" ||
      tournament.source === "historical")
  )
    fail(403, "שופטים רשאים להפעיל טורנירים חיים בלבד");
  if (
    !Number.isInteger(req.body.expectedRevision) ||
    req.body.expectedRevision < 0
  )
    fail(400, "יש לשלוח את גרסת הטורניר");
  if (tournament.revision !== req.body.expectedRevision)
    fail(
      409,
      "הטורניר עודכן על ידי איש צוות אחר. בדקו את המצב החדש ונסו שוב",
      "STALE_REVISION",
    );
  if (tournament.phase === "completed")
    fail(409, "טורניר שהסתיים אינו ניתן לעריכה");
}
async function commit(req, updates) {
  const tournament = await Tournament.findOneAndUpdate(
    {
      _id: req.params.id,
      engineVersion: ENGINE,
      revision: req.body.expectedRevision,
      phase: { $ne: "completed" },
    },
    { $set: updates, $inc: { revision: 1 } },
    { new: true, runValidators: true },
  );
  if (!tournament)
    fail(409, "הטורניר עודכן במקביל. בדקו את המצב החדש ונסו שוב", "STALE_REVISION");
  notifyTournament(req, tournament);
  return serialize(tournament);
}
function base(team, participants, req, source) {
  const date = req.body.date ? new Date(req.body.date) : new Date();
  if (
    Number.isNaN(date.getTime()) ||
    (source === "historical" && date > new Date())
  )
    fail(400, "יש לבחור תאריך היסטורי חוקי");
  if (req.body.title !== undefined && typeof req.body.title !== "string")
    fail(400, "שם טורניר לא חוקי");
  return {
    title: req.body.title?.trim() || `טורניר פנימי — ${team.name}`,
    description: `טורניר All Stars פנימי של ${team.name}`,
    date,
    registrationDeadline: date,
    location: team.name,
    image: team.logo || "/pokemon_kids_logo.png",
    maxParticipants: 128,
    currentParticipants: participants.length,
    type: "team_internal",
    engineVersion: ENGINE,
    scoringPolicy: SWISS_POLICY,
    team: team._id,
    teamNameSnapshot: team.name,
    teamLogoSnapshot: team.logo,
    competitionYear: COMPETITION_YEAR,
    source,
    phase: "setup",
    status: "upcoming",
    playerParticipants: participants,
    createdBy: req.user._id,
  };
}
export const createInternalTournament = asyncHandler(async (req, res) => {
  if (!validId(req.body.teamId)) fail(400, "יש לבחור נבחרת");
  const created = await withRosterLocks([req.body.teamId], async () => {
    const team = await Team.findById(req.body.teamId);
    if (!team?.isActive) fail(400, "נבחרת פעילה נדרשת לפתיחת טורניר");
    const players = await Player.find({
      team: team._id,
      playerType: "team",
      isActive: true,
    }).sort({ firstName: 1, lastName: 1, _id: 1 });
    if (players.length < 2 || players.length > 128)
      fail(400, "נדרשים בין 2 ל-128 ילדים פעילים בנבחרת");
    return Tournament.create(base(team, players.map(snapshot), req, "live"));
  });
  res.status(201).json(serialize(created));
});
export const getInternalTournaments = asyncHandler(async (req, res) => {
  const query = { engineVersion: ENGINE };
  if (req.query.teamId) {
    if (!validId(req.query.teamId)) fail(400, "נבחרת לא חוקית");
    query.team = req.query.teamId;
  }
  const tournaments = await Tournament.find(query)
    .select(
      "title date team teamNameSnapshot status phase source revision currentParticipants competitionYear",
    )
    .sort({ date: -1 });
  res.json(tournaments);
});
export const getInternalTournament = asyncHandler(async (req, res) =>
  res.json(serialize(await load(req))),
);
export const changeInternalParticipants = asyncHandler(async (req, res) => {
  const tournament = await load(req);
  revision(req, tournament);
  if (tournament.phase !== "setup" || tournament.rounds.length)
    fail(409, "לא ניתן לשנות משתתפים לאחר תחילת הסיבובים");
  const { playerIds } = req.body;
  if (
    !Array.isArray(playerIds) ||
    playerIds.length < 2 ||
    playerIds.length > 128 ||
    !playerIds.every(validId) ||
    new Set(playerIds).size !== playerIds.length
  )
    fail(400, "יש לבחור לפחות שני משתתפים ייחודיים");
  const output = await withRosterLocks([tournament.team], async () => {
    const players = await Player.find({
      _id: { $in: playerIds },
      team: tournament.team,
      playerType: "team",
      isActive: true,
    }).sort({ firstName: 1, lastName: 1, _id: 1 });
    if (players.length !== playerIds.length)
      fail(400, "ניתן לבחור רק ילדים פעילים מהנבחרת");
    return commit(req, {
      playerParticipants: players.map(snapshot),
      currentParticipants: players.length,
    });
  });
  res.json(output);
});
export const pairRound = asyncHandler(async (req, res) => {
  const tournament = await load(req);
  revision(req, tournament);
  if (tournament.rounds.length >= 16) fail(400, "ניתן לקיים עד 16 סיבובים");
  let matches;
  try {
    matches = generatePairings(
      tournament.playerParticipants,
      tournament.rounds,
    );
  } catch (error) {
    fail(400, error.message);
  }
  const round = {
    number: tournament.rounds.length + 1,
    matches,
    createdAt: new Date(),
    createdBy: req.user._id,
  };
  res.json(
    await commit(req, {
      phase: "running",
      rounds: [...tournament.rounds.map((r) => r.toObject()), round],
    }),
  );
});
export const enterMatchResult = asyncHandler(async (req, res) => {
  const tournament = await load(req);
  revision(req, tournament);
  const roundIndex = tournament.rounds.findIndex(
    (r) => r.number === Number(req.params.roundNumber),
  );
  const round = tournament.rounds[roundIndex];
  const match = round?.matches.id(req.params.matchId);
  if (!match) fail(404, "משחק לא נמצא");
  if (!match.player2) fail(400, "תוצאת Bye נקבעת אוטומטית");
  let score;
  try {
    score = validateScore(req.body.result);
  } catch (error) {
    fail(400, error.message);
  }
  const changed =
    !match.result ||
    ["winner", "score1", "score2", "drawnGames"].some(
      (key) => score[key] !== match.result[key],
    );
  const later = tournament.rounds.slice(roundIndex + 1);
  if (changed && later.length && req.body.invalidateLaterRounds !== true)
    fail(
      409,
      "תיקון תוצאה זו יבטל את הסיבובים המאוחרים. יש לאשר במפורש",
      "DOWNSTREAM_ROUNDS",
    );
  const rounds = tournament.rounds
    .slice(0, changed ? roundIndex + 1 : undefined)
    .map((r) => r.toObject());
  rounds[roundIndex].matches.find(
    (m) => String(m._id) === req.params.matchId,
  ).result = { ...score, enteredAt: new Date(), enteredBy: req.user._id };
  const invalidatedRounds = tournament.invalidatedRounds.map((entry) =>
    entry.toObject(),
  );
  if (changed && later.length)
    invalidatedRounds.push({
      invalidatedAt: new Date(),
      invalidatedBy: req.user._id,
      reason: `Correction to round ${round.number}`,
      rounds: later.map((r) => r.toObject()),
    });
  res.json(await commit(req, { rounds, invalidatedRounds }));
});
export const closeInternalTournament = asyncHandler(async (req, res) => {
  const tournament = await load(req);
  revision(req, tournament);
  if (
    !tournament.rounds.length ||
    tournament.rounds.some((r) => r.matches.some((m) => !m.result))
  )
    fail(400, "ניתן לסיים רק טורניר עם סיבובים שכל תוצאותיהם הוזנו");
  const finalStandings = calculateStandings(
    tournament.playerParticipants,
    tournament.rounds,
  );
  res.json(
    await commit(req, {
      status: "completed",
      phase: "completed",
      finalStandings,
      closedAt: new Date(),
      closedBy: req.user._id,
    }),
  );
});
export const createHistoricalInternal = asyncHandler(async (req, res) => {
  const { teamId, results, date } = req.body;
  if (
    !validId(teamId) ||
    !date ||
    !Array.isArray(results) ||
    results.length < 2 ||
    results.length > 128
  )
    fail(400, "נבחרת, תאריך ולפחות שתי תוצאות נדרשים");
  if (results.some((row) => !row || typeof row !== "object"))
    fail(400, "תוצאות לא חוקיות");
  const playerIds = results.map((r) => r.player);
  if (!playerIds.every(validId) || new Set(playerIds).size !== playerIds.length)
    fail(400, "שחקנים לא חוקיים או כפולים");
  const [team, players] = await Promise.all([
    Team.findById(teamId),
    Player.find({ _id: { $in: playerIds }, playerType: "team" }),
  ]);
  if (!team || players.length !== results.length)
    fail(400, "נבחרת או שחקנים לא נמצאו");
  const byId = new Map(players.map((p) => [p.id, p]));
  const positions = new Set();
  const finalStandings = results
    .map((row) => {
      if (
        !Number.isInteger(row.position) ||
        row.position < 1 ||
        row.position > results.length ||
        positions.has(row.position) ||
        !Number.isInteger(row.points) ||
        row.points < 0 ||
        row.points > 10000
      )
        fail(
          400,
          "מיקומים חייבים להיות ייחודיים ורציפים, וניקוד מספר שלם שאינו שלילי",
        );
      positions.add(row.position);
      const metrics = {};
      for (const key of ["omp", "gwp", "ogp"]) {
        if (
          row[key] !== undefined &&
          row[key] !== null &&
          (typeof row[key] !== "number" ||
            !Number.isFinite(row[key]) ||
            row[key] < 0 ||
            row[key] > 1)
        )
          fail(400, "אחוזי שוברי שוויון חייבים להיות בין 0 ל-1");
        metrics[key] = row[key] ?? null;
      }
      return {
        player: row.player,
        playerName: snapshot(byId.get(row.player)).nameSnapshot,
        position: row.position,
        points: row.points,
        ...metrics,
      };
    })
    .sort((a, b) => a.position - b.position);
  if (
    finalStandings.some(
      (row, index) => index && row.points > finalStandings[index - 1].points,
    )
  )
    fail(400, "סדר המיקומים אינו תואם לניקוד");
  const created = await Tournament.create({
    ...base(team, players.map(snapshot), req, "historical"),
    finalStandings,
    phase: "completed",
    status: "completed",
    closedAt: new Date(),
    closedBy: req.user._id,
  });
  res.status(201).json(serialize(created));
});
export const getAllStarsRankings = asyncHandler(async (req, res) => {
  const tournaments = await Tournament.find({
    engineVersion: ENGINE,
    type: "team_internal",
    phase: "completed",
    status: "completed",
    competitionYear: COMPETITION_YEAR,
  }).select("finalStandings");
  const totals = new Map();
  for (const tournament of tournaments)
    for (const row of tournament.finalStandings) {
      const key = String(row.player);
      const current = totals.get(key) || {
        playerId: key,
        playerName: row.playerName,
        points: 0,
        tournaments: 0,
      };
      current.points += row.points;
      current.tournaments++;
      totals.set(key, current);
    }
  const players = await Player.find({ _id: { $in: [...totals.keys()] } })
    .select("firstName lastName team")
    .populate("team", "name logo");
  const playersById = new Map(players.map((p) => [p.id, p]));
  const rows = [...totals.values()]
    .map((row) => {
      const player = playersById.get(row.playerId);
      return {
        ...row,
        playerName: player
          ? `${player.firstName} ${player.lastName}`
          : row.playerName,
        team: player?.team
          ? {
              id: player.team.id,
              name: player.team.name,
              logo: player.team.logo || "",
            }
          : null,
      };
    })
    .filter((row) => !req.query.teamId || row.team?.id === req.query.teamId)
    .sort(
      (a, b) =>
        b.points - a.points ||
        a.playerName.localeCompare(b.playerName, "he") ||
        a.playerId.localeCompare(b.playerId),
    );
  res.json({
    competitionYear: COMPETITION_YEAR,
    rankings: rows.map((row, index) => ({ ...row, position: index + 1 })),
  });
});
