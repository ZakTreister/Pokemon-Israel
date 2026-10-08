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

## “בהקמה” status treatment in the main menu
Do not use the previous pill/elliptical treatment.

Use a small **floating micro-tag** attached to the menu item:
- compact rounded rectangle, not a pill
- subtle tinted background using the existing CardSchool palette
- thin border
- very small semibold text
- tiny soft shadow if it fits the existing visual language
- absolutely positioned so it does not affect layout flow
- position it slightly above/over the visual top-left area of the item without covering the label

Most importantly, all main-menu items must stay on the **same baseline and same vertical line** regardless of whether they have the **בהקמה** tag.

Implementation guidance:
- give all desktop menu-item wrappers the same height/min-height
- center the main label consistently with flex alignment
- the badge must not add height/margin to only some items
- reserve enough header/menu vertical breathing room globally if needed, rather than shifting only tagged items
- preserve the same principle on mobile

Do not render **בהקמה** as normal inline text and do not let it push the menu item itself up/down.

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

## Floating trial-registration CTA
Public site pages should show a persistent floating CardSchool-branded CTA/logo with the text:

**הירשמו לשיעור ניסיון**

Scope:
- show it on public-facing pages such as homepage, league rankings, All Stars pages, team/player pages, events, news and public static pages
- do not show it inside management/admin pages, login/auth screens, or live tournament-operation screens
- keep it responsive and RTL-safe
- position it so it does not cover important content, navigation, dialogs, or mobile controls
- use a reusable shared component rather than duplicating page-specific markup

Destination:
- the CTA will eventually link to a dedicated landing page
- keep the destination configurable in one place
- do not invent or build that landing page in this iteration
- until a real destination is configured, do not hard-code an unrelated URL

## Responsive public navigation
The main site menu must work well on mobile:
- no clipped items
- clear open/close behavior
- RTL-safe layout
- management visibility remains role-aware
- **בהקמה** micro-tags remain legible, do not overlap labels, and do not disturb the shared menu baseline

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

Judges see only live-tournament operational functions. They must not receive team/player configuration actions, roster editing, historical-entry/import actions, tournament deletion, badge/Season administration, or other league configuration controls. Team/player pages may be visible to a judge when needed to open or operate a tournament, but configuration controls must be absent/read-only.

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
