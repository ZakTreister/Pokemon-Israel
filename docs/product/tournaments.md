# Tournaments

## Tournament types
- `team_internal`: internal tournament for one All Stars team
- `inter_team`: official encounter between teams
- `quarterly`: regular/club tournament (legacy internal name currently used by the project)

## Tournament permissions
A judge is a **live-tournament operator**, not a league/team administrator.

Judge may:
- open/start a tournament
- enter the active tournament management screen
- remove absent participants from that tournament before round 1 (this changes tournament participation only, not the team roster)
- enter and correct match results while the tournament is active
- complete/end a round and generate/proceed to the next round
- view standings/results needed to operate the event
- finish/close the tournament
- perform other actions directly required to operate that live tournament

Judge may NOT:
- create/edit/delete teams or players
- alter permanent team rosters
- delete tournaments
- edit historical/completed tournament data after the event is closed
- manually enter historical internal-team tournaments
- import historical regular/club tournaments from Excel
- manage badges/Seasons or other league configuration

Admin retains those administrative permissions as specified elsewhere.

See `docs/architecture/permissions.md`.

## Unified management page
The user-facing management page is **טורנירים** and contains all tournament types.

Do not expose a separate **טורנירים פנימיים** management tab.

The unified list must support:
- all tournaments
- filter by lifecycle/status: upcoming/future, active/in progress, completed
- filter by tournament type
- opening the relevant tournament-management page when the current user has permission
- super-admin hard delete for any tournament, including completed tournaments

If the underlying schema uses slightly different internal status names, the UI should still expose the product concepts above clearly.

## Deletion
Super-admin only may hard-delete tournaments.

This applies to:
- regular/club tournaments
- internal team tournaments
- inter-team tournaments
- completed tournaments

The previous rule that past/completed tournaments cannot be deleted is superseded.

Deletion must:
- permanently remove the tournament
- remove/clean dependent tournament state or embedded rounds/results
- ensure deleted results no longer contribute to derived rankings
- avoid orphaned references

Judges must not receive hard-delete permission.

## Shared tournament-engine requirements
The intended tournament engine is server-backed Swiss.

### Match/result UX
- Best of 3.
- A judge selects the winner by clicking a player name, or selects Draw.
- Then the score dropdown becomes enabled.
- Valid result shapes include 1-0 when applicable.
- Results must support normal Bo3 outcomes and draws.

### Result save state
Submitting a match result is asynchronous and the UI must show that state explicitly.

Immediately after submit:
- do NOT temporarily show “לא הוזנה תוצאה למשחק זה”
- show a concise saving state such as **שומר את התוצאה…**
- prevent accidental duplicate submission while that save is in flight

After confirmed server success:
- show the canonical saved result

If save fails:
- restore an editable/retryable state
- show a short Hebrew error explaining that the result was not saved
- tell the judge what to do next
- do not pretend the result is committed

### Approved internal-tournament operation layout
For the current approved screen hierarchy, match-card placement, mobile density, error-space behavior, and connection-info placement, follow:

- `docs/product/internal-tournament-ui.md`

That document is the more specific source of truth for this screen.

### Mobile tournament management layout
Tournament operation on mobile must be intentionally designed, not merely the desktop layout stacked vertically.

Requirements:
- balanced, symmetrical spacing
- player/winner controls should have equal visual weight
- result/score controls must be easy to tap and not squeezed
- use a consistent grid/stack appropriate to viewport width
- avoid awkward uneven button widths
- keep the primary action easy to reach
- no horizontal overflow
- preserve RTL reading order
- statuses/errors/saving indicators should not cause disruptive layout jumps

On very narrow screens, prefer clean full-width stacking over compressed multi-column controls.

### Standings
Swiss standings use:
- Points
- OMP
- GWP
- OGP

Pairing/standings logic must be canonical on the server, including equivalents of:
- `calculateStandings()`
- `generatePairings()`
- `pairCost()`

The frontend must not be the authoritative implementation.

### Round flow
After a round:
- allow “Pair another round”
- allow “Show results”
- allow continuing to new rounds after viewing results
- support returning to/editing a previous round

If editing an earlier result invalidates later pairings/standings, the server must handle that consistently rather than silently leaving inconsistent later rounds.

### Cancel latest round
A live internal tournament must allow staff who are authorized to operate the tournament to cancel the **latest/current round**.

User-facing action:
- label: **בטל סיבוב**
- show a confirmation before applying it
- make the destructive/reversal meaning clear

Behavior:
- only the latest active round may be cancelled through this action
- a completed/historical tournament cannot use this action
- cancellation is a server-authoritative structural mutation and must use the same revision/concurrency protection as round creation
- remove the cancelled round from the active `rounds` list
- archive a snapshot of the cancelled round in the tournament audit/history structure (for example `invalidatedRounds`) with reason, timestamp and actor
- results from the cancelled round must immediately stop contributing to standings/rankings
- previous rounds remain untouched
- the next generated round reuses the correct next round number based on the remaining active rounds
- cancelling round 1 does **not** reopen attendance/participant editing; the tournament roster remains locked once competitive play has started
- broadcast the canonical updated tournament state through the existing live synchronization path

Do not implement arbitrary deletion of an older/middle round from the active round selector. Corrections to earlier rounds continue to use the existing downstream-invalidation behavior.

### Persistence
Every material mutation must persist to the server:
- tournament creation
- participant removal before start
- round creation
- match result entry
- result correction
- tournament close

Refreshing, leaving the page, or opening the tournament from another device must reload the current server state.

### Live synchronization
Use the project's existing Socket.IO infrastructure for live tournament updates.

Expected behavior:
- initial page entry fetches canonical server state
- the client subscribes to the tournament's live channel/room
- after canonical server mutations, connected tournament clients receive an update event
- clients reconcile to the server state
- multiple judges can see new results/state without pressing a manual refresh button

Remove the normal-user **refresh from server** button.
A browser refresh or fresh navigation still works by loading state from the server.

### Network and live-sync errors
Do not show raw “Network Error” or similar technical messages.

Use concise Hebrew messaging based on what actually failed.

Examples:
- save/result mutation failed:
  - **לא הצלחנו לשמור את התוצאה. בדוק את החיבור ונסה שוב. אל תעבור לסבב הבא עד שהשמירה תצליח.**
- live Socket.IO connection dropped but current state remains visible:
  - **העדכון החי נותק. אפשר להמשיך לצפות; אנחנו מנסים להתחבר מחדש.**
- initial tournament load failed:
  - **לא הצלחנו לטעון את הטורניר. בדוק את החיבור ונסה שוב.**

Equivalent shorter copy is acceptable if it preserves the same meaning.

### Concurrency
Multiple judges may enter match results.
Structural operations such as starting/creating a round must be protected against duplicate execution by server-side versioning/locking/atomic transition logic.
The server state is canonical.

## Internal team tournaments

### One open internal tournament per team
A team may have **at most one open/live internal tournament at a time**.

An open internal tournament means a live `team_internal` tournament for that team that has not reached the completed/closed state.

Requirements:
- before creating a new live internal tournament, the server must check whether the team already has an open one
- this must be enforced on the backend, not only by disabling/hiding a button
- concurrent requests must not be able to create two open internal tournaments for the same team
- use an atomic/database-enforced uniqueness strategy appropriate to the current standalone Mongo architecture
- if creation is attempted while one already exists, return a clear conflict response that identifies the existing tournament when practical
- historical completed tournament creation does not count as an open live tournament
- completed/closed live tournaments no longer block a new one

UI behavior:
- if no open internal tournament exists, show **התחל טורניר**
- if an open internal tournament already exists, do not offer another create action
- instead show **המשך טורניר** and navigate directly to the existing open tournament
- if a stale UI still sends a create request and the server reports an existing tournament, recover by directing the user to that existing tournament rather than creating a duplicate

From a team page, staff can create a `team_internal` tournament.
It starts with the active roster preloaded.
Before round 1, staff can remove absent players.
No check-in workflow is required for team tournaments.

Internal team tournaments are the source for:
- internal team-player ranking
- overall All Stars player ranking, according to the ranking spec

### Internal tournament history
Internal tournament history belongs under the relevant team context.

Do not create a separate “internal tournaments” tab merely to expose this history.

When a user enters tournament history or another team-specific subpage, the management navigation should remain in the **נבחרות All-Stars** context, except when the user enters the actual tournament-management screen itself.

Always provide a clear back-navigation action, and do not render duplicate back actions for the same page.

## Historical internal-team result entry
Stage A requires manual historical entry for already-completed internal team tournaments.

The entry point belongs on the relevant team page/history area and is **admin-only**. Judges must not see or invoke the historical-entry action.

### Approved primary input flow: paste external standings
The primary UX is a large textarea where the admin pastes standings/results copied from another tournament system.

After paste:
1. parse the text into result rows
2. extract all recognized standings columns that are present and can be parsed safely, including:
   - position
   - player name
   - points
   - OMP
   - GWP
   - OGP
3. Do not reduce a richer pasted standings row to points only. When recognized standings fields are present, preserve them in the parsed preview and submit them through the historical-result model.
4. Prefer header-aware parsing: when the pasted table contains column headers, use the header names/order to map values instead of assuming that the first numeric token after the name is the only meaningful value.
5. Support normal pasted-table separators such as tabs and repeated whitespace, and tolerate percentage formats such as `62.5%` / `62,5%` when unambiguous.
6. If an optional recognized value cannot be parsed safely, leave that field unresolved/empty and surface the issue in the preview rather than silently assigning it to the wrong column.
7. try to match every parsed player name to an existing Player record relevant to the selected All Stars team
8. show the parsed preview before saving
9. for unresolved or ambiguous rows, require the admin to explicitly choose the correct existing player
10. do not allow final save while any required player mapping is unresolved
11. save the completed historical event through the canonical historical `team_internal` result model so it contributes to rankings exactly like other historical internal tournaments

### Reuse the legacy implementation
This exact interaction existed in repository history and should be used as implementation reference rather than reinvented.

Useful historical commits:
- `b894982f22386fdcebdd6724ae84b0540df6e171` — added textarea standings input, player matching and manual player selection when unmatched
- `e2c9cf3b983672793eaeffd538afd47e9d242fb8` — improved parsing of pasted standings/points

The old implementation lived in `src/pages/admin/AdminTournaments.tsx`.

Do **not** blindly restore the old User-based tournament model, deck-autocomplete behavior, alerts, or obsolete scoring conversion.
Extract/reuse the parsing and matching UX ideas and adapt them to the current Player-based All Stars historical endpoint/model.

### Matching rules for pasted names
Matching must be conservative, but a unique first name is sufficient:
- normalize whitespace, punctuation/case and harmless formatting differences before comparison
- prefer a unique exact normalized full-name match
- when the pasted value contains only one token / first name, auto-match it if exactly one relevant Player has that normalized first name
- if two or more relevant Players share that first name, do not guess; leave the row unresolved for explicit user selection
- a unique containment/legacy-style match may also be used when clearly safe
- never auto-match when multiple plausible players remain
- unresolved/ambiguous rows must display a selector
- the selector may expose the broader All Stars player pool when necessary, with team context, so transferred/former players can still be mapped intentionally
- prevent the same Player from being mapped to two different pasted rows in one historical tournament

Preserve the original pasted player name in the preview so the admin can see what is being matched.

### Historical-entry semantics
It remains:
- manual/paste-based, not Excel-based
- team-specific
- stored as a completed `team_internal` tournament
- included in the same ranking source-of-truth model as normal internal tournaments

The current checkbox/table workflow for individually selecting players and typing every position/point manually is no longer the preferred primary flow.
It may remain only as a fallback/editing aid if useful, but paste + parse + match is the normal workflow.

## Inter-team encounters
When implemented:
- pairings must not pair teammates against one another in the team-vs-team context
- team encounter standings are separate from internal player ranking
- team league scoring follows the dedicated ranking rules

## Regular / club tournaments
Regular tournaments remain separate from the team tournament world for scoring purposes.
They do not depend on badge Seasons.
Their player ranking accumulates over the player's lifetime.

## Future regular-tournament historical import
The unified **טורנירים** page should reserve a visible future action/button for importing historical regular/club tournament results from approximately the last five years.

That future import action is **admin-only**. Judges must not see or invoke it.

Stage A must NOT implement the Excel workflow itself.

Known future Excel fields are expected to include at least:
- first name
- last name
- city
- score/points

It is not yet known whether the file will contain one lifetime aggregate row per player or tournament-by-tournament data.
Do not design the actual importer until the real file is available and inspected.
