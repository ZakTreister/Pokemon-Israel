# Homepage

> **November 2026 event-hub specification overrides conflicting Stage A details below.** See [event-hub-rollout.md](./event-hub-rollout.md). Public `/tournaments` lists Event records; staff `/manage/tournaments` lists all tournament types. Weekly internal All-Stars tournaments need no Event.


The Stage A homepage is part of the required deliverable, not a future-only concept.

## Main navigation
See `docs/product/navigation-content.md`.
The public site header/navigation must expose the approved Stage A menu and remain usable on desktop and mobile.

The homepage also participates in the shared public floating **הירשמו לשיעור ניסיון** CTA defined in `docs/product/navigation-content.md`.

## Latest Updates media carousel (November 2026)
The homepage "חדשות מהשטח" horizontal carousel shows the ten most recent public Updates, including Updates linked to published Events, from the existing unified news feed. It is NOT a separate gallery of Event media.
- Each card features a safe, playable YouTube embed when the Update has a YouTube link; otherwise show an image from its media items, falling back to the legacy image field and then a text-only placeholder. Previously stored S3 videos, if any, remain readable for backward compatibility, but new video file uploads are disabled.
- Playback is user-initiated only; YouTube embeds never autoplay when the carousel appears. Uploading new videos to S3 is not supported.
- Preserve the Update title, date, excerpt and links to full post and related Event.
- Videos uploaded directly to an Event's gallery do not enter the homepage carousel unless attached to an Update as well.

## Running news banner
Show a prominent running/top news banner using the existing Updates/News data source.

Requirements:
- use the latest/relevant published updates
- clicking an item opens the full news/update post
- do not depend on WhatsApp integration in Stage A

## All Stars team section
The homepage should feature up to four All Stars teams.

When real inter-team standings exist, show the four leading teams for the current team competition year.

Each team card should ultimately support:
- team logo
- team name
- active player count
- number of official inter-team encounters played
- win percentage

Definitions when inter-team encounters exist:
- encounters played = completed official `inter_team` encounters
- win percentage = encounter wins / encounters played * 100
- draws count as played but not won

### Stage A fallback
Stage A does not yet implement official inter-team competition.
Therefore:
- do not fabricate a competitive ranking
- do not calculate team win rate from internal tournaments
- show up to four active All Stars teams using real data available now
- show team logo and name
- show active player count
- show completed internal-tournament count if useful
- keep the component/API structured so true standings, games played and win rate can replace the fallback later

Each team card should link into the relevant All Stars/team experience where appropriate.

## National regular-player leaders
Further down the homepage, show a table of the leading children in the national regular/club ranking.

Requirements:
- use the existing canonical national ranking source
- ranking is lifetime cumulative for regular/club players
- provide a clear link to the full **הליגה הישראלית** ranking page

Do not show team-player scores in this table.

## Upcoming club event
Show the nearest upcoming published Event and link to the Event detail page. A weekly All-Stars internal tournament is not an Event.

Requirements:
- use the existing tournament/event data
- show the nearest future regular/club event
- show a clear registration CTA when a registration URL/action exists
- link to the event/tournament details

Do not accidentally feature an internal team tournament as the public “next club event”.

## Bottom action cards
Include these homepage cards:

### הרשמה לחוג הקרוב לביתכם
- use the canonical shared registration destination: `https://lp.cardschool.co.il`
- this is the approved registration URL
- source it from the same shared configuration as the floating registration CTA
- do not keep a separate homepage-only registration URL
- use a clear prominent CTA

### העדכון האחרון
- show the latest published news/update
- show a useful excerpt/summary
- clicking it opens the full post

## Remove
Remove the **הדקים המובילים / top decks** homepage area completely.

## Visual behavior
Preserve the CardSchool visual system.
Use strong card hierarchy and prominent CTA/button styling consistent with the site's `shadow-button` treatment where appropriate.
Keep the page responsive and RTL-safe.


## Hero trading-card interaction
The three decorative trading cards in the homepage hero remain the same sizes and keep their current overall layout.

They are directly manipulable:
- on touch/mobile, users can drag/swipe the card group horizontally with a finger
- use natural snap behavior so cards settle into clear positions after release
- desktop mouse/trackpad drag may use the same interaction where practical
- do not replace direct manipulation with automatic floating animation
- do not resize/enlarge the center card as part of this change
- preserve accessibility and respect `prefers-reduced-motion` for transition animation

Approved card artwork:
- center/main card: use the site's existing Pikachu image asset
- one side card: Poké Ball
- other side card: trophy

Only the artwork/content inside the cards changes for this requirement; card dimensions remain unchanged.

## Featured All-Stars event fixtures
When the featured homepage Event is an All-Stars event, show all its public associated fixtures in chronological order under the single event heading. Preserve team names, logos and VS; show only the Event start date once in the hero, never individual fixture dates or times; use two columns on desktop when multiple fixtures exist and one column on mobile. A single fixture retains the existing presentation. Never show fixtures belonging to another event.

## Owner update — live competitions and removal of field news from homepage (2026-11-25)
Supersedes the homepage media carousel requirement: remove the entire חדשות מהשטח section and its homepage fetch/favorite sorting. Preserve the separate חדשות הליגה ticker, public News page, gallery and management options. Immediately below the hero, show טורנירים פעילים ברגע זה only when at least one public club Swiss tournament is actually running (type quarterly, engine swiss-v1, phase running, status upcoming, not deleted). Link directly to the existing public tournament detail with read-only live pairings. No date-derived legacy active statuses, training or inter-team private workspaces. Red record indicator pulses only when reduced motion is not requested. Fetch a minimal public live list on entry and every 30 seconds, clear when empty/error; no manual refresh or login required. Do not alter the existing tournament lifecycle, authorization, timers or event carousel.


## Owner update — two leagues and favorite team (2026-11-25)
Supersedes the separate homepage team/ranking/event areas. Keep the shared featured hero (including all fixtures and event date only), CardSchool news ticker, conditional active club tournaments, gallery and registration. Below the hero show הנבחרת שלי only when an active team has been selected. Desktop two league columns, mobile stacked: הליגה הישראלית לילדים (blue/yellow, חוגים וטורנירי ילדים ונוער, existing national podium and club events) and ליגת האולסטארז (purple/gold, נבחרות למתקדמים, canonical team standings and All-Stars events/training link). Use distinctive symbols plus labels; replace temporary trophy/shield icons when the official league assets are supplied. Fetch each event category separately. One shared team chooser, separate favorite button and profile link; show real fan counts, never use counts to rank teams. Preserve anonymous localStorage selection and existing action ledger; selecting the same team is idempotent; serialize requests within browser and use Web Locks when supported. Favorite card uses existing overview, directly tagged updates (fallback for legacy event-linked updates), aggregate official live scores only from running meetings in published events (30-second polling, no public pairings or management actions), previous result, next fixture, standings, team identity and share action. Do not restore the removed field-news carousel. Keep URLs and tournament scoring intact.

## Owner clarification — layout spacing and equal league heights (2026-11-25)
Remove the shared main element's extra bottom padding; keep each page's own spacing and the floating registration CTA. The two homepage league cards stretch to equal height when side by side on desktop, with natural content height when stacked on mobile. Do not set a fixed pixel height.

## Owner clarification — hide homepage gallery shortcut (2026-11-25)
Remove the standalone gallery link/card from the homepage for now; preserve the public gallery route and all other gallery access and functionality.

## Owner clarification — homepage league card footers (2026-11-25)
Rename the national league upcoming-events heading to **טורנירים ואירועים קרובים**. Keep equal-height desktop cards and push each card's upcoming-events group (including separator and related links) to the bottom via flex layout, without fixed heights; preserve natural stacked layout on mobile.
