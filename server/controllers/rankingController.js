import asyncHandler from 'express-async-handler';
import Tournament from '../models/tournamentModel.js';
import HistoricalRanking from '../models/historicalRankingModel.js';
import Player from '../models/playerModel.js';
import { hasRankingResults, nationalRankingFreshness } from '../services/rankingFreshness.js';
import {
  buildNationalRanking,
  HISTORICAL_CUTOFF,
  HISTORICAL_RANKING_SOURCE,
  regularTournamentFilter,
} from '../services/nationalRankings.js';

export const getNationalRankings = asyncHandler(async (req, res) => {
  const historical = await HistoricalRanking.find({ source: HISTORICAL_RANKING_SOURCE })
    .select('playerName points tournaments isAllStars player legacyUser updatedAt createdAt')
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
  // Only completed regular tournaments affect this ranking. Team-internal
  // and inter-team scores remain exclusively in their own competitions.
  const query = regularTournamentFilter(hasHistoricalSnapshot);
  // Retain archived results solely for their deletion timestamp. They never
  // contribute to points, participation, movers or the latest included event.
  const sourceTournaments = await Tournament.find(query).setOptions({includeDeleted:true})
    .select('title results finalStandings engineVersion type closedAt date createdAt updatedAt deletedAt')
    .lean();
  const tournaments=sourceTournaments.filter(row=>!row.deletedAt);
  const tournamentRows = [];
  const latest = tournaments.filter(hasRankingResults).sort((a,b) => new Date(b.closedAt || b.date).getTime() - new Date(a.closedAt || a.date).getTime() || String(b._id).localeCompare(String(a._id)))[0];
  for (const tournament of tournaments) {
    if (tournament.engineVersion === 'swiss-v1') {
      for (const result of tournament.finalStandings || []) {
        if (!result.player) continue;
        tournamentRows.push({
          tournamentId: String(tournament._id),
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
          tournamentId: String(tournament._id),
          playerId: String(result.player),
          playerKind: result.playerModel === 'Player' ? 'player' : 'user',
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
    offset: Number.parseInt(req.query.offset, 10),
    ...(latest ? { previousTournamentRows: tournamentRows.filter(row => row.tournamentId !== String(latest._id)) } : {}),
    sort: typeof req.query.sort === 'string' ? req.query.sort : 'position',
    descending: req.query.descending === 'true',
  });
  res.json({ ...result, tournamentCount: tournaments.length, ...nationalRankingFreshness(historical,sourceTournaments) });
});