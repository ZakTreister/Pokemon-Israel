export const HISTORICAL_RANKING_SOURCE = 'national-league-through-2026-11-16';
// The imported spreadsheet is an as-of snapshot. Completed regular tournaments
// on or before that date must not be counted again.
export const HISTORICAL_CUTOFF = new Date('2026-11-16T21:59:59.999Z');

// Explicit competition boundary: national ranking must never aggregate
// team-internal or inter-team tournaments, even when a Player has both scores.
export const regularTournamentFilter = (hasHistoricalSnapshot = false) => ({
  status: 'completed',
  type: { $in: [null, 'quarterly'] },
  ...(hasHistoricalSnapshot ? { date: { $gt: HISTORICAL_CUTOFF } } : {}),
});

export const normalizeRankingName = (value = '') =>
  String(value).normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('he');

const nameCompare = (a, b) => a.playerName.localeCompare(b.playerName, 'he');
const canonicalCompare = (a, b) =>
  b.points - a.points || nameCompare(a, b) || a.playerId.localeCompare(b.playerId);

export function buildNationalRanking(historicalRows, postImportTournamentRows, options = {}) {
  const { includeAllStars = false, search = '', page = 1, pageSize = 25,
    sort = 'position', descending = false } = options;
  const totals = new Map();
  const linkedPlayers = new Map();
  const linkedUsers = new Map();
  for (const historic of historicalRows) {
    const id = `historical:${historic._id}`;
    const row = {
      playerId: id,
      playerName: historic.playerName,
      points: historic.points,
      tournaments: historic.tournaments,
      isAllStars: historic.isAllStars === true,
      bestRank: null,
    };
    totals.set(id, row);
    if (historic.player) linkedPlayers.set(String(historic.player), id);
    if (historic.legacyUser) linkedUsers.set(String(historic.legacyUser), id);
  }
  for (const result of postImportTournamentRows) {
    if (!result.playerId) continue;
    const kind = result.playerKind === 'player' ? 'player' : 'user';
    const id = String(result.playerId);
    const key = kind === 'player'
      ? linkedPlayers.get(id) || `player:${id}`
      : linkedUsers.get(id) || `user:${id}`;
    const row = totals.get(key) || {
      playerId: key,
      playerName: result.playerName || 'שחקן ללא שם',
      points: 0,
      tournaments: 0,
      isAllStars: false,
      bestRank: null,
    };
    row.points += Number.isFinite(result.points) ? result.points : 0;
    row.tournaments += 1;
    if (Number.isInteger(result.position) && result.position > 0)
      row.bestRank = row.bestRank === null
        ? result.position : Math.min(row.bestRank, result.position);
    totals.set(key, row);
  }
  // Ranking order and rank calculation precede search/pagination.
  const eligible = [...totals.values()].filter(row => includeAllStars || !row.isAllStars);
  eligible.sort(canonicalCompare);
  let precedingPoints = null;
  let precedingPosition = 0;
  eligible.forEach((row, index) => {
    if (row.points !== precedingPoints) precedingPosition = index + 1;
    row.position = precedingPosition;
    precedingPoints = row.points;
  });
  const normalizedSearch = normalizeRankingName(search);
  const filtered = normalizedSearch
    ? eligible.filter(row => normalizeRankingName(row.playerName).includes(normalizedSearch))
    : eligible;
  if (sort !== 'position') {
    const allowed = new Set(['playerName', 'points', 'tournaments']);
    if (allowed.has(sort)) {
      filtered.sort((a, b) => {
        const primary = sort === 'playerName' ? nameCompare(a, b) : a[sort] - b[sort];
        return (descending ? -primary : primary) || a.position - b.position;
      });
    }
  } else if (descending) filtered.reverse();
  const validSize = Number.isInteger(pageSize) ? Math.min(100, Math.max(1, pageSize)) : 25;
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / validSize));
  const validPage = Number.isInteger(page) ? Math.max(1, Math.min(page, totalPages)) : 1;
  return {
    rankings: filtered.slice((validPage - 1) * validSize, validPage * validSize),
    total, page: validPage, pageSize: validSize, totalPages,
  };
}