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
