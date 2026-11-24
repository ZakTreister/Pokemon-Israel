# Rankings

> **November 2026 event-hub specification overrides conflicting Stage A details below.** See [event-hub-rollout.md](./event-hub-rollout.md). Public `/tournaments` lists Event records; staff `/manage/tournaments` lists all tournament types. Weekly internal All-Stars tournaments need no Event.


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

In team-specific All Stars player ranking tables, the **entire team-player row is clickable** and opens that player's public All Stars profile page. The name may also render as a semantic link, but it must not be the only clickable target.

Club/regular ranking rows remain non-profile links because club players do not have public individual pages.

## Regular / club national ranking
- Applies to club/regular players.
- Uses regular/club tournament results only.
- Accumulates across the entire lifetime of the player.
- Does not reset by Season.
- Does not reset each September.
- Historical regular-tournament Excel import, when eventually implemented, must feed this same ranking model.

## All Stars team-player ranking
Team-related scoring is separate from regular club scoring.

Internal team tournaments contribute to the **ranking inside that player's team**.

The team page does not have a separate ranking tab.

Team-specific ranking fields are shown directly in the unified **חברי נבחרת** table:
- **מיקום**
- **שם מלא**
- **עיר**
- **מספר שחקן**
- **נקודות**
- **טורנירים**

In RTL, **מיקום** appears immediately to the right of the player name.

Default sort is canonical position ascending. Players without ranking data remain visible in the member table.

There is no product-level **overall All Stars player ranking across different teams**. Do not calculate, display or expose a cross-team individual All Stars ranking.

Inter-team encounters do not alter the internal team-player ranking unless a later product decision explicitly changes this.

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


## Historical regular ranking baseline (November 2026)

The owner's historical Excel contains aggregate lifetime points and participation counts, not per-tournament results. This approved import is a one-time opening-balance exception to the event-derived ranking rule. Do not create fake tournaments, placements, event history or best-rank data.

The imported ranking baseline is through **2026-11-16** local Israel date. Only later completed regular tournaments may add to it; earlier DB tournament results must not be double-counted. The source has no city or participant IDs. Import creates canonical regular Players with missing city flagged as historical-import records, and links existing Players (especially existing All-Stars team players) only after review of a live identity-matching report. Never guess ambiguous identities or recreate an existing All-Stars player. Imported `HistoricalRanking` records link to canonical Players for future scores.

The default national ranking page **excludes imported All-Stars players**. A checkbox **הצג שחקני All-Stars** includes them as grey/muted rows marked **All-Stars**. This is not an overall cross-team All Stars competitive ranking. Ranking places are computed from descending cumulative points among the currently eligible cohort, with shared places on ties, *before* search or pagination. Search never renumbers the ranking. Imported historical source row numbers/ranking positions are discarded and not persisted.

The table displays **מקום, שחקן, נקודות, השתתפויות**. Search, global column sorting and paging are server-side. Default page size **25**; show previous/next and current/total pages. Changing search, sorting or All-Stars visibility resets to page 1. Remain RTL and mobile-friendly.

### Strict scoring separation for an All-Stars Player who also competes in regular tournaments (2026-11-17)
Player identity is shared; **competitive score is not**. The import CSV's historical points and participations are *regular/quarterly tournament* totals even when `isAllStars=true`. They belong exclusively to the national **regular** ranking baseline. Existing and future team-internal `team_internal` scores remain part of the **within-team All-Stars ranking** and must not be added to the national regular score. Inter-team `inter_team` competition has its own team standings and also must not flow into national player scores. New regular tournaments add to the same ordinary baseline by Player ID, regardless of whether the player belongs to All-Stars. The All-Stars visibility checkbox only controls whether these **regular points** are shown on the national ranking; it never shows or imports internal team points. National regular ranking is lifetime; internal team ranking follows its independent competition-year semantics.
