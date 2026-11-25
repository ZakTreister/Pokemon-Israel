# Navigation and Content Pages

> **November 2026 event-hub specification overrides conflicting Stage A details below.** See [event-hub-rollout.md](./event-hub-rollout.md). Public `/tournaments` lists Event records; staff `/manage/tournaments` lists all tournament types. Weekly internal All-Stars tournaments need no Event.


The approved main site navigation is part of Stage A.

## Main public navigation
The header/menu should contain:

- **ניהול** — visible only to authenticated judges/admins; contents filtered by permission
- **הליגה הישראלית** — links to the national lifetime ranking of regular/club players
- **All Stars** — links to the All Stars team area: teams, team standings when available, and team pages
- **אירועים** — links to the events/tournaments page
- **חדשות** — links to the news feed
- **חנות** — show **בהקמה** in Stage A
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
It should be the public entry point to teams, official team standings when available, and team pages.

Do not show an overall individual ranking comparing All Stars players across different teams. Individual All Stars ranking is team-specific only.

### אירועים
Use the existing public /tournaments route for **Event entities**, not a raw tournament listing. Each Event links to its competitions, results, media and updates. Tournament results remain directly addressable; staff retain a unified all-types tournament management list.

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
- approved URL: `https://lp.cardschool.co.il`
- keep the destination configured centrally/shared rather than duplicating the URL across pages
- clicking the floating CTA opens this landing page
- do not substitute a different destination without a later product decision

## Responsive public navigation
The main site menu must work well on mobile. Preserve the approved single, flat two-column mobile menu, with all authorized links in the same order as desktop. Do not introduce a primary/secondary split, a “עוד באתר” disclosure, or substitute inline text for the floating construction micro-tag. Changes to existing navigation design require explicit product approval.

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


## Shared registration destination
All public registration/trial CTAs that represent the same enrollment action use the centrally configured registration destination:

`https://lp.cardschool.co.il`

This is the approved registration URL.

Do not duplicate it independently in homepage or other public components. Keep one shared configuration value.

## Owner update — remove About navigation (2026-11-25)
Remove the built-in על הליגה item from desktop/mobile header and footer navigation. Retain the existing /about route for old direct links; dynamic admin-managed content navigation is unaffected.

## Owner clarification — trailing construction links
Keep dynamic content-page links before the final two built-in header links: חנות and הזמנת יום הולדת, in that order, for all roles and desktop/mobile. Keep the same final two links in footer navigation. Preserve construction indicators.

## Owner update — fixed-page text management (2026-11-25)
Admin-only **ניהול טקסטים** is separate from dynamic content pages. List fixed pages (All Stars and national rankings / Israeli children's league) with an internal edit route and parent back navigation. Edit title, subtitle and sanitized rich HTML body using the existing HTML editor. Persist by fixed page key; no create/delete or navigation-menu controls. Both league pages render the managed header followed immediately by a shared public Card containing the managed HTML, before rankings, fixtures or teams; hide the card if empty. Do not add a hardcoded section heading; editors can include headings in HTML. All editorial text comes only from the persisted page record. Before configuration return empty fields and omit the public hero until a managed title is available; never show hardcoded fallback heading/subtitle while loading or on error. The existing badge-program description/image editor moves here; badge definition/award management remains under Badges. The two existing resources save independently. No database migration or new editorial content is required at deployment.

## Owner update — All-Stars page hero (2026-11-25)
Use the shared full-width PageHero on the public All Stars page, with its existing responsive typography and spacing and an explicit purple/gold variant matching the homepage league identity (purple gradient, amber accents, white heading and light purple subtitle). Keep title and subtitle connected to managed fixed-page texts; render the managed rich HTML inside a public Card immediately below the hero, before standings/team content. Existing dark/light hero appearances on other pages remain unchanged.

## Owner update — All-Stars section cards (2026-11-25)
On the public All Stars page, wrap each complete upcoming matches, team standings, weekly training results and league news section (heading and all existing content) in its own shared public Card, with consistent responsive padding. Preserve section order, matches/standings anchor IDs, internal controls and content. Do not change homepage, favorite team chooser or badge area.

## Owner update — All-Stars weekly training pagination (2026-11-25)
Weekly training results show three completed team-internal tournaments at a time, newest first. Reuse the public paginated tournament list with team/status filtering on the server (not the overview's limited twelve results). The supported favorite team is the default filter; if none is selected or it is unavailable, default to all teams. A manual filter remains usable and resets the list to three; a change of favorite resets the default. Each More click appends the next three; hide More when no further pages exist. Keep loading, retry and empty states; do not alter homepage or ranking rules.

## Owner-approved content-page buttons (2026-11-25)
Each managed content page has independent showAsButton, buttonLabel (up to 80 chars), and buttonTargets (public fixed route keys or /content/<id>). In the new/edit form, check the option and choose multiple fixed or existing CMS pages (including drafts; never self). The label defaults to the title when enabling and is editable. The shared static allow-list includes homepage, rankings, All Stars, events (alias /events), news, gallery, deck stats, About, shop, birthday. Exclude login, management, individual player/team/event/news/tournament detail routes. The server validates allowed targets and referenced CMS IDs. Public GET /api/content-pages/buttons?target=... returns id/label only for published enabled destination pages; unpublished/missing CMS host returns empty. Links are rendered at the very end of the page content, before the site footer, not at the hero. The layout handles fixed pages, and ContentPage handles the loaded published record. Empty lists render no wrapper. Preserve existing navigation and event-linked content behavior. Deleting a CMS page removes incoming target references; draft hides links without discarding configuration. No migration is required; legacy pages default disabled.

## Site settings — owner approved 2026-11-25
Admin-only management /manage/site-settings, tabs for static page availability/header/footer and social links. Singleton MongoDB settings, defaults preserve the existing site and all public fixed routes active; homepage cannot be disabled. Store each visibility preference independently; disabled pages retain preferences and data, disappear from navigation and CMS host selector, return 404/noindex on direct HTML loads, and show not-found in SPA. Events alias shares its setting. Sitemap excludes disabled fixed routes; child/event/news/tournament details and staff/API workflows remain separate and unchanged. Existing hard-coded or HTML links may still point at a disabled page and show not-found. Fixed shop/birthday stay last. HTTPS-only platform-specific Facebook, Instagram, YouTube, TikTok, WhatsApp links with on/off; no default URLs; render accessible external icons in footer only. Admin save updates current layout immediately; other sessions reload settings on refresh. No physical page deletion or drag ordering. Dynamic content pages retain existing publishing/navigation flow.

## Owner update — permanently retire unused fixed public pages
Remove `/deck-stats` (סטטיסטיקות דקים) and `/about` (על הליגה) from the router, fixed page settings, menu/footer order, CMS host allow-list and sitemap. Old direct URLs return HTTP 404/noindex; no management toggle to re-enable. Existing deck data and management/API flows are unchanged. Retired CMS host assignments are filtered from the editor and cleaned on save; a source with no remaining host is disabled. Earlier retention of About as a direct URL is superseded.

## League branding
Site settings include two independently managed league logos, kids and All Stars. Use verified S3 uploads (dedicated purpose and singleton entity IDs), optional replacement/removal, save with settings. No bundled logo fallback; show text or neutral icons when unset. Public projection includes URLs only. The page settings table must keep row labels legible in light and dark themes. Preserve team and player media.

Managed logo placement: home trading cards and league panels, league-specific page heroes and public events/tournaments, All Stars fan section, context-aware header, both footer logos, kids trial CTA, site favicon and social sharing metadata. Existing historical tournament artwork and per-team logos remain unchanged. The old bundled PNG remains available for historical URL snapshots but is no longer selected by the branding UI or SEO. No image is shown until an administrator uploads and saves a logo.

## Owner follow-up — All Stars content styling and related links
All Stars events use the purple All Stars PageHero and configured league logo. CMS pages have an independent boolean isAllStars (default false, validated on create/update), editable in the shared editor and exposed on published detail. True uses All Stars hero/logo and social sharing image; false uses regular kids-league styling. No placeholder hero, loading message, or body/media/link region is rendered before the requested content/event record resolves; route ID changes remount to prevent stale content. Errors remain visible. Empty media/body regions are omitted. Related CMS buttons stay at the end, inside one public Card headed קישורים נוספים; no card until links exist. Separate event-linked information cards remain unchanged.
