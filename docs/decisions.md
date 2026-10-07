# Product Decisions

This file records current decisions that supersede earlier assumptions in code or prior implementation plans.

## 2026-10 — No child login in Stage A
Neither club players nor All Stars players log in.
Team-player workflows must not require User accounts.
Existing legacy links may remain backward compatible.

## 2026-10 — Stage A includes the public navigation and homepage
The approved main site menu and the homepage content defined in `docs/product/navigation-content.md` and `docs/product/homepage.md` are now part of Stage A.
They are not deferred to a later polish phase.

## 2026-10 — Prominent button treatment applies to standalone actions
Use the CardSchool `shadow-button` treatment for standalone action buttons.

Do NOT apply the same strong elevation to controls that already live inside another component, including:
- header/menu navigation items
- management sidebar items
- inline remove-player/remove-user controls
- inline table/list actions
- compact icon actions

Embedded controls should use the parent component's lighter interaction styling.

## 2026-10 — “בהקמה” is an attached menu badge
In the main site menu, **בהקמה** is not inline text.
It is an absolutely positioned small pill badge at the visual top-left of the relevant menu item, with an elliptical/rounded-full border.

## 2026-10 — Nested pages use one back action
Provide one clear back control on nested management/team/tournament pages.
Do not show duplicate back buttons for the same navigation action.

## 2026-10 — Network errors are user-facing Hebrew states
Raw technical network errors must never be the primary user message.
Show a short Hebrew explanation plus the required next action and whether normal work may continue safely.

## 2026-10 — Result submission has an explicit saving state
After a tournament match result is submitted and before server confirmation, show **שומר את התוצאה…** (or equivalent) rather than “לא הוזנה תוצאה”.
On failure, clearly state that the result was not saved and allow retry.

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

## 2026-10 — Tournament deletion is super-admin hard delete
Super-admin may permanently delete any tournament, including completed tournaments, across all tournament types.
Judges may not hard-delete tournaments.
Because rankings are derived from tournament/result data, deleted tournaments must stop contributing to ranking calculations.
Deletion must also clean up or avoid orphaned dependent tournament state.

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

## 2026-10 — Live tournament updates use WebSocket/Socket.IO
Normal tournament operation should update live via the existing Socket.IO infrastructure.
Remove the manual “refresh from server” button from normal UX.
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
