import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calendarDate,
  validateBirthDate,
  playerAge,
  profileFields,
} from '../services/playerProfile.js';
test('date-only age calculations respect birthdays, leap dates and Jerusalem calendar midnight', () => {
  assert.equal(playerAge('2016-10-13', '2026-10-12'), 9);
  assert.equal(playerAge('2016-10-13', '2026-10-13'), 10);
  assert.equal(playerAge('2016-10-13', '2026-10-14'), 10);
  assert.equal(playerAge('2016-02-29', '2026-02-28'), 9);
  assert.equal(playerAge('2016-02-29', '2026-03-01'), 10);
  assert.equal(playerAge(''), undefined);
  assert.equal(calendarDate(new Date('2026-10-12T22:30:00Z')), '2026-10-13');
});
test('profile fields are optional, clearable and bounded; future/impossible/non-date births fail', () => {
  assert.deepEqual(profileFields({}), {});
  assert.deepEqual(profileFields({ description: '', dateOfBirth: null }), {
    description: '',
    dateOfBirth: '',
  });
  assert.equal(
    profileFields({ description: 'a'.repeat(500) }).description.length,
    500,
  );
  assert.throws(() => profileFields({ description: 'a'.repeat(501) }));
  assert.throws(() => profileFields({ description: { html: 'x' } }));
  for (const value of [
    '2026-02-30',
    '2026-02-29',
    '2999-01-01',
    '2016-10-13T00:00:00Z',
    123,
  ])
    assert.throws(() => validateBirthDate(value, '2026-10-13'));
  assert.equal(validateBirthDate('2024-02-29', '2026-10-13'), '2024-02-29');
});

test('join date and compact Pokemon names use date-only validation and normalized domain values', () => {
  assert.deepEqual(
    profileFields({
      joinedAt: '2020-01-01',
      pokemon: [' Iron   Hands ', 'Pikachu'],
    }),
    { joinedAt: '2020-01-01', pokemon: ['Iron Hands', 'Pikachu'] },
  );
  for (const input of [
    { joinedAt: '2999-01-01' },
    { pokemon: Array(7).fill('Pikachu') },
    { pokemon: ['Mr. Mime'] },
    { pokemon: ['Pikachu1'] },
    { pokemon: ['פיקאצ׳ו'] },
  ])
    assert.throws(() => profileFields(input));
  assert.deepEqual(profileFields({ joinedAt: '', pokemon: [] }), {
    joinedAt: '',
    pokemon: [],
  });
});
