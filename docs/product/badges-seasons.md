# Badges and Seasons

## Badge definition
A badge has:
- name
- optional image
- explanation/description

Badge definitions are dynamic, not a fixed hard-coded set.

## Badge/tag image upload
Badge images use the shared AWS S3 upload/storage capability defined in `docs/architecture/media-upload.md`.

Requirements:
- the badge image is optional; badge creation/editing must succeed without an image
- super-admin can upload an image while creating/editing a badge definition
- super-admin can replace or remove the image
- supported image types/limits follow the shared image-upload rules
- new uploads are stored under `public/badges/<badge-id>/...`
- persist provider-neutral storage metadata; do not introduce new Cloudinary `publicId` dependencies
- the normal management UX is file upload with preview, not manual remote-URL entry
- existing legacy badge image URLs remain readable until intentionally migrated

## Permissions
The Badges page is super-admin only.
Super-admin can create and manage badge definitions.
Badge/Season management is not a judge page unless a later decision changes this.

## Badge awards
Badge awards apply only to All Stars / team players.

A new award must preserve:
- player
- badge
- awarded date/time
- staff user who awarded it
- the active badge Season in which it was awarded

Season behavior:
- a badge can be awarded only while a badge Season is active
- when no badge Season is active, the management UI must explain that a Season must be opened before awarding
- the same player may receive the same badge at most once **per Season**
- the same player may earn that badge again in a later Season
- closing/opening a badge Season never removes or rewrites prior awards
- prior Season awards remain visible in history and on the approved public All Stars player profile

Legacy compatibility:
- existing award records created before Season linkage may have no Season
- keep those records readable; do not discard them during migration
- migrate the old lifetime `player + badge` uniqueness rule safely so it does not prevent earning the same badge in a later Season
- new Season-aware awards must enforce uniqueness on `player + badge + season`

Badge definition changes:
- deactivating a badge prevents new awards but must not remove historical awards
- editing a badge definition must not delete award history
- no award-revoke/delete workflow is required unless separately specified

## Badge management UI
The super-admin Badges page is the single management surface for badge definitions, badge Seasons and awards.

It must support:
- see the active badge Season and previous Seasons
- open a new Season when none is active
- close the active Season
- create/edit a badge definition
- optional badge image upload/replace/remove using the shared AWS media uploader
- activate/deactivate a badge definition
- award an active badge to an eligible active All Stars player
- show award history with at least player, badge, Season, awarded date and awarding staff user

The badge image is optional. Name remains required; description is optional.

The existing legacy Lucide `icon` field may remain readable as a fallback during migration, but the primary new-media workflow is the optional uploaded badge image.

## Public All Stars player badge display
The existing public All Stars player profile displays earned badge history.

For each award expose only public-safe data:
- badge name
- description
- optional badge image
- awarded date
- badge Season name when available

Do not expose:
- awarding staff identity
- internal storage keys
- admin-only badge metadata

Inactive badge definitions may still appear in historical earned-badge records.

## Seasons
There are approximately 3-4 Seasons during a year.
Seasons are primarily a badge-domain concept.

Important:
- Seasons do NOT reset regular-player scoring.
- Seasons do NOT reset team-player scoring.
- Seasons do NOT reset team standings.
- Seasons do NOT block team creation.
- Seasons do NOT block roster changes.
- Seasons do NOT determine tournament eligibility.
- Seasons do NOT scope tournament scoring.

## No standalone Seasons page
Remove the standalone user-facing Seasons management page and its management navigation item.

Remove old business logic that couples Season state to:
- team creation
- team updates
- roster management
- tournament creation
- tournament scoring/rankings

The Season model may remain if it is useful for badge award history and transitions.

## Season transition
The super-admin performs Season transitions manually from the Badges page.

The current Season should be visible on the Badges page.
Season transition controls belong there.

## Team competition year is separate
The annual All Stars scoring cycle that resets around September 1 is a separate concept from Season.
Do not overload Season to mean competition year.
