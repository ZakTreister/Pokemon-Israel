import asyncHandler from 'express-async-handler';
import Tournament from '../models/tournamentModel.js';
export const getNationalRankings = asyncHandler(async (req, res) => {
  const tournaments = await Tournament.find({
    status: 'completed',
    type: { $in: [null, 'quarterly'] },
    engineVersion: { $ne: 'swiss-v1' },
  }).select('results');
  const totals = new Map();
  for (const tournament of tournaments)
    for (const result of tournament.results) {
      if (!result.player) continue;
      const id = String(result.player);
      const row = totals.get(id) || {
        playerId: id,
        playerName: result.playerName,
        points: 0,
        tournaments: 0,
        bestRank: null,
      };
      row.points += Number.isFinite(result.points) ? result.points : 0;
      row.tournaments++;
      if (result.position > 0)
        row.bestRank =
          row.bestRank === null
            ? result.position
            : Math.min(row.bestRank, result.position);
      totals.set(id, row);
    }
  const rankings = [...totals.values()]
    .sort(
      (a, b) =>
        b.points - a.points ||
        a.playerName.localeCompare(b.playerName, 'he') ||
        a.playerId.localeCompare(b.playerId),
    )
    .map((row, index) => ({ ...row, position: index + 1 }));
  res.json({ rankings, tournamentCount: tournaments.length });
});
