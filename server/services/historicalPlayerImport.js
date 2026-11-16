// Pure identity planning for the legacy cumulative snapshot.
// Source names lack city/ID. All existing links must be reviewed before apply.
import { normalizeRankingName } from './nationalRankings.js';

export function splitHistoricalPlayerName(fullName, override = {}) {
  const tokens = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  const firstName = typeof override.firstName === 'string'
    ? override.firstName.trim() : tokens[0] || '';
  const lastName = typeof override.lastName === 'string'
    ? override.lastName.trim() : tokens.slice(1).join(' ');
  if (!firstName || !lastName || firstName.length > 50 || lastName.length > 50)
    throw new Error(`Cannot split historical name: ${fullName}`);
  return { firstName, lastName, reviewSuggested: tokens.length !== 2 || /\?/.test(fullName) };
}

export function planHistoricalPlayers(rows, players, existingHistorical = [], review = {}) {
  const existingBySourceName = new Map(existingHistorical.map(row => [row.normalizedName, row]));
  const assignments = new Set();
  return rows.map(row => {
    const override = review[row.playerName] || {};
    // CSV columns are the preferred proposed split; a private review override can correct them.
    const split = splitHistoricalPlayerName(row.playerName, {
      ...(row.firstName && row.lastName ? { firstName: row.firstName, lastName: row.lastName } : {}),
      ...override,
    });
    const previous = existingBySourceName.get(row.normalizedName);
    const expectedType = row.isAllStars ? 'team' : 'quarterly';
    const reviewedName = normalizeRankingName(`${split.firstName} ${split.lastName}`);
    const allCandidates = players.filter(p => (
      (p.historicalImportSource === row.source && p.historicalNormalizedName === row.normalizedName) ||
      [row.normalizedName, reviewedName].includes(normalizeRankingName(`${p.firstName} ${p.lastName}`))
    ));
    const archivedMatches = allCandidates.filter(p => !!p.deletedAt);
    const current = allCandidates.filter(p => !p.deletedAt);
    const linkedId = String(previous?.player || override.playerId || '');
    let chosen;
    let state;
    let issue = null;
    if (linkedId) {
      chosen = players.find(p => String(p._id) === linkedId && !p.deletedAt);
      if (!chosen) issue = `Linked Player not found or archived: ${linkedId}`;
      else state = 'reviewed-link';
    } else {
      const imported = current.filter(p => p.historicalImportSource === row.source && p.historicalNormalizedName === row.normalizedName);
      const matches = current.filter(p => p.playerType === expectedType);
      if (imported.length === 1) { chosen = imported[0]; state = 'imported-existing'; }
      else if (imported.length > 1) issue = 'More than one previously imported Player';
      else if (archivedMatches.length) issue = 'Matching archived Player exists; restore/review before import';
      else if (current.length !== matches.length) issue = 'Matching name also exists in the other player type; review identity';
      else if (matches.length === 1) { chosen = matches[0]; state = 'name-candidate'; }
      else if (matches.length > 1) issue = 'Multiple Players have the same name';
      else if (row.isAllStars) issue = 'All-Stars Player missing; never create an unassigned team player';
      else state = 'create-quarterly';
    }
    if (chosen && chosen.playerType !== expectedType && !override.playerId && !previous?.player)
      issue = 'Player type differs from historical All-Stars classification';
    if (chosen && assignments.has(String(chosen._id)))
      issue = 'Two historical rows resolve to the same Player';
    if (chosen) assignments.add(String(chosen._id));
    return { row, ...split, player: chosen || null, state: issue ? 'blocked' : state,
      issue, reviewSuggested: (split.reviewSuggested || /\?/.test(split.lastName)) &&
        state === 'create-quarterly' && !(override.firstName && override.lastName) };
  });
}