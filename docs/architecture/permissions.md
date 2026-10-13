# Permissions

This document is the authoritative role matrix for Stage A.

Backend authorization is mandatory. Frontend visibility is only a UX layer and must not be treated as security.

## Roles

### Admin
Highest management role for the current product.
Owns league configuration, teams, players, historical data, destructive actions, badges/Seasons and tournament administration.

### Judge
Operational role for running tournaments.
A judge is **not** a team/player administrator.

A judge may be assigned as the teacher of one or more teams. This relationship does not change the judge's authorization role or grant any admin-only mutations.

## Permission matrix

| Action | Admin | Judge |
| --- | --- | --- |
| View teams and rosters | Yes | Yes, read-only |
| Create/edit/delete/deactivate team | Yes | No |
| Upload/change team logo | Yes | No |
| Upload/change/remove player photo | Yes | No |
| Assign/change team teacher | Yes | No |
| Create/edit/delete/deactivate player | Yes | No |
| Assign/unassign/transfer player | Yes | No |
| Change permanent roster | Yes | No |
| Open/start a tournament | Yes | Yes |
| Manage participants for next uncreated tournament round | Yes | Yes — tournament participation only |
| Enter live match result | Yes | Yes |
| Correct result while tournament is active | Yes | Yes |
| End/advance round | Yes | Yes |
| Generate next round | Yes | Yes |
| Finish/close tournament | Yes | Yes |
| Operate other live tournament controls required by the event | Yes | Yes |
| Edit completed/historical tournament data | Yes | No |
| Soft-delete tournament | Yes | No |
| Permanently hard-delete tournament | Yes | No |
| Manual historical internal-team tournament entry | Yes | No |
| Historical regular/club Excel import | Yes | No |
| Manage badge definitions, including badge image | Yes | No |
| Award/manage badges | Yes | No |
| Remove/revoke awarded badge | Yes | No |
| Transition badge Season | Yes | No |
| Soft-delete badge Season | Yes | No |
| Annual team-year reset | Yes | No |
| Manage league/system configuration | Yes | No |

## Important distinction: roster vs tournament participants

A judge may manage the live tournament's participant selection for the **next uncreated round**, both before round 1 and while a later current round is running.

That action changes tournament participation only. It must not rewrite an already-created round or change the permanent team roster.

It must not:
- remove the player from the All Stars team
- deactivate the player
- change the permanent roster
- modify the Player/Team relationship

## Completed tournaments

Once a tournament is closed/completed, the judge's mutation permissions end.

Any later administrative correction, soft/permanent deletion or historical operation is admin-only.

## UI behavior

For judges:
- hide or disable team/player configuration controls
- do not show historical manual-entry or Excel-import actions
- do not show tournament deletion controls
- do not show badges/Season administration
- show only controls required to open and operate a tournament

Read-only team/player information may still be shown when it helps the judge identify participants or open an event.

## API behavior

Every admin-only mutation must enforce role checks on the server.

A judge calling an admin-only endpoint directly must receive an authorization failure even if the frontend normally hides that control.
