# Tournaments

## Tournament types
- `team_internal`: internal tournament for one All Stars team
- `inter_team`: official encounter between teams
- `quarterly`: regular/club tournament (legacy name currently used by the project)

## Shared tournament-engine requirements
The intended tournament engine is server-backed Swiss.

### Match/result UX
- Best of 3.
- A judge selects the winner by clicking a player name, or selects Draw.
- Then the score dropdown becomes enabled.
- Valid result shapes include 1-0 when applicable.
- Results must support normal Bo3 outcomes and draws.

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

### Persistence
Every material mutation must persist to the server:
- tournament creation
- participant removal before start
- round creation
- match result entry
- result correction
- tournament close

Refreshing, leaving the page, or opening the tournament from another device must reload the current server state.

### Concurrency
Multiple judges may enter match results.
Structural operations such as starting/creating a round must be protected against duplicate execution by server-side versioning/locking/atomic transition logic.
The server state is canonical.

## Internal team tournaments
From a team page, staff can create a `team_internal` tournament.
It starts with the active roster preloaded.
Before round 1, staff can remove absent players.
No check-in workflow is required for team tournaments.

Internal team tournaments are the source for:
- internal team-player ranking
- overall All Stars player ranking, according to the ranking spec

## Inter-team encounters
When implemented:
- pairings must not pair teammates against one another in the team-vs-team context
- team encounter standings are separate from internal player ranking
- team league scoring follows the dedicated ranking rules

## Regular / club tournaments
Regular tournaments remain separate from the team tournament world.
They do not depend on badge Seasons.
Their player ranking accumulates over the player's lifetime.

## Historical data
Two different historical-entry needs exist:

### Stage A internal-team retro entry
The system must support entering results for internal team tournaments that already occurred on Sunday 2026-10-04.
This is not the Excel import described below.

### Future regular-tournament Excel import
A future Excel import will apply only to regular/club tournaments.
Known columns are expected to include at least:
- first name
- last name
- city
- score/points

It is not yet known whether the file will contain one lifetime aggregate row per player or tournament-by-tournament data.
Do not design or implement that Excel importer until the actual file is available and inspected.
