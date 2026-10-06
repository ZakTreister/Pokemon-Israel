import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateStandings,
  generatePairings,
  validateScore,
} from "../services/swiss.js";
const participants = (count) =>
  Array.from({ length: count }, (_, i) => ({
    player: String(i),
    nameSnapshot: `Player ${i}`,
  }));
const result = (winner, score1, score2, drawnGames = 0) => ({
  winner,
  score1,
  score2,
  drawnGames,
});
test("Bo3 validates winner, timed 1–0 wins, drawn games and score boundaries", () => {
  for (const score of [
    result("player1", 2, 0),
    result("player1", 2, 1),
    result("player1", 1, 0),
    result("player2", 0, 1),
    result("draw", 1, 1, 1),
    result("draw", 0, 0),
  ])
    assert.deepEqual(validateScore(score), score);
  for (const score of [
    result("player1", 0, 1),
    result("draw", 1, 0),
    result("player1", 3, 0),
    result("player1", 2, 1, 1),
    result("player1", 1.5, 0),
    result("bye", 0, 0),
  ])
    assert.throws(() => validateScore(score));
});
test("standings calculate points and opponent/game percentages from actual results", () => {
  const rows = calculateStandings(participants(4), [
    {
      matches: [
        { player1: "0", player2: "1", result: result("player1", 2, 1) },
        { player1: "2", player2: "3", result: result("draw", 1, 1, 1) },
      ],
    },
  ]);
  assert.deepEqual(
    rows.map((row) => [row.player, row.points]),
    [
      ["0", 3],
      ["2", 1],
      ["3", 1],
      ["1", 0],
    ],
  );
  assert.equal(rows[0].omp, 1 / 3);
  assert.equal(rows[0].gwp, 2 / 3);
  assert.equal(rows[0].ogp, 1 / 3);
  assert.equal(rows[1].gwp, 4 / 9);
  assert.equal(rows[1].ogp, 4 / 9);
  assert.equal(rows[3].omp, 1);
  assert.equal(rows[3].ogp, 2 / 3);
});
test("bye adds match points without invented game/opponent percentages", () => {
  const rows = calculateStandings(participants(3), [
    { matches: [{ player1: "2", player2: null, result: result("bye", 0, 0) }] },
  ]);
  assert.equal(rows[0].points, 3);
  assert.equal(rows[0].byes, 1);
  assert.equal(rows[0].matchesPlayed, 0);
  assert.equal(rows[0].gwp, 0);
  assert.equal(rows[0].omp, 0);
});
test("pairings are deterministic, complete, avoid rematches and distribute byes", () => {
  const roster = participants(5);
  const rounds = [];
  const byes = new Set();
  const meetings = new Set();
  for (let round = 0; round < 4; round++) {
    const matches = generatePairings(roster, rounds);
    assert.deepEqual(generatePairings(roster, rounds), matches);
    assert.equal(
      new Set(
        matches.flatMap((m) =>
          m.player2 ? [m.player1, m.player2] : [m.player1],
        ),
      ).size,
      5,
    );
    const bye = matches.find((m) => !m.player2);
    assert.ok(!byes.has(bye.player1));
    byes.add(bye.player1);
    for (const match of matches.filter((m) => m.player2)) {
      const key = [match.player1, match.player2].sort().join(":");
      assert.ok(!meetings.has(key));
      meetings.add(key);
      match.result = result("draw", 1, 1);
    }
    rounds.push({ matches });
  }
});
test("refuses another round while a result is missing and handles a large roster", () => {
  const roster = participants(128);
  const matches = generatePairings(roster, []);
  assert.equal(matches.length, 64);
  assert.equal(
    new Set(matches.flatMap((m) => [m.player1, m.player2])).size,
    128,
  );
  assert.throws(() => generatePairings(roster, [{ matches }]));
});
