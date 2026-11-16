import test from 'node:test';
import assert from 'node:assert/strict';
import { splitHistoricalPlayerName, planHistoricalPlayers } from '../services/historicalPlayerImport.js';
import { HISTORICAL_RANKING_SOURCE } from '../services/nationalRankings.js';
const row = (name, isAllStars = false) => ({ source: HISTORICAL_RANKING_SOURCE,
  normalizedName: name, playerName: name, points: 10, tournaments: 2, isAllStars });
const player = (_id, firstName, lastName, playerType = 'quarterly') =>
  ({ _id, firstName, lastName, playerType });

test('splits names while flagging compound names for review', () => {
  assert.deepEqual(splitHistoricalPlayerName('שחקן א'), { firstName:'שחקן', lastName:'א', reviewSuggested:false });
  assert.deepEqual(splitHistoricalPlayerName('ילד שני משפחה', {firstName:'ילד שני', lastName:'משפחה'}),
    {firstName:'ילד שני', lastName:'משפחה', reviewSuggested:true});
});
test('links unique existing All-Stars and never creates a new unassigned team player', () => {
  const result = planHistoricalPlayers([row('שחקן א', true), row('שחקן ב', true)],
    [player('p1', 'שחקן','א','team')]);
  assert.equal(result[0].state, 'name-candidate');
  assert.equal(result[0].player._id, 'p1');
  assert.equal(result[1].state, 'blocked');
});
test('creates missing regular Players with unknown city and no invented birth year', () => {
  const [item] = planHistoricalPlayers([row('שחקן ג')], []);
  assert.equal(item.state, 'create-quarterly');
  assert.equal(item.firstName, 'שחקן');
  assert.equal(item.lastName, 'ג');
});
test('ambiguous matches are blocked; reviewed explicit ID can resolve', () => {
  const players = [player('p1','שחקן','ד'), player('p2','שחקן','ד')];
  assert.equal(planHistoricalPlayers([row('שחקן ד')], players)[0].state, 'blocked');
  assert.equal(planHistoricalPlayers([row('שחקן ד')], players, [], {
    'שחקן ד': { playerId: 'p2' },
  })[0].player._id, 'p2');
});
test('existing linked Player survives a name change', () => {
  const [item] = planHistoricalPlayers([row('שם ?')], [player('p9','שם','משפחה')],
    [{normalizedName:'שם ?',player:'p9'}]);
  assert.equal(item.player._id, 'p9');
});