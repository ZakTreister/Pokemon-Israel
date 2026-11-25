# 2026-11-25 — content, events and public experience refresh

Approved scope requested 2026-11-25. Implementation is incremental; this document is not a claim that all items are developed.

## Batch 1 — ranking and public layout
- Shared three-player podium on homepage and ranking; preserve canonical shared ranks on ties.
- National ranking initially displays two rows; More appends up to 25 using server offset; search/filter/sort reset; next club event CTA in points explanation below search.
- Rank movers derive from full canonical ranking before and after the latest completed regular tournament (closedAt, falling back to date). Compare existing players only, keep historical snapshot and league separation; show up to three positive movers, even when outside the first visible rows.
- Homepage quick links have larger icons on the left; upcoming events inside one card with horizontally scrollable cards; events directory falls back to first image when cover is absent.

## Batch 2 — canonical event tournaments (pending)
- Tournament is the sole authoritative inter-team competition, with eventId, date, teams, optional location, setup lifecycle. No independent fixture creation or optional official tournament selector.
- Audit event fixtures, public All-Stars overview, homepage hero, teacher/admin dashboard, event editor, all inter-team launch endpoints, tests and MD. Migrate existing unlinked fixtures idempotently, preserve linked tournament IDs, results and old URLs; do not invent duplicates. Do not delete legacy records until audited/migrated.
- New official meetings are created only inside Event management; assigned teachers and system admin can operate scheduled tournaments on the Israel-local event date, not before. Preserve active sessions and permissions. Unified public tournament cards, hide empty section.

## Batch 3 — managed content and rich events (pending)
- Admin CRUD for content pages: title, hero subtitle, sanitized HTML content with safe links, media carousel, show-in-navigation checkbox with required navigation label when enabled, show-in-field-news checkbox.
- Event links multiple pages; public event shows one card of linked pages stacked vertically, clickable through to public page; content page hero, carousel, content inside card.
- Existing Event description becomes subtitle without data loss. Add independent sanitized HTML body. Public event content right, media carousel left, mobile stack, no media heading.
- Shared safe HTML sanitation at persistence/render boundary; no scripts, handlers, unsafe URLs, raw untrusted markup. Admin-only editing and publication; preserve navigation styling, no overflow menu.

## Batch 4 — field news and gallery (pending)
- Independent show-in-field-news checkbox for Update, Event and ContentPage; unified feed with canonical links and no duplicates. Existing updates remain visible by default.
- Per-media show-in-gallery checkbox on Event/Update/ContentPage uploads; admin-managed standalone gallery media, editable title/subtitle; public gallery only published and explicitly selected media. Use shared S3 images and YouTube link flow (no new video file uploads). Homepage gallery button points to gallery.

## Batch 5 — anonymous team fan counts (pending)
- Existing localStorage favorite button explanation: סמנו וקבלו עדכונים בעמוד הראשי. Count selection, removal and switches on server without account or identity; idempotency and abuse limits, nonnegative atomic counts, no PII. Display in All-Stars and team page. Without durable anonymous identifier cannot guarantee unique fans or undo browser-storage clearing; label appropriately.

## Verification
Targeted tests per batch, then full server/UI/lint/build after implementation. No direct pushes to main.
