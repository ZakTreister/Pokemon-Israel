# Internal Tournament Operation UI

This document records the approved UI direction for All Stars internal tournament operation.

It supplements `docs/product/tournaments.md` and `docs/product/management-ui.md`.
When this document is more specific about the tournament-operation layout, follow it.

## Team management entry points

On the **ניהול נבחרות / נבחרות All-Stars** list, do not use one combined button labeled **סגל וטורנירים**.

For each active team, expose two separate actions:

### חברי נבחרת
- Label: **חברי נבחרת**
- Navigates to the existing team roster/ranking/details page.
- This is navigation only; it must not create a tournament.
- It is the entry point for viewing the team's roster and team-player ranking/details.

### התחל טורניר / המשך טורניר
This is one conditional operational action for the team:

- If the team has **no** open/live internal tournament:
  - Label: **התחל טורניר**
  - Start the internal-tournament creation flow for that specific team.
- If the team **already has** an open/live internal tournament:
  - do **not** render **התחל טורניר**
  - render **המשך טורניר** instead
  - navigate directly to the existing active tournament
  - never offer a second create action for that team

This operational action should be visually more prominent than **חברי נבחרת**.
It is available to staff roles that are allowed to operate a live tournament.
Permanent team editing controls remain admin-only.

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
   - **טבלה** toggle/action
3. A real error block only when an actionable error actually exists
4. Current-round match cards immediately
5. Round progression actions:
   - **הגרל סיבוב נוסף**
   - **בטל סיבוב** when a latest active round exists
   - **סיים טורניר**
   - any short blocking instruction that is actually relevant
6. Secondary connection/synchronization explanation below the matches, preferably collapsed or visually de-emphasized

Before round 1 exists, **משתתפים** defines the round-1 participant set. After competitive play starts, the same view remains available and defines the participant set for the **next uncreated round**.

Participant changes are allowed while the current round is being played. They never rewrite the current round's pairings or results.

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

Each match editor owns its own unsaved draft. A successful save or live update for another match must not clear, reset or invalidate this match's dirty draft merely because the tournament-wide revision changed.

Judges must be able to fill several match cards and then save those results one after another.

A same-match concurrency conflict may require the affected match to reconcile/retry, but unrelated match drafts should remain intact.

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

## Participants view

Add **משתתפים** beside **טבלה** in the live tournament controls.

Reuse the existing team-member/participant checkbox component where practical.

Behavior:
- before round 1: checked players are the saved participants for round 1
- once rounds exist: checked players are the saved participants for the **next uncreated round**
- the view is editable even while the latest round is in progress
- changing the checkboxes does not add/remove anyone from a round that has already been created
- the participant plan always refers to the next round after the latest created round, regardless of which historical round the round selector is currently displaying
- newly checked active team members join from the next round; rounds they missed contribute 0 match points
- unchecked players keep every previous match/result/standing contribution but are excluded from future pairings
- a previously removed player may be checked again for a future round if still eligible
- changes affect tournament participation only and never change permanent team membership
- completed tournaments are read-only

Show clear helper copy such as:
- before round 1: **הבחירה תקבע את משתתפי סבב 1**
- while a round exists: **השינויים יחולו מסבב הבא. הסבב הנוכחי לא ישתנה**

Keep an explicit save action when the checkbox selection differs from the saved next-round participant set.

## Round toolbar

The current-round controls should be compact and easy to find.

On mobile it may remain near the top/sticky while scrolling if this does not cover content.

It should include:
- round selector
- **טבלה**

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
- editable next-round participant planning without mutating already-created rounds
- standings and round progression behavior

Do not rebuild the tournament engine for this UI task.
