# Stage A implementation

## Domain and compatibility

Teams gain an optional legacy-compatible staff `teacher` reference that should be
populated for active teams through management. New team creation requires an
eligible teacher whose User role is `admin` or `judge`; teacher changes are
admin-only. The relation does not change authorization roles. Existing teams
without a teacher remain readable until assigned.

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
`setup`, then create rounds.

Concurrency is split by mutation scope.

Structural tournament mutations carry `expectedRevision` and use the tournament
revision as an atomic compare-and-swap guard. This includes attendance changes,
round creation/cancellation, tournament closure, and corrections to earlier
rounds that invalidate downstream rounds. Two judges cannot perform the same
structural transition from one revision.

Ordinary match-result saves use per-match optimistic concurrency instead. Each
match carries a result/version counter (for example `resultRevision`), and a
result save compares the expected version of that specific match. A successful
save may still increment the tournament revision for canonical snapshots/live
notifications, but that new tournament revision must not make untouched sibling
match drafts stale. Different matches may therefore be saved concurrently while
concurrent edits to the same match conflict cleanly.

All writes remain atomic on standalone MongoDB without requiring transactions or
a replica set.

Results select a winner or draw before a Bo3 score. Wins support 2–0, 2–1 and
1–0 (and reverse scores); draws support 0–0 and 1–1. Optional drawn-game counts
allow accurate GWP/OGP when games themselves ended in draws; no more than three
games can be recorded. Missing results block pairing and closure.

Round 1 is randomized server-side rather than derived from roster/alphabetical
seed order. The randomized pairings (and randomized round-1 bye when needed) are
persisted as the created round and are not regenerated on refresh/reconnect.
From round 2 onward, the normal Swiss standings/rematch/bye rules apply. The
random source should be injectable/mockable for deterministic automated tests.

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

All Stars team-player rankings are **per team** and sum final match points over
completed internal records for that team. Historical entries supply final
positions and points; unknown percentages remain null. Positions must be
unique/contiguous and consistent with descending points. Tournament
roster/name snapshots preserve event history after transfers or renames.
Do not calculate or expose an overall cross-team individual All Stars ranking.
Regular results are separate.

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


## October 2026 Stage A corrections

Management now has one all-type tournament list at `/manage/tournaments`.
Team details/history/manual entry live under `/manage/teams/:id`, with legacy
URLs redirected to their new context. The first menu item is Overview for both
staff roles. The mobile menu has explicit open/close controls and closes on
navigation. Existing regular creation/results tools are reused rather than
reimplemented. Season controls are reused exclusively inside Badges; closing a
badge Season no longer creates team roster snapshots. Old snapshot documents
and optional legacy Tournament.season values remain readable, but new events
ignore the Season field and no ranking query uses it.

Tournament deletion remains admin-only, but the normal delete flow is now soft
delete by default. A soft-deleted tournament is retained with deletion metadata
(for example `deletedAt` and `deletedBy`), excluded from normal management and
public queries, excluded immediately from rankings/statistics/counts, and ignored
by open/live tournament uniqueness checks. Normal tournament mutations reject
soft-deleted records.

The confirmation dialog also offers an explicit permanent-delete option, which is
unchecked by default. When the admin explicitly opts into permanent deletion, the
canonical tournament and its embedded matches/results/archives are physically
removed. Judges cannot delete. Existing CAS/concurrency protection must prevent
a stale mutation from reviving either a soft-deleted or permanently deleted
tournament. No restore UI is required in the current iteration, but soft-deleted
records retain enough data for future recovery/audit.

The existing Socket.IO server authenticates staff with the existing JWT, but
Socket.IO is scoped only to the operational management screen of a live
tournament. While that screen is mounted, clients join one validated internal
tournament room and receive notifications only after successful canonical
writes. They fetch authoritative state on entry, notification and reconnect;
revision checks prevent older responses replacing a newer snapshot. A ten-second
automatic fallback fetch handles connection loss. Leaving live tournament
management unsubscribes/disconnects that screen's live connection. Public pages,
management lists, team/player administration, historical entry and other
non-live-management screens use normal HTTP/API fetch/refetch flows and do not
maintain Socket.IO connections. No normal manual refresh button remains in live
tournament operation. Dirty match drafts keep their captured revision across
other judges' updates; a stale save requires re-entry against the new canonical
result. Structural CAS protections remain unchanged.

### Cloudinary configuration

Set these **server-only** variables in deployment `.env`:
`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
The reusable `POST /api/media/images` endpoint accepts raw PNG/JPEG/WebP image
bodies (maximum 5 MiB) from authenticated judges/admins. It checks both MIME and
file signature, signs the fixed upload parameters on the server, uploads to
Cloudinary's image endpoint, and returns secure URL, public ID, dimensions and
format. Provider failures return a generic error; secrets never reach the
browser. Team create/edit use the shared ImageUpload component and persist URL
and public ID. Existing URL-only logos remain compatible. Removing a logo only
unassigns it; it does not delete possibly shared Cloudinary media.

Missing provider credentials produce an explicit 503 response. Tests verify the
signed provider contract with a mock and the real HTTP authorization/type/size
boundary; live provider delivery requires the deployment owner's credentials.

### Public shell and homepage

The approved header menu links to lifetime club rankings, All Stars, existing
Events, Updates-based News, and repository-managed Store/About/Birthday pages
marked under construction. Staff management stays role-aware. News uses existing
Update records and safe escaped text with HTTP(S) links, without raw HTML.

`GET /api/rankings` derives lifetime national points from completed regular/club
records (including untyped legacy regular events), excluding internal/inter-team
contexts. Both homepage leaders and the full rankings page consume this endpoint.
The homepage features only future regular events, up to four active teams, a
latest-news banner/full-post links, and the two required bottom action cards.
Set frontend build variable `VITE_RAV_MESSER_URL` to the intended HTTP(S) enrollment
URL. Until configured the enrollment card shows a disabled pending-link state;
no destination is invented. Build again after changing a Vite environment value.

`npm run test:stage-a:ui` renders real React routes with fixture data to verify
menu order, roles, nested team context, nearest club-event selection and static
page states. It creates no screenshots or manual checklist.
