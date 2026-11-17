import test from 'node:test';
import assert from 'node:assert/strict';
import { splitHistoricalPlayerName, planHistoricalPlayers, historicalLegacyUserIds } from '../services/historicalPlayerImport.js';
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

test('reuses existing regular Player rather than creating a duplicate', () => {
  const existingRegular = player('regular-17', 'שחקן', 'דוגמה', 'quarterly');
  const [entry] = planHistoricalPlayers([row('שחקן דוגמה')], [existingRegular]);
  assert.equal(entry.state, 'name-candidate');
  assert.equal(entry.player._id, existingRegular._id);
});

test('takes exact firstName/lastName columns from split source CSV', () => {
  const splitRow = { ...row('שם כפול משפחה'), firstName: 'שם כפול', lastName: 'משפחה' };
  const [entry] = planHistoricalPlayers([splitRow], []);
  assert.equal(entry.firstName, 'שם כפול');
  assert.equal(entry.lastName, 'משפחה');
  assert.equal(entry.reviewSuggested, true);
});

test('a confirmed first-name-only historical record retains blank lastName', () => {
  assert.throws(() => splitHistoricalPlayerName('שם'), /Cannot split historical name/);
  assert.deepEqual(splitHistoricalPlayerName('שם', { firstName: 'שם', lastName: '' }),
    { firstName: 'שם', lastName: '', reviewSuggested: false });
  const sourceRow = { ...row('שם'), firstName: 'שם', lastName: '' };
  const [entry] = planHistoricalPlayers([sourceRow], []);
  assert.equal(entry.state, 'create-quarterly');
  assert.equal(entry.firstName, 'שם');
  assert.equal(entry.lastName, '');
  assert.equal(entry.reviewSuggested, false);
});

test('unlinked legacy player User matching a missing regular Player blocks creation', () => {
  const source = row('שחקן דוגמה');
  const legacyUsers = [{ _id: 'legacy-u1', name: 'שחקן דוגמה', player: null }];
  const [entry] = planHistoricalPlayers([source], [], [], {}, legacyUsers);
  assert.equal(entry.state, 'blocked');
  assert.match(entry.issue, /legacy player User/);
});

test('verified Player / User linkage does not block a matched canonical Player', () => {
  const source = row('שחקן דוגמה');
  const existingPlayer = { ...player('existing-1', 'שחקן', 'דוגמה'), user: 'legacy-u1' };
  const legacyUsers = [{ _id: 'legacy-u1', name: 'שחקן דוגמה', player: 'existing-1' }];
  const [entry] = planHistoricalPlayers([source], [existingPlayer], [], {}, legacyUsers);
  assert.equal(entry.state, 'name-candidate');
  assert.equal(entry.player._id, 'existing-1');
});

test('legacy User-to-Player link is retained even if Player.user is null', () => {
  const p = player('canonical-player-id', 'שחקן', 'דוגמה');
  const users = [{ _id: 'user-id', player: 'canonical-player-id', name: 'שחקן דוגמה' }];
  assert.deepEqual(historicalLegacyUserIds(p, users), ['user-id']);
  const [entry] = planHistoricalPlayers([row('שחקן דוגמה')], [p], [], {}, users);
  assert.equal(entry.state, 'name-candidate');
});

test('conflicting legacy User references block historical player reconciliation', () => {
  const p = { ...player('canonical-player-id', 'שחקן', 'דוגמה'), user: 'user-a' };
  const users = [{ _id: 'user-b', player: p._id, name: 'שחקן דוגמה' }];
  const [entry] = planHistoricalPlayers([row('שחקן דוגמה')], [p], [], {}, users);
  assert.equal(entry.state, 'blocked');
  assert.match(entry.issue, /Conflicting canonical Player/);
});
