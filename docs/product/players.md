# Players

## Canonical player record
Players are represented by the Player model.

Current product-level player types:
- `team`: All Stars team player
- `quarterly`: regular/club player (legacy internal enum name is acceptable)

## No child authentication in Stage A
Neither club children nor team children have login accounts in Stage A.
Do not require a User record to create or manage a team player.
Existing legacy User-linked player records must remain compatible, but new Stage A team-player flows must work without child User accounts.

## Player identity data
Common fields include:
- first name
- last name
- city
- player type
- active state
- optional team

For some children an Israeli national ID may later be available.
It is optional and sensitive.

## Future matching/deduplication rule
When matching a player during imports/integrations:
1. If national ID is provided, try exact national-ID identity first.
2. Otherwise, or when no safe national-ID match exists, use normalized first name + last name + city.
3. If a supplied national ID conflicts with a possible name+city match, do not auto-merge. Require staff review.

The old quarterly dedupe rule using club is superseded by the intended identity rule above once that migration is implemented.

## Public player pages
There are no public player pages for club players.

A team-player child page may exist, but:
- it is linked only from the player's team page
- there is no global child directory/index
- the site should not promote standalone discovery of child profiles

Planned team-player profile fields:
- child photo
- name
- city
- seniority / tenure
- a short biography
- score/ranking inside the team
- image of current personal deck
- earned badges

## Editing player profile data
Because children do not log in in Stage A, child/team profile information is managed by admin, not by the child.

Judges have read-only access to player/team identity data needed for tournament operation. Judges may not:
- create a player
- edit a player's profile/details
- delete/deactivate a player
- assign/unassign/transfer a player between teams
- change a player's team settings or media
