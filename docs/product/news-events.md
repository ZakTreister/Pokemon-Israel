# News and Events

## Events page
Reuse/upgrade the existing tournaments page rather than creating a disconnected new system.

User-facing concept: **אירועים**

It should include:
- upcoming tournaments/events
- a clear registration link/CTA for the next relevant tournament
- previous tournaments archive
- links to previous tournament details/results

The existing `/tournaments` route may remain internally to preserve links.

## News
Reuse the existing Updates capability as the basis for News.

Required presentation:
1. A **חדשות** page containing a feed of updates/posts.
2. A running/top news banner on the homepage.

## Update content
An update may contain:
- formatted text
- links inside text
- image(s)

Rich content may be stored as HTML, but arbitrary unsanitized HTML must never be rendered.
Sanitize on the server and allow only the tags/attributes required by the product.
Images should preferably be modeled explicitly rather than relying on unrestricted `<img>` HTML.

## Phase 1 publishing
Initially, staff/admin will paste news updates manually into the system.

## WhatsApp Channel direction
Future goal: either ingest WhatsApp Channel posts or use one external/source-of-truth publishing system that can publish to both the website and WhatsApp.

Do not build Stage A around WhatsApp scraping.
The current product does not depend on automated WhatsApp ingestion.
