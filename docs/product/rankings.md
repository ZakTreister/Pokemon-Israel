# Rankings

## Principle
Rankings are derived from tournament/result records. Do not use opaque manually updated counters as the primary source of truth.

## Ranking table ordering and sorting
Ranking tables must be sortable by meaningful displayed columns.

Default ordering on every child/player ranking page is by the canonical **place/rank ascending**:
- place 1 first
- then place 2
- then place 3
- and so on

The default view must never appear in incidental API/insertion order.

Users may change the sort by interacting with sortable column headers and may reverse ascending/descending order where meaningful.

Sorting the view does not change the canonical ranking calculation or persisted tournament data.

Team-player names in public All Stars ranking tables link to their public All Stars player pages.
Club/regular ranking names remain non-profile links because club players do not have public individual pages.

## Regular / club national ranking
- Applies to club/regular players.
- Uses regular/club tournament results only.
- Accumulates across the entire lifetime of the player.
- Does not reset by Season.
- Does not reset each September.
- Historical regular-tournament Excel import, when eventually implemented, must feed this same ranking model.

## All Stars player ranking
Team-related scoring is separate from regular club scoring.

Internal team tournaments contribute to:
- ranking inside the player's team
- overall ranking of All Stars players

Inter-team encounters do not alter the internal player ranking unless a later product decision explicitly changes this.

## Team standings
Official team standings are based on inter-team competition, not internal tournaments.

Previously defined encounter scoring:
- team win: 3 league points
- loss: 0
- draw: 1 each
- primary encounter comparison: sum of Swiss match points by team
- tie-break: total individual games won
- if still tied: encounter draw

These team standings accumulate across the current team competition year.

## Team competition year
Team competitive scoring resets once per year, around September 1, through an explicit super-admin action such as:
**התחל שנה חדשה / אפס ניקוד נבחרות**

The reset:
- must not delete historical tournaments/results
- must preserve previous-year team standings/history
- opens a new team competition year with zeroed derived standings

Do not couple this annual reset to badge Seasons.

## Seasons do not reset ranking
Badge Seasons have no scoring reset semantics.
