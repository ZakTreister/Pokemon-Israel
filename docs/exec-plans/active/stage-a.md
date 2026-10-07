# Stage A — Internal All Stars Tournament MVP

## Goal
Deliver the first operational version of Cardschool IL for All Stars internal team tournaments, and complete the Stage A corrections required after the first Codex implementation.

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

### 12. Team/homepage behavior
Preserve the Stage A homepage All Stars section.

Do not fabricate true team win rate/ranking from internal tournaments.
Until inter-team competition exists, show only statistics that are actually derivable.

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
- full News redesign
- Store
- About the League static page
- Birthday Booking static page
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
