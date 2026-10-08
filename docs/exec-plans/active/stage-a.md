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
- `docs/product/internal-tournament-ui.md`
- `docs/architecture/permissions.md`
- `docs/architecture/media-upload.md`
- `docs/decisions.md`

## Existing Stage A functionality
The prior iterations implemented persisted All Stars internal tournament functionality and much of the Stage A public/management shell.

Inspect the current code before making changes.
Reuse and correct existing functionality rather than creating parallel implementations.

Historical internal-tournament result entry is believed to already exist.
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

Every nested page gets exactly one clear back action.
Fix any current page that renders two back buttons for the same navigation action.

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

This workflow is **admin-only**. A judge must not see or use it.

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
- show the future action/placeholder to admin only
- do not show it to judges
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

### 8. Tournament network-error UX
Fix the current raw/technical network-error experience.

For tournament management:
- catch request/network failures
- never show raw “Network Error”/Axios text as the primary message
- show short Hebrew copy
- tell the judge whether the attempted change was saved
- tell the judge what to do next
- tell them when they may safely continue

Use the behavior/copy principles in `docs/product/tournaments.md` and `docs/product/management-ui.md`.

Socket disconnect and failed mutation are different states and must not be presented as the same error.

### 9. Match-result saving state
After the judge submits a result:
- immediately show **שומר את התוצאה…** or equivalent
- do not show “לא הוזנה תוצאה למשחק זה” during the in-flight save
- prevent duplicate submission
- after server success, show canonical saved result
- on failure, show concise Hebrew failure/retry state and keep the result editable

### 10. Tournament mobile layout
Improve the tournament-management layout specifically for mobile.

Requirements:
- balanced/symmetrical winner buttons
- coherent score/result fields
- consistent widths and spacing
- large enough touch targets
- no squeezed controls
- no horizontal overflow
- clean RTL order
- stable saving/error/status areas that do not make controls jump around

Prefer clean full-width stacking on very narrow devices over compressed multi-column layout.

### 11. Team/player permissions and roster actions
Permanent team/player configuration is admin-only.

Admin must be able to remove/unassign a player from a team and perform the other roster actions defined in the product specs.

A judge may view the roster and use it to open a tournament, but must not be able to:
- add/edit/delete a team
- add/edit/delete a player
- assign/unassign/transfer roster members
- edit team/player settings or media

Inside an active tournament, a judge may remove an absent participant before round 1. This modifies the tournament participant list only and must never alter the permanent team roster.

Keep team-transfer behavior coherent and preserve the rule that a player belongs to at most one active team at a time.

Do not allow deactivating a team while active players are still assigned.

The inline admin remove-player control is contextual inside the roster item and must NOT receive the strong page-level `shadow-button` emphasis.

### 12. Mobile management UX
Make the management navigation closable on mobile:
- visible close affordance
- close after navigation
- no content trapping/overlay issues
- RTL-safe

Fix the create-team form on mobile so it lays out cleanly without squeezed controls or horizontal overflow.

### 13. Button shadow consistency
Use the row/group rule from `docs/product/management-ui.md`.

If one button in a visual action row/group uses `shadow-button-<color>`, all buttons in that same row/group must also use an appropriate shadow treatment.

Do not leave mixed flat/elevated buttons in the same action row.

Embedded controls outside that action group — main navigation, management sidebar, inline remove-player controls, compact row/table/card actions and filter chips — remain visually lighter unless they themselves are part of a shadowed action group.

### 14. Reusable Cloudinary image upload
Implement/preserve the reusable Cloudinary-backed image-upload flow described in `docs/architecture/media-upload.md`.

Required Stage A integration:
- team logo upload during team creation/editing

Build it as reusable infrastructure for future image consumers.

The repository/deployment owner will provide Cloudinary environment variables in `.env`.

Never expose the API secret to the frontend.

### 15. Main public site navigation
Implement/preserve the approved main menu exactly as defined in `docs/product/navigation-content.md`.

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
- main-menu items themselves do NOT use `shadow-button`
- replace the old pill **בהקמה** treatment with the floating micro-tag defined in `docs/product/navigation-content.md`
- keep every desktop menu item on the same baseline/vertical line, whether or not it has a **בהקמה** tag

### 16. Events and News public entry points
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

### 17. Homepage — All Stars
Remove the top-decks section.

Show up to four active All Stars teams.

Because inter-team competition is not yet implemented:
- do not claim they are truly ranked “top four” based on internal tournament data
- do not calculate team win rate from internal tournaments
- show only real derivable data such as logo, name, player count and completed internal-tournament count
- prepare the API/component for later real inter-team standings/win-rate data

### 18. Homepage — national leaders
Show a table of the leading regular/club children from the national lifetime ranking.

Requirements:
- regular/club ranking only
- use canonical ranking data
- link to the full **הליגה הישראלית** page

### 19. Homepage — upcoming club tournament
Show the nearest upcoming regular/club tournament/event.

Requirements:
- do not select a team-internal tournament for this section
- show event details
- show registration CTA/link when available
- link to the event details

### 20. Homepage — news and action cards
Implement:
- running/top news banner using Updates/News
- **הרשמה לחוג הקרוב לביתכם** card linking to the configured Rav Messer destination
- **העדכון האחרון** card showing the latest update and opening the full post

Keep external URLs configurable rather than burying them in business logic when practical.

### 21. Homepage visual quality
Keep the existing CardSchool visual system.

Requirements:
- responsive RTL layout
- strong visual hierarchy
- cards should feel intentional, not default/plain
- standalone actions follow the Stage A button styling rules
- embedded controls retain lighter component-level styling
- remove obsolete top-deck homepage logic if it is no longer used

### 22. Enforce permissions in backend and frontend
Implement the role boundary in `docs/architecture/permissions.md`.

Do not rely only on hidden buttons. Backend routes/mutations must reject unauthorized judge actions.

Judge is allowed to operate a live tournament only. Configuration and historical administration are admin-only.

### 23. Approved internal-tournament operation UI
Apply the approved layout in `docs/product/internal-tournament-ui.md`.

In particular:
- replace the combined **סגל וטורנירים** team action with separate **סגל** and **התחל טורניר** actions
- **סגל** navigates to the team roster/ranking/details page
- **התחל טורניר** starts the team's internal-tournament flow
- remove empty reserved mobile error space
- render match cards directly in the page content, without a redundant outer match-list Card
- on mobile, place the current-round matches immediately after the compact header/round controls and any error that actually exists
- move healthy connection/explanatory copy below the matches or into a compact/collapsible secondary area
- preserve all existing tournament behavior and backend semantics

This correction is primarily frontend layout/interaction work. Do not rebuild the tournament engine.

### 24. Cancel latest round
Add **בטל סיבוב** to live internal tournament operation according to `docs/product/tournaments.md` and `docs/product/internal-tournament-ui.md`.

Required:
- latest/current round only
- confirmation
- server-authoritative mutation with revision/concurrency protection
- archive cancelled round for audit/history
- remove its results from current standings
- preserve previous rounds
- roster remains locked even when round 1 is cancelled
- live Socket.IO clients receive the canonical updated state

### 25. Historical team results — paste, parse and match
Replace the current manual row-by-row historical-entry UX as the primary flow with the approved pasted-standings workflow in `docs/product/tournaments.md`.

Important implementation references already exist in Git history:
- `b894982f22386fdcebdd6724ae84b0540df6e171`
- `e2c9cf3b983672793eaeffd538afd47e9d242fb8`
- historical file: `src/pages/admin/AdminTournaments.tsx`

Reuse/adapt the useful parser and player-matching approach, but keep the current architecture:
- Player-based All Stars players, not legacy User accounts
- current historical `team_internal` endpoint/model
- current permissions (admin only)
- current CardSchool UI
- no obsolete deck-autocomplete requirement
- no legacy alert-based UX requirement

The final flow must:
- accept pasted standings in a large textarea
- parse names/positions/points robustly
- auto-match only safe unique matches
- require explicit selection for ambiguous/unmatched names
- prevent duplicate mapping of one Player to multiple rows
- show a parsed/mapped preview
- block save until mappings are resolved
- save as a completed historical internal-team tournament and feed the same All Stars ranking source of truth

### 26. Prevent duplicate open internal tournaments
Enforce the product invariant that each All Stars team may have at most one open/live internal tournament.

Required:
- backend enforcement is authoritative
- concurrent create requests must not create duplicates
- use an atomic/database-enforced uniqueness approach compatible with the current Mongo deployment
- completed/closed tournaments do not block future tournament creation
- historical completed tournaments do not block live tournament creation
- team-management UI shows **התחל טורניר** only when none is open
- when one is already open, show **המשך טורניר** and navigate to it
- if a stale create attempt receives the backend conflict, recover gracefully by opening/linking the existing tournament
- preserve current permissions and roster-preload behavior

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
