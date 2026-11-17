/**
 * Historical national ranking — one aggregate baseline per real Player.
 *
 * Offline CSV validation (no DB):
 *   node scripts/import-historical-rankings.mjs --file /secure/source.csv
 * Live DB preview (read-only, prints candidate matches and blockers):
 *   node scripts/import-historical-rankings.mjs --file /secure/source.csv --inspect --report /secure/report.json
 * Apply after reviewing the report, resolving blockers and backing up MongoDB:
 *   node scripts/import-historical-rankings.mjs --file /secure/source.csv --apply --approved [--review-file /secure/review.json]
 *
 * review.json (outside the public repository) maps original full names to either
 * {"playerId":"<Mongo ObjectId>"} or {"firstName":"...","lastName":"..."}.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';
import { HISTORICAL_RANKING_SOURCE, normalizeRankingName } from '../server/services/nationalRankings.js';
import { planHistoricalPlayers, historicalLegacyUserIds } from '../server/services/historicalPlayerImport.js';

const args = process.argv.slice(2);
const option = (name) => {
  const index = args.indexOf(name);
  return index === -1 ? null : args[index + 1];
};
const file = option('--file');
if (!file) throw new Error('Usage: --file <private-csv> [--inspect | --apply --approved] [--review-file <private-json>] [--report <private-json>]');
const apply = args.includes('--apply');
const inspect = args.includes('--inspect');
if (apply && inspect) throw new Error('Choose either --inspect or --apply');
if (apply && !args.includes('--approved'))
  throw new Error('Refusing DB write without --approved after reviewing a live --inspect report and DB backup');

const lines = readFileSync(file, 'utf8').replace(/^\uFEFF/, '').trimEnd().split(/\r?\n/);
const actualColumns = lines.shift();
const splitColumns = actualColumns === 'firstName,lastName,points,tournaments,isAllStars';
const legacyColumns = actualColumns === 'playerName,points,tournaments,isAllStars';
if (!splitColumns && !legacyColumns)
  throw new Error('Expected CSV headers: firstName,lastName,points,tournaments,isAllStars');
const rows = lines.map((line, i) => {
  // The source uses names without commas. Quote characters/commas are not valid inside
  // firstName/lastName in this one-time private import format.
  const parts = line.split(',');
  if (parts.length !== (splitColumns ? 5 : 4))
    throw new Error(`CSV row ${i + 2}: invalid columns`);
  const [firstName, lastName, points, tournaments, isAllStars] = splitColumns
    ? parts : [null, null, ...parts.slice(1)];
  const playerName = (splitColumns ? `${firstName} ${lastName}` : parts[0]).trim().replace(/\s+/g, ' ');
  const row = {
    source: HISTORICAL_RANKING_SOURCE,
    playerName,
    ...(splitColumns ? { firstName: firstName.trim(), lastName: lastName.trim() } : {}),
    normalizedName: normalizeRankingName(playerName),
    points: Number(points),
    tournaments: Number(tournaments),
    isAllStars: isAllStars === 'true',
  };
  if (!row.playerName || row.playerName.length > 200 || !row.normalizedName ||
      (splitColumns && (!row.firstName || row.firstName.length > 50 || row.lastName.length > 50)) ||
      !Number.isInteger(row.points) || row.points < 0 ||
      !Number.isInteger(row.tournaments) || row.tournaments < 0 ||
      !['true', 'false'].includes(isAllStars))
    throw new Error(`Invalid CSV data on row ${i + 2}`);
  return row;
});
const uniqueNames = new Set(rows.map(x => x.normalizedName));
const allStars = rows.filter(x => x.isAllStars).length;
if (rows.length !== 337 || uniqueNames.size !== 337 || allStars !== 35)
  throw new Error(`Expected exactly 337 unique rows and 35 All-Stars; got ${rows.length}/${uniqueNames.size}/${allStars}`);
const summary = {
  rows: rows.length,
  allStars,
  regular: rows.length - allStars,
  points: rows.reduce((sum, x) => sum + x.points, 0),
  participations: rows.reduce((sum, x) => sum + x.tournaments, 0),
};
// Guard the one-time approved opening balance against a silently altered CSV.
if (summary.points !== 6054 || summary.participations !== 821)
  throw new Error(`Historical snapshot totals differ: expected 6054 points and 821 participations, got ${summary.points}/${summary.participations}`);
console.log('Source validation:', JSON.stringify(summary, null, 2));
if (!apply && !inspect) {
  console.log('Offline dry-run complete. No DB connection was opened or changed. Run --inspect against MongoDB for actual matching.');
  process.exit(0);
}

const reviewPath = option('--review-file');
const review = reviewPath ? JSON.parse(readFileSync(reviewPath, 'utf8')) : {};
if (!review || typeof review !== 'object' || Array.isArray(review))
  throw new Error('review file must be a JSON object keyed by original playerName');
await import('dotenv/config');
if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required for a live match preview or apply');
const { default: mongoose } = await import('mongoose');
const { default: Player } = await import('../server/models/playerModel.js');
const { default: User } = await import('../server/models/userModel.js');
const { default: HistoricalRanking } = await import('../server/models/historicalRankingModel.js');
await mongoose.connect(process.env.MONGODB_URI);
try {
  // Archived Players are included in preflight so we never quietly clone an archived child.
  const [players, existing, legacyUsers] = await Promise.all([
    Player.find().setOptions({ includeDeleted: true })
      .select('_id firstName lastName playerType user deletedAt historicalImportSource historicalNormalizedName')
      .lean(),
    HistoricalRanking.find({ source: HISTORICAL_RANKING_SOURCE }).lean(),
    User.find({ role: 'player' }).select('_id name player').lean(),
  ]);
  const historicalByName = new Map(existing.map(x => [x.normalizedName, x]));
  if (existing.some(x => !uniqueNames.has(x.normalizedName)))
    throw new Error('Existing historical baseline has names missing from source; refusing unsafe update');
  for (const row of rows) {
    const prev = historicalByName.get(row.normalizedName);
    if (prev && (prev.playerName !== row.playerName || prev.points !== row.points ||
        prev.tournaments !== row.tournaments || prev.isAllStars !== row.isAllStars))
      throw new Error(`Historical baseline for ${row.playerName} differs; manual migration required`);
  }
  const plan = planHistoricalPlayers(rows, players, existing, review, legacyUsers);
  const blocked = plan.filter(x => x.issue);
  const proposed = {
    ...summary,
    matchedExisting: plan.filter(x => x.player && !x.issue).length,
    toCreate: plan.filter(x => x.state === 'create-quarterly').length,
    blocked: blocked.length,
    nameSplitReviewSuggested: plan.filter(x => x.reviewSuggested).length,
  };
  const report = {
    generatedAt: new Date().toISOString(),
    summary: proposed,
    entries: plan.map(x => ({ sourceName: x.row.playerName, isAllStars: x.row.isAllStars,
      firstName: x.firstName, lastName: x.lastName, state: x.state, issue: x.issue,
      existingPlayerId: x.player ? String(x.player._id) : null,
      reviewSuggested: x.reviewSuggested })),
  };
  const reportFile = option('--report');
  if (reportFile) writeFileSync(reportFile, JSON.stringify(report, null, 2), 'utf8');
  console.log('DB identity preview:', JSON.stringify(proposed, null, 2));
  const needsNameReview = plan.filter(x => x.reviewSuggested && !x.issue);
  if (needsNameReview.length) {
    console.error('Names awaiting verified first/last-name approval:');
    for (const x of needsNameReview) console.error(`${x.row.playerName}: ${x.firstName} | ${x.lastName}`);
  }
  if (blocked.length || needsNameReview.length) {
    console.error('Blocking identities (up to 30 shown):');
    for (const x of blocked.slice(0, 30)) console.error(`${x.row.playerName}: ${x.issue}`);
    throw new Error(`Refusing import: ${blocked.length} unresolved identities and ${needsNameReview.length} unreviewed split names. Use private --review-file overrides.`);
  }
  if (!apply) {
    console.log('Read-only DB inspection complete. Review private report before --apply --approved.');
    process.exitCode = 0;
  } else {
    let newPlayers = 0;
    let newRankings = 0;
    for (const entry of plan) {
      const { row } = entry;
      let target = entry.player;
      if (!target) {
        // Idempotent recovery of a Player created during an interrupted previous attempt.
        target = await Player.findOne({ historicalImportSource: HISTORICAL_RANKING_SOURCE,
          historicalNormalizedName: row.normalizedName });
        if (!target) {
          target = await Player.create({
            firstName: entry.firstName,
            lastName: entry.lastName,
            playerType: 'quarterly',
            city: '',
            historicalImportSource: HISTORICAL_RANKING_SOURCE,
            historicalNormalizedName: row.normalizedName,
            birthYear: null,
            user: null,
            isActive: true,
          });
          newPlayers++;
        }
      }
      const linked = historicalByName.get(row.normalizedName);
      if (linked?.player && String(linked.player) !== String(target._id))
        throw new Error(`Existing confirmed link differs for ${row.playerName}`);
      if (linked?.legacyUser && target.user && String(linked.legacyUser) !== String(target.user))
        throw new Error(`Conflicting User link for ${row.playerName}`);
      const legacyIds = historicalLegacyUserIds(target, legacyUsers, linked?.legacyUser);
      if (legacyIds.length > 1)
        throw new Error(`Conflicting User links for ${row.playerName}`);
      const linkedUser = legacyIds[0] || null;
      const result = await HistoricalRanking.updateOne(
        { source: HISTORICAL_RANKING_SOURCE, normalizedName: row.normalizedName },
        { $setOnInsert: row, $set: { player: target._id, ...(linkedUser ? { legacyUser: linkedUser } : {}) } },
        { upsert: true },
      );
      if (result.upsertedCount) newRankings++;
    }
    console.log(`Imported: ${newRankings} new historical ranking balances; ${newPlayers} new regular Players. Existing All-Stars reused, never recreated.`);
  }
} finally {
  await mongoose.disconnect();
}