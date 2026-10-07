# News and Events

## Events page
Reuse/upgrade the existing tournaments page rather than creating a disconnected new system.

User-facing concept: **אירועים**

Stage A should expose the page from the main navigation.

It should include:
- upcoming tournaments/events
- a clear registration link/CTA for the next relevant tournament
- previous tournaments archive
- links to previous tournament details/results

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
