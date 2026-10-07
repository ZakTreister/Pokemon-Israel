# Navigation and Content Pages

Main public navigation should contain:

- **ניהול** — visible only to judges/admins; contents filtered by permission
- **הליגה הישראלית** — national lifetime ranking of club/regular players
- **All Stars** — All Stars/team standings/ranking area
- **אירועים** — events/tournaments page
- **חדשות** — news feed
- **חנות** — currently marked **בהקמה**
- **על הליגה** — static HTML/content page maintained in the repository; currently **בהקמה**
- **הזמנת יום הולדת** — static HTML/content page maintained in the repository; currently **בהקמה**

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
