# Management UI

## Navigation hierarchy
The management experience is one coherent area named **ניהול**.

The first item is always **סקירה כללית**.

Primary labels relevant to Stage A:
- **סקירה כללית**
- **נבחרות All-Stars**
- **טורנירים**

Do not use:
- “נבחרות וסגלים”
- “טורנירים רגילים”
- a separate “טורנירים פנימיים” tab
- a standalone “עונות” tab

## Overview — my teams
The management **סקירה כללית** page should surface teams for which the signed-in staff user is the assigned teacher.

For each assigned team show a compact operational card with:
- team name/logo
- member count when available
- current/open tournament state
- a prominent quick tournament action

Keep this card operationally minimal. Do not add edit/settings/history/member-management buttons to the overview card. The card/name itself may navigate to the team page for everything beyond the quick tournament action.

Quick action:
- no open/live internal tournament -> **התחל טורניר**
- open/live internal tournament exists -> **המשך טורניר**
- never offer creation of a second simultaneous tournament

The quick action follows the current user's existing role permissions; teacher assignment itself does not elevate permissions.

If the user teaches multiple teams, show all of their assigned teams.

## Team-list member disclosure
On `/manage/teams`, team cards must remain compact.

Do not show every team's full child/member list expanded by default.

If member rows remain available inline for quick management:
- label the disclosure **חברי נבחרת (N)**
- keep it collapsed by default
- preserve independent expansion per team
- keep nested actions such as remove/unassign independently clickable

Use **חברי נבחרת** rather than **סגל** for user-facing team-management labels.

Inside the team page's **חברי נבחרת** tab, admin player edit and remove/unassign controls are contextual row actions. They should not appear as large page-level buttons. Removal requires confirmation and removes only the team assignment, not the player record.

## Action hierarchy
Management screens should not present every available capability as an equally prominent button.

Default hierarchy:
- one clear primary action for the screen/card
- at most one or two visible secondary actions when they are genuinely common
- navigation that can be represented by a clickable card/row, tab or section should not automatically become another large button
- low-frequency configuration belongs in the relevant detail/settings page
- rare or destructive operations may be grouped under a compact **עוד פעולות** (`⋮`) menu when discoverability remains reasonable

Examples:
- team card: **התחל/המשך טורניר** is primary; **חברי נבחרת** is secondary
- team configuration such as teacher, name/logo and active state belongs in **הגדרות נבחרת**
- tournament history is a section/tab of the team context rather than another large primary action
- the teacher's overview card shows only the operational tournament shortcut plus normal card navigation

Do not remove capabilities merely to reduce visual noise. Reduce prominence and move them to the context where they are actually used.

This action-density rule does **not** change the management navigation/menu structure.

## Buttons
Use the CardSchool button system consistently.

### Shadow consistency is decided per action row/group
Treat a horizontal action row or visually grouped set of buttons as one styling unit.

If **any** button in that row/group uses a `shadow-button-<color>` treatment, then **every button in the same row/group must also have a shadow treatment**.

Each button may use the shadow/color appropriate to its semantic variant (primary, secondary, destructive, etc.), but one button in a row must not look elevated while its siblings look flat.

If none of the buttons in a row/group uses a shadow, the group may remain flat.

### Embedded / contextual controls
Controls that are not part of such an action row and already live inside another visual component should remain visually lighter.

Examples:
- main/site navigation items
- management sidebar/menu items
- compact remove-player/remove-user control inside a roster row/card
- inline edit/delete controls inside a table/list item
- icon-only actions inside an existing card/row
- filter chips/tabs that already have their own selected/unselected surface

These embedded controls should not receive shadow merely because shadow exists elsewhere on the page.

In short: shadows are **all-or-none within the same action row/group**, not globally all-or-none across the page.

## Tournament deletion dialog
Tournament deletion is admin-only and uses one confirmation dialog.

Default behavior:
- the normal **מחק** action means soft delete
- include a **מחיקה לצמיתות** checkbox/toggle
- the permanent-delete option is **unchecked by default**
- when unchecked, the primary confirmation performs soft delete
- when checked, clearly strengthen the destructive warning/copy before permanent deletion
- do not preselect permanent deletion
- judges must not see tournament deletion controls

The dialog should make it obvious that soft deletion removes the tournament from normal use/rankings while preserving the underlying record, whereas permanent deletion cannot be recovered through the normal product flow.

## Back navigation
Every nested management page must provide an obvious way to return to the previous/parent context.

There must be **one clear back control only** in the page chrome/content hierarchy.
Do not render duplicate back buttons for the same navigation action.

Do not rely only on the browser back button.

## User-facing errors
Technical/network errors must not be shown raw to users.

Display short Hebrew messages that answer two things:
1. what happened
2. what the user should do now / whether they may continue safely

Examples of intended behavior:
- failed mutation/save: explain that the change was not saved, ask the user to check the connection and retry, and tell them not to perform dependent actions until save succeeds
- live WebSocket disconnect while server data is otherwise available: explain briefly that live updates were disconnected and that automatic reconnection is being attempted; the user may continue viewing
- failed page/data load: explain that loading failed and suggest retrying/reloading

Do not expose Axios error objects, stack traces, HTTP jargon, or raw English network messages.

Keep error copy concise.

## Section persistence
When navigating within team-related history/settings/details, the sidebar/tab state remains on **נבחרות All-Stars**.

Only the actual tournament-management screen is allowed to move the active management context to **טורנירים**.

## Mobile menu
The management navigation must:
- open as a mobile-friendly drawer/panel
- have an explicit close button
- close after route navigation
- not cover the content indefinitely
- respect RTL layout

## Forms on mobile
Management forms must be designed for narrow screens.

The create-team form in particular must:
- stack controls vertically when needed
- avoid squeezed multi-column fields
- keep labels, upload control and submit action readable
- avoid horizontal overflow


## Tournament operation density
The running internal-tournament page is an operational screen and should prioritize the current matches over secondary explanatory/status content.

Do not reserve blank mobile space for errors that do not exist.
Do not wrap the full match list in a redundant outer Card.

See `docs/product/internal-tournament-ui.md` for the approved information hierarchy and match-card layout.


## Player management corrections
On the general **ניהול → שחקנים** page:
- admin has an explicit **מחק שחקן** action
- deletion requires confirmation
- deletion is soft deletion/archival so historical tournament, ranking and badge references remain intact
- deleted players disappear from active lists and future selectors

On a managed team's **חברי נבחרת** table:
- admin has a compact **עריכת שחקן** action/link
- it opens the canonical Player editor rather than creating a second team-specific edit form
- it remains independent from public-profile row navigation

During Player creation:
- normalized likely-duplicate detection is server-backed
- a likely match opens a Hebrew warning dialog before final creation
- the dialog offers a path to the existing player and an explicit **צור בכל זאת** override
- duplicate detection is a warning/confirmation flow, not a hard uniqueness constraint


## Team list row actions
On **ניהול → נבחרות All-Stars**:
- show the team's current logo/image directly in each compact team card/row when available
- use a neutral placeholder when no image exists
- provide admin with a clear **עריכת נבחרת** action
- reuse the canonical team edit/settings flow
- judges remain read-only and do not receive the edit action
- keep the existing primary **התחל טורניר / המשך טורניר** action visually primary; **עריכת נבחרת** is secondary


## Player editor dialog layout
The canonical Player editor is shared across management entry points.

It must remain usable on normal laptop/desktop heights:
- cap modal height to the viewport
- scroll the body internally
- keep header/close and save/cancel reachable
- desktop uses a responsive two-column field grid
- mobile uses one column
- long text, media upload/preview and the compact Pokémon-list editor may span the full grid width

The team-page **עריכת שחקן** action and the Players-management **ערוך** action must open this same editor.


## Team edit dialog
The **עריכת נבחרת** action opens a reusable dialog over the current management page.

The same dialog is used from:
- **ניהול → נבחרות All-Stars**
- the managed team page

It contains core team settings only: name, optional logo, assigned teacher and active status when applicable. Roster assignment/removal remains outside this dialog.

After successful save, close the dialog and refresh the current team/list state without a full-page reload.


## Updates management
**ניהול עדכונים** is a working CRUD surface, not a visual placeholder.

Create/edit uses the shared dialog pattern and supports:
- required **כותרת**
- optional **תיאור**
- optional **תמונה**
- optional **קישור**

Delete requires confirmation.

After create/edit/delete, update or refetch the canonical list without a full-page reload. Show concise Hebrew validation/save errors.


## Players list pagination
**ניהול → שחקנים** uses real server-side pagination.

- default 25 players per page
- search and player-type filters are server-side and combine with pagination
- filter/search changes return to page 1
- show current page and total-page context
- provide clear previous/next navigation
- do not preload all Player rows and slice them in the browser
- preserve the current page after normal edits where sensible; recover to the previous valid page when deletion empties the last page


## Tournament list pagination
Management **טורנירים** uses real server-side pagination, matching the Players-management approach.

- default 25 tournaments per page
- lifecycle/type/search filters are server-side
- changing filters/search returns to page 1
- show clear previous/next controls and page context
- do not preload all tournaments

For summary counters, use pagination `total` / count-only data instead of loading entity rows when the rows are not displayed.




## Overview dashboard KPIs — approved 2026.10.4; A26 source revised 2026.10.5

Replace the existing generic overview KPI strip with role-appropriate, fixed KPI sets. Keep the existing operational `הנבחרות שלי` cards (including the single start/continue-tournament action) and other relevant overview content; avoid duplicating KPI cards.

**Judge** (assigned team): exactly three compact metrics scoped to **that assigned team**:
1. **שחקנים פעילים** (`J1`): non-deleted active `team` Players currently assigned to the team.
2. **מיקום בליגה** (`J2`): canonical position in the **current competition year's official inter-team standings**, displayed as `X / N` where N is the number of competing ranked teams. Never derive it from internal player rankings. If official standings are not available/implemented, show `טרם נקבע` or a clearly unavailable state, not an invented rank or an assumed zero.
3. **טורנירים פנימיים** (`J7`): number of non-deleted, completed `team_internal` tournaments for this team (including recorded historical internal tournaments). Label/count as completed, not merely created.

If a judge is assigned multiple teams, keep these three metrics scoped **per team**, rather than merging unrelated teams. Do not reveal another judge's team-only management data.

**Admin**: exactly six system-wide KPI cards in the following **fixed two-row order** (three columns on desktop; responsive stacking on mobile). Do not keep the old `A17` type-breakdown card in the dashboard; it is replaced by the completed-quarterly-tournaments metric.

**Row 1 — All Stars teams**
1. **נבחרות פעילות** (`A1`): count active Teams.
2. **שחקני נבחרות** (`A2`): count active, non-archived Players with `playerType='team'`.
3. **מפגשי נבחרות השנה** (`A26`): dynamic **per-team comparison of completed internal team tournaments** (`type='team_internal'`) in the current team competition year. For this KPI, a 'meeting' means one completed internal tournament for that team. **Do not include `inter_team` tournaments**, even if completed. See calculation below.

**Row 2 — Live operations and club activity**
4. **טורנירים פעילים** (`A13`): count all non-deleted tournaments whose canonical lifecycle is currently `active`, across tournament types.
5. **שחקני חוגים** (`A3`): count active, non-archived Players with `playerType='quarterly'`.
6. **טורנירים רבעוניים שהושלמו** (`A40`, new KPI, replacing `A17`): count completed, non-deleted **quarterly/club tournaments across all years**, including legacy tournaments without an explicit `type` (the existing `type || 'quarterly'` fallback). Include tournaments only if canonical lifecycle is `completed`; exclude future/active ones. Each tournament document is counted once. No grouping into other tournament types.

**A26 computation / display — revised for 2026.10.5**
- Count **completed internal team tournaments only** (`type='team_internal'`, `status='completed'` / canonical `phase='completed'`, `deletedAt=null`). Each eligible tournament contributes **exactly 1 to its own `team`**; it does not contribute to other teams. Use the existing canonical `Tournament.team` reference, including eligible manually imported/historical internal tournaments according to their **actual tournament date**.
- **Explicitly exclude `inter_team` tournaments** (and `quarterly` tournaments), even if they are finished. No official two-team encounter association, inter-team standings or new match model is required for A26.
- Select **all currently active teams**, including those with **zero** eligible internal tournaments. Do not count inactive teams in the comparison, and do not allow an inactive team's count to establish the maximum.
- "השנה" refers to the **current All Stars team competition year**, not lifetime internal-tournament totals. For now (until configurable competition-year start/end dates are implemented), apply the operational **September 1 through following August 31** year boundary in the `Asia/Jerusalem` calendar timezone to the tournament's `date`. Thus in October 2026, eligible events are dated 2026-09-01 through 2027-08-31; an older imported tournament does not count even if it was created/imported recently or has the current placeholder `competitionYear='stage-a-initial'` value. Do not auto-reset official rankings; this date boundary is for the dashboard statistic only.
- `maximum = max(completedInternalCount for every active team)`. If **all counts are equal**, show that common number and `לכל נבחרת השנה` (including `0` when the source is queried successfully and none has any eligible tournaments). If no active teams exist, use a clear empty state rather than inventing a team count.
- If **counts differ**, show **every active team below the maximum** together with its gap `maximum - teamCount` (e.g. `נבחרת ברק — חסרים 2`, `נבחרת אש — חסר 1`). List all lagging teams, including those with zero; sort by largest gap and then Hebrew team name. Explain the gap is relative to the most active team, not necessarily to scheduled/missed events.
- Keep the existing `equal` / `uneven` display and card location; use a real server-side grouped/count query to populate it, rather than the existing `unavailable` placeholder or fetching all tournament rows.
- Continue to show `unavailable` only for an actual query/authoritative-data error, not simply because official `inter_team` infrastructure has not been built. Keep the judge's separate `J2` league ranking pending until official standings exist.
- Add/update focused tests for internal-only counts, current-year boundary, historical backdated imports, soft deletion, active/inactive teams, zero-count teams, equal/uneven outcomes and exclusion of `inter_team` and `quarterly`.

**Presentation and implementation**:
- Cards are concise, linkable to the relevant authorized management/team view, and use the existing CardSchool stat-card system. Respect keyboard/RTL/mobile and role restrictions.
- In `A26`, show either the equal per-team count or the full lagging-team/gap list (never both modes at once). Show `A40` as one concise total with an all-time completed-tournaments scope.
- All counts/rankings come from server-side count/group/summary queries or canonical derived competition results, not fetching entire Player/Team/Tournament collections just to calculate `.length`.
- Reuse count and lifecycle semantics across lists, dashboards and soft-delete filters. Prefer one role-appropriate overview summary endpoint/shared query functions, avoiding repeated N+1 requests.
- The official inter-team encounter engine/team standings are still future work. **They are not dependencies for `A26`.** Only the judge's `J2` league-position KPI remains pending official standings; do not synthesize it.
- Preserve useful existing "nearest tournament" and team quick-operation context below the KPIs when applicable, without adding a fourth/seventh KPI.

## Player management table refinements — 2026.10.4
In **ניהול → שחקנים**:
- render **עריכת שחקן** and **מחק שחקן** as compact icon-only contextual actions, using the shared button/icon system; keep accessible Hebrew names (`aria-label` and/or title/tooltip), keyboard focus, touch targets and the existing deletion confirmation/authorization
- clicking either action must not activate clickable-row navigation
- remove the **חשבון** column from the Players table; it currently shows the optional legacy `player.user.username` relationship, but children do not require login accounts in Stage A
- removing this table column must **not** delete/migrate the optional legacy User linkage or alter backward compatibility/API semantics

## Management table header contrast — 2026.10.4
- replace the excessively pale header-row styling on management tables with a clearly differentiated background and readable foreground using existing CardSchool theme tokens
- ensure WCAG AA text contrast (at least 4.5:1 for normal header text), including RTL/mobile and hover/focus/sort states
- prefer a shared DataTable/table-header primitive or reusable styling over repeating ad-hoc class changes across pages
- retain existing table columns, sorting, filters and behavior except for the expressly removed **חשבון** column above
