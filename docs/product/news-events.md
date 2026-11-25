# News and Events

> **November 2026 event-hub specification overrides conflicting Stage A details below.** See [event-hub-rollout.md](./event-hub-rollout.md). Public `/tournaments` lists Event records; staff `/manage/tournaments` lists all tournament types. Weekly internal All-Stars tournaments need no Event.


## Public Events directory — approved November 2026
The existing public `/tournaments` route displays published **Event** records (not a public list of tournaments); support `/events` as an optional alias. Filter Events by clubs / All-Stars. The Event detail page contains linked tournaments/results, event updates, promotional and post-event gallery media. Keep `/tournaments/:id` public tournament result deep links working.

Regular/club and official inter-team tournaments can be linked to an Event, each to at most one Event. Weekly `team_internal` tournaments instead remain under All-Stars/team pages without Event. Existing legacy tournaments may remain unlinked indefinitely, without invented synthetic Events.

Three independent admin lists remain: `/manage/events`, `/manage/tournaments` (all types), and `/manage/updates` (all updates). Updates authored from within an Event use the same Update model and appear in both Event and global news/homepage feeds.

### Media for Events and Updates (November 2026)
Images can be uploaded to S3 (JPEG/PNG/WebP, max 5MB). Videos can only be added as validated HTTPS YouTube links in the Event or Update media manager. New MP4/WebM uploads to S3 are not supported, including through the upload API. The homepage news carousel displays YouTube videos attached to recent Updates; standalone Event gallery videos do not automatically become news. Existing previously stored video references remain viewable for compatibility.

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


## Update / News item fields
Complete the existing Updates capability rather than creating a second news model.

Each update/news item supports:
- **כותרת** — required
- **תיאור** — optional
- **תמונה** — optional
- **קריאה לפעולה** — optional button/CTA text
- **קישור קריאה לפעולה** — optional destination URL

Backward compatibility:
- existing `content` data remains readable and is treated as the update description
- do not break or hide existing updates merely because the management UI now calls this field **תיאור**
- a migration/rename may be introduced only if legacy records remain fully compatible

### Management behavior
The existing **ניהול עדכונים** page must provide working CRUD:
- create update
- edit update
- delete update with confirmation
- refresh/update local canonical state after successful mutation without full-page reload

Form behavior:
- title is required and trimmed
- description is optional plain text
- image is optional and uses the shared managed-image upload flow
- CTA text is optional
- CTA destination URL is optional
- CTA text and URL are treated as one logical action: if either is supplied, require both before save
- validate the CTA URL as a normal `http://` or `https://` URL
- show concise Hebrew validation/network errors
- create/edit dialog should use the shared Modal/Dialog primitive rather than page-local overlay markup

### Update image
Update/news images use the shared AWS S3 media architecture.

Recommended upload purpose:
- `update-image`

Recommended public namespace:
- `public/updates/<update-id>/...`

Rules:
- JPEG/PNG/WebP
- default image size limit follows the shared media rules
- upload/replace/remove from create/edit management flow
- image remains optional
- keep legacy updates without media valid

### Public presentation
The public News feed and full News post should use the available fields:
- title
- description/content
- image when present
- CTA button when CTA text + destination are present

For an optional CTA:
- render the button using the exact CTA text configured by the manager
- the button navigates to the configured destination URL
- external destinations open safely with `target="_blank"` and `rel="noopener noreferrer"`
- do not require users to paste URLs into description text just to get a clickable action

The homepage news banner/latest-update card may keep their compact presentation, but should use the same canonical Update records.


## Events pagination
The public **אירועים** tournament list uses the shared server-side tournament pagination contract.

- default 25 events per page
- filtering/search happens before pagination on the server
- display current page/total-page context and next/previous navigation
- never fetch the complete tournament archive merely to render the Events list


## Team-specific updates (2026-11-25)
Updates support optional teamIds (one or more existing teams), editable via the shared admin update form. Explicit team links take priority over legacy event-based inference for the favorite-team homepage card and All-Stars feed. Existing event linkage/publication rules remain unchanged. Updates can be team-specific without an event.
