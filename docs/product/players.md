# Players

## Canonical player record
Players are represented by the Player model.

Current product-level player types:
- `team`: All Stars team player
- `quarterly`: regular/club player (legacy internal enum name is acceptable)

## No child authentication in Stage A
Neither club children nor team children have login accounts in Stage A.
Do not require a User record to create or manage a team player.
Existing legacy User-linked player records must remain compatible, but new Stage A team-player flows must work without child User accounts.

## Player identity data
Common fields include:
- first name
- last name
- city
- player type
- active state
- optional team

For some children an Israeli national ID may later be available.
It is optional and sensitive.

## Future matching/deduplication rule
When matching a player during imports/integrations:
1. If national ID is provided, try exact national-ID identity first.
2. Otherwise, or when no safe national-ID match exists, use normalized first name + last name + city.
3. If a supplied national ID conflicts with a possible name+city match, do not auto-merge. Require staff review.

The old quarterly dedupe rule using club is superseded by the intended identity rule above once that migration is implemented.

## Team-player number
Every All Stars / team player has a **מספר שחקן**.

Requirements:
- this field belongs to `playerType: team`
- new team-player create/edit forms include **מספר שחקן**
- new team players require a value
- existing legacy team players without a number must remain readable and editable so admin can fill it in
- the number is a player display/profile attribute intended for reuse in team UI and future shirt/kit presentation
- do not use the number as the player's identity/deduplication key
- no uniqueness rule or numeric range is defined yet; do not invent one until product requirements specify it
- club/regular players do not require this field

## Creating a team player
When an admin creates a **שחקן נבחרת** from the general Players management page, the form must include a required **נבחרת** selector.

Creation rules:
- a new team player created from the general Players page must be assigned to a team as part of the same submit
- do not create an unassigned team player and require a separate follow-up assignment
- the team selector lists eligible active All Stars teams
- when creation is initiated from within a specific team context, the team is already known and should be preselected/implicit rather than asking the admin to choose it again
- club/regular player creation remains unchanged

## Editing and removing a team player
For a team player, the primary contextual management surface is the team's **חברי נבחרת** tab.

From that tab, admin must be able to:
- edit the player's editable team-player fields, including name, city and player number
- remove/unassign the player from that team

These actions should be compact row actions or an accessible row **עוד פעולות** menu, not large page-level buttons.

Removal changes team membership only; it does not delete the Player record.

The general Players management page may continue to provide broad player editing as an additional administration surface.

## Public player pages
There are no public player pages for club players.

Every All Stars / team player has a public player page.

Discovery rules:
- in lists/tables that represent All Stars / team players, the **entire player row/card is clickable** and opens that player's public page
- this includes team rosters and team-specific player-ranking tables
- the player name should still have clear link styling/semantics where appropriate, but it is not the only clickable target
- if a row contains independent interactive controls such as edit/remove/action buttons, those controls must remain independently operable and must not trigger row navigation
- there is no global child directory/index
- the site should not promote standalone discovery of child profiles
- club/regular players still have no public individual profile

Preferred route shape:
- `/all-stars/players/:playerId`

The player page should use only appropriate public data already available in the product model and may show, when present:
- child photo
- name
- city
- current All Stars team
- player number
- seniority / tenure
- a short biography
- score/ranking inside the team
- image of current personal deck
- earned badges

Do not require child login for this page.
Do not expose private/admin-only player data.

## Editing player profile data
Because children do not log in in Stage A, child/team profile information is managed by admin, not by the child.

Judges have read-only access to player/team identity data needed for tournament operation. Judges may not:
- create a player
- edit a player's profile/details
- delete/deactivate a player
- assign/unassign/transfer a player between teams
- change a player's team settings or media
