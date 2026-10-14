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


## Shared player editor
The Player edit experience must be reusable from multiple management contexts.

Do not keep the full edit-dialog state/business logic inside `AdminPlayers.tsx`.

Preferred boundary:
- reusable `PlayerEditDialog` / player-edit form component owns the dialog presentation
- reusable player-edit hook/controller owns form state, validation, load/save lifecycle and upload busy/error state
- canonical player service/Redux/API layer owns server calls
- callers such as **ניהול → שחקנים** and a managed team page only provide the Player/player id, open/close state and an optional completion/return callback

Both entry points must open the same canonical editor and produce the same validation, upload and save behavior.

## Player editor layout
The edit dialog must fit within the viewport.

Requirements:
- the dialog itself never extends beyond the visible viewport
- constrain dialog height and make the body/content area internally scrollable when needed
- keep title/close affordance and primary actions reachable
- on desktop, lay out suitable form controls in **two columns**
- on narrow/mobile screens, collapse cleanly to one column
- full-width controls such as longer description text, image/deck upload previews or Pokémon collection controls may span both columns
- do not solve the height problem by shrinking touch targets or making fields unreadably dense

## Team-player tenure
All Stars/team players gain an optional date-only **joinedAt** / team-join date field.

Management label: **תאריך הצטרפות**.

The displayed **וותק** is derived from this date rather than stored as a manually aging text value.

Rules:
- optional
- date-only semantics; avoid timezone day-shift bugs
- future dates are invalid
- admin can set/change/remove it from the shared Player editor
- club/quarterly players do not require this field
- public/team UI may display a human-readable tenure derived from it where the existing profile design calls for seniority/tenure

## Personal deck image
All Stars/team players support an optional **דק אישי** image.

Management:
- upload/replace/remove through the shared image uploader
- use the existing AWS S3 media architecture rather than a special upload implementation
- keep this separate from the child's profile photo
- recommended upload purpose/key namespace: `player-deck` under `public/players/<player-id>/deck/...`
- creation/editing remains valid without a deck image
- judges remain read-only

Public profile:
- when present, the current personal deck image may be displayed on the approved public All Stars player profile

## Favorite / personal Pokémon
All Stars/team players may store up to **6 Pokémon names** for profile display.

Management UI:
- start with one compact input row
- provide **הוסף פוקימון** to add another input until the maximum of 6
- allow removing optional rows
- keep the Pokémon inputs visually compact and on one row/compact group where screen width allows; wrap responsively on small screens
- show a tooltip/help affordance with the naming rules and an example
- do not render six empty fields by default

Validation:
- maximum 6 non-empty names
- each name is trimmed
- allow English letters and spaces only: `A-Z`, `a-z`, and spaces
- collapse repeated spaces
- reject numbers, Hebrew letters and punctuation in the stored input for this version

Image URL:
- derive the image URL from the validated name; do not ask admin to paste a URL
- normalize to lowercase
- replace spaces with hyphens
- use:
  `https://r2.limitlesstcg.net/pokemon/gen9/<pokemon-name>.png`

Example:
- `Iron Hands` → `https://r2.limitlesstcg.net/pokemon/gen9/iron-hands.png`

Store the normalized Pokémon names/domain values, not six copied external image URLs, so URL construction remains centralized.


## Players management pagination
The general **ניהול → שחקנים** page must use server-side pagination and must not load the full Player collection into the browser.

Requirements:
- the Players API supports paged retrieval
- default page size: **25**
- return the current page rows plus pagination metadata such as total count, page, page size and total pages
- existing type filter and text search must be applied on the server **before** pagination
- changing search/filter resets to page 1
- navigating pages fetches only the requested page
- keep a stable canonical sort so players do not jump unpredictably between pages
- after create/edit/delete, refresh the relevant current page and handle the case where deletion leaves the current page empty
- judges remain subject to their existing restricted player visibility

The UI should provide clear previous/next page navigation and current page/total-page context. Do not fake pagination by fetching all players and slicing client-side.


## Regular-player location field
Regular/club players no longer use a separate `club` field.

Use the same canonical **עיר / `city`** field for both player types:
- team player: first name, last name, city
- regular/quarterly player: first name, last name, city

Requirements:
- remove `club` from create/edit forms, DTOs, API payloads, model usage, search/filtering and duplicate detection
- regular-player creation/editing requires/uses **עיר** instead of **חוג**
- duplicate detection for regular players becomes normalized first name + last name + city
- management search should search city rather than club
- no backward-compatibility requirement for legacy `club` values; remove the active dependency rather than carrying dual fields

## Regular-player photo
Regular/quarterly players do **not** have a player-photo field in the current product.

Requirements:
- do not show photo upload in regular-player create/edit flows
- do not persist or expose regular-player photo media as part of this scope
- the optional Player photo remains a team-player / All Stars capability only


## Player count-only usage
Where a surface needs only a number of Players and does not render Player rows, do not fetch full Player documents solely to count them.

Use the same authorized/filter-aware pagination query's `total` metadata or a lightweight count-only variant.

Examples include team/member counts and management/overview counters. Count logic must respect active/deleted/player-type/team filters consistently with the corresponding canonical list query.


### Count-only player queries
If another screen needs only a Player count, do not fetch all Player records to calculate it.

Use the canonical total/count returned by a lightweight server query or count-only pagination mode with the same authorization/filter semantics as the normal Players list.


## Player form visual layout refinements — 2026.10.4
Apply these ordering and spacing requirements to the canonical Player edit dialog and to creation forms where the same fields exist. Preserve one reusable player form/editor workflow, existing validation, roles and save/upload behavior.

- use an orderly two-column responsive grid on desktop, stacking into one column on mobile, with consistent labels, row spacing and field widths
- group basic identity fields logically first (first/last names, city, and player number/team selection when applicable)
- for All Stars/team players, place **תאריך לידה** and **תאריך הצטרפות** side by side in one row, **above** the full-width **תיאור קצר** field
- place **תמונת שחקן** and **דק אישי** upload/preview controls side by side in the next appropriate row; stack on narrow screens; align their labels, sizing and preview areas without changing media upload/storage logic
- put the Pokémon name collection after the profile/media controls, retaining its compact behavior and max of six
- position the **פעיל** checkbox at the **bottom of the form** (for both team and regular players), above the form actions
- normalize the visible height of all single-line text, number, date and select inputs using shared form styles; do not force textareas, checkboxes or image upload controls to single-line input height
- preserve touch-friendly targets, clear focus/validation styling, RTL alignment, internal modal scrolling and reachable save/cancel actions
