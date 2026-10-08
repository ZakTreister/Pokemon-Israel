import type { ManageablePlayer } from '../../../types/team';

export interface HistoricalRow {
  pastedName: string;
  player: string;
  position: number;
  points: number;
  omp?: number;
  gwp?: number;
  ogp?: number;
}

export const normalizePlayerName = (name: string) =>
  name
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/[\p{P}\p{S}\u200e\u200f]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Adapted from the legacy pasted-standings flow; no rank-to-points conversion. */
export function parseHistoricalStandings(input: string): {
  rows: HistoricalRow[];
  errors: string[];
} {
  const rows: HistoricalRow[] = [];
  const errors: string[] = [];
  let metrics: ('omp' | 'gwp' | 'ogp')[] = [];
  for (const [index, raw] of input.split(/\r?\n/).entries()) {
    const line = raw.replace(/[\u200e\u200f]/g, '').trim();
    if (!line) continue;
    if (
      /\b(standings|points|pts|player|rank|position)\b|נקודות|שחקן|מיקום/i.test(
        line,
      ) &&
      !/\d/.test(line)
    ) {
      metrics = [...line.matchAll(/\b(OMP|GWP|OGP)\b/gi)].map(
        (match) => match[1].toLowerCase() as 'omp' | 'gwp' | 'ogp',
      );
      continue;
    }
    const rank = line.match(/^(\d+)\s*[:.)-]?\s+/);
    const tokens = (rank ? line.slice(rank[0].length) : line).split(/\s+/);
    const pointsIndex = tokens.findIndex((token) =>
      /^-?\d+(?:\.\d+)?$/.test(token),
    );
    const pastedName = tokens.slice(0, pointsIndex).join(' ');
    const points = Number(tokens[pointsIndex]);
    const position = rank ? Number(rank[1]) : rows.length + 1;
    if (
      pointsIndex < 1 ||
      !pastedName ||
      !Number.isInteger(points) ||
      points < 0 ||
      points > 10000 ||
      position < 1
    ) {
      errors.push(`שורה ${index + 1}: יש להזין שם וניקוד שלם שאינו שלילי.`);
      continue;
    }
    const row: HistoricalRow = { pastedName, player: '', position, points };
    const trailing = tokens.slice(pointsIndex + 1);
    if (
      metrics.length &&
      new Set(metrics).size === metrics.length &&
      trailing.length === metrics.length
    ) {
      for (const [i, key] of metrics.entries()) {
        // Only explicit percentages are unambiguous; unknown tie-breaks stay absent.
        if (/^\d+(?:[.,]\d+)?%$/.test(trailing[i])) {
          const percentage = Number(
            trailing[i].replace('%', '').replace(',', '.'),
          );
          if (percentage <= 100) row[key] = percentage / 100;
          else errors.push(`שורה ${index + 1}: אחוז חייב להיות בין 0 ל־100.`);
        }
      }
    }
    rows.push(row);
  }
  if (rows.length < 2 || rows.length > 128)
    errors.push('נדרשות בין 2 ל־128 תוצאות.');
  const sorted = [...rows].sort((a, b) => a.position - b.position);
  if (sorted.some((row, index) => row.position !== index + 1))
    errors.push('המיקומים חייבים להיות ייחודיים ורציפים.');
  if (
    sorted.some(
      (row, index) => index > 0 && row.points > sorted[index - 1].points,
    )
  )
    errors.push('סדר המיקומים אינו תואם לניקוד.');
  return { rows, errors };
}

export function matchHistoricalPlayers(
  rows: HistoricalRow[],
  players: ManageablePlayer[],
  teamId: string,
): HistoricalRow[] {
  const teamPlayers = players.filter((player) => player.team?.id === teamId);
  const matched = rows.map((row) => {
    const name = normalizePlayerName(row.pastedName);
    const exact = teamPlayers.filter(
      (p) => normalizePlayerName(`${p.firstName} ${p.lastName}`) === name,
    );
    const candidates = exact.length
      ? exact
      : teamPlayers.filter((p) => {
          const full = normalizePlayerName(`${p.firstName} ${p.lastName}`);
          // Short single-token names are not safe containment matches.
          return (
            name.split(' ').length >= 2 &&
            (` ${full} `.includes(` ${name} `) ||
              ` ${name} `.includes(` ${full} `))
          );
        });
    return { ...row, player: candidates.length === 1 ? candidates[0].id : '' };
  });
  const counts = new Map<string, number>();
  for (const row of matched)
    if (row.player) counts.set(row.player, (counts.get(row.player) || 0) + 1);
  return matched.map((row) => ({
    ...row,
    player: (counts.get(row.player) || 0) > 1 ? '' : row.player,
  }));
}

export function historicalMappingsResolved(rows: HistoricalRow[]): boolean {
  return (
    rows.length >= 2 &&
    rows.every((row) => !!row.player) &&
    new Set(rows.map((row) => row.player)).size === rows.length
  );
}
