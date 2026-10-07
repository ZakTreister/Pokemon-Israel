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

## Buttons
Use the CardSchool button system consistently.

### Standalone action buttons
Standalone actions that sit directly on the page/card/modal as their own action should have a clearly visible button surface and the `shadow-button` treatment.

Examples:
- create team
- save / submit
- open tournament
- historical result entry
- start round / next round
- close tournament
- back
- upload/select image
- primary modal confirmation

Primary/destructive/secondary variants may differ in color and emphasis, but standalone actions should still read clearly as buttons.

### Embedded / contextual controls
Controls that already live **inside another visual component** should NOT receive the same prominent `shadow-button` treatment.

Examples:
- main/site navigation items
- management sidebar/menu items
- compact remove-player/remove-user control inside a roster row/card
- inline edit/delete controls inside a table/list item
- icon-only actions inside an existing card/row
- filter chips/tabs that already have their own selected/unselected surface

These controls should remain visually lighter so the parent component keeps the hierarchy.

In short: use strong elevation for standalone actions, not for every clickable element.

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
