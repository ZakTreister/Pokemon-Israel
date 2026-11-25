import test from 'node:test';
import assert from 'node:assert/strict';
import {nationalRankingFreshness,leagueRankingFreshness} from '../services/rankingFreshness.js';
const historic=[{updatedAt:'2026-11-18T12:00:00Z'}];
const fixture={_id:'a',title:'Club',date:'2026-11-20T12:00:00Z',updatedAt:'2026-11-22T10:00:00Z',results:[{player:'p'}]};
test('historical import timestamp and tournament coverage month are independent',()=>{
 assert.deepEqual(nationalRankingFreshness(historic,[]),{lastUpdatedAt:'2026-11-18T12:00:00.000Z',resultsThrough:{date:'2026-07',precision:'month',title:'אליפות ישראל'}});
 assert.deepEqual(nationalRankingFreshness([],[]),{lastUpdatedAt:null,resultsThrough:null});
});
test('latest included tournament date is independent of latest source edit, archived results never extend coverage',()=>{
 const earlier={...fixture,_id:'b',date:'2026-11-19T12:00:00Z',updatedAt:'2026-11-25T10:00:00Z'};
 const empty={...fixture,_id:'c',date:'2026-12-01',updatedAt:'2026-12-02',results:[]};
 const removed={...fixture,_id:'d',date:'2026-11-24',deletedAt:'2026-11-26T10:00:00Z'};
 const rows=[fixture,earlier,empty,removed];
 const expected={lastUpdatedAt:'2026-11-26T10:00:00.000Z',resultsThrough:{date:'2026-11-20T12:00:00.000Z',precision:'day',title:'Club'}};
 assert.deepEqual(nationalRankingFreshness(historic,rows),expected);
 assert.deepEqual(nationalRankingFreshness(historic,rows),expected,'reading does not change the date');
 assert.equal(leagueRankingFreshness([]),null);
 assert.equal(leagueRankingFreshness([fixture,removed]),expected.lastUpdatedAt);
});
