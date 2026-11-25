# SEO phase one — 2026-11-25

Approved: minimum non-disruptive SEO for cardschool.co.il. Preserve the React SPA, existing routes, content, visual UI, permissions and database schema.

- Hebrew homepage title and description target קארדסקול, CardSchool and חוגי פוקימון. No keyword stuffing or claims about cities not backed by actual club information.
- Replace Bolt placeholder social image with the existing public site logo; basic Open Graph/Twitter tags and homepage Organization/WebSite structured data.
- Express renders metadata in the initial HTML response with a single canonical URL. Static public destinations get distinct descriptions; published events, content pages and news use existing content. The /events listing canonical is /tournaments (existing primary navigation).
- Dynamic sitemap uses published Event and ContentPage records and only updates whose event is published or absent. Static public destinations are included. No player identifiers or roster details in sitemap.
- Phase-one noindex for management, login, dashboard, QR, individual child profiles, team detail/roster pages, tournament result detail, unfinished and unknown routes. No public access or existing authorization changes. Allow crawling HTML so search engines can read noindex. Search directives are not access control and do not make publicly accessible data private.
- A bounded metadata lookup falls back to the unchanged SPA with noindex if unavailable. No new front-end API calls or libraries. Static metadata is generated on direct HTML requests; SPA navigation does not update the document head in phase one. No SSR/prerender or custom administrator SEO editor yet.
- Search Console ownership verification and sitemap submission require account access after deploy. Google determines indexing, titles, ranking and snippets; no guarantees.

Verification: automated metadata and sitemap tests; full configured CI; after deployment verify /robots.txt, /sitemap.xml and view-source of public and noindex pages.
