# Navigation and Content Pages

The approved main site navigation is part of Stage A.

## Main public navigation
The header/menu should contain:

- **ניהול** — visible only to authenticated judges/admins; contents filtered by permission
- **הליגה הישראלית** — links to the national lifetime ranking of regular/club players
- **All Stars** — links to the All Stars/team ranking/standings area
- **אירועים** — links to the events/tournaments page
- **חדשות** — links to the news feed
- **חנות** — show **בהקמה** in Stage A
- **על הליגה** — repository-managed static HTML/content page; show **בהקמה** in Stage A
- **הזמנת יום הולדת** — repository-managed static HTML/content page; show **בהקמה** in Stage A

Do not expose child/player login navigation in Stage A.

## “בהקמה” badge styling in the main menu
For menu items that are not yet active/complete, render **בהקמה** as a small badge attached to the menu item itself.

Required visual treatment:
- the menu item wrapper is `position: relative`
- the badge is `position: absolute`
- place it at the **visual top-left** corner of the menu item
- use a compact pill / elliptical outline
- visible border
- rounded-full / fully elliptical shape
- small typography so it does not compete with the menu label
- keep enough offset/padding so it does not cover the label
- preserve correct placement in RTL on desktop and mobile

Do not render **בהקמה** as normal inline text beside the label.

## Stage A route behavior

### ניהול
Only judges/admins see this item.
It opens the single management area described below.

### הליגה הישראלית
Use the existing national rankings capability/page, adapted to the current product terminology.

### All Stars
Use the All Stars/team public area.
It should be the public entry point to team standings/ranking and team pages.

### אירועים
Reuse/upgrade the existing tournaments page as the user-facing Events page.
Do not build a disconnected duplicate events system.

### חדשות
Reuse the existing Updates data/capability as the basis for the News feed.
The menu item should lead to the user-facing News experience.

### חנות
Stage A needs only the menu presence plus the attached **בהקמה** badge.
Do not build commerce functionality.

### על הליגה
This is intended to be a static repository-managed page.
For Stage A, a repository-managed under-construction page/state is sufficient.

### הזמנת יום הולדת
This is intended to be a static repository-managed page.
For Stage A, a repository-managed under-construction page/state is sufficient.

## Main-menu control styling
Main navigation items are embedded inside the header/navigation component.
They should NOT use the prominent page-level `shadow-button` treatment.

Use the header's own active/hover/focus styling instead.
The same principle applies on mobile navigation.

## Responsive public navigation
The main site menu must work well on mobile:
- no clipped items
- clear open/close behavior
- RTL-safe layout
- management visibility remains role-aware
- the absolute **בהקמה** badges remain legible and do not overlap labels

## Management navigation
There is one management entry only.
Do not display separate “ניהול” and “ניהול משותף” links.

Management ordering/labels:
1. **סקירה כללית**
2. **נבחרות All-Stars**
3. **טורנירים**
4. other authorized management functions as applicable

Do not expose:
- standalone **טורנירים פנימיים**
- standalone **עונות**

Admins see all authorized admin functions.
Judges see only operational functions they are allowed to use.

## Management route context
Nested pages should keep the parent management section visibly active.

Examples:
- team history remains under **נבחרות All-Stars**
- team detail/settings remain under **נבחרות All-Stars**
- other team-specific views remain under **נבחרות All-Stars**
- actual tournament management may use the **טורנירים** context

Nested pages must expose an obvious back action.

## Mobile management navigation
The management menu must work as a closable mobile drawer/panel:
- explicit close affordance
- closes after choosing a navigation item
- must not trap or obscure the content
- must remain usable in RTL

## Static pages
About the League and Birthday Booking are repository-managed static content, not CMS-managed pages, unless a future decision changes this.
