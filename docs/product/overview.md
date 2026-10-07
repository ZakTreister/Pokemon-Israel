# Product Overview

Cardschool IL manages the Israeli Pokémon league, All Stars teams, tournaments, rankings and public league content.

## Player populations

### Club / regular-league players
- Children who participate in regular club tournaments.
- No login in Stage A.
- No public individual player page.
- Appear in the national regular-player ranking.
- Their regular-tournament ranking points accumulate for the lifetime of the player and do not reset by season or year.

### All Stars / team players
- Children assigned to an All Stars team.
- No login in Stage A.
- May have a public-facing child profile that is linked only from their team page.
- Team-related scoring is separate from regular club scoring.
- Team-player score accumulates during a team competition year and resets only when a new team competition year is explicitly started.

## Staff roles
- `admin`: super-admin / highest management. Owns configuration, teams, players, historical data and destructive administration.
- `judge`: live-tournament operator only.
- Children do not log in during Stage A.

Judge permissions are intentionally narrow. A judge may open and operate a live tournament, including participant check-in/removal before round 1, result entry/correction while active, round transitions and tournament completion. A judge may not create/edit/delete teams or players, change rosters, manage badges/Seasons, delete tournaments, or enter/import historical tournament data.

See `docs/architecture/permissions.md` for the authoritative permission matrix.

## Management UX
There is one user-facing management area named **ניהול**.
Do not expose a second concept such as **ניהול משותף**.
Each role sees only the management options it is authorized to use.

## Tournament types
Canonical tournament types:
- `team_internal`
- `inter_team`
- `quarterly` (regular/club tournament in the current codebase naming)

## Core data principle
Tournament and result records are the source of truth. Rankings and statistics are calculations over those records.

## Product phases
The current implementation target is Stage A. Product specs include future features as well, but Codex must implement only what the active execution plan requests.
