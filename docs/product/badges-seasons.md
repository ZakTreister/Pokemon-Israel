# Badges and Seasons

## Badge definition
A badge has:
- name
- image
- explanation/description

Badge definitions are dynamic, not a fixed hard-coded set.

## Permissions
The Badges page is super-admin only.
Super-admin can create and manage badge definitions.
Badge/Season management is not a judge page unless a later decision changes this.

## Badge awards
Badge awards apply to team players.
An award must preserve at least:
- player
- badge
- date
- Season in which it was awarded

A player should not receive the same badge twice within the rules currently enforced by the product unless explicitly changed later.

## Seasons
There are approximately 3-4 Seasons during a year.
Seasons are primarily a badge-domain concept.

Important:
- Seasons do NOT reset regular-player scoring.
- Seasons do NOT reset team-player scoring.
- Seasons do NOT reset team standings.
- Seasons do NOT block team creation.
- Seasons do NOT block roster changes.
- Seasons do NOT determine tournament eligibility.
- Seasons do NOT scope tournament scoring.

## No standalone Seasons page
Remove the standalone user-facing Seasons management page and its management navigation item.

Remove old business logic that couples Season state to:
- team creation
- team updates
- roster management
- tournament creation
- tournament scoring/rankings

The Season model may remain if it is useful for badge award history and transitions.

## Season transition
The super-admin performs Season transitions manually from the Badges page.

The current Season should be visible on the Badges page.
Season transition controls belong there.

## Team competition year is separate
The annual All Stars scoring cycle that resets around September 1 is a separate concept from Season.
Do not overload Season to mean competition year.
