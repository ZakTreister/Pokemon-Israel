import test from 'node:test';
import assert from 'node:assert/strict';
import { buildNationalRanking, normalizeRankingName } from '../services/nationalRankings.js';

const history = [
  { _id: 'a', playerName: 'לביא אדר', points: 103, tournaments: 7, isAllStars: true },
  { _id: 'b', playerName: 'מיכאל הורוביץ', points: 74, tournaments: 6, isAllStars: false },
  { _id: 'c', playerName: 'נטע הורנמן', points: 57, tournaments: 7, isAllStars: false, player: 'player-x' },
  { _id: 'd', playerName: 'עומר גוהרי', points: 62, tournaments: 6, isAllStars: true },
];

test('all-stars are excluded by default and added back at their true ranks', () => {
  const defaultRows = buildNationalRanking(history, []).rankings;
  assert.deepEqual(defaultRows.map(r => r.playerName), ['מיכאל הורוביץ', 'נטע הורנמן']);
  assert.deepEqual(defaultRows.map(r => r.position), [1, 2]);
  const included = buildNationalRanking(history, [], { includeAllStars: true }).rankings;
  assert.equal(included.length, 4);
  assert.equal(included[0].playerName, 'לביא אדר');
  assert.equal(included[0].isAllStars, true);
  assert.equal(included[0].position, 1);
});

test('a reviewed Player link adds new tournaments to the historical aggregate once', () => {
  const result = buildNationalRanking(history, [
    { playerId: 'player-x', playerKind: 'player', points: 10, position: 3 },
  ]);
  assert.equal(result.rankings.find(r => r.playerName === 'נטע הורנמן').points, 67);
  assert.equal(result.rankings.find(r => r.playerName === 'נטע הורנמן').tournaments, 8);
});

test('name alone never merges an unverified new player with an imported row', () => {
  const result = buildNationalRanking(history, [
    { playerId: 'different-id', playerKind: 'player', playerName: 'מיכאל הורוביץ', points: 8 },
  ]);
  assert.equal(result.total, 3);
});

test('search and pagination are applied server-side without renumbering canonical ranks', () => {
  const searched = buildNationalRanking(history, [], { includeAllStars: true, search: ' הורו ', pageSize: 1 });
  assert.equal(searched.total, 1);
  assert.equal(searched.rankings[0].position, 2);
  assert.equal(normalizeRankingName('  נטע   הורנמן '), 'נטע הורנמן');
  const paged = buildNationalRanking(history, [], { includeAllStars: true, page: 2, pageSize: 2 });
  assert.equal(paged.totalPages, 2);
  assert.equal(paged.rankings.length, 2);
  assert.deepEqual(paged.rankings.map(r => r.position), [3,4]);
});

test('equal points share position and later positions skip ranks', () => {
  const result = buildNationalRanking([
    { _id: '1', playerName: 'א', points: 9, tournaments: 1 },
    { _id: '2', playerName: 'ב', points: 9, tournaments: 1 },
    { _id: '3', playerName: 'ג', points: 8, tournaments: 1 },
  ], []);
  assert.deepEqual(result.rankings.map(r => r.position), [1,1,3]);
});