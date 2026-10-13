# CardSchool IL — Version Tracker

This file is the canonical implementation-version tracker for approved product/spec work.

## Versioning rule

Use calendar versions in the form `YYYY.MM.N`, for example `2026.10.1`, then `2026.10.2`.

Rules:
- One approved specification batch gets one new version number.
- Product/architecture docs remain the detailed source of truth; this file defines the implementation batch and status.
- A version moves through `PLANNING` → `READY_FOR_DEVELOPMENT` → `DEVELOPED`.
- Codex implements the requested version and updates this file in the same implementation PR.
- When finished, Codex marks the version `DEVELOPED`, records the PR URL, final SHA, verification, and known gaps.
- A new version starts only after the previous version is marked `DEVELOPED`, unless the product owner explicitly queues another version.
- Clarifications made before development begins may update the current pending version scope, but may not create hidden untracked requirements.

## Previous developed version

**Version:** `2026.10.1`  
**Status:** `DEVELOPED`\
**Previous developed baseline:** repository implementation before version tracking began  
**Implementation PR:** [Create/review work → main](https://github.com/ZakTreister/Pokemon-Israel/compare/main...work?expand=1) — create-PR fallback; actual PR URL pending.\
**Implementation commit:** `840af32aad4579814fc7e10ac206d589d2bb451c`\
**Developed on:** `2026-10-11`

### Scope

#### 1. Team-player number and team-page player management
- add canonical `playerNumber` for All Stars/team players
- require it for new team players; preserve legacy records without it for backfill
- global **ניהול → שחקנים → הוסף שחקן נבחרת** requires selecting an active team and assigns the player in the same flow
- team page **חברי נבחרת** shows full name, city and player number
- admin can edit a team player from the member row
- admin can remove/unassign a player from the member row without deleting the Player
- **דירוג וסטטיסטיקה** shows position, name, points and tournaments in canonical team-rank order

#### 2. Live tournament participant editing
- rename existing **דירוג ותוצאות** to **טבלה** without changing its behavior
- add **משתתפים** beside it
- reuse the checkbox participant/team-member selector where practical
- before round 1, selection defines round-1 participants
- while a current round runs, selection defines the next uncreated round
- participant edits never rewrite already-created pairings/results
- late joiners start next round with 0 match points for missed rounds
- unchecked players keep historical results/standings impact and are excluded from future pairing
- eligible players may be re-added for a later round
- tournament participant changes never change permanent team membership
- preserve historical participant snapshots and store the future eligible set separately
- keep structural concurrency safe and do not break unrelated match drafts/saves

Manual pairing override/editing is explicitly **not** part of this version.

#### 3. Public Events mirrors management Tournaments
- public **אירועים** uses the same compact tournament-list visual language as management **טורנירים**
- reuse shared filter/list/summary primitives where sensible
- keep public PageHero/chrome
- remove the separate oversized image-card-grid presentation
- public actions remain details/registration/results only
- never expose management-only actions

#### 4. Remove overall cross-team All Stars individual ranking
- All Stars individual ranking is team-specific only
- remove remaining `overallRanking` UI/API dependencies
- public player profile shows team-specific ranking only

#### 5. Route navigation starts at the top
- implement one central React Router/layout scroll-to-top behavior for route changes
- include Link/NavLink/programmatic navigation/clickable rows/cards/back-forward
- do not reset scroll for same-page state changes
- preserve explicit hash/anchor behavior

#### 6. Homepage hero trading cards: touch drag + approved artwork
Keep all three hero trading cards at their current sizes.

Interaction:
- on touch/mobile, users can drag/swipe the cards horizontally with a finger
- use lightweight natural snap/settling behavior
- mouse/trackpad drag may follow the same interaction where practical
- do not substitute automatic floating animation
- respect `prefers-reduced-motion`
- preserve the existing hero layout and card dimensions

Artwork:
- center/main card uses the site's existing Pikachu image asset
- one side card uses a Poké Ball illustration
- the other side card uses a trophy illustration
- do not enlarge the center card or otherwise change relative card sizes


#### 4. Team management: show image and edit action
In **ניהול → נבחרות All-Stars**:

- each team summary/card/row shows the current team logo/image when one exists
- show a neutral placeholder when no logo exists
- team image remains optional
- add a clear admin-only **עריכת נבחרת** action
- reuse/open the canonical team edit/settings flow; do not duplicate team-edit logic
- judges can view the logo but cannot edit the team
- preserve **התחל טורניר / המשך טורניר** as the primary action; **עריכת נבחרת** is secondary


#### 5. Reusable Player editor and dialog layout
Refactor the current Player editing implementation so it can be opened from multiple management contexts without duplicated logic.

Architecture:
- shared canonical `PlayerEditDialog` / player form UI
- reusable player-edit state/controller/hook for form state, validation, upload/save lifecycle
- keep persistence calls in the existing player service/Redux/API layer
- **ניהול → שחקנים** and the managed team page both open the same editor
- do not put React UI inside an API service

Layout:
- dialog must not overflow the viewport
- use a viewport-bounded max height with internally scrollable body
- keep header/close and save/cancel reachable
- desktop: suitable fields in a two-column grid
- mobile: one column
- long description/media/Pokémon controls may span both columns

#### 6. Additional All Stars player fields
Add these optional fields to the shared team-player editor.

**תאריך הצטרפות / ותק**
- persist optional date-only `joinedAt`
- reject future dates
- calculate/display user-facing **וותק** from this date
- do not store an aging free-text tenure value

**דק אישי**
- optional personal deck image
- upload/replace/remove using the shared AWS S3 image uploader
- separate from profile photo
- use a distinct `player-deck` purpose and public player deck namespace
- may appear on the approved public All Stars player profile

**עד 6 פוקימונים**
- initially show one compact Pokémon-name field
- allow adding/removing fields up to 6
- English letters and spaces only
- trim and collapse repeated spaces
- URL slug: lowercase + spaces → hyphens
- image URL is derived from:
  `https://r2.limitlesstcg.net/pokemon/gen9/<pokemon-name>.png`
- add tooltip/help text explaining the naming restriction and example
- persist normalized Pokémon names, not derived image URLs



#### 7. Shared team edit dialog
The approved **עריכת נבחרת** action opens a reusable dialog rather than navigating to a separate page.

Requirements:
- implement one canonical `TeamEditDialog`
- open it from **ניהול → נבחרות All-Stars**
- reuse the same dialog from the managed team page
- edit core team settings: name, optional logo/image, assigned teacher and active status when applicable
- keep roster/player assignment/removal outside this dialog
- reuse existing teams service/Redux persistence
- do not duplicate form state/edit logic in multiple pages
- successful save closes the dialog and refreshes canonical team/list data without a full-page reload


#### 8. Complete Updates / News
Complete the existing Updates capability as the canonical News system.

Fields:
- **כותרת** — required
- **תיאור** — optional
- **תמונה** — optional
- **קישור** — optional

Compatibility:
- preserve existing `content` records and treat them as description content
- do not create a second News model

Management:
- make create/edit/delete fully functional through the existing API/service
- delete requires confirmation
- title is trimmed and required
- optional link must be a valid `http://` or `https://` URL
- use shared Modal/Dialog
- image upload uses shared S3/ImageUpload with an `update-image` purpose
- successful mutations update/refetch canonical state without full-page reload

Public:
- News list/full post show image when present
- show description/content
- show an explicit CTA/link when an optional link exists
- external link opens safely in a new tab
- homepage news banner/latest-update continue using the same Update records


#### 9. Server-side pagination for Players management
**ניהול → שחקנים** must not fetch the full Player collection.

Requirements:
- implement real server-side pagination
- default page size: **25**
- Players API returns current-page rows and pagination metadata: total, page, pageSize and totalPages
- apply existing authorization/role visibility, type filter and text search before pagination
- use a stable deterministic sort
- changing search/filter resets to page 1
- next/previous page fetches only the requested page
- do not implement client-side fake pagination over a full fetch
- after create/edit/delete, refresh the current page; if deleting the last row makes the page invalid/empty, move to the previous valid page
- show clear previous/next navigation and page context in the management UI

### Required verification
Codex must inspect current implementation, follow the detailed docs, add/update relevant tests, run tests, lint and build, and make no unrelated changes.

### Implementation verification

- `npm run test:stage-a`: **PASS** — 25 server tests, no failures or skips. Includes player-number validation/atomic team assignment, legacy backfill, historical participant retention, next-round eligibility, late joins/re-adds, structural conflicts, live synchronization and independent match versions.
- `npm run test:stage-a:ui`: **PASS** — all 8 verification scripts. Includes participant draft preservation/conflict recovery/out-of-order responses, compact public Events, contextual member edit/unassignment, team-only ranking, SPA navigation/anchors/back-forward, required creation fields and hero drag/snap/artwork/reduced-motion behavior.
- `npm run lint`: **PASS** — 0 errors, 4 existing warnings.
- `npm run build`: **PASS** — production Vite build; existing Browserslist, mixed import and bundle-size warnings remain.
- `git diff --check`: **PASS**.
- Supplemental `npx tsc -p tsconfig.app.json --noEmit`: 17 pre-existing legacy type errors, unchanged from baseline; no new errors. This is not the configured build command.

**Known gaps:** No known gaps in the approved `2026.10.1` implementation. PR creation remains pending: GitHub GraphQL and REST requests returned `Forbidden`, including the escalated API attempt. The final GitHub PR creation click is still required. Reuse an existing open `work` → `main` PR if present; otherwise create one using the link above, then replace the fallback with its actual PR URL. The legacy TypeScript errors above remain outside this version's scope.

The implementation SHA identifies the final code/test commit; the following documentation-only commit records this verification and SHA in the same `work` → `main` change set.

### Completion contract for Codex
In the implementation PR for `2026.10.1`, Codex must update this section to include:
- **Status:** `DEVELOPED`
- **Implementation PR:** actual GitHub PR URL
- **Implementation commit:** final implementation SHA
- **Verification:** tests/lint/build results
- **Known gaps:** any remaining gap, or `none`

Codex must return the PR link to the user when finished. If its environment cannot create a PR directly, it must return the direct GitHub compare/create-PR link and clearly state that the final GitHub PR creation click is still required.


---

## Previous developed version

**Version:** `2026.10.2`  
**Status:** `DEVELOPED`\
**Implementation PR:** Not created, as requested. [Create work → main PR](https://github.com/ZakTreister/Pokemon-Israel/compare/main...work?expand=1)\
**Implementation commit:** `a9b993f61d820f21057532f4ff0bdb7f065c7be9`\
**Developed on:** `2026-10-13`

### Scope

#### 1. Merge team ranking/statistics into חברי נבחרת
On the team page, remove the separate **דירוג וסטטיסטיקה** tab.

Use one unified **חברי נבחרת** table with:
- **מיקום**
- **שם מלא**
- **עיר**
- **מספר שחקן**
- **נקודות**
- **טורנירים**

Requirements:
- in RTL, **מיקום** appears immediately to the right of the player name
- default ordering is canonical team rank ascending
- players without ranking data remain visible with neutral/empty ranking values
- preserve full-row navigation to the public player profile
- preserve compact admin edit/remove actions in the row
- use team-specific ranking only; no cross-team overall All Stars ranking
- remove the separate **דירוג וסטטיסטיקה** navigation/tab and any duplicate table/data presentation created solely for it
- reuse the existing shared table/data primitives rather than maintaining parallel roster and ranking tables

#### 2. Replace Cloudinary with AWS S3 generic storage
- Amazon S3 becomes the canonical object store for new uploads
- use the existing production bucket `cardschool-public-prod` in `eu-north-1`
- keep the bucket private with S3 Block Public Access enabled
- use short-lived backend-authorized presigned direct browser-to-S3 uploads
- public objects use the `public/` prefix and are delivered through `https://d1grgd8g6bpbb7.cloudfront.net`
- CloudFront already uses origin path `/public`
- private objects use `private/` and must not be reachable through the public CloudFront distribution
- replace Cloudinary-specific `publicId` assumptions with provider-neutral storage keys/metadata for new uploads
- preserve existing Cloudinary media during migration
- remove active Cloudinary dependency/config only after no active upload path needs it
- keep the storage abstraction extensible for future PDFs, spreadsheets/exports and other managed files

#### 3. Optional team logo upload
- a team does not require a logo
- team creation/editing must work with no logo
- admin can upload, replace and remove a logo when desired
- use the shared uploader/storage service
- new team logos live under `public/teams/<team-id>/...`
- public team UI resolves the image through CloudFront
- judges may view but may not change the logo

#### 4. Optional child/player photo upload
- a Player does not require a photo
- player creation/editing must work with no photo
- admin can upload, replace and remove an optional photo for any Player
- applies to All Stars/team players and regular/club children
- reuse the shared uploader
- team-player photos may be public on the already-approved public player profile
- regular/club child photos remain private and are not included in public APIs/pages
- changing player type must not silently expose a previously private photo
- judges cannot change player photos

#### 5. Optional badge/tag image upload
- a badge does not require an image
- badge creation/editing must work with no image
- super-admin can upload, replace and remove an image when desired
- reuse the shared uploader
- new badge images live under `public/badges/<badge-id>/...`
- normal management flow is file upload with preview rather than manual URL entry

#### 6. Complete seasonal badge system
Implement the currently partial badge feature as a complete Season-aware feature.

Existing behavior to preserve:
- dynamic badge definitions rather than a hard-coded fixed set
- admin-only badge management
- team-player-only badge awards
- active/inactive badge definitions
- earned badges on the public All Stars player profile
- badge Season controls live on the Badges page and do not affect rankings/team/tournament eligibility

Required completion:
- add the active badge Season to every new badge award
- require an active badge Season before awarding
- enforce one award per `player + badge + season`, not one award for the player's lifetime
- allow the same badge to be earned again in a later Season
- preserve legacy awards without Season data
- safely migrate/drop the old lifetime `player + badge` unique-index behavior
- include Season in management award history
- expose public-safe Season name and optional badge image on the public All Stars player profile
- preserve historical awards when a badge is edited or deactivated
- allow super-admin to remove/revoke an awarded badge from a player with confirmation
- implement award removal as soft revocation with `revokedAt` / `revokedBy`; revoked awards disappear from normal/public earned-badge views
- allow re-awarding the same badge in the same Season after the previous award was revoked
- allow super-admin to soft-delete a badge Season
- persist Season deletion metadata such as `deletedAt` / `deletedBy`
- exclude deleted Seasons from normal Season history/listing and active-Season resolution
- deleting a Season preserves its award records but hides the deleted Season name from public player badge display
- if an active Season is deleted, no Season remains active until another is opened
- keep the current no-judge badge/Season mutation rule

#### 7. Optional All Stars profile description and birthday
Add optional profile fields for team players:
- optional `description` / short biography, maximum 500 plain-text characters
- optional `dateOfBirth` stored with date-only semantics

Management:
- admin can set/change/remove both fields in team-player create/edit flows
- neither field is required
- regular/club players are unchanged by this scope

Public profile:
- show description when present
- show calculated current age when date of birth is present
- never expose the exact date of birth in the public API or page
- omit age entirely when date of birth is absent
- reject future dates
- calculate age correctly around birthdays without timezone day-shift bugs

#### 8. Shared image rules
- the upload capability itself is required in this version for team, player/child and badge management even though the images are optional
- JPEG, PNG and WebP
- maximum 5 MB by default
- backend authorization and validation are authoritative
- one reusable image-upload component/service with preview, upload state, replacement/removal and Hebrew errors
- do not expose AWS credentials in frontend code
- do not implement arbitrary unrestricted file uploads in this version

### Required verification
Codex must inspect the current implementation and the AWS storage architecture docs, implement the full approved `2026.10.2` scope, add/update relevant server/UI tests, and run tests, lint and build.

At minimum verify:
- unified team member/ranking table behavior
- presign authorization and upload-purpose validation
- image type/size validation
- storage-key namespace/ownership
- optional team logo upload/replacement/removal
- optional child photo upload and public/private visibility
- optional badge image upload/replacement/removal
- active Season required for new badge awards
- one same-badge award per player per Season, with re-award allowed in a later Season
- legacy badge awards without Season remain readable
- badge award history and public profile include Season/public-safe badge media
- badge revocation removes the award from normal/public views and permits a later re-award
- optional team-player description persists and appears publicly when present
- optional team-player date of birth remains private while public DTO/profile expose only correctly calculated age
- future birth dates are rejected and missing birth date omits age
- Season soft deletion is hidden from ordinary Season history and never counts as active
- awards belonging to a deleted Season remain preserved, with the deleted Season name hidden publicly
- creation/editing of team, player and badge succeeds without an image
- judge mutation denial
- legacy Cloudinary media compatibility

### Implementation verification

- `npm run test:stage-a`: **PASS** — 31 server tests; no failures/skips. Includes real AWS SDK presigned-POST policy verification, purpose/type/size/ownership validation, conditional object verification/promotion, optional team/player/badge media, public/private photo boundaries, legacy Cloudinary compatibility and safe replacement cleanup including historical tournament references.
- Server regressions cover Season-required awards, seasonal uniqueness and legacy-index migration, repeated awards in later Seasons, soft revocation/re-award, active-Season index migration, soft deletion and retained award records, deleted-Season name privacy, biography limits, date-only birthday calculations and public age-only DTOs.
- `npm run test:stage-a:ui`: **PASS** — all 9 verification scripts. Includes the single unified member/ranking table with unranked members and independent row actions, generic direct-upload flow, preview/progress/busy/error/removal states, optional create/edit media and profile fields, preserved in-flight form edits, Season-aware badge presentation and confirmed revocation/Season deletion.
- `npm run lint`: **PASS** — 0 errors; 4 existing warnings.
- `npm run build`: **PASS** — production Vite build; existing Browserslist, mixed-import and bundle-size warnings remain.
- `git diff --check`: **PASS**.
- Supplemental `npx tsc -p tsconfig.app.json --noEmit`: the same 17 pre-existing legacy errors as the baseline; no new errors. This is not the configured build command.

**Known implementation gaps:** none.

**Verification limitation:** live uploads against the production S3 bucket were not exercised because AWS credentials are not bound in this workspace. HTTP integration tests use an injected object-storage provider; the presigned-POST policy test uses the actual AWS SDK signer. Production uses the already-configured Render/AWS resources described in the architecture document.

No PR was created, per the implementation request. The link above opens GitHub's creation form; the final PR creation click remains with the user. The implementation SHA is the final code/test commit; the following documentation-only commit records completion metadata.

### Completion contract for Codex
In the implementation PR for `2026.10.2`, Codex must:
- mark **Status** as `DEVELOPED`
- record the actual PR URL
- record the final implementation SHA
- record tests/lint/build results
- record known gaps, or `none`
- return the PR link to the user

If PR creation is unavailable, return the direct GitHub compare/create-PR link and clearly state that the final GitHub PR creation click is still required.


---

## Current version

**Version:** `2026.10.3`  
**Status:** `READY_FOR_DEVELOPMENT`  
**Implementation PR:** _pending_

### Scope

#### 1. Delete/archive player
Add a visible admin-only **מחק שחקן** action in player management.

Behavior:
- show an explicit confirmation dialog
- normal deletion is soft deletion/archive
- preserve the Player record and all historical tournament/result references
- exclude deleted players from normal active player lists
- exclude deleted players from future team/tournament assignment choices
- if the player is currently assigned to a team, deletion must leave no active roster membership
- judge cannot delete players
- do not hard-delete historically referenced Player records in this flow

#### 2. Edit player directly from managed team page
On each player row in the management version of the team page, add an explicit **עריכת שחקן** action/link for admin.

Requirements:
- open the canonical Player edit flow for that player
- reuse existing edit components/logic
- do not create a second independent player editor
- preserve whole-row navigation to the public profile
- edit action must not trigger row navigation
- judge remains read-only

#### 3. Warn before creating a likely duplicate player
Before creating a Player, perform a server-backed normalized duplicate check.

Matching rule:
- team player: normalized first name + last name + city
- club player: normalized first name + last name + club

When a likely duplicate exists:
- show a clear Hebrew warning/modal
- show enough existing-player context to identify the match
- provide a way to open/edit the existing player where practical
- do not silently create
- allow admin to explicitly choose **צור בכל זאת**
- normalize whitespace/case consistently with existing player matching rules

This is a warning workflow, not a hard uniqueness constraint.

### Required verification
Codex must inspect current code first, reuse existing player edit/normalization infrastructure, add/update relevant automated tests, run tests, lint and build, and make no unrelated changes.

### Completion contract for Codex
In the implementation PR for `2026.10.3`, Codex must:
- mark **Status** as `DEVELOPED`
- record the actual PR URL
- record the final implementation SHA
- record tests/lint/build results
- record known gaps, or `none`
- return the PR link to the user

If PR creation is unavailable, return the direct GitHub compare/create-PR link and clearly state that the final GitHub PR creation click is still required.
