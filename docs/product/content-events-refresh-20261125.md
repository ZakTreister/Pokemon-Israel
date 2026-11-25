# 2026-11-25 — content, events and public experience refresh

Approved scope requested 2026-11-25. Implementation is incremental; this document is not a claim that all items are developed.

## Batch 1 — ranking and public layout
- Shared three-player podium on homepage and ranking; show canonical unique national ranks (owner clarification supersedes earlier shared places).
- National ranking initially displays 25 rows; More appends up to 25 using server offset; search/filter/sort reset; next club event CTA in points explanation below search.
- Rank movers derive from full canonical ranking before and after the latest completed regular tournament (closedAt, falling back to date). Compare existing players only, keep historical snapshot and league separation; show up to three positive movers, even when outside the first visible rows.
- Homepage quick links have larger icons on the left; upcoming events in individual cards in a horizontal carousel below the heading, without an enclosing card; events directory falls back to first image when cover is absent.

## Batch 2 — canonical event tournaments (partially implemented)
- Tournament is the sole authoritative inter-team competition, with eventId, date, teams, optional location, setup lifecycle. No independent fixture creation or optional official tournament selector.
- Audit event fixtures, public All-Stars overview, homepage hero, teacher/admin dashboard, event editor, all inter-team launch endpoints, tests and MD. Migrate existing unlinked fixtures idempotently, preserve linked tournament IDs, results and old URLs; do not invent duplicates. Do not delete legacy records until audited/migrated.
- Implemented: new official meetings are created only inside Event management; legacy writes disabled, admin can convert an existing legacy fixture in place. Public overview derives meetings from Tournament and temporarily retains only unconverted legacy fixtures. Existing production fixtures have not yet been migrated; operational authorization outside the inter-team HTTP routes and full CI require review.
- New official meetings are created only inside Event management; assigned teachers and system admin can operate scheduled tournaments on the Israel-local event date, not before. Preserve active sessions and permissions. Unified public tournament cards, hide empty section.

## Batch 3 — managed content and rich events (implemented, pending verification)
- Admin CRUD for content pages: title, hero subtitle, sanitized HTML content with safe links, media carousel, show-in-navigation checkbox with required navigation label when enabled, show-in-field-news checkbox.
- Event links multiple pages; public event shows one card of linked pages stacked vertically, clickable through to public page; content page hero, carousel, content inside card.
- Existing Event description becomes subtitle without data loss. Add independent sanitized HTML body. Public event content right, media carousel left, mobile stack, no media heading.
- Restricted HTML grammar rejects unsupported tags/attributes and allows safe HTTP(S)/local links. Draft pages are not exposed publicly; navigation and event cards include published pages only. A page may be reused across events; deletion requires unlinking first.
- Shared safe HTML sanitation at persistence/render boundary; no scripts, handlers, unsafe URLs, raw untrusted markup. Admin-only editing and publication; preserve navigation styling, no overflow menu.

## Batch 4 — field news and gallery (implemented, pending verification)
- Independent show-in-field-news checkbox for Update, Event and ContentPage; unified feed with canonical links and no duplicates. Existing updates remain visible by default.
- Per-media show-in-gallery checkbox on Event/Update/ContentPage uploads; admin-managed standalone gallery media, editable title/subtitle; public gallery only published and explicitly selected media. Use shared S3 images and YouTube link flow (no new video file uploads). Homepage gallery button points to gallery.

## Batch 5 — anonymous team fan counts (implemented, pending verification)
- Existing localStorage favorite button explanation: סמנו וקבלו עדכונים בעמוד הראשי. Count selection, removal and switches on server without account or identity; idempotency and abuse limits, nonnegative atomic counts, no PII. Display in All-Stars and team page. Without durable anonymous identifier cannot guarantee unique fans or undo browser-storage clearing; label appropriately.

## Verification
Targeted tests per batch, then full server/UI/lint/build after implementation. No direct pushes to main.

Favorite changes use one atomic append-only action (selection, removal or switch), with random per-operation UUID for safe retries, never a user or device identifier. Legacy local preferences are not retroactively counted; removal is logged without subtracting a nonexistent vote. Counts are net actions, clamped to zero for display. A transient IP rate limit is not stored in MongoDB; no guarantee against intentional manipulation, browser resets or multi-tab races. Field news connected to the favorite team's published events sorts first.

## Follow-up — visual HTML editing
- Shared RichHtmlField defaults to RTL visual editing with formatting, lists, quotes, undo/redo and a source mode. Remove the two permanent link inputs; select text and use the toolbar link action, which opens only a temporary URL field. Keep the existing HTML allow-list and separate media upload. Pasted text is plain text; source is validated before switching to visual mode. Browser-native editing commands require desktop/mobile browser acceptance.

## Follow-up — public card wrappers
Use the shared `Card` public variant (background, border and shadow frame), not the clipping-only `cs-public-card` CSS class, for content body, event body, each event tournament and legacy fixture, the single stacked linked-content panel and each event in the homepage upcoming-events carousel. The heading and carousel must not have an enclosing Card (owner clarification). Keep event tournament section hidden when no tournaments or legacy fixtures exist. Keep the event body/media two-column layout and horizontal upcoming carousel.

## Follow-up — next points-earning event
Rankings selects the earliest published club event on or after the Israel-local calendar date with at least one linked quarterly tournament. Events without linked tournaments, past and draft events, and All-Stars events do not qualify. Filter server-side before choosing the next event; do not use the featured sort or an arbitrary page limit.

## Follow-up — Swiper and public content address
Use one shared real Swiper React component for homepage field-news cards and upcoming-event cards, event and content-page media, and news-post media. RTL touch/mouse swipe, responsive card counts, previous/next navigation and pagination; no autoplay. Keep the standalone gallery grid and text ticker unchanged. Each persisted content page displays its full public address and a copy button in the management list and selected editor; draft links remain inaccessible until published.

## Follow-up — hide empty event updates
Render the entire public event updates section only if at least one update is returned. No empty-state heading or placeholder; existing update links and layout are preserved.

## Follow-up — routed content editing and creation
Admin list `/manage/content-pages` shows only the list. Edit navigates to `/manage/content-pages/:id`, New to `/manage/content-pages/new`. Both use the same editor and hide the list; initial save replaces the new URL with the saved ID, keeps the editor open for media and copy address, and subsequent saves stay in the editor. Close/back navigates to the list. Direct refresh supports drafts through an admin-only detail endpoint, never changes public draft access.

## Follow-up — public homepage live tournaments and simpler navigation
See homepage.md: show only actually running public club competitions, remove the homepage field-news carousel (not the ticker or news page), and remove the built-in About link from public header/footer.

## Follow-up — content editor action placement
The shared create/edit editor displays Save and Close together at the bottom, after all content fields, public address and media controls (or the first-save media hint). The save button is explicitly associated with the content form to preserve native required-field validation; media actions remain independent. Close retains existing navigation behavior.

## Follow-up — larger Pokémon and badge-program information
Keep the selected Pokémon in one responsive full-width row of the player hero card, not constrained by portrait width; use 5rem maximum frames and 94% image fill with zero minimum width/height. Badge-program settings and navigation ordering follow badges-seasons.md and navigation-content.md.
