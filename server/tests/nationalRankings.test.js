import test from 'node:test';
import assert from 'node:assert/strict';
import { buildNationalRanking, normalizeRankingName, regularTournamentFilter, HISTORICAL_CUTOFF } from '../services/nationalRankings.js';

const history = [
  { _id: 'a', playerName: 'שחקן א', points: 103, tournaments: 7, isAllStars: true },
  { _id: 'b', playerName: 'שחקן ג', points: 74, tournaments: 6, isAllStars: false },
  { _id: 'c', playerName: 'שחקן ד', points: 57, tournaments: 7, isAllStars: false, player: 'player-x' },
  { _id: 'd', playerName: 'שחקן ה', points: 62, tournaments: 6, isAllStars: true },
];

test('all-stars are excluded by default and added back at their true ranks', () => {
  const defaultRows = buildNationalRanking(history, []).rankings;
  assert.deepEqual(defaultRows.map(r => r.playerName), ['שחקן ג', 'שחקן ד']);
  assert.deepEqual(defaultRows.map(r => r.position), [1, 2]);
  const included = buildNationalRanking(history, [], { includeAllStars: true }).rankings;
  assert.equal(included.length, 4);
  assert.equal(included[0].playerName, 'שחקן א');
  assert.equal(included[0].isAllStars, true);
  assert.equal(included[0].position, 1);
});

test('a reviewed Player link adds new tournaments to the historical aggregate once', () => {
  const result = buildNationalRanking(history, [
    { playerId: 'player-x', playerKind: 'player', points: 10, position: 3 },
  ]);
  assert.equal(result.rankings.find(r => r.playerName === 'שחקן ד').points, 67);
  assert.equal(result.rankings.find(r => r.playerName === 'שחקן ד').tournaments, 8);
});

test('name alone never merges an unverified new player with an imported row', () => {
  const result = buildNationalRanking(history, [
    { playerId: 'different-id', playerKind: 'player', playerName: 'שחקן ג', points: 8 },
  ]);
  assert.equal(result.total, 3);
});

test('search and pagination are applied server-side without renumbering canonical ranks', () => {
  const searched = buildNationalRanking(history, [], { includeAllStars: true, search: ' ג ', pageSize: 1 });
  assert.equal(searched.total, 1);
  assert.equal(searched.rankings[0].position, 2);
  assert.equal(normalizeRankingName('  שחקן   ד '), 'שחקן ד');
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
test('national ranking query accepts only regular tournaments, not All-Stars team events', () => {
  const before = regularTournamentFilter();
  const after = regularTournamentFilter(true);
  assert.deepEqual(before, { status: 'completed', type: { $in: [null, 'quarterly'] } });
  assert.deepEqual(after, { status: 'completed', type: { $in: [null, 'quarterly'] },
    date: { $gt: HISTORICAL_CUTOFF } });
  assert.equal(before.type.$in.includes('team_internal'), false);
  assert.equal(before.type.$in.includes('inter_team'), false);
});

test('an existing All-Stars Player accumulates ordinary imported and new regular points only', () => {
  const playerId = 'team-player-1';
  const row = { _id: 'regular-baseline-1', player: playerId, playerName: 'שחקן נבחרת',
    points: 24, tournaments: 6, isAllStars: true };
  const futureRegular = { playerId, playerKind: 'player', points: 5, position: 2 };
  const regular = buildNationalRanking([row], [futureRegular], { includeAllStars: true });
  assert.equal(regular.rankings[0].points, 29);
  assert.equal(regular.rankings[0].tournaments, 7);
  assert.equal(regular.rankings[0].isAllStars, true);
  assert.equal(buildNationalRanking([row], [futureRegular]).total, 0);
});


test('rank movers compare full canonical positions before the latest tournament, before filtering or paging', () => {
  const baseline = [
    {_id:'a',playerName:'א',points:10,tournaments:1,player:'a'},
    {_id:'b',playerName:'ב',points:8,tournaments:1,player:'b'},
    {_id:'c',playerName:'ג',points:6,tournaments:1,player:'c'},
  ];
  const result = buildNationalRanking(baseline, [{playerId:'c',playerKind:'player',points:6},{playerId:'new',playerKind:'player',playerName:'חדש',points:2}], {previousTournamentRows:[],offset:1,pageSize:2});
  assert.deepEqual(result.rankings.map(row=>row.position),[2,3]);
  assert.equal(result.topMovers[0].playerName,'ג');
  assert.equal(result.topMovers[0].rankChange,2);
  assert.equal(result.topMovers.length,1);
});
test('offset supports initial two rows followed by batches without overlapping', () => {
  const rows=Array.from({length:60},(_,i)=>({_id:String(i),playerName:String(i),points:60-i,tournaments:1}));
  const initial=buildNationalRanking(rows,[],{pageSize:2,offset:0});
  const next=buildNationalRanking(rows,[],{pageSize:25,offset:2});
  assert.equal(initial.rankings.length,2);
  assert.equal(next.rankings.length,25);
  assert.equal(next.rankings[0].position,3);
  assert.equal(next.rankings[24].position,27);
});
