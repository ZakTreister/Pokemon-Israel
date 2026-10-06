# Stage A implementation

## Domain and compatibility

New internal tournaments use `type: team_internal`, `engineVersion: swiss-v1`,
`team`, and `playerParticipants[].player`. Legacy `participants.user` and
`results.player` (User references) are preserved. The legacy tournament routes
exclude the new engine from both reads and mutations. Existing records without
an engine version retain their existing behavior, including legacy internal
records. New team children have `user: null`; existing linked Users remain intact.
Team mutations no longer consult badge Seasons.

All staff use `/manage`; existing `/admin` URLs redirect into that area.
Judges can manage teams, load children, and run/import internal tournaments.
Admin-only legacy tools and badges remain behind backend role authorization.
Public team endpoints expose names, cities, roster IDs and real counts, without
staff identities, User links, or lock data. There are no new child-login CTAs.

## Persisted Swiss workflow

Create a tournament from the active team roster, adjust attendance while in
`setup`, then create rounds. Every mutation carries `expectedRevision`. A single
Mongo `findOneAndUpdate` compares the revision and increments it atomically.
A conflict returns HTTP 409 / `STALE_REVISION`; clients reload and require a retry.
This covers results, attendance, pairings and closure, without transactions or a
replica set. Two judges cannot start the same round from the same revision.

Results select a winner or draw before a Bo3 score. Wins support 2–0, 2–1 and
1–0 (and reverse scores); draws support 0–0 and 1–1. Optional drawn-game counts
allow accurate GWP/OGP when games themselves ended in draws; no more than three
games can be recorded. Missing results block pairing and closure.

Correcting an earlier result requires explicit `invalidateLaterRounds: true`.
Later rounds are removed from current play and archived with actor/time/reason;
new pairings are calculated from the corrected state. Unchanged results do not
invalidate rounds. Completed tournaments are immutable and retain participants,
rounds, final standings and closure metadata. Reloading uses server state only.

Roster operations acquire team document leases in sorted ID order, release them
in `finally`, and compare the original Player membership when transferring.
Leases expire after 60 seconds to recover from process failure. Roster changes,
team deactivation, child loading and roster snapshots share these locks.

## Scoring policy

The product specs name the tie-breakers without specifying formulas. Stage A
records the explicit policy `swiss-3-1-0-opponent-floor-1/3-v1` on tournaments:

- Match points: win 3, draw 1, loss 0. Bye: 3 match points.
- GWP: `(3 × game wins + drawn games) / (3 × games played)`.
- OMP: mean opponent match-point percentage, each floored at 1/3.
- OGP: mean opponent GWP, each floored at 1/3.
- Byes supply no games/opponent and are excluded from opponent-percentage
  denominators. Empty denominators yield zero.
- Standings compare Points, OMP, GWP, OGP, then original deterministic roster seed.
- Pairing minimizes rematches first, then point differences and rank distance.
  A bounded deterministic minimum-cost search supports up to 128 participants;
  large searches may return the best solution found within the search budget.
  Byes go to players with the fewest previous byes, then the lowest standing.

All Stars rankings sum final match points over completed new internal records.
Historical entries supply final positions and points; unknown percentages remain
null. Positions must be unique/contiguous and consistent with descending points.
Per-team rankings filter by current membership; tournament roster/name snapshots
preserve event history after transfers or renames. Regular results are separate.

## Competition cycle and statistics

The initial ongoing cycle is `stage-a-initial`; it does not advance automatically
on September 1 or on badge Season changes. A future explicit admin reset must
open a new cycle key and preserve existing records. Annual reset administration
and official inter-team competition are intentionally outside Stage A.

Homepage cards show up to four active teams, active roster count and completed
internal tournament count. `officialStats: null` reserves space for future real
inter-team standings; internal results never supply team rank or win percentage.

## Verification

`npm run test:stage-a` uses Node's test runner and standalone MongoDB. The HTTP
integration suite mounts actual routes and creates a randomly named isolated
test database. Teardown drops only that database. By default Mongo is at
`mongodb://127.0.0.1:27017`; `STAGE_A_TEST_MONGO_URI` can override the server, but
cannot override the randomly selected test database. Tests cover Bo3 and Swiss
formulas, pairings/byes, role enforcement, roster operations without child Users,
concurrent transitions, correction, closure, restart recovery, historical entry,
rankings independent of Seasons, and legacy User tournament compatibility.

Required repository checks remain `npm run lint` and `npm run build`.

A supplemental `tsc --noEmit --project tsconfig.app.json` check still reports
pre-existing legacy type errors (Button child cloning, incomplete Tournament
interfaces, legacy admin form defaults, and API logging). These were reproduced
against the unchanged baseline commit; Stage A adds no TypeScript diagnostics.
The configured Vite build transpiles successfully. Existing duplicate Deck index
warnings remain unrelated to Stage A. Player/User index initialization was fixed
by using Mongo's `objectId` type alias and removing the conflicting redundant
username index declaration, preserving the unique indexes and legacy data.
