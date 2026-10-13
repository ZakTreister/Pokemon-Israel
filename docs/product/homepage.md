# Homepage

The Stage A homepage is part of the required deliverable, not a future-only concept.

## Main navigation
See `docs/product/navigation-content.md`.
The public site header/navigation must expose the approved Stage A menu and remain usable on desktop and mobile.

The homepage also participates in the shared public floating **הירשמו לשיעור ניסיון** CTA defined in `docs/product/navigation-content.md`.

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
Show the nearest upcoming regular/club tournament/event.

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
