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
  b.points - a.points || b.tournaments - a.tournaments || nameCompare(a, b) || a.playerId.localeCompare(b.playerId);

export function buildNationalRanking(historicalRows, postImportTournamentRows, options = {}) {
  const { includeAllStars = false, search = '', page = 1, pageSize = 25,
    sort = 'position', descending = false, offset, previousTournamentRows, allRows = false } = options;
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
      // Preserve the pre-import public identifier for ordinary event-only rows.
      // The internal totals Map still distinguishes User and Player namespaces.
      playerId: id,
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
  eligible.forEach((row, index) => { row.position = index + 1; });
  let topMovers = [];
  if (Array.isArray(previousTournamentRows)) {
    const previous = buildNationalRanking(historicalRows, previousTournamentRows, { includeAllStars, allRows: true }).rankings;
    const positions = new Map(previous.map(row => [row.playerId, row.position]));
    for (const row of eligible) {
      if (positions.has(row.playerId)) row.rankChange = positions.get(row.playerId) - row.position;
    }
    topMovers = eligible.filter(row => row.rankChange > 0)
      .sort((a,b) => b.rankChange - a.rankChange || a.position - b.position || nameCompare(a,b)).slice(0,3);
  }
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
  const start = Number.isSafeInteger(offset) && offset >= 0 ? offset : (validPage - 1) * validSize;
  return {
    rankings: allRows ? filtered : filtered.slice(start, start + validSize),
    ...(Array.isArray(previousTournamentRows) ? { topMovers } : {}),
    total, page: validPage, pageSize: validSize, totalPages,
  };
}