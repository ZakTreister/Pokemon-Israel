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

## Child/player photo
The Player record supports an optional child photo managed through the shared AWS S3 upload capability.

Requirements:
- the child/player photo is optional; player creation/editing must succeed without a photo
- admin can upload, replace and remove the child's photo from player create/edit/profile-management flows
- this applies to both `team` and `quarterly` / regular-club players
- judges remain read-only and cannot change player media
- new uploads persist provider-neutral storage metadata rather than Cloudinary-specific identifiers
- reuse the shared image-upload component; do not create a separate uploader just for players
- no child login/self-service is introduced by this feature

Visibility:
- an All Stars/team player's photo may be exposed on the already-approved public player profile and can be stored under `public/players/<player-id>/...`
- regular/club players have no public individual profile; their photos must not be returned by public APIs or displayed on public pages and should be stored under `private/players/<player-id>/...`
- a change of player type must not automatically make a previously private photo public; an authorized media visibility transition must be explicit

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

## Optional All Stars profile fields
All Stars / team players support two additional optional profile fields:

### Description / biography
- canonical field: `description` (or an equivalently clear existing naming convention)
- applies only to `playerType: team`
- optional; empty value is valid
- editable by admin in team-player create/edit flows
- displayed on the public All Stars player profile when non-empty
- plain text only; do not render unsanitized rich HTML
- keep it concise; maximum 500 characters

### Date of birth and public age
- canonical field: `dateOfBirth`
- applies only to `playerType: team`
- optional; empty value is valid
- store it as a date-only value (`YYYY-MM-DD` semantics), not a timestamp whose timezone conversion can move the birthday by a day
- future dates are invalid
- admin can set/change/remove it in team-player create/edit flows
- the exact date of birth is private management data and must **not** be returned by the public player endpoint
- the public All Stars player profile shows only the player's current integer age when date of birth exists
- calculate age from the current calendar date and birthday; decrement by one until the birthday has occurred in the current year
- age should update naturally over time without rewriting the Player record
- if no date of birth exists, omit the age rather than showing an unknown/zero placeholder
- regular/club players do not gain these public-profile fields in this version

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
- edit the player's editable team-player fields, including name, city, player number, optional description, optional date of birth and optional photo
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
- optional description / short biography
- age when a date of birth exists; never expose the exact date of birth publicly
- score/ranking inside the team
- image of current personal deck
- earned badges

Do not require child login for this page.
Do not expose private/admin-only player data.

## Creating team players from Players management
When admin creates a **שחקן נבחרת** from the global **ניהול → שחקנים** page, the form must include a required **נבחרת** selector.

The create payload assigns the new player to that selected team immediately.

Requirements:
- list active All Stars teams
- selecting a team is required for this global team-player creation flow
- do not create a new team player from this flow in an unassigned state
- keep the existing team-context creation/import flow compatible
- include the other required team-player fields such as name and **מספר שחקן**
- include optional profile fields such as description, date of birth and photo without making them required

## Editing player profile data
Because children do not log in in Stage A, child/team profile information is managed by admin, not by the child.

Judges have read-only access to player/team identity data needed for tournament operation. Judges may not:
- create a player
- edit a player's profile/details
- delete/deactivate a player
- assign/unassign/transfer a player between teams
- change a player's team settings or media


## Player deletion
Admin must have a visible **מחק שחקן** action from player management.

Deletion is soft deletion / archival by default:
- the Player record and historical tournament/result references are preserved
- the player is excluded from normal active player lists and future team/tournament assignment choices
- a deleted player must not be treated as an active team member
- historical tournament results, standings snapshots and earned history remain readable
- deletion requires an explicit confirmation dialog
- judge cannot delete players

Do not hard-delete Player records that are referenced by historical competition data.

## Edit player from team management
On a managed team page, each player row must expose an explicit **עריכת שחקן** action/link for admin.

Requirements:
- the action opens the canonical team-player edit flow for that Player
- do not duplicate a second independent edit implementation
- preserve row navigation to the public player profile
- the edit control is independently clickable and must not trigger row navigation
- judge remains read-only for permanent player data

## Duplicate-player warning on creation
Before creating a new Player, check for an existing likely duplicate using normalized identity fields.

For All Stars/team players:
- compare normalized first name + last name + city

For regular/club players:
- compare normalized first name + last name + club

If one or more likely matches already exist:
- do not silently create the new Player
- show a clear Hebrew warning/modal before creation
- show enough existing-player context to recognize the possible duplicate
- provide an action to open/edit the existing player where practical
- allow admin to explicitly continue with **צור בכל זאת** because two different children may legitimately share the same identifying fields
- the warning must be backed by server-side duplicate lookup/checking; frontend-only comparison is not sufficient
- normalize case/whitespace consistently with the existing duplicate-detection rules
