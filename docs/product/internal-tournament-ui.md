# Internal Tournament Operation UI

This document records the approved UI direction for All Stars internal tournament operation.

It supplements `docs/product/tournaments.md` and `docs/product/management-ui.md`.
When this document is more specific about the tournament-operation layout, follow it.

## Team management entry points

On the **ניהול נבחרות / נבחרות All-Stars** list, do not use one combined button labeled **סגל וטורנירים**.

For each active team, expose two separate actions:

### סגל
- Label: **סגל**
- Navigates to the existing team roster/ranking/details page.
- This is navigation only; it must not create a tournament.
- It is the entry point for viewing the team's roster and team-player ranking/details.

### התחל טורניר
- Label: **התחל טורניר**
- Starts/opens the internal-tournament creation flow for that specific team.
- It should be visually more prominent than **סגל**.
- It is available to staff roles that are allowed to operate a live tournament.
- Permanent team editing controls remain admin-only.

Keep the existing admin-only team configuration actions separate from these two primary team actions.

## Primary mobile goal

During a running tournament, the judge must reach the actual match controls almost immediately after opening the page.

Do not make the judge scroll through status placeholders, explanatory text, connectivity paragraphs, or a large wrapper card before reaching the matches.

The page is an operational tool first.

## Running tournament information order

For a tournament that already has rounds, use this visual order:

1. Compact tournament header:
   - tournament title
   - one clear back action
   - compact date / participant count / lifecycle metadata
   - optional compact live-connection indicator
2. Compact round toolbar:
   - current round selector
   - **דירוג ותוצאות** toggle/action
3. A real error block only when an actionable error actually exists
4. Current-round match cards immediately
5. Round progression actions:
   - **הגרל סיבוב נוסף**
   - **בטל סיבוב** when a latest active round exists
   - **סיים טורניר**
   - any short blocking instruction that is actually relevant
6. Secondary connection/synchronization explanation below the matches, preferably collapsed or visually de-emphasized

The pre-round setup/attendance screen is an exception: before round 1 exists, attendance controls naturally appear before matches because there are no matches yet.

## No reserved mobile error space

Do not reserve vertical space for an error that is not currently visible.

Specifically:
- remove fixed/minimum-height mobile placeholders such as an empty `min-h-16` error region
- when there is no error, the next operational control should move up
- when an error exists, render the error normally and let it take the space it actually needs

A save failure or blocking mutation error must still be clearly visible.
This rule is about removing empty reserved space, not hiding real errors.

## Match cards live directly on the page

Do not place the whole match list inside an additional large Card/panel whose only purpose is to wrap all games.

Instead:
- the page content owns the match grid/list directly
- each match is its own standalone card
- avoid double padding: page padding + outer card padding + match-card padding
- on mobile, use nearly the full content width available after the normal page gutter
- on larger screens, the match cards may use a two-column grid when space allows

This should reduce wasted horizontal space on mobile and move the match controls higher on the screen.

## Match card layout

Each match card should remain compact and operational.

Recommended structure:
- small table-number/status header
- winner choices
- score selector
- save action
- concise per-match save state only when useful

Winner controls:
- player 1 and player 2 have equal visual weight
- **תיקו** remains clearly available between/alongside them
- preserve RTL order
- controls must be easy to tap

On mobile:
- avoid oversized padding
- player controls should fit in one compact row when practical
- score selector and save button may share one row when usable
- on very narrow widths, stack cleanly rather than squeezing unreadably
- no horizontal overflow

## Cancel round action
During a live tournament with at least one active round, expose **בטל סיבוב** for the latest/current round.

Placement:
- group it with round-level progression controls, not inside an individual match card
- style it as a reversal/destructive secondary action; it should be less prominent than **הגרל סיבוב נוסף**
- require confirmation

After success, immediately render the canonical server state with that round removed.
The cancelled round must no longer affect standings.
See `docs/product/tournaments.md` for the authoritative cancellation semantics.

## Saving and errors inside match cards

Per-match states such as:
- **שומר את התוצאה…**
- saved confirmation
- retry after a failed save

may remain inside the relevant match card because they directly affect the judge's next action.

Do not move critical save failure information into a hidden secondary-information area.

## Connectivity information

This connection state exists only on the live tournament operation screen. Other site/management screens do not maintain Socket.IO connections.

Connection state is secondary while everything is healthy.

Healthy state:
- a small indicator is sufficient
- do not dedicate a tall paragraph above the games

Disconnected/degraded state:
- show a concise visible message because it can affect safe operation
- automatic reconnect behavior should remain
- do not reserve space for this message while connected

Longer explanatory copy such as “all results are saved to the server and can be resumed on another device” belongs below the matches or in a collapsible details area.

## Round toolbar

The current-round controls should be compact and easy to find.

On mobile it may remain near the top/sticky while scrolling if this does not cover content.

It should include:
- round selector
- **דירוג ותוצאות**

Do not turn the toolbar into another tall information card.

## Styling

Keep the existing CardSchool visual language:
- navy / blue / yellow accents
- Rubik typography
- RTL
- compact competitive/event-management feel

The approved concept intentionally uses:
- a navy compact round bar
- standalone white match cards
- blue primary selection/save treatment
- yellow emphasis for the next-round action
- green saved-state accent where useful

Exact pixel values do not need to copy the prototype, but the hierarchy and density should.

## Desktop

Desktop may use more whitespace than mobile, but keep the same information hierarchy.

Preferred:
- match grid directly on the page
- two columns where appropriate
- no unnecessary outer match-list Card

## Do not change tournament behavior

This is a layout/UX change.

Preserve:
- server-authoritative state
- Socket.IO live synchronization while this live tournament operation screen is mounted
- concurrency/revision protection
- match save behavior
- result correction rules
- Swiss calculations
- participant locking
- standings and round progression behavior

Do not rebuild the tournament engine for this UI task.
