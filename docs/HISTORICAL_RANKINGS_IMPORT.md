# Import the historical national ranking snapshot (November 2026)

## What the source actually contains

The owner supplied `טבלת הדירוג הישראלי פוקימון.xlsx` as one cumulative snapshot of all previous regular-tournament ranking results. There are **337 distinct names**, of which **35** are marked All-Stars, **6,054** total points and **821** counted participations. Individual tournament rounds/results, city, player identifiers, exact birthdates, year of birth, OMP, GWP and OGP **do not exist in the source**. Do not fabricate them.

The final owner-approved private split-name CSV is `cardschool-historical-rankings-approved-2026-11.csv` with exactly five columns: `firstName,lastName,points,tournaments,isAllStars`. A legacy unsplit four-column CSV remains read-compatible, but **new imports should use the split-name format**. Neither original serial nor imported position is stored in MongoDB. Leaderboard positions are computed from points. The private `cardschool-name-approvals-for-import-2026-11.json` records the owner's approved compound-name splits, and must be passed to the preflight and import with `--review-file`. Do not commit it to GitHub.

**Never commit the real Excel/CSV or a matching review file to this public repository.** They contain children's names and/or internal IDs. The project owner/operator keeps all three files in private local storage.

## Canonical Player records, names, and All-Stars

The November import creates/links canonical `Player` documents, not just independent leaderboard entries. Each `HistoricalRanking` stores immutable original aggregate points/participations and a link to its canonical `Player`. No fake `Tournament` documents or per-event history are created. The historical baseline is counted once and later regular-tournament results are added by canonical Player ID, only after the snapshot cutoff.

For new club players:
- `firstName` and `lastName` are **explicit columns in the input CSV**. There were 30 three-token names and one owner-confirmed first-name-only record; the owner has completed the split-name review. Include the approved private review JSON when inspecting/importing. Any further change or unclear identity must be reviewed before apply. This is never silently inferred from the first whitespace token. For instance, `ילד שני משפחה` may need a two-word first name. Do not accept a literal `?` as a confirmed surname.
- The Player is created as `quarterly` with `city: ''`, `birthYear: null` and a private historical-import marker. Missing city is permitted **only for this historical-import cohort**, not ordinary manually created club players.
- Admin can later edit first name, last name, city and optional integer **birth year** in `ניהול → שחקנים → עריכה`. Year-only values are not turned into fictitious January 1 birthdates. Existing All-Stars already have an optional exact-date profile field.

For existing players:
- The live DB preview searches **all existing canonical Player records**, including `quarterly` regular club players and `team` All-Stars, for normalized full-name candidates, without requiring an Excel city. It proposes a match only when the name is unique within the matching player type and no contradictory/archived matches exist. If historical club participants exist **only as legacy User accounts** without Player records, they need a separate identity audit/link before applying (the current preflight does not auto-merge free-standing User accounts). Do not turn such legacy identities into duplicate Players.
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
node scripts/import-historical-rankings.mjs --file /secure/cardschool-historical-rankings-2026-11.csv --inspect --review-file /secure/cardschool-name-approvals-for-import-2026-11.json --report /secure/identity-preview.json
```

Compare proposed All-Stars matches against actual roster; review name splitting; resolve ambiguous/archived/missing players. To correct a compound name or explicitly link a differently spelled/ambiguous existing person, prepare a private `/secure/review.json`, for example:

```json
{
  "ילד שני משפחה": { "firstName": "ילד שני", "lastName": "משפחה" },
  "שחקן שדורש התאמה": { "playerId": "0123456789abcdef01234567" }
}
```

Then repeat `--inspect` with `--review-file` until no blockers remain and the report has been reviewed. Only then run:

```bash
node scripts/import-historical-rankings.mjs --file /secure/cardschool-historical-rankings-2026-11.csv --apply --approved --review-file /secure/review.json
```

For this dataset, always include the owner's approved split-name overrides in the effective private review file; combine them with any subsequent approved Player-ID mappings. `--approved` confirms that the operator reviewed **both regular and All-Stars existing Player candidates**, name splits, the cutoff, and the DB backup; it is **not** a substitute for review. Do not store internal Player IDs in a public GitHub commit.

After applying, verify counts, player management edits, All-Stars visibility, search, sorting, pagination and subsequent player-ID-linked scores. The first run can create up to 302 regular Player records, but the actual number depends on existing matches. All 35 All-Stars should link to existing Players or the script stops.

## Verification status

- Focused pure tests: `node --test server/tests/nationalRankings.test.js server/tests/historicalPlayerImport.test.js` — 12 passing in the workspace, including existing regular Player reuse and explicit split columns.
- Offline CSV validation: passing for 337/35/6,054/821.
- **Not done:** live DB `--inspect`/`--apply`; full repository tests, lint, TypeScript build, production deployment. Keep this PR draft until those checks and identity review are completed.

## Owner-confirmed missing surname exception
The private split CSV contains one owner-confirmed name-only record: a verified regular record with a first name only and an empty `lastName`. Do not write `?` or an invented surname. The importer accepts a blank surname **only when explicitly present as an empty split CSV column**; unreviewed single-token legacy full names still fail validation. Imported canonical Players may retain blank surname, and staff can complete it later in the regular Player editor. Keep the source CSV private and preserve identical aggregate totals.

## Owner-approved split CSV (2026-11-17)

The owner reviewed and approved all 21 queried first-name/last-name splits. The private canonical CSV is `cardschool-historical-rankings-approved-2026-11.csv`; use this file rather than earlier split candidates. Source totals remain unchanged: **337 entries, 35 All-Stars, 6,054 points, 821 participations**. The owner-approved answers changed 2 proposed splits; no original source ranking/serial is persisted.

The private approval audit is `cardschool-name-splits-approved-2026-11.csv`: 21 explicitly approved complex splits, 9 clear compound surnames, and 1 confirmed empty surname. For the current importer, supply the corresponding **private** `cardschool-name-approvals-for-import-2026-11.json` via `--review-file` to suppress previously raised compound-name warnings; it contains only reviewed first/last-name overrides, not MongoDB Player IDs. Do not commit any of these private, child-identifying files to the public repo.

The read-only inspector also considers legacy player `User` accounts that have no corresponding `Player`, and refuses to create a new canonical player when that identity has not been reconciled. It checks bidirectional Player/User links and rejects conflicting or duplicate legacy User assignments. Existing name matches are candidates, not proof of identity.

**This resolves name splitting, not identity matching.** The live read-only `--inspect` report must still compare every row against both regular/quarterly and All-Stars/team Players, including archived records, and confirm uniqueness before `--apply`. Remaining real-database identity conflicts must be reviewed with explicit Player ID mappings and a fresh inspect run.

## Do not mix All-Stars and regular scoring
For all 35 source-marked All-Stars, CSV `points` and `tournaments` refer strictly to **ordinary/quarterly tournaments**, not internal All-Stars results. Link historical ordinary totals to the existing team Player ID without changing internal team results. National ranking sums the ordinary historical opening balance and only future completed `quarterly` or legacy-regular (`type:null`) tournaments; it excludes both `team_internal` and `inter_team`. The internal All-Stars player ranking is computed independently from `team_internal` final standings for its competition year. Opting in to show All-Stars on the national ranking displays only their ordinary points, muted and tagged. A regression test asserts the ordinary-tournament filter excludes both team categories.
