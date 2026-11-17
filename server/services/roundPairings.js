// Validate and apply a human-approved override of the latest round's pairings.
// Stable match IDs remain associated with tables; scores only survive when
// both players in the match are unchanged.
const id = value => value == null ? null : String(value);
const validPlayer = value => typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);
function invalid(message, code = 'INVALID_PAIRINGS') {
  const error = new Error(message);
  error.code = code;
  throw error;
}
export function planRoundPairingEdit(round, requested, clearResults = false) {
  if (!Array.isArray(requested) || requested.length !== round.matches.length)
    invalid('יש להעביר את כל הצימודים בסבב');
  const oldById = new Map(round.matches.map(match => [id(match._id), match]));
  const currentPlayers = round.matches.flatMap(match => [id(match.player1), id(match.player2)].filter(Boolean));
  const inputPlayers = [];
  const seenMatches = new Set();
  const seenTables = new Set();
  let clearedResults = 0;
  let changed = false;
  const matches = requested.map(row => {
    if (!row || typeof row !== 'object' || !oldById.has(row.matchId) || seenMatches.has(row.matchId))
      invalid('זוהה צימוד חסר או כפול');
    seenMatches.add(row.matchId);
    if (!Number.isInteger(row.table) || row.table < 1 || row.table > requested.length || seenTables.has(row.table))
      invalid('יש לבחור מספר שולחן ייחודי לכל משחק');
    seenTables.add(row.table);
    if (!validPlayer(row.player1) || (row.player2 !== null && !validPlayer(row.player2)) ||
        row.player1 === row.player2)
      invalid('משתתפי הצימוד אינם חוקיים');
    inputPlayers.push(row.player1);
    if (row.player2) inputPlayers.push(row.player2);
    const original = oldById.get(row.matchId);
    const changedPlayers = id(original.player1) !== row.player1 || id(original.player2) !== row.player2;
    const changedTable = original.table !== row.table;
    if (changedPlayers || changedTable) changed = true;
    const scored = original.result && id(original.player2) !== null;
    if (changedPlayers && scored && !clearResults)
      invalid('לצימוד שהשתנה כבר יש תוצאה. יש לאשר במפורש את מחיקתה.', 'RESULTS_REQUIRE_CLEAR');
    if (changedPlayers && scored) clearedResults++;
    return {
      ...original, table: row.table, player1: row.player1, player2: row.player2,
      resultRevision: (original.resultRevision || 0) + (changedPlayers ? 1 : 0),
      result: !row.player2
        ? { winner: 'bye', score1: 0, score2: 0, drawnGames: 0 }
        : changedPlayers ? null : original.result || null,
    };
  });
  if (new Set(inputPlayers).size !== inputPlayers.length ||
      currentPlayers.length !== inputPlayers.length ||
      currentPlayers.some(player => !inputPlayers.includes(player)))
    invalid('יש לשמור על כל המשתתפים הייחודיים של הסבב, ללא הוספה או הסרה');
  return { matches: matches.sort((a, b) => a.table - b.table), clearedResults, changed };
}
