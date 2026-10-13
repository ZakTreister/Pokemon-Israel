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

## Current version

**Version:** `2026.10.2`  
**Status:** `READY_FOR_DEVELOPMENT`  
**Implementation PR:** _pending_

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

### Completion contract for Codex
In the implementation PR for `2026.10.2`, Codex must:
- mark **Status** as `DEVELOPED`
- record the actual PR URL
- record the final implementation SHA
- record tests/lint/build results
- record known gaps, or `none`
- return the PR link to the user

If PR creation is unavailable, return the direct GitHub compare/create-PR link and clearly state that the final GitHub PR creation click is still required.
