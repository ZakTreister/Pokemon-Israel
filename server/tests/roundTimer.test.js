import test from 'node:test';
import assert from 'node:assert/strict';
import {
  changeRoundTimer, createRoundTimer, readRoundTimer,
  remainingRoundSeconds, roundsWithStoppedTimer,
} from '../services/roundTimer.js';

const time = iso => new Date(iso);

test('a new round timer is ready, not automatically started by pairing', () => {
  const timer = createRoundTimer();
  assert.equal(timer.status, 'ready');
  assert.equal(timer.startedAt, null);
  assert.equal(timer.remainingSeconds, 3000);
  assert.deepEqual(readRoundTimer({}), timer);
});

test('start, pause, resume and expiry derive time from server timestamps', () => {
  const t0 = time('2026-11-24T10:00:00Z');
  const started = changeRoundTimer(createRoundTimer(600), 'start', undefined, t0);
  assert.equal(started.status, 'running');
  assert.equal(started.version, 1);
  assert.equal(remainingRoundSeconds(started, time('2026-11-24T10:01:12Z')), 528);
  const paused = changeRoundTimer(started, 'pause', undefined, time('2026-11-24T10:01:12Z'));
  assert.equal(paused.status, 'paused');
  assert.equal(paused.remainingSeconds, 528);
  assert.equal(remainingRoundSeconds(paused, time('2026-11-24T10:20:00Z')), 528);
  const resumed = changeRoundTimer(paused, 'start', undefined, time('2026-11-24T10:20:00Z'));
  assert.equal(remainingRoundSeconds(resumed, time('2026-11-24T10:28:48Z')), 0);
  const expired = changeRoundTimer(resumed, 'pause', undefined, time('2026-11-24T10:28:49Z'));
  assert.equal(expired.status, 'finished');
  assert.equal(expired.remainingSeconds, 0);
});

test('duration may be changed while paused; reset is manual', () => {
  const set = changeRoundTimer(createRoundTimer(), 'configure', 90 * 60 + 5);
  assert.equal(set.durationSeconds, 5405);
  assert.equal(set.remainingSeconds, 5405);
  assert.equal(set.status, 'ready');
  assert.equal(set.version, 1);
  const reset = changeRoundTimer({ ...set, status: 'paused', remainingSeconds: 15 }, 'reset');
  assert.equal(reset.remainingSeconds, 5405);
  assert.equal(reset.status, 'ready');
  assert.equal(reset.version, 2);
  assert.throws(() => changeRoundTimer(set, 'configure', 0), /להגדיר/);
  assert.throws(() => changeRoundTimer(set, 'configure', 10801), /להגדיר/);
  assert.throws(() => changeRoundTimer(set, 'configure', 12.5), /להגדיר/);
});

test('cannot silently restart, configure or reset a running timer', () => {
  const started = changeRoundTimer(createRoundTimer(), 'start');
  assert.throws(() => changeRoundTimer(started, 'start'), /הפעלה מחדש/);
  assert.throws(() => changeRoundTimer(started, 'configure', 900), /לעצור/);
  assert.throws(() => changeRoundTimer(started, 'reset'), /לעצור/);
  assert.throws(() => changeRoundTimer(createRoundTimer(), 'pause'), /אינו פועל/);
  assert.throws(() => changeRoundTimer(createRoundTimer(), 'invalid'), /לא חוקית/);
});

test('new round freezes old running clock without restarting the next one', () => {
  const started = changeRoundTimer(createRoundTimer(1200), 'start', undefined,
    time('2026-11-24T10:00:00Z'));
  const original = {number:1, timer:started, matches:[]};
  const prepared = roundsWithStoppedTimer([original], time('2026-11-24T10:02:00Z'));
  assert.equal(prepared[0].timer.status, 'paused');
  assert.equal(prepared[0].timer.remainingSeconds, 1080);
  assert.equal(prepared[0].timer.version, 2);
  assert.equal(original.timer.status, 'running', 'do not mutate stored round');
  const next = createRoundTimer(prepared[0].timer.durationSeconds);
  assert.equal(next.status, 'ready');
  assert.equal(next.remainingSeconds, 1200);
});
