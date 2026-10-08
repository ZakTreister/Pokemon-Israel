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
A future button/placeholder belongs on the unified Tournaments page for importing roughly the last five years of regular/club tournament results via Excel.
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

## 2026-10 — Cloudinary is the reusable image-upload provider
Stage A introduces a reusable image-upload capability backed by Cloudinary.
The first required use is team logos, but the same abstraction should support future child photos, badge images, news images and other media.
Cloudinary secrets must never be exposed to the browser.

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
Previous rounds stay intact and the participant roster remains locked.


## 2026-10 — One open internal tournament per team
Each All Stars team may have at most one open/live internal tournament at a time.

The rule is backend-enforced and concurrency-safe.
When an open tournament exists, the team UI shows **המשך טורניר** instead of allowing another **התחל טורניר** action.
Completed and historical tournaments do not block creation of the next live tournament.


## 2026-10 — Tables support sorting; rankings default to place
Tables with meaningful columns should support user sorting through reusable table behavior.

Player/child ranking pages always open sorted by canonical place/rank ascending. User-selected sorting changes only the view, not the ranking calculation.

## 2026-10 — Every All Stars player has a public profile page
Every team player has a public All Stars player page. Public All Stars player names link to that page.

There is still no global child directory, and club/regular players still do not have public individual profile pages.

## 2026-10 — Public pages show a floating trial-registration CTA
Public pages show a reusable floating CardSchool-branded **הירשמו לשיעור ניסיון** CTA.

It is not shown in management/admin, authentication, or live tournament-operation screens. Its approved destination is `https://lp.cardschool.co.il`, configured centrally/shared rather than repeated page by page.
