# Live round timers — staff management (2026-11-24)

## Scope and behavior
- One shared `RoundTimer` UI is used in the **inter-team encounter** and **regular/club Swiss tournament** management screens. Internal one-team tournaments are unchanged.
- Every created round gets a server-persisted clock initially **ready and stopped**. Drawing pairings **never** starts it.
- Staff can start, pause, resume, reset (only when stopped), and configure the clock from 1 second to 180 minutes (only when stopped). A new round inherits the preceding round's configured duration but remains ready until staff explicitly start it.
- Expiry displays **00:00 / הזמן הסתיים** but never advances/closes the round or changes results. Staff can reset after pausing an expired running timer.
- The timer appears above managed match tables and expands independently to a full-viewport overlay. The existing editable full-screen match presentation still works; Esc or the collapse icon closes the timer overlay.
- The UI derives remaining seconds from server-issued start timestamps plus a measured clock offset; it does not rely on a background browser interval for authoritative time.
- All clock actions are server persisted. The current clock synchronizes to other staff via the already-authenticated tournament Socket.IO room (`tournament:timer:updated`) and reconciles over HTTP on mount and every 15 seconds.
- Timer commands do not update the tournament structural revision, and the `roundTimers` Map is stored separately from `rounds`. Result/pairing writes that replace round arrays cannot overwrite running clocks.
- Each round owns its own timer state and monotonically increasing version. The server rejects stale timer actions, non-staff access, completed tournaments, and attempts to change clocks for non-current rounds. On next-round generation or tournament close, the old timer is frozen if still running. A cancelled round's old map entry is replaced on a new round with the same number.
- Public tournament pages are **not** subscribed to staff timer events.

## Staff HTTP API
Both routes accept only authenticated judges/admins:
- `GET /api/inter-team/:id/rounds/:roundNumber/timer`
- `PUT /api/inter-team/:id/rounds/:roundNumber/timer`
- `GET /api/tournaments/:id/round-management/rounds/:roundNumber/timer`
- `PUT /api/tournaments/:id/round-management/rounds/:roundNumber/timer`

PUT: `{ "action": "start" | "pause" | "reset" | "configure", "expectedTimerVersion": number, "durationSeconds"?: number }`.
The response carries `roundNumber`, the canonical `timer` snapshot and `serverTime` (ISO 8601). The `configure` action requires valid `durationSeconds`. The server rejects conflicting versions with HTTP 409. No score entry or next-round endpoint accepts implicit timer start.

## Verification
- `server/tests/roundTimer.test.js` checks stopped initialization, timestamps across pause/resume, expiry, configurable duration, restrictions while running, and freezing the preceding clock.
- Manual smoke test: run two judges in separate browsers; draw round 1, verify 50:00 stopped on both; start on one, verify both count down; pause, configure and resume from the other; expand the timer while match scores update; refresh; finish scores, draw the next round and verify its clock is stopped and inherits duration.
