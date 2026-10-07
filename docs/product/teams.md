# Teams

## Team entity
An All Stars team has at least:
- name
- logo / emblem
- active state
- roster of team players

Team names must remain uniquely normalized as in the existing model.

## Creating and managing teams
- Staff with the required permission may create a team.
- Team creation is NOT blocked by an active Season.
- General team/roster administration is not globally locked because a Season is active.
- A player may belong to only one active team at a time.
- Team players may be transferred between teams through management flows.
- Staff must be able to remove/unassign a player from a team.
- Do not deactivate a team while active players are still assigned to it. Require transfer/unassignment first.

## Management label
The management navigation label is **נבחרות All-Stars**.
Do not use **נבחרות וסגלים** as the primary label.

## Team page
A team page should show:
- team logo
- team name
- roster
- team-related ranking/statistics when available
- internal tournament history
- access to the existing/manual historical internal-tournament result-entry flow
- staff-only action to open a new internal tournament

Team-specific subpages/history should preserve the **נבחרות All-Stars** navigation context.
Entering the actual tournament-management screen may switch to the Tournament context.
Always provide a visible back-navigation action.

## Internal tournament launch
Opening an internal tournament from the team page must:
- create a `team_internal` tournament linked to that team
- preload all active players currently assigned to the team
- allow the judge to remove absent/non-participating players before round 1
- lock the participant set once competitive rounds begin

## Team creation on mobile
The create-team form must be intentionally responsive:
- no awkward compressed horizontal layout
- fields stack cleanly on narrow screens
- image/logo upload remains usable
- primary actions remain prominent and reachable

## Team logo
Team logo upload should use the shared Cloudinary-backed image-upload abstraction defined in `docs/architecture/media-upload.md`.

## Team statistics
When inter-team competition exists:
- games/matches played = completed official inter-team encounters in which the team participated
- win rate = won completed inter-team encounters / completed inter-team encounters * 100
- draws count as played but not won

Do not derive team win rate from internal tournaments.

## Team history
History must be preserved across team competition years:
- the team identity/name as needed for historical display
- roster membership for that year
- year-specific team standings/statistics
Historical data must not be lost when a new competition year starts.
