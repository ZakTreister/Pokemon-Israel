// Stage A scoring policy: 3/1/0 match and game points; opponent percentage
// floors of 1/3. Byes award 3 match points, but no games or opponent.
export const SWISS_POLICY = "swiss-3-1-0-opponent-floor-1/3-v1";
const id = (value) => String(value?._id || value);
const compare = (a, b) =>
  b.points - a.points ||
  b.omp - a.omp ||
  b.gwp - a.gwp ||
  b.ogp - a.ogp ||
  a.seed - b.seed;

export function validateScore(result) {
  if (!result || !["player1", "player2", "draw"].includes(result.winner))
    throw new Error("בחר מנצח או תיקו");
  const { score1, score2, drawnGames = 0, winner } = result;
  if (
    ![score1, score2, drawnGames].every(
      (n) => Number.isInteger(n) && n >= 0 && n <= 3,
    ) ||
    score1 + score2 + drawnGames > 3
  )
    throw new Error("תוצאה לא חוקית למשחק הטוב משלושה");
  const shape = `${score1}-${score2}`;
  const valid =
    winner === "draw"
      ? ["0-0", "1-1"]
      : winner === "player1"
        ? ["2-0", "2-1", "1-0"]
        : ["0-2", "1-2", "0-1"];
  if (!valid.includes(shape)) throw new Error("התוצאה אינה תואמת למנצח שנבחר");
  return { winner, score1, score2, drawnGames };
}

export function calculateStandings(participants, rounds) {
  const rows = participants.map((p, seed) => ({
    player: id(p.player),
    playerName: p.nameSnapshot,
    seed,
    points: 0,
    matchesPlayed: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    byes: 0,
    gameWins: 0,
    gameDraws: 0,
    gamesPlayed: 0,
    opponents: [],
    competitivePoints: 0,
  }));
  const byId = new Map(rows.map((r) => [r.player, r]));
  for (const round of rounds) {
    for (const match of round.matches) {
      if (!match.result) continue;
      const first = byId.get(id(match.player1));
      if (!first) throw new Error("Unknown player in round");
      if (!match.player2) {
        first.points += 3;
        first.byes++;
        continue;
      }
      const second = byId.get(id(match.player2));
      if (!second) throw new Error("Unknown opponent in round");
      const result = validateScore(match.result);
      for (const [player, opponent, side, games] of [
        [first, second, "player1", result.score1],
        [second, first, "player2", result.score2],
      ]) {
        const won = result.winner === side;
        const draw = result.winner === "draw";
        const points = won ? 3 : draw ? 1 : 0;
        player.points += points;
        player.competitivePoints += points;
        player.matchesPlayed++;
        player.wins += Number(won);
        player.draws += Number(draw);
        player.losses += Number(!won && !draw);
        player.gameWins += games;
        player.gameDraws += result.drawnGames;
        player.gamesPlayed += result.score1 + result.score2 + result.drawnGames;
        player.opponents.push(opponent.player);
      }
    }
  }
  const matchRate = (r) =>
    r.matchesPlayed ? r.competitivePoints / (r.matchesPlayed * 3) : 0;
  const gameRate = (r) =>
    r.gamesPlayed ? (r.gameWins * 3 + r.gameDraws) / (r.gamesPlayed * 3) : 0;
  const mean = (values) =>
    values.length ? values.reduce((s, n) => s + n, 0) / values.length : 0;
  for (const row of rows) {
    row.gwp = gameRate(row);
    row.omp = mean(
      row.opponents.map((opponent) =>
        Math.max(1 / 3, matchRate(byId.get(opponent))),
      ),
    );
    row.ogp = mean(
      row.opponents.map((opponent) =>
        Math.max(1 / 3, gameRate(byId.get(opponent))),
      ),
    );
  }
  return rows.sort(compare).map((row, index) => {
    const { opponents, competitivePoints, seed, ...standing } = row;
    // Keep implementation-only fields out of the canonical result record.
    void opponents;
    void competitivePoints;
    void seed;
    return { ...standing, position: index + 1 };
  });
}

export function pairCost(a, b, meetings) {
  return (
    (meetings.has([a.player, b.player].sort().join(":")) ? 1000000000 : 0) +
    Math.abs(a.points - b.points) * 1000 +
    Math.abs(a.position - b.position)
  );
}

export function generatePairings(participants, rounds) {
  if (participants.length < 2) throw new Error("נדרשים לפחות שני משתתפים");
  if (rounds.some((r) => r.matches.some((m) => !m.result)))
    throw new Error("יש להזין את כל תוצאות הסיבוב לפני יצירת סיבוב נוסף");
  const standings = calculateStandings(participants, rounds);
  const meetings = new Set(
    rounds.flatMap((r) =>
      r.matches
        .filter((m) => m.player2)
        .map((m) => [id(m.player1), id(m.player2)].sort().join(":")),
    ),
  );
  let pool = [...standings];
  const matches = [];
  if (pool.length % 2) {
    const candidates = [...pool].sort(
      (a, b) => a.byes - b.byes || b.position - a.position,
    );
    const bye = candidates[0];
    pool = pool.filter((p) => p.player !== bye.player);
    matches.push({
      player1: bye.player,
      player2: null,
      result: { winner: "bye", score1: 0, score2: 0, drawnGames: 0 },
    });
  }
  // Exact minimum-cost matching for a small roster. The bounded deterministic
  // search below supports larger rosters without unbounded exponential work.
  let budget = 60000;
  let best = null;
  let bestCost = Infinity;
  function search(remaining, paired, cost) {
    if (--budget < 0 || cost >= bestCost) return;
    if (!remaining.length) {
      best = paired;
      bestCost = cost;
      return;
    }
    const first = remaining[0];
    const candidates = remaining
      .slice(1)
      .sort(
        (a, b) =>
          pairCost(first, a, meetings) - pairCost(first, b, meetings) ||
          a.position - b.position,
      );
    for (const opponent of candidates) {
      search(
        remaining.filter((p) => p !== first && p !== opponent),
        [...paired, { player1: first.player, player2: opponent.player }],
        cost + pairCost(first, opponent, meetings),
      );
    }
  }
  search(pool, [], 0);
  if (!best) throw new Error("לא ניתן ליצור זיווגים");
  return [...best, ...matches].map((match, index) => ({
    ...match,
    table: index + 1,
  }));
}
