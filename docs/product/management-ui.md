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
Important actions should look intentionally actionable and prominent.

Use the existing CardSchool button system and the existing/available `shadow-button` visual treatment for primary/high-value actions such as:
- create team
- open internal tournament
- save/submit
- start next round
- close tournament
- historical result entry
- upload/select image where appropriate

Do not apply oversized emphasis to tiny icon-only utility actions when it would harm hierarchy.

## Back navigation
Every nested management page must provide an obvious way to return to the previous/parent context.

Do not rely only on the browser back button.

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
