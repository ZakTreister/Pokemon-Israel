# Stage A — Internal All Stars Tournament MVP

## Goal
Deliver the first operational version of Cardschool IL for All Stars internal team tournaments.

A staff member must be able to create a team, load children into it, start an internal tournament from the team page, run the entire Swiss event with server persistence, close it, and later see the resulting player/team information without losing state.

Read the product specs referenced below before coding.

## Required product specs
- `docs/product/overview.md`
- `docs/product/teams.md`
- `docs/product/players.md`
- `docs/product/tournaments.md`
- `docs/product/rankings.md`
- `docs/product/homepage.md`
- `docs/decisions.md`

## Scope

### 1. Team foundation
Make the existing team implementation suitable for Stage A.

Required:
- team creation including a logo/emblem field
- active roster management
- create/load team children as Player records without requiring child login/User accounts
- assign/transfer/remove team players as needed
- remove the current global “active Season blocks team changes” behavior
- prevent invalid deactivation of a team that still has active assigned players
- keep existing data backward compatible

Do not implement national-ID storage in Stage A.

### 2. Unified management UX relevant to Stage A
There must be one user-facing **ניהול** area for staff.
Do not show a separate **ניהול משותף** concept.
Judges/admins should see only the Stage A management options they are authorized to use.

Do not spend this stage rebuilding unrelated admin pages.

### 3. Team page
Provide a team page that:
- displays logo, name and active roster
- exposes a staff-only action to **פתח טורניר פנימי**
- links to team-player child profiles only if those profiles are implemented as part of the existing code path; a full rich profile is not required for the MVP unless needed by current UI

No child login.

### 4. Create internal tournament from team
Opening a tournament from the team page must:
- create a canonical `team_internal` tournament linked to the team
- preload all active players on that team as participants
- use Player references for this new tournament flow
- let the judge remove absent participants before round 1
- prevent participant removal/addition after competitive rounds begin

Do not force the new internal-tournament flow through legacy `participants.user` semantics.

### 5. Server-backed Swiss engine
Implement the previously specified Swiss behavior as a real persisted server workflow.

Required behavior:
- best of 3 matches
- choose player winner or Draw, then choose score
- support 1-0 results where valid
- standings: Points, OMP, GWP, OGP
- server-canonical pairing and standings calculations
- pair another round
- show results between rounds
- continue pairing after viewing results
- return to/edit a previous round
- handle downstream state consistently when an earlier result is corrected

The backend is the source of truth.

### 6. Persistence and resume
Persist every important tournament mutation immediately.

A judge must be able to:
- refresh the browser
- leave the tournament page
- log in from another browser/device

and reload the current tournament state from the server.

Do not rely on localStorage for tournament state.

### 7. Multiple judges / structural safety
Multiple staff members may enter results.

Implement protection against duplicate structural operations:
- starting the same round twice
- generating duplicate pairings
- conflicting round transitions

Use an appropriate server-side version/lock/atomic transition approach compatible with the project's current Mongo deployment.
Do not require Mongo transactions/replica-set support if the repository is intentionally using standalone Mongo; use safe atomic updates/manual rollback patterns as needed.

### 8. Close tournament
Staff can explicitly close/end the tournament.

Closing must:
- validate that the tournament can be completed
- mark it completed
- preserve participants, rounds, matches/results and final standings
- make its results available to All Stars player ranking calculations
- make the closed state survive refresh/restart

### 9. All Stars player ranking needed by Stage A
Internal team tournaments must provide enough canonical result data to calculate:
- each player's ranking inside the team
- overall All Stars player ranking

For Stage A these rankings are based on completed internal team tournaments.
Do not use badge Seasons to reset these scores.

The annual team competition-year reset around September 1 is a product requirement, but a complete annual-reset administration feature is not required unless needed by the current Stage A implementation. Do not couple score to Season.

### 10. Retrospective internal tournament entry
Provide a focused manual way to enter the already-completed internal team tournaments from Sunday 2026-10-04.

This is for `team_internal` tournaments only.

Requirements:
- staff chooses the team and historical date
- select the participating team players
- enter enough final tournament result data to reproduce the player ranking impact
- save it as a completed historical internal tournament
- clearly distinguish historical/manual entry in data if useful
- use the same ranking source-of-truth model as normal completed internal tournaments

Do NOT implement the future regular-tournament Excel importer in this stage.

If full round-by-round historical information is available in the UI/data, it may be entered, but do not block the MVP on reconstructing pairings that are not known.

### 11. Homepage All Stars section
Replace/remove the existing top-decks homepage section.

Add an All Stars team section showing up to four active teams.

Because Stage A does not yet implement official inter-team encounters:
- do not fabricate a competitive team ranking
- do not calculate win percentage from internal tournaments
- show team logo/name and statistics actually available, such as player count and completed internal-tournament count
- structure the component/API so it can later use true inter-team standings, games played and win rate

### 12. Remove Stage A child-login assumptions
The existing app currently has child/player dashboard assumptions.

For Stage A:
- no navigation CTA should invite children to log in
- new team-player creation must not create a login
- do not build Deck/Pokémon self-edit flows
- keep staff authentication intact

Avoid destructive removal of legacy auth data unless necessary; compatibility is preferable.

## Out of scope for Stage A
Do NOT implement these merely because they exist in the product docs:
- Deck/Pokémon team-player profile editing
- child self-service/player dashboard
- national-ID storage/encryption
- regular tournament Excel import
- WhatsApp Channel ingestion
- full News redesign
- Events redesign beyond changes strictly needed by the tournament flow
- Store
- About the League static page
- Birthday Booking static page
- full badge/Season redesign
- annual competition-year reset UI, unless a minimal piece is required to keep ranking semantics correct
- inter-team encounter engine
- true team league standings/win rate
- quarterly/regular tournament overhaul

## Compatibility
Existing public regular tournaments, rankings, updates, decks, legacy users and historical tournament records should not be broken by Stage A.

Where the legacy Tournament schema is User-based, extend/migrate carefully so the new team-internal flow can be Player-based without corrupting old data.

## Verification
Perform code-level verification appropriate to the repository:
- build
- lint if configured
- verify server routes/models compile/start as far as the existing project tooling allows

Do not create a manual click-through test plan or screenshots as part of this task.

## Completion
When the Stage A implementation is complete:
- commit the changes
- push to the working branch requested by the environment/workflow
- report the final commit SHA and build/lint result
