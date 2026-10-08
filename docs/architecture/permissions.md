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

## Permission matrix

| Action | Admin | Judge |
| --- | --- | --- |
| View teams and rosters | Yes | Yes, read-only |
| Create/edit/delete/deactivate team | Yes | No |
| Upload/change team logo | Yes | No |
| Create/edit/delete/deactivate player | Yes | No |
| Assign/unassign/transfer player | Yes | No |
| Change permanent roster | Yes | No |
| Open/start a tournament | Yes | Yes |
| Remove absent participant before round 1 | Yes | Yes — tournament participant list only |
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
| Manage badge definitions | Yes | No |
| Award/manage badges | Yes | No |
| Transition badge Season | Yes | No |
| Annual team-year reset | Yes | No |
| Manage league/system configuration | Yes | No |

## Important distinction: roster vs tournament participants

A judge may remove an absent player from the participant list of a tournament **before round 1**.

That action must only change the tournament's participant snapshot/list.

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
