import asyncHandler from 'express-async-handler';
import Tournament from '../models/tournamentModel.js';
import HistoricalRanking from '../models/historicalRankingModel.js';
import Player from '../models/playerModel.js';
import {
  buildNationalRanking,
  HISTORICAL_CUTOFF,
  HISTORICAL_RANKING_SOURCE,
} from '../services/nationalRankings.js';

export const getNationalRankings = asyncHandler(async (req, res) => {
  const historical = await HistoricalRanking.find({ source: HISTORICAL_RANKING_SOURCE })
    .select('playerName points tournaments isAllStars player legacyUser')
    .lean();
  // Never publish a partially applied historical import as the canonical baseline.
  const hasHistoricalSnapshot = historical.length === 337 && historical.every(row => !!row.player);
  if (!hasHistoricalSnapshot) historical.length = 0;
  else {
    const players = await Player.find({ _id: { $in: historical.map(row => row.player) } })
      .setOptions({ includeDeleted: true })
      .select('firstName lastName').lean();
    const currentNames = new Map(players.map(player =>
      [String(player._id), `${player.firstName} ${player.lastName}`.trim()]));
    for (const row of historical)
      row.playerName = currentNames.get(String(row.player)) || row.playerName;
  }
  const query = {
    status: 'completed',
    type: { $in: [null, 'quarterly'] },
    // Only post-snapshot tournaments accumulate on top of imported totals.
    ...(hasHistoricalSnapshot ? { date: { $gt: HISTORICAL_CUTOFF } } : {}),
  };
  const tournaments = await Tournament.find(query)
    .select('results finalStandings engineVersion type')
    .lean();
  const tournamentRows = [];
  for (const tournament of tournaments) {
    if (tournament.engineVersion === 'swiss-v1') {
      for (const result of tournament.finalStandings || []) {
        if (!result.player) continue;
        tournamentRows.push({
          playerId: String(result.player),
          playerKind: 'player',
          playerName: result.playerName,
          points: result.points,
          position: result.position,
        });
      }
    } else {
      for (const result of tournament.results || []) {
        if (!result.player) continue;
        tournamentRows.push({
          playerId: String(result.player),
          playerKind: 'user',
          playerName: result.playerName,
          points: result.points,
          position: result.position,
        });
      }
    }
  }
  const requestedPage = Number.parseInt(req.query.page, 10);
  const requestedPageSize = Number.parseInt(req.query.pageSize, 10);
  const result = buildNationalRanking(historical, tournamentRows, {
    includeAllStars: req.query.includeAllStars === 'true',
    search: typeof req.query.search === 'string' ? req.query.search : '',
    page: requestedPage,
    pageSize: requestedPageSize,
    sort: typeof req.query.sort === 'string' ? req.query.sort : 'position',
    descending: req.query.descending === 'true',
  });
  res.json({ ...result, tournamentCount: tournaments.length });
});