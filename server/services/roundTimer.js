// A persisted, independently versioned clock per tournament round.
// The clock is deliberately separate from the tournament structural revision,
// so judges can save results while a colleague starts or pauses the timer.
export const DEFAULT_ROUND_SECONDS = 50 * 60;
export const MAX_ROUND_SECONDS = 180 * 60;

export function createRoundTimer(durationSeconds = DEFAULT_ROUND_SECONDS) {
  return {
    durationSeconds,
    remainingSeconds: durationSeconds,
    status: 'ready',
    startedAt: null,
    version: 0,
  };
}

export function readRoundTimer(timer) {
  return timer
    ? {
        durationSeconds: timer.durationSeconds,
        remainingSeconds: timer.remainingSeconds,
        status: timer.status,
        startedAt: timer.startedAt ?? null,
        version: timer.version ?? 0,
      }
    : createRoundTimer();
}

export function remainingRoundSeconds(timer, now = new Date()) {
  if (timer.status !== 'running' || !timer.startedAt) return timer.remainingSeconds;
  const elapsed = Math.max(0, (now.getTime() - new Date(timer.startedAt).getTime()) / 1000);
  return Math.max(0, timer.remainingSeconds - elapsed);
}

export function changeRoundTimer(timer, action, durationSeconds, now = new Date()) {
  if (!['start', 'pause', 'reset', 'configure'].includes(action))
    throw new Error('פעולת טיימר לא חוקית');
  if (action === 'configure') {
    if (!Number.isInteger(durationSeconds) || durationSeconds < 1 || durationSeconds > MAX_ROUND_SECONDS)
      throw new Error('יש להגדיר משך זמן בין שנייה אחת לשלוש שעות');
  }
  if (action === 'start') {
    if (timer.status === 'running' || remainingRoundSeconds(timer, now) <= 0)
      throw new Error('יש לעצור או לאפס את הטיימר לפני הפעלה מחדש');
    return { ...timer, status: 'running', startedAt: now, version: timer.version + 1 };
  }
  if (action === 'pause') {
    if (timer.status !== 'running') throw new Error('הטיימר אינו פועל');
    const remainingSeconds = remainingRoundSeconds(timer, now);
    return {
      ...timer,
      remainingSeconds,
      status: remainingSeconds <= 0 ? 'finished' : 'paused',
      startedAt: null,
      version: timer.version + 1,
    };
  }
  if (timer.status === 'running')
    throw new Error('יש לעצור את הטיימר לפני שינוי או איפוס');
  const duration = action === 'configure' ? durationSeconds : timer.durationSeconds;
  return { ...createRoundTimer(duration), version: timer.version + 1 };
}

// Freeze the old clock at a round transition without rewriting match rows.
export function stopRoundTimer(timer, now = new Date()) {
  if (timer.status !== 'running') return readRoundTimer(timer);
  const remainingSeconds = remainingRoundSeconds(timer, now);
  return {
    ...readRoundTimer(timer),
    remainingSeconds,
    startedAt: null,
    status: remainingSeconds <= 0 ? 'finished' : 'paused',
    version: (timer.version ?? 0) + 1,
  };
}
