import { calculateStandings } from './swiss.js';

const id = value => String(value?._id ?? value);
const pairKey = (a, b) => [id(a), id(b)].sort().join(':');

/**
 * Bipartite Swiss pairing: never match players from the same team.
 * Bench players are unscored (never a bye).
 */
export function planInterTeamRound({ participants, rounds, teamIds, eligibleIds, random = Math.random }) {
  if (!Array.isArray(teamIds) || teamIds.length !== 2 || id(teamIds[0]) === id(teamIds[1]))
    throw new Error('יש לבחור שתי נבחרות שונות');
  if (rounds.some(round => round.matches.some(match => !match.result)))
    throw new Error('יש להזין את תוצאות הסבב הקודם לפני יצירת סבב נוסף');
  const members = new Map(participants.map(p => [id(p.player), p]));
  const selected = new Set((eligibleIds ?? participants.map(p => p.player)).map(id));
  if (selected.size < 2 || [...selected].some(player => !members.has(player)))
    throw new Error('יש לבחור משתתפים חוקיים משתי הנבחרות');
  const teamOf = new Map(participants.map(p => [id(p.player), id(p.team)]));
  const sides = teamIds.map(team => [...selected].filter(player => teamOf.get(player) === id(team)));
  if (sides.some(side => !side.length) || sides[0].length + sides[1].length !== selected.size)
    throw new Error('נדרש שחקן אחד לפחות מכל נבחרת, ללא שחקנים זרים');
  // The opening round is a fair draw: neither table assignments nor the
  // surplus bench depend on roster order, points, names or player IDs.
  // Shuffle each team independently to keep every match cross-team.
  // A random function can be injected for deterministic tests.
  if (!rounds.length) {
    const shuffle = players => {
      const pool = [...players];
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      return pool;
    };
    const [left, right] = sides.map(shuffle);
    const tableCount = Math.min(left.length, right.length);
    const largerSide = left.length > right.length ? left : right;
    return {
      matches: Array.from({ length: tableCount }, (_, index) => ({
        player1: left[index],
        player2: right[index],
        table: index + 1,
      })),
      benchPlayerIds: largerSide.slice(tableCount),
    };
  }
  const standings = new Map(calculateStandings(participants, rounds).map(row => [row.player, row]));
  const benchCounts = new Map(participants.map(p => [id(p.player), 0]));
  const previous = new Set();
  for (const round of rounds) {
    for (const player of round.benchPlayerIds ?? []) benchCounts.set(id(player), (benchCounts.get(id(player)) ?? 0) + 1);
    for (const match of round.matches) if (match.player2) previous.add(pairKey(match.player1, match.player2));
  }
  const larger = sides[0].length >= sides[1].length ? 0 : 1;
  const extra = sides[larger].length - sides[1 - larger].length;
  // Automatic pairing rotates the bench in complete fairness tiers.
  // A player cannot sit a second time while any eligible teammate has never
  // sat; likewise no third turn before every teammate has had two turns.
  // In particular, we never fill a partially exhausted tier with players who
  // have already benched more often. Admin manual overrides remain unrestricted.
  const minBenchCount = Math.min(...sides[larger].map(player => benchCounts.get(player) ?? 0));
  const sameTier = sides[larger].filter(player => (benchCounts.get(player) ?? 0) === minBenchCount);
  if (sameTier.length < extra)
    throw new Error('לא ניתן להגריל סבב: יש ילדים שטרם ישבו בספסל כמספר הפעמים של האחרים, ואין מספיק מהם למלא את הספסל. אפשר לשנות את הרכב המשתתפים לפני ההגרלה.');
  // An automatically generated round also never puts the same child on the
  // bench in two consecutive rounds, even after all players had a bench turn.
  const lastBench = new Set((rounds.at(-1)?.benchPlayerIds ?? []).map(id));
  const benchCandidates = sameTier.filter(player => !lastBench.has(player));
  if (benchCandidates.length < extra)
    throw new Error('לא ניתן להגריל סבב בלי להושיב שחקן בספסל שני סבבים ברצף. יש להתאים את הרכב המשתתפים לפני ההגרלה.');
  const bench = benchCandidates.sort((a,b) =>
    standings.get(a).points - standings.get(b).points ||
    standings.get(b).position - standings.get(a).position ||
    a.localeCompare(b)).slice(0, extra);
  const sitting = new Set(bench);
  const left = sides[0].filter(p => !sitting.has(p));
  const right = sides[1].filter(p => !sitting.has(p));
  const cost = (a,b) =>
    (previous.has(pairKey(a,b)) ? 1000000 : 0) +
    Math.abs(standings.get(a).points - standings.get(b).points) * 1000 +
    Math.abs(standings.get(a).position - standings.get(b).position);
  // Deterministic cheapest bipartite assignment with local 2-opt refinement.
  const ranked = [...left].sort((a,b) => standings.get(b).points - standings.get(a).points || a.localeCompare(b));
  const available = new Set(right);
  const matches = ranked.map(player1 => {
    const player2 = [...available].sort((a,b) => cost(player1,a) - cost(player1,b) || a.localeCompare(b))[0];
    available.delete(player2);
    return { player1, player2 };
  });
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 0; i < matches.length; i++) {
      for (let j = i + 1; j < matches.length; j++) {
        const a = matches[i], b = matches[j];
        const oldCost = cost(a.player1,a.player2) + cost(b.player1,b.player2);
        const newCost = cost(a.player1,b.player2) + cost(b.player1,a.player2);
        if (newCost < oldCost) {
          [a.player2,b.player2] = [b.player2,a.player2];
          improved = true;
        }
      }
    }
  }
  return {
    matches: matches.map((match, index) => ({ ...match, table: index + 1 })),
    benchPlayerIds: bench,
  };
}

export function validateInterTeamPairings(matches, participants, teamIds, benchPlayerIds = []) {
  const teams = new Set(teamIds.map(id));
  const memberTeams = new Map(participants.map(p => [id(p.player), id(p.team)]));
  const used = new Set(benchPlayerIds.map(id));
  if (used.size !== benchPlayerIds.length) throw new Error('שחקן ספסל כפול');
  for (const player of used) if (!teams.has(memberTeams.get(player)))
    throw new Error('שחקן ספסל אינו שייך למפגש');
  for (const match of matches) {
    const a = id(match.player1), b = id(match.player2);
    if (!b || !memberTeams.has(a) || !memberTeams.has(b) ||
      !teams.has(memberTeams.get(a)) || !teams.has(memberTeams.get(b)) ||
      memberTeams.get(a) === memberTeams.get(b) || used.has(a) || used.has(b))
      throw new Error('כל צימוד חייב להכיל שחקן מכל אחת משתי הנבחרות');
    used.add(a); used.add(b);
  }
  return true;
}
