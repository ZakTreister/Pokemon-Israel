/**
 * One-time historical national-ranking baseline import.
 * Dry-run (no database connection):
 *   node scripts/import-historical-rankings.mjs --file data/historical-rankings-2026-11.csv
 * Apply (requires MONGODB_URI, BACKUP and review):
 *   node scripts/import-historical-rankings.mjs --file data/historical-rankings-2026-11.csv --apply
 */
import { readFileSync } from 'node:fs';
import process from 'node:process';
import {
  HISTORICAL_RANKING_SOURCE,
  normalizeRankingName,
} from '../server/services/nationalRankings.js';

const args = process.argv.slice(2);
const fileIndex = args.indexOf('--file');
if (fileIndex < 0 || !args[fileIndex + 1]) {
  console.error('Usage: node scripts/import-historical-rankings.mjs --file <csv-path> [--apply]');
  process.exit(1);
}
const apply = args.includes('--apply');
const file = args[fileIndex + 1];
const lines = readFileSync(file, 'utf8').replace(/^\uFEFF/, '').trimEnd().split(/\r?\n/);
const columns = 'sourceRow,sourceRank,playerName,points,tournaments,isAllStars';
if (lines.shift() !== columns) throw new Error(`Unexpected CSV header; expected: ${columns}`);

const rows = lines.map((line, i) => {
  const cols = line.split(',');
  if (cols.length !== 6) throw new Error(`Invalid CSV column count at data line ${i + 1}`);
  const [sourceRow, sourceRank, playerName, points, tournaments, isAllStars] = cols;
  const name = playerName.trim();
  const normalizedName = normalizeRankingName(name);
  const row = {
    source: HISTORICAL_RANKING_SOURCE,
    sourceRow: Number(sourceRow),
    sourceRank: Number(sourceRank),
    playerName: name,
    normalizedName,
    points: Number(points),
    tournaments: Number(tournaments),
    isAllStars: isAllStars === 'true',
  };
  if (!name || name.length > 200 || !normalizedName ||
    ![row.sourceRow, row.sourceRank, row.points, row.tournaments].every(Number.isInteger) ||
    row.sourceRow !== i + 1 || row.sourceRank < 1 || row.points < 0 || row.tournaments < 0 ||
    !['true', 'false'].includes(isAllStars)) {
    throw new Error(`Invalid row ${i + 1}: ${line}`);
  }
  return row;
});
const uniqueNames = new Set(rows.map(row => row.normalizedName));
const allStars = rows.filter(row => row.isAllStars).length;
if (rows.length !== 337 || uniqueNames.size !== 337 || allStars !== 35) {
  throw new Error(`Expected 337 unique players including 35 All-Stars; got ${rows.length}, ${uniqueNames.size}, ${allStars}`);
}
console.log(JSON.stringify({
  source: HISTORICAL_RANKING_SOURCE,
  rows: rows.length,
  allStars,
  regular: rows.length - allStars,
  points: rows.reduce((sum, row) => sum + row.points, 0),
  participations: rows.reduce((sum, row) => sum + row.tournaments, 0),
  mode: apply ? 'APPLY' : 'DRY-RUN',
}, null, 2));
if (!apply) {
  console.log('Dry run complete: no database records were changed.');
  process.exit(0);
}
await import('dotenv/config');
if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required for --apply');
const { default: mongoose } = await import('mongoose');
const { default: HistoricalRanking } = await import('../server/models/historicalRankingModel.js');
await mongoose.connect(process.env.MONGODB_URI);
try {
  const existing = await HistoricalRanking.find({ source: HISTORICAL_RANKING_SOURCE }).lean();
  const byName = new Map(existing.map(row => [row.normalizedName, row]));
  for (const row of rows) {
    const previous = byName.get(row.normalizedName);
    if (!previous) continue;
    if (previous.points !== row.points || previous.tournaments !== row.tournaments ||
      previous.isAllStars !== row.isAllStars || previous.playerName !== row.playerName) {
      throw new Error(`Existing baseline differs for ${row.playerName}; aborting without overwriting it`);
    }
  }
  if (existing.length > rows.length || existing.some(row => !uniqueNames.has(row.normalizedName))) {
    throw new Error('Database contains baseline records absent from CSV; refusing to delete or overwrite');
  }
  const toInsert = rows.filter(row => !byName.has(row.normalizedName));
  if (toInsert.length) {
    await HistoricalRanking.bulkWrite(toInsert.map(row => ({
      updateOne: {
        filter: { source: HISTORICAL_RANKING_SOURCE, normalizedName: row.normalizedName },
        update: { $setOnInsert: row },
        upsert: true,
      },
    })));
  }
  console.log(`Imported ${toInsert.length} new rows; ${rows.length - toInsert.length} already matched. No players or tournaments were created.`);
} finally {
  await mongoose.disconnect();
}