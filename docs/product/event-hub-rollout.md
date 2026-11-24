# Event Hub, All-Stars & News — agreed product specification
Updated 2026-11-24. Source of truth for implementation, supersedes conflicting older Stage A documents.

## Identity and navigation
Event is a public narrative container, not a score source. Public `/tournaments` becomes an **Event directory** with All/Club/All-Stars filters; `/events` may alias it. No public raw-tournament list. `/tournaments/:id` result/detail deep links must remain accessible. Public All-Stars has teams, official meetings, team standings, weekly internal tournament history and news. `/manage/events`, `/manage/tournaments` and `/manage/updates` are separate admin areas; the tournament list contains *all* competition types.

Preserve the existing approved header and flat mobile navigation, including the original floating **בהקמה** micro-tags, as specified in [navigation-content.md](./navigation-content.md). Mobile-first page design does not authorize reorganizing the site menu or changing existing component styling without explicit approval.

## Data ownership
`Event`: title, description, category (club | all_stars; mixed deferred), optional start/end, cover/promo gallery, retrospective gallery, publication status. Event can exist with zero tournaments. Events include 0..n tournaments and 0..n updates.
`Tournament.eventId`: optional ObjectId, **at most one** event. New club and inter-team competitions should link to an event; historical competitions remain unlinked until manually assigned. Weekly `team_internal` tournaments have no event and remain attached to their team. Never auto-create event wrappers for old tournaments.
`Update.eventId`: optional ObjectId, at most one event; updates can be created from Event management (preselected event) or globally, remain one record and show everywhere: Event detail, `/news`, `/manage/updates`, homepage ticker and media carousel. No news duplication.
Only admin can create, edit, publish, remove or attach Event content and media; existing judge tournament operational permissions remain intact. For child photos, admin confirms parental permission outside application; removal must be possible.

## Media
Images: multiple JPEG/PNG/WebP using the existing protected S3 presign->inspect->promote flow, maximum 5MB each. Videos: **YouTube links only** in this release (validated HTTPS youtube.com/youtu.be video IDs). Do not offer or permit new MP4/WebM uploads to S3, even via the API. Existing stored videos, if any, remain readable for backward compatibility but cannot be newly uploaded or attached. No arbitrary HTML, unsafe URLs or automatic playback. Editors can attach/remove image and YouTube media; publishing remains distinct from draft. Homepage Updates carousel shows playable YouTube embeds from each recent Update, otherwise images; media uploaded directly to an Event gallery is not syndicated as news automatically. Media loads lazily.

## League and ranking
Inter-team official completed meetings alone contribute team standings: win 3, draw 1, loss 0. Tie-break by individual game **win minus loss** difference across completed official meetings; equal residual shares place. Internal All-Stars tournaments contribute only to a player's **within-team** ranking, never public overall cross-team individual ranking. Regular/club national rankings remain lifetime and separate.
All-Stars hub: nearest official encounter/event, team table, 4 team cards with branded color/region, team updates/media, weekly internal tournaments; team page: banner/description/cover, next and last official encounters, unified member ranking/history, device-only `localStorage` favorite team button. National ranking: prominent search, top 3 derived from unfiltered canonical ranking, mobile minimal columns, clear points explainer. Historical rank movers deferred until snapshots exist.

## Event-scoped creation dialogs
Club events expose the existing club tournament creation modal with the event preselected, single future calendar date, and server-side event association on creation. All-Stars events expose a single future fixture creation modal using the shared fixture editor; saving creates an actual inter_team Tournament with upcoming status, setup phase, scheduled date and eventId, using the existing inter-team engine. No rounds or scoring are created; future setup tournaments are excluded from active sessions until their date. Legacy planned fixtures remain supported. Stay on the event page, refresh after success, and preserve existing fixtures and IDs. Existing tournament linking and global creation remain available; mixed-category events remain deferred.

## Scheduling
Admin can plan a full season or a single encounter. Planned fixtures are not completed tournaments and cannot affect scoring. A fixture may link to a created inter-team tournament, and when live competition is opened it must not create a second duplicate. Dates/teams remain editable in admin until play; display only verified dates/fixtures, no fabricated fixtures.

## Staged implementation — one PR, sequential commits
1. **Domain and protected APIs:** Event model and CRUD/public projections; optional event association on Tournament and Update; validation and pagination, legacy-safety and public visibility; backend tests.
2. **Admin workflow:** Event management, tournament attach/detach and updates-within-event; global management list and global Updates stay canonical; auth and UI tests.
3. **Public event & media experience:** Event directory/detail with competitions/results, promotions/gallery, updates; shared image uploads and YouTube embeds, homepage featured event and news ticker/carousel; mobile RTL.
4. **All-Stars & rankings:** next/last encounters, team standings, weekly internal history, team branding + favorite; improved national rank search and top 3; tests.
5. **Verification and rollout:** update all affected MD, preserve old URLs, test targeted backend/frontend and full test suite where executable, confirm no staff data leaked.

## Acceptance checks
- Admin creates Event Hanukkah with four club tournaments on different days; posts promo update inside Event, appears once in global News/ticker and on event; adds gallery after event.
- Admin creates an All-Stars round-one Event with two inter-team matches; completed scores update team standings; weekly internal tournaments remain outside Event directory and visible per team.
- Legacy tournaments lacking event are still directly accessible and manageably listed, without generated Events.
- Only admin can edit Event/Update/media; public cannot see drafts; checks on media size/MIME and URLs.
- All-stars player scores unaffected by official team encounters; no cross-team personal league ranking.
- Mobile RTL cards and tables fit without page-wide horizontal scrolling.

## Deferred, no invention
Mixed-category events, ranking momentum/history snapshots, parental-consent application workflow, and cross-device favorites.
