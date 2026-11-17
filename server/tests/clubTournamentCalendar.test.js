import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clubDateKey,
  clubRegistrationOpen,
  tournamentLifecycle,
  isClubTournament,
} from '../../shared/tournamentDomain.js';

const date = new Date('2026-11-17T12:00:00.000Z');
const club = { type: 'quarterly', engineVersion: null, date, status: 'upcoming' };

test('club event is all-day and remains upcoming on the entire Israel calendar date', () => {
  assert.equal(clubDateKey(date), '2026-11-17');
  for (const now of [
    new Date('2026-11-16T22:00:00.000Z'),
    new Date('2026-11-17T07:00:00.000Z'),
    new Date('2026-11-17T21:59:59.000Z'),
  ]) {
    assert.equal(tournamentLifecycle(club, now), 'upcoming');
    assert.equal(clubRegistrationOpen(club, now), true);
  }
  const after = new Date('2026-11-17T22:00:00.000Z');
  assert.equal(clubDateKey(after), '2026-11-18');
  assert.equal(tournamentLifecycle(club, after), 'active');
  assert.equal(clubRegistrationOpen(club, after), false);
  assert.equal(clubRegistrationOpen({ ...club, status: 'completed' }), false);
});

test('team and inter-team events are never treated as club events', () => {
  for (const type of ['team_internal', 'inter_team']) {
    const event = { ...club, type };
    assert.equal(isClubTournament(event), false);
    assert.equal(clubRegistrationOpen(event), false);
  }
});
