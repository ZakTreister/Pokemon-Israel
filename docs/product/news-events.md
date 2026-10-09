# News and Events

## Events page
Reuse/upgrade the existing tournaments page rather than creating a disconnected new system.

User-facing concept: **אירועים**

Stage A should expose the page from the main navigation.

The public Events page is the public-facing counterpart of the unified management **טורנירים** page.

It must expose **all non-deleted canonical tournaments**, across all tournament types:
- regular/club (`quarterly`)
- All Stars internal-team (`team_internal`)
- inter-team (`inter_team`)

It must support public filtering comparable to the management list:
- lifecycle/status: all, upcoming/future, active/in progress, completed
- tournament type: all + each supported tournament type
- free-text search where useful (for example title/location/team)
- filters may be combined

Default view should not hide internal-team tournaments. The product promise is one public tournament/event history, not separate archives by engine/type.

The page should show enough public-safe summary information to understand each event, such as:
- title
- date
- type
- lifecycle/status
- location when relevant
- team name when relevant
- participant count when appropriate

A tournament entry links to a public tournament page.

That page displays the **results of that tournament itself**:
- completed event: final standings/results
- active event: current recorded results/standings, clearly marked as in progress
- upcoming event: event details and registration information; no fabricated/empty "final results"

The tournament page must not substitute the overall league/All Stars ranking for the event's own results.

Public tournament pages must work for all canonical tournament types, including `swiss-v1` internal-team tournaments. Do not route a public Swiss tournament into the management screen and do not return 404 merely because it uses the new engine.

For active/completed internal-team tournaments, expose only appropriate public tournament information and public-safe standings/results. Never expose:
- staff identities
- internal revision/version fields
- audit metadata
- deletion metadata
- management permissions/actions
- other admin-only fields

Public Events/detail pages use normal HTTP loading/refetch behavior. They do not open Socket.IO connections.

Soft-deleted tournaments are excluded.

Keep the existing registration CTA where registration is actually meaningful for that tournament type. Do not show a misleading registration action for internal-team/inter-team events that are not publicly registerable.

The existing `/tournaments` route may remain internally to preserve links.

## News
Reuse the existing Updates capability as the basis for News.

Stage A presentation includes:
1. A **חדשות** page/feed reachable from the main navigation.
2. A running/top news banner on the homepage.
3. The latest-update homepage card, which opens the full post.

Do not create a second unrelated news data model when the existing Updates model can be evolved/reused.

## Full post
A news/update item must have a user-facing full-post view or equivalent full-content presentation so homepage/banner links can open the complete update.

## Update content
An update may contain:
- formatted text
- links inside text
- image(s)

Rich content may be stored as HTML, but arbitrary unsanitized HTML must never be rendered.
Sanitize on the server and allow only the tags/attributes required by the product.
Images should preferably be modeled explicitly rather than relying on unrestricted `<img>` HTML.

If full rich-HTML editing is not already implemented, do not let that block the Stage A homepage/menu work; preserve a safe path to support it and do not introduce unsafe HTML rendering.

## Phase 1 publishing
Initially, staff/admin will paste news updates manually into the system.

## WhatsApp Channel direction
Future goal: either ingest WhatsApp Channel posts or use one external/source-of-truth publishing system that can publish to both the website and WhatsApp.

Do not build Stage A around WhatsApp scraping.
The current product does not depend on automated WhatsApp ingestion.
