import test from 'node:test';
import assert from 'node:assert/strict';
import { splitHistoricalPlayerName, planHistoricalPlayers } from '../services/historicalPlayerImport.js';
import { HISTORICAL_RANKING_SOURCE } from '../services/nationalRankings.js';
const row = (name, isAllStars = false) => ({ source: HISTORICAL_RANKING_SOURCE,
  normalizedName: name, playerName: name, points: 10, tournaments: 2, isAllStars });
const player = (_id, firstName, lastName, playerType = 'quarterly') =>
  ({ _id, firstName, lastName, playerType });

test('splits names while flagging compound names for review', () => {
  assert.deepEqual(splitHistoricalPlayerName('לביא אדר'), { firstName:'לביא', lastName:'אדר', reviewSuggested:false });
  assert.deepEqual(splitHistoricalPlayerName('דוד שמואל יעקובוביץ', {firstName:'דוד שמואל', lastName:'יעקובוביץ'}),
    {firstName:'דוד שמואל', lastName:'יעקובוביץ', reviewSuggested:true});
});
test('links unique existing All-Stars and never creates a new unassigned team player', () => {
  const result = planHistoricalPlayers([row('לביא אדר', true), row('גור בורדייניק', true)],
    [player('p1', 'לביא','אדר','team')]);
  assert.equal(result[0].state, 'name-candidate');
  assert.equal(result[0].player._id, 'p1');
  assert.equal(result[1].state, 'blocked');
});
test('creates missing regular Players with unknown city and no invented birth year', () => {
  const [item] = planHistoricalPlayers([row('מיכאל הורוביץ')], []);
  assert.equal(item.state, 'create-quarterly');
  assert.equal(item.firstName, 'מיכאל');
  assert.equal(item.lastName, 'הורוביץ');
});
test('ambiguous matches are blocked; reviewed explicit ID can resolve', () => {
  const players = [player('p1','נטע','הורנמן'), player('p2','נטע','הורנמן')];
  assert.equal(planHistoricalPlayers([row('נטע הורנמן')], players)[0].state, 'blocked');
  assert.equal(planHistoricalPlayers([row('נטע הורנמן')], players, [], {
    'נטע הורנמן': { playerId: 'p2' },
  })[0].player._id, 'p2');
});
test('existing linked Player survives a name change', () => {
  const [item] = planHistoricalPlayers([row('ספיר ?')], [player('p9','ספיר','כהן')],
    [{normalizedName:'ספיר ?',player:'p9'}]);
  assert.equal(item.player._id, 'p9');
});