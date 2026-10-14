import test from 'node:test';
import assert from 'node:assert/strict';
import { encounterBalance } from '../services/overview.js';
const teams = [
  { id: 'a', name: 'אש' },
  { id: 'b', name: 'ברק' },
  { id: 'c', name: 'כוכב' },
];
test('team meeting comparison requires authoritative year/count data and retains zero-count teams', () => {
  assert.deepEqual(encounterBalance(teams, null), { status: 'unavailable' });
  assert.deepEqual(encounterBalance(teams, { counts: [] }), {
    status: 'unavailable',
  });
  assert.deepEqual(
    encounterBalance(teams, { competitionYear: 'official-year', counts: [] }),
    { status: 'equal', competitionYear: 'official-year', count: 0, maximum: 0 },
  );
  const source = {
    competitionYear: 'official-year',
    counts: [
      { teamId: 'a', count: 3 },
      { teamId: 'b', count: 3 },
      { teamId: 'c', count: 3 },
      { teamId: 'inactive', count: 100 },
    ],
  };
  assert.equal(
    encounterBalance(teams, source).count,
    3,
    'inactive/other teams never establish the maximum',
  );
  source.counts = [
    { teamId: 'a', count: 4 },
    { teamId: 'b', count: 2 },
  ];
  assert.deepEqual(encounterBalance(teams, source).lagging, [
    { id: 'c', name: 'כוכב', gap: 4 },
    { id: 'b', name: 'ברק', gap: 2 },
  ]);
  assert.deepEqual(
    teams.map((team) => team.id),
    ['a', 'b', 'c'],
  );
  assert.deepEqual(
    encounterBalance(teams, {
      competitionYear: 'official-year',
      counts: [{ teamId: 'a', count: -1 }],
    }),
    { status: 'unavailable' },
  );
});

test('internal meeting year uses Jerusalem September boundaries, including the UTC date before rollover', async () => {
  const { teamMeetingYear } = await import('../services/overview.js');
  const before = teamMeetingYear(new Date('2026-08-31T20:59:59.999Z'));
  const after = teamMeetingYear(new Date('2026-08-31T21:00:00.000Z'));
  assert.equal(before.competitionYear, '2025-2026');
  assert.equal(after.competitionYear, '2026-2027');
  assert.equal(after.start.toISOString(), '2026-08-31T21:00:00.000Z');
  assert.equal(after.end.toISOString(), '2027-08-31T21:00:00.000Z');
  assert.equal(
    teamMeetingYear(new Date('2027-01-01T12:00:00Z')).competitionYear,
    '2026-2027',
  );
  assert.deepEqual(
    encounterBalance([], { competitionYear: '2026-2027', counts: [] }),
    { status: 'empty', competitionYear: '2026-2027' },
  );
});
