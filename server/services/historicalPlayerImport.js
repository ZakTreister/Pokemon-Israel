// Pure identity planning for the legacy cumulative snapshot.
// Source names lack city/ID. All existing links must be reviewed before apply.
import { normalizeRankingName } from './nationalRankings.js';

export function splitHistoricalPlayerName(fullName, override = {}) {
  const tokens = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  const firstName = typeof override.firstName === 'string'
    ? override.firstName.trim() : tokens[0] || '';
  const lastName = typeof override.lastName === 'string'
    ? override.lastName.trim() : tokens.slice(1).join(' ');
  // The source may explicitly confirm an unknown surname (e.g. firstName only).
  // Do not treat a blank surname as a confirmed value unless it is present in
  // the reviewed split-name input; a blank inferred by parsing remains invalid.
  const confirmedMissingSurname = Object.prototype.hasOwnProperty.call(override, 'lastName') &&
    typeof override.lastName === 'string' && lastName === '' &&
    normalizeRankingName(firstName) === normalizeRankingName(fullName);
  if (!firstName || (!lastName && !confirmedMissingSurname) ||
      firstName.length > 50 || lastName.length > 50)
    throw new Error(`Cannot split historical name: ${fullName}`);
  return { firstName, lastName, reviewSuggested: !confirmedMissingSurname &&
    (tokens.length !== 2 || /\?/.test(fullName)) };
}

// A one-to-one Player/User relationship can be stored on either side in
// older records. Inspect both directions before linking ordinary results.
export function historicalLegacyUserIds(player, legacyUsers = [], previousLegacyUser = null) {
  if (!player?._id) return [];
  const byPlayer = legacyUsers.filter(u =>
    u.player && String(u.player) === String(player._id)).map(u => String(u._id));
  return [...new Set([
    ...(player.user ? [String(player.user)] : []),
    ...byPlayer,
    ...(previousLegacyUser ? [String(previousLegacyUser)] : []),
  ])];
}

export function planHistoricalPlayers(rows, players, existingHistorical = [], review = {}, legacyUsers = []) {
  const existingBySourceName = new Map(existingHistorical.map(row => [row.normalizedName, row]));
  const assignments = new Set();
  return rows.map(row => {
    const override = review[row.playerName] || {};
    // CSV columns are the preferred proposed split; a private review override can correct them.
    const split = splitHistoricalPlayerName(row.playerName, {
      ...(typeof row.firstName === 'string' && typeof row.lastName === 'string'
        ? { firstName: row.firstName, lastName: row.lastName } : {}),
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
    // A legacy player User may have historical/future tournament results but
    // no canonical Player link. Creating a new Player blindly would split the
    // child's identity and future regular scores into separate ranking rows.
    const sameNameUsers = legacyUsers.filter(user =>
      [row.normalizedName, reviewedName].includes(normalizeRankingName(user.name)));
    const unlinkedUsers = sameNameUsers.filter(user =>
      !players.some(p => String(p.user || '') === String(user._id) ||
        (user.player && String(p._id) === String(user.player))));
    if (!issue && unlinkedUsers.length) {
      const confirmedUser = previous?.legacyUser || null;
      if (!confirmedUser ||
          unlinkedUsers.some(user => String(user._id) !== String(confirmedUser)))
        issue = 'Matching legacy player User lacks a verified canonical Player link; review before import';
    }
    if (chosen && chosen.playerType !== expectedType && !override.playerId && !previous?.player)
      issue = 'Player type differs from historical All-Stars classification';
    if (chosen && historicalLegacyUserIds(chosen, legacyUsers, previous?.legacyUser).length > 1)
      issue = 'Conflicting canonical Player to legacy User links; manual reconciliation required';
    if (chosen && assignments.has(String(chosen._id)))
      issue = 'Two historical rows resolve to the same Player';
    if (chosen) assignments.add(String(chosen._id));
    return { row, ...split, player: chosen || null, state: issue ? 'blocked' : state,
      issue, reviewSuggested: (split.reviewSuggested || /\?/.test(split.lastName)) &&
        state === 'create-quarterly' && !(override.firstName && override.lastName) };
  });
}