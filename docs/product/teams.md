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
- Do not deactivate a team while active players are still assigned to it. Require transfer/unassignment first.

## Team page
A team page should show:
- team logo
- team name
- roster
- team-related ranking/statistics when available

For authorized staff, the team page includes a button to open a new internal tournament for that team.

## Internal tournament launch
Opening an internal tournament from the team page must:
- create a `team_internal` tournament linked to that team
- preload all active players currently assigned to the team
- allow the judge to remove absent/non-participating players before round 1
- lock the participant set once competitive rounds begin

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
