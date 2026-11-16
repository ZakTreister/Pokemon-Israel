# Import the historical national ranking snapshot (November 2026)

## What the source actually contains

The owner supplied `טבלת הדירוג הישראלי פוקימון.xlsx` as one cumulative snapshot of all previous regular-tournament ranking results. There are **337 distinct names**, of which **35** are marked All-Stars, **6,054** total points and **821** counted participations. Individual tournament rounds/results, city, player identifiers, exact birthdates, year of birth, OMP, GWP and OGP **do not exist in the source**. Do not fabricate them.

The sanitized private CSV for the current importer is `cardschool-historical-rankings-2026-11.csv` with exactly four columns: `playerName,points,tournaments,isAllStars`. The importer still accepts the earlier six-column CSV but **ignores its source row number and source ranking position entirely**. Neither original serial nor imported row position is stored in MongoDB. Leaderboard positions are computed from points.

**Never commit the real Excel/CSV or a matching review file to this public repository.** They contain children's names and/or internal IDs. The project owner/operator keeps all three files in private local storage.

## Canonical Player records, names, and All-Stars

The November import creates/links canonical `Player` documents, not just independent leaderboard entries. Each `HistoricalRanking` stores immutable original aggregate points/participations and a link to its canonical `Player`. No fake `Tournament` documents or per-event history are created. The historical baseline is counted once and later regular-tournament results are added by canonical Player ID, only after the snapshot cutoff.

For new club players:
- `firstName` is provisionally the first whitespace-separated name token and `lastName` the remaining token(s); allow review-file overrides for compounds. **30** names have three or more tokens; the operator must review the proposed split. For instance, `דוד שמואל יעקובוביץ` may need a two-word first name. `ספיר ?` is unresolved and must be reviewed.
- The Player is created as `quarterly` with `city: ''`, `birthYear: null` and a private historical-import marker. Missing city is permitted **only for this historical-import cohort**, not ordinary manually created club players.
- Admin can later edit first name, last name, city and optional integer **birth year** in `ניהול → שחקנים → עריכה`. Year-only values are not turned into fictitious January 1 birthdates. Existing All-Stars already have an optional exact-date profile field.

For existing players:
- The live DB preview proposes a match only when the **normalized full name is unique within the matching player type** and no contradictory/archived matches exist. This applies to both club and All-Stars players.
- All-Stars must already be existing `team` Players, as requested. **Never auto-create a new All-Stars Player or change an existing player's team membership, number, city, photo, badges, deck, or tournament results.** A missing or ambiguous All-Stars match is an import blocker.
- A player's name or status may have changed since the spreadsheet. Use an explicit reviewed `playerId` mapping in the private review JSON; the importer refuses ambiguous/archived identities rather than guessing. It accepts mismatched current name only when the mapping is explicit.
- Name-based candidates are **not merged silently**. The operator must first run `--inspect`, review matches and name splits, and then explicitly pass `--approved` to run the import.
- Existing Player profile data is not overwritten by historical snapshot contents; only a link to historic aggregate points/participations is added.
- Rerunning import is idempotent and checks baseline totals for conflicts, so an interruption cannot silently double-count.

## Ranking behavior

- Normal national rankings hide source-marked All-Stars. A checkbox `הצג שחקני All-Stars` includes them as muted rows with an All-Stars label. This does not create an overall All-Stars team-player league ranking.
- The national ranking page has **server-side** search, global sort and pagination (default 25/page), independent of current table page state.
- Canonical position comes from the cumulative points among the chosen cohort, and is calculated **before** search or pagination. Equal points share a position.
- The baseline is treated as a snapshot through **2026-11-16** Israel time; only later completed regular tournaments contribute. Confirm the date before deployment; otherwise adjust the code/data contract deliberately.
- Source names on the public leaderboard follow the canonical linked Player name, including subsequent edits. Historical points/participations remain unchanged unless the owner explicitly authorizes a correction.
- The public ranking displays only place, name, cumulative points and counted participations. No old original ordinal/serial is stored or shown.

## Commands and precautions

First run an **offline CSV validation** (no database opened):

```bash
node scripts/import-historical-rankings.mjs --file /secure/cardschool-historical-rankings-2026-11.csv
```

Before any write, back up production MongoDB. With `MONGODB_URI` configured, run **read-only DB identity inspection** and save the report **outside** the public repository:

```bash
node scripts/import-historical-rankings.mjs --file /secure/cardschool-historical-rankings-2026-11.csv --inspect --report /secure/identity-preview.json
```

Compare proposed All-Stars matches against actual roster; review name splitting; resolve ambiguous/archived/missing players. To correct a compound name or explicitly link a differently spelled/ambiguous existing person, prepare a private `/secure/review.json`, for example:

```json
{
  "דוד שמואל יעקובוביץ": { "firstName": "דוד שמואל", "lastName": "יעקובוביץ" },
  "שחקן שדורש התאמה": { "playerId": "0123456789abcdef01234567" }
}
```

Then repeat `--inspect` with `--review-file` until no blockers remain and the report has been reviewed. Only then run:

```bash
node scripts/import-historical-rankings.mjs --file /secure/cardschool-historical-rankings-2026-11.csv --apply --approved --review-file /secure/review.json
```

If there are no overrides, omit `--review-file`. `--approved` confirms that the operator reviewed identity candidates, name splits, the cutoff, and the DB backup; it is **not** a substitute for review. Do not store internal Player IDs in a public GitHub commit.

After applying, verify counts, player management edits, All-Stars visibility, search, sorting, pagination and subsequent player-ID-linked scores. The first run can create up to 302 regular Player records, but the actual number depends on existing matches. All 35 All-Stars should link to existing Players or the script stops.

## Verification status

- Focused pure tests: `node --test server/tests/nationalRankings.test.js server/tests/historicalPlayerImport.test.js` — passing in the workspace.
- Offline CSV validation: passing for 337/35/6,054/821.
- **Not done:** live DB `--inspect`/`--apply`; full repository tests, lint, TypeScript build, production deployment. Keep this PR draft until those checks and identity review are completed.