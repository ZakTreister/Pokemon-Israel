# National league — historical cumulative ranking import (November 2026)

## Source and scope

The owner supplied `טבלת הדירוג הישראלי פוקימון.xlsx` as **all tournament history available up to the 2026-11-16 import snapshot**. It is a cumulative leaderboard, **not** a tournament-by-tournament record.

The original workbook has 338 nonempty rows, of which row 338 is a header accidentally placed at the bottom. Actual import rows: **337** distinct names, **35** marked `all-stars`, **302** others, **6,054** accumulated points, **821** accumulated participations. The available fields are original place, full name, total points, number of participations, and All-Stars flag. No individual tournament results, city, player ID, birth date, OMP/GWP/OGP, or historic best rank is available. Never invent any of those fields.

Do **not** commit the real source Excel or converted CSV to the public repository. They contain children's names. The project owner retains the CSV locally, and the deployment operator supplies its path to the import command. The downloadable CSV is named `cardschool-historical-rankings-2026-11.csv`.

## Data integrity and review

- The 337 names are unique after trimming, collapsing spaces, and case folding. This does *not* establish that they match existing DB players uniquely; the spreadsheet has no city or national ID.
- Three original placements appear out of score order: **איתם דובדבני** (29 points, source place 111), **אלעד הרכבי** (25 points, source place 149), **אושרי קאפח** (14 points, source place 189). Preserve their scores and original positions in audit metadata; calculate the displayed leaderboard rank from total points rather than trusting the source place.
- The name **ספיר ?** includes an unresolved surname marker and needs a manual review. Do not guess a surname.
- Historical All-Stars means the 35 rows explicitly flagged `all-stars` in the source. It does not create an overall cross-team All Stars competition.
- Because the sheet gives no event dates, its totals are treated as a snapshot through 2026-11-16 (Israel local date). Only subsequently dated regular tournaments contribute additional points. Confirm the cutoff before applying to production if the spreadsheet's actual compilation date differs.
- An imported ranking row is **not** automatically a Player record. Never fabricate a city, bypass Player validation, or join to an existing child by name alone. Future live tournament rows require a **staff-reviewed** `player` or `legacyUser` mapping in the HistoricalRanking database record to accumulate against that historical baseline. Until mapped, separate live and imported rows may appear for the same text name. This is a known follow-up.

## Architecture

- `HistoricalRanking`: one document per imported person containing points, participations, source name/place/row and imported All-Stars flag. Optional reviewed links to Player or legacy User. This is an explicit exception to the usual event-derived ranking rule, because the source has aggregate totals only.
- `GET /api/rankings`: combines this historical baseline with non-deleted, completed regular tournaments **after** the snapshot cutoff; no invented tournament documents. Existing legacy tournament result handling remains for pre-import installations that have no baseline.
- Apply All-Stars visibility **before** canonical rank computation, then text search, then server-side sorting and pagination. Shared-point ranks tie (1, 1, 3). When search narrows results, the player retains the canonical rank within the chosen All-Stars visibility cohort.
- Request params: `includeAllStars=true|false` (default false), `search`, `page` (default 1), `pageSize` (default 25, maximum 100), `sort`, `descending`. Response: page rows plus `total`, `page`, `pageSize`, `totalPages`.
- Public table: place, name, points, participations. No historical best-rank column. Search and pagination are server-side. Optional All-Stars rows are greyed and visibly tagged All-Stars. Display only the current page. Rows are not public child-profile links.

## One-time deployment

1. Back up the production MongoDB database. Confirm the intended snapshot cutoff and review the three misplaced original positions and unresolved name before running.
2. Copy `cardschool-historical-rankings-2026-11.csv` from the project owner's download to a secure local path outside the public repository.
3. Run a dry-run (does not connect to MongoDB):

   ```bash
   node scripts/import-historical-rankings.mjs --file /secure/path/cardschool-historical-rankings-2026-11.csv
   ```

4. Verify summary: 337 rows, 35 All-Stars, 302 regular, 6,054 points, 821 participations; no duplicate normalized names.
5. After deploying the code with valid `MONGODB_URI`, apply intentionally:

   ```bash
   node scripts/import-historical-rankings.mjs --file /secure/path/cardschool-historical-rankings-2026-11.csv --apply
   ```

6. The upsert is idempotent, refuses to overwrite divergent historical totals, and never creates Player, User, or Tournament records. Verify `GET /api/rankings` returns 302 non-All-Stars by default and 337 with `includeAllStars=true` before counting post-cutoff results. Verify pagination, search, and marks on mobile.
7. Staff can subsequently add reviewed `player` / `legacyUser` links to historical records as a separate identity reconciliation workflow. Do not let unresolved identity matching silently double count or overwrite existing player results.

## Verification

Focused pure calculation tests: `node --test server/tests/nationalRankings.test.js`.

Before merging, run configured full server tests, UI verification, lint and production build per `AGENTS.md`. This PR is a draft until those checks and production identity/cutoff review are completed.