import test from 'node:test';
import assert from 'node:assert/strict';
import { planRoundPairingEdit } from '../services/roundPairings.js';

const a = 'aaaaaaaaaaaaaaaaaaaaaaaa';
const b = 'bbbbbbbbbbbbbbbbbbbbbbbb';
const c = 'cccccccccccccccccccccccc';
const d = 'dddddddddddddddddddddddd';
const m1 = '111111111111111111111111';
const m2 = '222222222222222222222222';
const base = {
  matches: [
    { _id: m1, table: 1, player1: a, player2: b,
      result: { winner: 'player1', score1: 2, score2: 0 }, resultRevision: 2 },
    { _id: m2, table: 2, player1: c, player2: d, result: null, resultRevision: 0 },
  ],
};
const request = [
  { matchId: m1, table: 1, player1: a, player2: c },
  { matchId: m2, table: 2, player1: b, player2: d },
];

test('swapping players requires explicit result clearance and preserves an untouched match', () => {
  assert.throws(() => planRoundPairingEdit(base, request), { code: 'RESULTS_REQUIRE_CLEAR' });
  const edited = planRoundPairingEdit(base, request, true);
  assert.equal(edited.clearedResults, 1);
  assert.equal(edited.matches[0].result, null);
  assert.equal(edited.matches[0].resultRevision, 3);
  assert.equal(edited.matches[1].player1, b);
});

test('renumbering tables keeps saved scores and match identities', () => {
  const edited = planRoundPairingEdit(base, [
    { matchId: m1, table: 2, player1: a, player2: b },
    { matchId: m2, table: 1, player1: c, player2: d },
  ]);
  assert.equal(edited.clearedResults, 0);
  assert.equal(edited.matches.find(m => m._id === m1).result.score1, 2);
  assert.equal(edited.matches.find(m => m._id === m1).resultRevision, 2);
});

test('forbids duplicated players and missing matches', () => {
  assert.throws(() => planRoundPairingEdit(base, [
    { matchId: m1, table: 1, player1: a, player2: a }, request[1],
  ], true), { code: 'INVALID_PAIRINGS' });
  assert.throws(() => planRoundPairingEdit(base, [request[0], request[0]], true),
    { code: 'INVALID_PAIRINGS' });
});

test('moving the bye keeps a valid automatic bye result', () => {
  const odd = { matches: [
    { _id: m1, table: 1, player1: a, player2: b, result: null },
    { _id: m2, table: 2, player1: c, player2: null,
      result: { winner: 'bye', score1: 0, score2: 0, drawnGames: 0 } },
  ] };
  const edited = planRoundPairingEdit(odd, [
    { matchId: m1, table: 1, player1: a, player2: c },
    { matchId: m2, table: 2, player1: b, player2: null },
  ]);
  assert.equal(edited.matches[0].result, null);
  assert.equal(edited.matches[1].result.winner, 'bye');
  assert.equal(edited.matches[1].player1, b);
});
