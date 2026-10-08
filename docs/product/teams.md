# Teams

## Team entity
An All Stars team has at least:
- name
- logo / emblem
- active state
- roster of team players

Team names must remain uniquely normalized as in the existing model.

## Creating and managing teams
- Team configuration is admin-only.
- Judges may view team information as needed to open/manage tournaments, but may not change team settings.
- Only admin may create, edit, activate/deactivate or delete a team.
- Only admin may upload/change a team logo.
- Only admin may add, edit, transfer, assign, remove or unassign players from a team roster.
- Team creation is NOT blocked by an active Season.
- General team/roster administration is not globally locked because a Season is active.
- A player may belong to only one active team at a time.
- Do not deactivate a team while active players are still assigned to it. Require transfer/unassignment first.

## Management label
The management navigation label is **נבחרות All-Stars**.
Do not use **נבחרות וסגלים** as the primary label.

## Team-list primary actions
On the team-management list, replace the old combined **סגל וטורנירים** action with two actions:

- **סגל** — navigates to the existing team roster/ranking/details page
- **התחל טורניר** — starts/opens a new internal tournament for that team when no open internal tournament exists
- If that team already has an open internal tournament, replace the create action with **המשך טורניר**, linking to the existing tournament

A team must never be offered a second simultaneous live internal tournament.

The **התחל טורניר** / **המשך טורניר** action should be the more prominent operational action.

Do not merge these two meanings into one button.

Permanent configuration controls remain admin-only. Judges may use the tournament-start action according to live-tournament permissions.

See `docs/product/internal-tournament-ui.md`.

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
- first resolve whether an open live internal tournament already exists for that team
- if one exists, open that tournament instead of creating another
- otherwise create a `team_internal` tournament linked to that team
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
