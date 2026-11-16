import asyncHandler from 'express-async-handler';
import Tournament from '../models/tournamentModel.js';
import HistoricalRanking from '../models/historicalRankingModel.js';
import {
  buildNationalRanking,
  HISTORICAL_CUTOFF,
  HISTORICAL_RANKING_SOURCE,
} from '../services/nationalRankings.js';

export const getNationalRankings = asyncHandler(async (req, res) => {
  const historical = await HistoricalRanking.find({ source: HISTORICAL_RANKING_SOURCE })
    .select('playerName points tournaments isAllStars player legacyUser')
    .lean();
  const hasHistoricalSnapshot = historical.length > 0;
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