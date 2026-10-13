# Product Decisions

This file records current decisions that supersede earlier assumptions in code or prior implementation plans.

## 2026-10 — No child login in Stage A
Neither club players nor All Stars players log in.
Team-player workflows must not require User accounts.
Existing legacy links may remain backward compatible.

## 2026-10 — Stage A includes the public navigation and homepage
The approved main site menu and the homepage content defined in `docs/product/navigation-content.md` and `docs/product/homepage.md` are now part of Stage A.
They are not deferred to a later polish phase.

## 2026-10 — Shadow buttons are consistent within an action row
If any button in a visual action row/group uses `shadow-button-<color>`, every button in that same row/group must also use an appropriate shadow treatment.

Embedded/contextual controls outside that action row — such as navigation items, sidebar items, inline remove-player controls and compact row actions — remain flat unless they themselves belong to a shadowed action group.

## 2026-10 — “בהקמה” uses a floating micro-tag
Do not use the old pill/elliptical badge.
Use a compact floating rounded-rectangle micro-tag with subtle background/border styling.

It must be absolutely positioned and must not affect menu-item layout.
All main-menu items must remain aligned on the same baseline and vertical line whether or not they have the tag.

## 2026-10 — Nested pages use one back action
Provide one clear back control on nested management/team/tournament pages.
Do not show duplicate back buttons for the same navigation action.

## 2026-10 — Network errors are user-facing Hebrew states
Raw technical network errors must never be the primary user message.
Show a short Hebrew explanation plus the required next action and whether normal work may continue safely.

## 2026-10 — Result submission has an explicit saving state
After a tournament match result is submitted and before server confirmation, show **שומר את התוצאה…** (or equivalent) rather than “לא הוזנה תוצאה”.
On failure, clearly state that the result was not saved and allow retry.

## 2026-10 — Judge is a live-tournament operator only
Judge permissions are limited to operating tournaments that are being opened or are currently active.

A judge may open a tournament, manage its pre-round participant list, enter/correct live results, advance/end rounds and close the tournament.

A judge may not create/edit/delete teams or players, change permanent rosters, delete tournaments, edit completed historical data, perform historical manual entry or Excel import, or manage badges/Seasons.

Administrative configuration belongs to admin.

## 2026-10 — One management area
The user-facing management concept is only **ניהול**.
Remove/avoid **ניהול משותף** as a separate management area.

## 2026-10 — Management labels
Use:
- **סקירה כללית** as the first management item
- **נבחרות All-Stars** instead of “נבחרות וסגלים”
- **טורנירים** instead of “טורנירים רגילים”

Do not expose a separate “טורנירים פנימיים” management tab.

## 2026-10 — Seasons are only a badge-domain concept
There are roughly 3-4 Seasons per year.
Season transitions are performed by super-admin from the Badges page.
Season changes do not reset any rankings.
Remove the standalone Seasons page and remove old Season coupling from teams, tournaments and rankings.

## 2026-10 — Team competition year is separate from Season
All Stars/team competitive scoring accumulates through a competition year and resets around September 1 through an explicit super-admin action.
Historical yearly team data is preserved.

## 2026-10 — Regular ranking is lifetime
Regular/club player points accumulate across the player's lifetime.
No Season/year reset.

## 2026-10 — Scoring is separated by tournament context
Regular tournament scoring and team-domain scoring are separate.
Internal team tournaments rank team players; inter-team encounters rank teams.
Do not infer the scoring bucket from the player's current type alone.

## 2026-10 — Team creation is not Season-locked
Creating a team is allowed while a Season is active.
General team structural work must not be globally blocked by badge Season.

## 2026-10 — Team-player profile discovery
Team-player child profiles are linked only through the team page.
No global child directory.
Club players have no public individual profile.

## 2026-10 — Tournament deletion is soft by default
Tournament deletion is super-admin only across all tournament types, including completed tournaments.

The normal delete flow performs a soft delete by default. The confirmation dialog includes an explicit **מחיקה לצמיתות** checkbox/toggle that is unchecked by default.

Soft-deleted tournaments remain stored with deletion metadata but are excluded from normal lists/public views and immediately stop contributing to rankings, statistics, counts and open-tournament constraints.

Permanent hard delete happens only when the super-admin explicitly opts into **מחיקה לצמיתות**. Judges cannot delete tournaments at all.

No restore UI is required in the current iteration, but soft deletion must preserve enough data for future recovery/audit.

## 2026-10 — One unified tournament-management list
The management Tournaments page contains all tournament types:
- internal team tournaments
- inter-team encounters
- regular/club tournaments

It must support filtering by lifecycle/status and by tournament type.
Users with management permission may open the relevant tournament-management page.

## 2026-10 — Internal historical tournament entry stays under the team
Historical internal-team result entry is a team-context action, not a separate management tab.
If the capability already exists in the codebase, preserve and reuse it rather than reimplementing a duplicate flow.

## 2026-10 — Regular historical Excel import deferred
A future admin entry point belongs on the unified Tournaments page for importing roughly the last five years of regular/club tournament results via Excel.

Because this is a rare/future operation, it should live in a secondary/advanced or **עוד פעולות** context rather than as a prominent peer of normal tournament operations.
The actual Excel importer is NOT part of Stage A and must not be implemented until the real file is available and inspected.

## 2026-10 — WebSocket/Socket.IO is only for live tournament management
Socket.IO is used only while an authorized user is actively inside the operational management screen of a live tournament.

Do not maintain WebSocket connections elsewhere in the application. Public pages, rankings, news/events, management overview/lists, team/player administration and historical-entry screens use normal HTTP/API fetch/refetch flows.

Entering live tournament management creates/subscribes to the tournament-specific connection; leaving that screen cleans it up.
Remove the manual “refresh from server” button from live tournament operation.
Initial page load/refresh still fetches canonical server state.

## 2026-10 — Homepage team stats must be real
Do not calculate team win rate from internal tournaments.
True team standings/win rate come from official inter-team encounters.
Stage A may show active teams without pretending they are competitively ranked.

## 2026-10 — Homepage top decks are removed
The top/leading decks area is not part of the current homepage.
Replace that space with the approved All Stars, ranking, event and news content.

## 2026-10 — Badge administration is super-admin only
The Badges page, badge definition management and Season transition UX are restricted to the super-admin unless changed later.


## 2026-10 — Badge awards are Season-aware
Badge definitions are dynamic; the product does not hard-code a fixed set of eight badge definitions.

Badges may be awarded only to All Stars/team players and only while a badge Season is active.

A player may receive a given badge at most once in a particular badge Season, and may earn the same badge again in a later Season. Every new award records its badge Season. Historical awards remain preserved across Season transitions and remain visible on the approved public All Stars player profile.

Legacy awards created before Season linkage remain readable during migration.

Badge awards can be removed from a player by super-admin. Removal is recorded as a soft revocation so audit data is preserved, while revoked awards disappear from normal/public earned-badge views. A revoked award does not block re-awarding that badge in the same Season.

Badge Seasons can also be soft-deleted by super-admin. Deleted Seasons do not appear in normal Season history and never count as active. Their historical award records remain preserved, but public player data does not expose the deleted Season's name.

## 2026-10 — AWS S3 is the reusable file-storage provider
This decision supersedes the earlier Cloudinary decision.

Cardschool uses Amazon S3 as the canonical reusable object store, with direct browser uploads authorized by the backend through short-lived presigned uploads.

The storage layer is intentionally generic so it can later support non-image files such as PDFs, spreadsheets/exports and managed documents.

The current release must provide image-upload capability for:
- optional team logo
- optional child/player photo
- optional badge/tag image

None of these images is a required field. Team, player/child and badge creation/editing must remain valid without an image; the requirement is that authorized administrators have the option to upload, replace and remove one.

The S3 bucket remains private with Block Public Access enabled. Public assets are stored under `public/` and delivered through CloudFront; private assets are stored under `private/` and are not exposed by the public CloudFront distribution.

Persist provider-neutral storage keys/metadata instead of Cloudinary-specific `publicId` fields for new uploads. Preserve legacy media records during migration.

AWS credentials remain server/deployment secrets and must never be exposed to the browser or committed to source control.

## 2026-10 — News Phase 1 is manual
Use the existing Updates capability as the basis for News.
Manual paste/admin publishing comes first; automated WhatsApp Channel ingestion is future work.


## 2026-10 — Historical internal team results use pasted standings
The primary historical All Stars tournament-entry flow is a large pasted-standings textarea, parser, automatic player matching and explicit manual mapping for unresolved/ambiguous names.

Reuse the proven legacy behavior from commits `b894982f22386fdcebdd6724ae84b0540df6e171` and `e2c9cf3b983672793eaeffd538afd47e9d242fb8`, adapted to the current Player-based internal-tournament model.

The current row-by-row manual entry is not the preferred primary UX.

## 2026-10 — Live internal tournaments can cancel the latest round
Authorized live-tournament operators can cancel only the latest/current active round.
The cancelled round is archived for audit/history, removed from active standings, and may be re-paired.
Previous rounds stay intact. The future participant plan remains independently editable and never rewrites an already-created round.


## 2026-10 — One open internal tournament per team
Each All Stars team may have at most one open/live internal tournament at a time.

The rule is backend-enforced and concurrency-safe.
When an open tournament exists, the team UI shows **המשך טורניר** instead of allowing another **התחל טורניר** action.
Completed and historical tournaments do not block creation of the next live tournament.


## 2026-10 — Tables support sorting; rankings default to place
Tables with meaningful columns should support user sorting through reusable table behavior.

Player/child ranking pages always open sorted by canonical place/rank ascending. User-selected sorting changes only the view, not the ranking calculation.

## 2026-10 — Every All Stars player has a public profile page
Every team player has a public All Stars player page.

In team-player lists/tables, the entire player row/card is the navigation target to that profile; the name is not the only clickable area. Nested action controls remain independent and must not trigger row navigation.

There is still no global child directory, and club/regular players still do not have public individual profile pages.

## 2026-10 — Public pages show a floating trial-registration CTA
Public pages show a reusable floating CardSchool-branded **הירשמו לשיעור ניסיון** CTA.

It is not shown in management/admin, authentication, or live tournament-operation screens. Its approved destination is `https://lp.cardschool.co.il`, configured centrally/shared rather than repeated page by page.


## 2026-10 — Round 1 pairings are randomized
The first round of a live Swiss tournament is randomized on the server and must not follow alphabetical roster order, IDs, or frontend ordering.

The created round is persisted immediately. Round 1 is not re-randomized on refresh/reconnect. From round 2 onward the normal Swiss pairing policy applies.

Automated tests must control/inject the randomness rather than depend on probabilistic assertions.

## 2026-10 — Match-result saves use match-level concurrency
Ordinary match result entry uses a per-match result/version guard rather than treating every sibling match draft as stale whenever the tournament-wide revision changes.

Different matches can be drafted and saved sequentially or concurrently without invalidating one another. Concurrent edits to the same match still conflict safely.

Tournament-wide revision protection remains authoritative for structural changes such as attendance, round creation/cancellation, close, and earlier-round corrections that invalidate later rounds.


## 2026-10 — Events is the public all-tournaments view
The public **אירועים** page is the public-facing counterpart of management **טורנירים** and exposes all non-deleted canonical tournament types: regular/club, internal All Stars and inter-team.

Users can filter by lifecycle/status and tournament type and use public search. Public tournament details/results must also support the canonical Swiss/internal engine rather than excluding it.

A public tournament page shows the results of that specific tournament: final results when completed, current results while active, and no invented results before it starts. It must not replace tournament results with another ranking view.

Public responses use explicit safe fields and never expose management permissions, staff identities, revisions, audit/deletion metadata or controls. Public Events/detail pages use HTTP only, not Socket.IO.

Public and management tournament lists should reuse shared filter/domain/presentation primitives where sensible, while management-only actions remain outside the shared public component.


## 2026-10 — Team management uses compact member lists
The main `/manage/teams` page is a compact team overview. It must not show all children under all teams expanded by default.

If inline team-member rows are kept for quick administration, they appear under an independent **חברי נבחרת (N)** disclosure that is collapsed by default.

User-facing team-management terminology uses **חברי נבחרת** instead of **סגל**. The internal technical term `roster` may remain unchanged.


## 2026-10 — Every team has an assigned teacher
Each All Stars team has one assigned teacher, referencing an existing staff user whose role is `admin` or `judge`. One staff user may teach multiple teams.

Teacher is a team relationship, not a new authorization role. A judge teacher remains a judge and does not receive admin team/player configuration permissions. Assigning/changing a teacher is admin-only.

The management **סקירה כללית** page shows the signed-in user's assigned teams with a quick **התחל טורניר** action, or **המשך טורניר** when that team already has an open live tournament.

Teacher identity remains internal management data for now and is not exposed on public team pages.


## 2026-10 — Management actions use progressive disclosure
Management screens emphasize the current task rather than displaying every capability as an equal button.

For team cards, **התחל טורניר / המשך טורניר** is the primary visible action and **חברי נבחרת** is the secondary action. Team configuration, history and other low-frequency administration move into the team detail context, with rare actions optionally under an accessible **עוד פעולות** menu.

The team page organizes members, ranking/statistics and tournament history as sections/tabs, while admin configuration belongs under **הגדרות נבחרת**.

Teacher cards on **סקירה כללית** remain minimal and show the tournament quick action plus ordinary navigation to the team page.

No capability is removed by this cleanup, and the management navigation/menu structure is explicitly unchanged.


## 2026-10 — All Stars individual ranking is team-specific only
All Stars players are ranked inside their own team from that team's internal tournament results.

There is no overall individual All Stars ranking that compares players across different teams. Do not calculate, expose or display an `overall All Stars ranking` on player profiles or public All Stars pages.


## 2026-10 — Route navigation starts at the top
Every navigation to a different application page/route opens the destination at the top.

This is implemented centrally at the React Router/layout boundary so links, programmatic navigation, clickable rows/cards and browser back/forward follow the same behavior. Same-page state changes do not reset scroll. Explicit anchor/hash navigation may target its requested section.


## 2026-10 — Team players have a player number
Every All Stars/team player has a **מספר שחקן** stored as a reusable player display/profile field, including for future shirt/kit presentation.

New team-player create/edit flows include the field and new team players require it. Legacy team players without a number remain readable/editable for backfill. The number is not an identity key, and no uniqueness/range rule is defined yet.

## 2026-10 — All Stars profile biography and age are optional
All Stars/team players may have an optional short description and optional date of birth.

The description is public profile content when present.

Date of birth remains private management data. Public player APIs/pages expose only the calculated current age, never the exact birth date. Missing values remain valid and do not show empty placeholders.

## 2026-10 — Team page uses one unified member/ranking table
The team page does not have a separate **דירוג וסטטיסטיקה** tab.

**חברי נבחרת** is the single player table and contains position, full name, city, player number, points and tournament count. In RTL, position appears immediately to the right of the player name.

Ranking remains team-specific only. Team members without ranking history remain visible in the table.


## 2026-10 — Team-player creation includes team assignment
Creating a **שחקן נבחרת** from the general Players management page requires choosing the All Stars team in the same form and submit. Do not create a new unassigned team player and require a second assignment step.

When creation is initiated from a specific team context, that team is already known and should be used implicitly/preselected.

## 2026-10 — Team-member edit/remove lives with חברי נבחרת
Admin can edit a team player's team-facing fields and remove/unassign that player directly from the team's **חברי נבחרת** tab using compact row-level actions.

Removing a player from a team changes membership only and does not delete the Player record. The general Players page remains available as a broader administration surface.


## 2026-10 — Events visually mirrors tournament management
The public **אירועים** list should look and behave like the public-safe version of management **טורנירים** rather than a separately designed tournament browser.

Both views reuse the same summary/card/row presentation, filter patterns, tournament type/status labels and responsive information hierarchy where practical. The public wrapper navigates to public details/results; the management wrapper adds management-only actions and permissions.


## 2026-10 — Live tournaments have an editable next-round participant plan
The live internal-tournament screen adds **משתתפים** beside the existing standings/results control. The existing **דירוג ותוצאות** control is renamed **טבלה** without changing its behavior.

**משתתפים** reuses the checkbox-based team-member selection pattern. Before round 1 it defines round-1 participants; after a round exists it defines participants for the next uncreated round and remains editable while the current round is being played.

An already-created round is never changed by participant edits. Unchecked players retain prior results and standings impact but are excluded from future pairing. Newly checked players enter from the next round with 0 points for rounds they missed. Re-adding an eligible player for a later round is allowed.

Tournament participant editing never changes permanent team membership. The implementation preserves historical participant snapshots and stores the next-round eligible set separately.


## 2026-10 — Versioned specification workflow
Approved specification work is tracked in `docs/version.md` using calendar versions such as `2026.10.1`.

Codex implementation PRs must mark the requested version **DEVELOPED**, record the PR URL/final SHA/verification results, and return the PR link. The next version begins only after the prior version is marked developed unless explicitly queued otherwise.

## 2026-10 — Homepage hero cards are directly draggable
The three homepage hero trading cards keep their existing sizes. On touch devices the user can drag/swipe them horizontally and they settle/snap into position.

The center card uses the existing Pikachu image asset; the side cards use Poké Ball and trophy artwork. This change affects card artwork and direct manipulation, not relative card sizing.


## 2026-10 — Team member table includes ranking/statistics
The team page no longer has a separate **דירוג וסטטיסטיקה** tab.

The **חברי נבחרת** table is the single team-player table and includes:
- position
- full name
- city
- player number
- points
- tournaments

In RTL, position appears immediately to the right of the player name. Default ordering remains canonical team rank ascending. Players without ranking data remain visible.


## 2026-10 — Version 2026.10.2
Version `2026.10.2` removes the separate team **דירוג וסטטיסטיקה** view and merges its position, points and tournament-count data into the existing **חברי נבחרת** table.


## 2026-10 — Player deletion is soft and history-preserving
Admin gets a visible **מחק שחקן** action. Normal deletion archives/soft-deletes the Player instead of removing historical competition references. Deleted players disappear from normal active lists and future assignment choices. Judge cannot delete players.

## 2026-10 — Managed team rows link to canonical player editing
On the managed team page, admin can open **עריכת שחקן** directly from each member row. This reuses the canonical Player edit flow; it is not a separate duplicate editor.

## 2026-10 — Player creation warns about likely duplicates
Before creating a player, the server checks normalized identifying fields and the UI warns when a likely existing player matches.

Team players use normalized first name + last name + city. Club players use normalized first name + last name + club.

The warning does not permanently block creation: admin may explicitly **צור בכל זאת** because distinct children can share the same identifying fields.


## 2026-10 — Player deletion is soft deletion
Admin has an explicit **מחק שחקן** action in Players management. It requires confirmation and soft-deletes/archives the Player so tournament results, rankings, awards and historical references remain intact.

Deleted players are removed from active lists/selection, current team membership and ordinary public discovery, and cannot participate in new tournament or badge operations. Judges cannot delete players.

## 2026-10 — Team page links to canonical player editor
In management context, **חברי נבחרת** rows include a compact admin-only **עריכת שחקן** action. It opens/reuses the canonical Player edit flow rather than introducing a second team-specific editor.

## 2026-10 — Player creation warns about likely duplicates
Player creation performs normalized, server-backed likely-duplicate detection before final creation.

A likely match opens a warning dialog with the existing player and gives the admin a path to edit that player or explicitly **צור בכל זאת**. It is a warning/confirmation flow rather than a hard uniqueness constraint.


## 2026-10 — Team management rows show logo and edit action
The **ניהול → נבחרות All-Stars** overview shows each team's current logo/image in the team summary/card/row when available, with a neutral placeholder when absent.

Admin also gets a clear **עריכת נבחרת** action from that same summary/card/row. It reuses the canonical team edit/settings flow. Judges remain read-only.


## 2026-10 — Player editing uses one reusable editor
The canonical Player edit dialog is shared by **ניהול → שחקנים** and managed team pages.

UI/presentation lives in a reusable Player editor component with reusable form/controller logic; API/service code remains UI-agnostic. The dialog is viewport-bounded, internally scrollable, two-column on desktop and one-column on mobile.

## 2026-10 — Team-player tenure is derived from join date
All Stars/team players may store an optional date-only **תאריך הצטרפות**. User-facing **וותק** is calculated from that date rather than stored as manually maintained text.

## 2026-10 — Team-player personal deck and up to six Pokémon
All Stars/team players may have an optional uploaded personal-deck image plus up to six Pokémon names.

Pokémon names accept English letters/spaces only. Their display images are derived centrally from the Limitless gen9 image base URL by lowercasing the name and replacing spaces with hyphens. Persist the names, not the derived URLs.


## 2026-10 — Team editing uses a shared dialog
**עריכת נבחרת** opens one reusable `TeamEditDialog`, not a separate page.

The same dialog is used from the teams management list and the managed team page. It edits the team's core settings; roster/player assignment remains outside the dialog.
