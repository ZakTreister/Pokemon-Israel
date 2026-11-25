import { spawnSync } from 'node:child_process';

// Run every independent UI suite even when an earlier one fails.
const suites = [
  "scripts/verify-stage-a-ui.mjs",
  "scripts/verify-internal-tournament-ui.mjs",
  "scripts/verify-frontend-refactor.mjs",
  "scripts/verify-profile-refactor.mjs",
  "scripts/verify-tournament-changes.mjs",
  "scripts/verify-public-stage-a.mjs",
  "scripts/verify-recent-stage-a.mjs",
  "scripts/verify-version-2026-10-1.mjs",
  "scripts/verify-version-2026-10-2.mjs",
  "scripts/verify-pairings-fullscreen.mjs",
  "scripts/verify-rich-html-editor.mjs",
  "scripts/verify-public-card-wrappers.mjs",
  "scripts/verify-managed-page-intro.mjs"
];
const failures = [];
for (const suite of suites) {
  console.log('\n=== ' + suite + ' ===');
  const result = spawnSync(process.execPath, [suite], { stdio: 'inherit' });
  if (result.error) console.error(result.error);
  if (result.status !== 0 || result.error || result.signal) failures.push(suite);
}
console.log('\nUI suites: ' + (suites.length - failures.length) + '/' + suites.length + ' passed');
if (failures.length) {
  console.error('Failed suites:\n' + failures.join('\n'));
  process.exitCode = 1;
}
