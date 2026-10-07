# Stage A — Internal All Stars Tournament MVP + Public Site Shell

## Goal
Deliver the first operational version of Cardschool IL for All Stars internal team tournaments, complete the Stage A corrections required after the first Codex implementation, and implement the approved public site navigation/homepage.

The current repository already contains a substantial Stage A implementation.
Inspect and reuse what exists before changing it.
Do not rebuild completed functionality from scratch.

## Required product specs
Read:
- `docs/product/overview.md`
- `docs/product/teams.md`
- `docs/product/players.md`
- `docs/product/tournaments.md`
- `docs/product/rankings.md`
- `docs/product/badges-seasons.md`
- `docs/product/homepage.md`
- `docs/product/news-events.md`
- `docs/product/navigation-content.md`
- `docs/product/management-ui.md`
- `docs/architecture/media-upload.md`
- `docs/decisions.md`

## Existing Stage A functionality
The prior iteration implemented persisted All Stars internal tournament functionality.

In particular, historical internal-tournament result entry is believed to already exist.
Inspect the current code first.
If present, preserve and integrate it in the team context rather than creating a duplicate screen or route.

## Required corrections / completion work

### 1. Management navigation cleanup
Use one management area.

Required labels/order:
1. **סקירה כללית**
2. **נבחרות All-Stars**
3. **טורנירים**
4. remaining authorized items

Remove:
- standalone **טורנירים פנימיים**
- standalone **עונות**
- old **נבחרות וסגלים** wording
- old **טורנירים רגילים** wording

Nested team pages/history remain visibly under **נבחרות All-Stars**.
Actual tournament management may use the **טורנירים** context.

Always provide a clear back action on nested pages.

### 2. Remove old Season coupling
Season is now a badge-domain concept only.

Remove the standalone Seasons page and management link.
Remove legacy Season restrictions/coupling from teams, rosters, tournaments and ranking logic.

Do not delete the Season concept if badge history/transitions need it.

Season transition belongs under the super-admin Badges page.

A Season transition must not reset ranking.

### 3. Unified Tournaments management page
The **טורנירים** management page must show every tournament type:
- regular/club
- internal team
- inter-team

Provide filters for:
- lifecycle/status: future/upcoming, active/in progress, completed
- tournament type

If the current user has tournament-management permission, they can enter the relevant management screen.

Do not expose a separate internal-tournament management tab.

### 4. Super-admin hard delete
Super-admin may hard-delete any tournament, including completed/past tournaments.

Apply this to all tournament types.

Remove the old backend restriction that prevents deleting past tournaments.

Judges must not have hard-delete permission.

Deletion must clean dependent state and ensure deleted results no longer affect derived rankings.

### 5. Internal historical tournament entry
This is mandatory Stage A functionality and is expected to already exist.

Do NOT create a separate historical-tournaments tab.

The action belongs on the relevant team page/team tournament history.

Inspect the current implementation:
- preserve it if correct
- move/integrate it if currently placed incorrectly
- fix only gaps needed for the current product spec
- do not duplicate the workflow

It remains manual, not Excel-based.

### 6. Future regular historical Excel action
On the unified **טורנירים** page, reserve a visible future action/button for importing approximately five years of historical regular/club tournament results.

Stage A:
- show the future action/placeholder as appropriate
- do NOT implement Excel parsing/import
- do NOT guess the file structure

The actual importer will be designed after the real Excel file is received.

### 7. Live tournament updates
Remove the normal-user **refresh from server** button.

Use the existing Socket.IO infrastructure for active tournament synchronization:
- canonical initial fetch on entry
- subscribe to tournament-specific live updates
- emit/update clients after canonical server mutations
- keep server state authoritative
- browser refresh continues to work normally

Preserve the existing concurrency/version protections around structural tournament operations.

### 8. Team roster actions
Staff must be able to remove/unassign a player from a team.

Keep team-transfer behavior coherent and preserve the rule that a player belongs to at most one active team at a time.

Do not allow deactivating a team while active players are still assigned.

### 9. Mobile management UX
Make the management navigation closable on mobile:
- visible close affordance
- close after navigation
- no content trapping/overlay issues
- RTL-safe

Fix the create-team form on mobile so it lays out cleanly without squeezed controls or horizontal overflow.

### 10. Button styling
Important management actions should use the CardSchool prominent button styling, including the `shadow-button` treatment where appropriate.

Do this consistently without turning minor icon controls into oversized primary actions.

### 11. Reusable Cloudinary image upload
Implement the reusable Cloudinary-backed image-upload flow described in `docs/architecture/media-upload.md`.

Required Stage A integration:
- team logo upload during team creation/editing

Build it as reusable infrastructure for future image consumers.

The repository/deployment owner will provide Cloudinary environment variables in `.env`.

Never expose the API secret to the frontend.

### 12. Main public site navigation
Implement the approved main menu exactly as defined in `docs/product/navigation-content.md`.

Stage A menu:
- **ניהול** — staff only
- **הליגה הישראלית**
- **All Stars**
- **אירועים**
- **חדשות**
- **חנות** — **בהקמה**
- **על הליגה** — repository-managed static/under-construction page
- **הזמנת יום הולדת** — repository-managed static/under-construction page

Requirements:
- remove child/player-login navigation from the public Stage A UX
- preserve role-aware management visibility
- keep desktop and mobile navigation polished and RTL-safe
- do not implement store commerce
- do not invent CMS infrastructure for the static pages

### 13. Events and News public entry points
Reuse existing capabilities rather than creating duplicate systems.

#### אירועים
Use the existing tournaments page/data as the basis for the public Events page:
- upcoming events
- registration CTA where available
- previous tournament archive/details

#### חדשות
Use existing Updates as the basis for:
- News feed/page
- full-post presentation
- homepage news banner
- latest-update homepage card

Manual publishing remains sufficient for Stage A.
Do not implement WhatsApp ingestion.

### 14. Homepage — All Stars
Remove the top-decks section.

Show up to four active All Stars teams.

Because inter-team competition is not yet implemented:
- do not claim they are truly ranked “top four” based on internal tournament data
- do not calculate team win rate from internal tournaments
- show only real derivable data such as logo, name, player count and completed internal-tournament count
- prepare the API/component for later real inter-team standings/win-rate data

### 15. Homepage — national leaders
Show a table of the leading regular/club children from the national lifetime ranking.

Requirements:
- regular/club ranking only
- use canonical ranking data
- link to the full **הליגה הישראלית** page

### 16. Homepage — upcoming club tournament
Show the nearest upcoming regular/club tournament/event.

Requirements:
- do not select a team-internal tournament for this section
- show event details
- show registration CTA/link when available
- link to the event details

### 17. Homepage — news and action cards
Implement:
- running/top news banner using Updates/News
- **הרשמה לחוג הקרוב לביתכם** card linking to the configured Rav Messer destination
- **העדכון האחרון** card showing the latest update and opening the full post

Keep external URLs configurable rather than burying them in business logic when practical.

### 18. Homepage visual quality
Keep the existing CardSchool visual system.

Requirements:
- responsive RTL layout
- strong visual hierarchy
- cards should feel intentional, not default/plain
- important CTA buttons should use the site's prominent/`shadow-button` treatment where appropriate
- remove obsolete top-deck homepage logic if it is no longer used

## Existing Stage A core behavior that must remain working
Do not regress:
- team creation
- team roster loading
- Player-based team participants
- open internal tournament from team
- preload team roster
- remove absent participants before round 1
- server-backed Swiss pairing/results
- Bo3 result entry including valid 1-0 outcomes
- Points / OMP / GWP / OGP standings
- server persistence
- resume after refresh
- multi-judge-safe structural transitions
- close tournament
- internal tournament ranking contribution
- manual historical internal-team result entry if already implemented
- no child login

## Out of scope for Stage A
Do NOT implement:
- regular historical Excel import logic
- Deck/Pokémon child self-editing
- child login/self-service
- national-ID storage/encryption
- WhatsApp Channel ingestion
- Store commerce
- finished About the League editorial content beyond the repository-managed under-construction page/state
- finished Birthday Booking content beyond the repository-managed under-construction page/state
- inter-team tournament engine beyond existing scaffolding
- true team league win-rate/standings if inter-team encounters are not implemented
- annual team competition-year reset UI unless separately requested

## Verification
Perform code-level verification:
- build
- lint if configured
- server compile/start checks available in the repository

Do not create a manual click-through checklist or screenshots as part of this task.

## Completion
When complete:
- commit the changes
- push to the requested working branch
- report final commit SHA
- report build/lint verification
