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
  warnings: string[];
} {
  const rows: HistoricalRow[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  type Column = 'player' | 'points' | 'position' | 'omp' | 'gwp' | 'ogp';
  const aliases: Record<string, Column | undefined> = {
    player: 'player',
    שחקן: 'player',
    שם: 'player',
    points: 'points',
    pts: 'points',
    נקודות: 'points',
    rank: 'position',
    position: 'position',
    מיקום: 'position',
    מקום: 'position',
    omp: 'omp',
    gwp: 'gwp',
    ogp: 'ogp',
  };
  let columns: (Column | undefined)[] | undefined;
  for (const [index, raw] of input.split(/\r?\n/).entries()) {
    const line = raw.replace(/[\u200e\u200f]/g, '').trim();
    if (!line) continue;
    const header = line
      .split(/\s+/)
      .map((token) => aliases[token.toLowerCase()]);
    if (header.includes('player') && header.includes('points')) {
      if (
        header.some(
          (column) =>
            column && header.filter((value) => value === column).length > 1,
        )
      ) {
        errors.push(`שורה ${index + 1}: כותרות העמודות חייבות להיות ייחודיות.`);
      }
      columns = header;
      continue;
    }
    let pastedName: string;
    let pointsText: string;
    let positionText: string;
    let cells: string[] = [];
    if (columns) {
      // Tabs preserve empty cells; repeated spaces preserve full player names.
      cells = raw
        .replace(/[\u200e\u200f]/g, '')
        .split('\t')
        .map((cell) => cell.trim());
      if (!raw.includes('\t')) {
        cells = line.split(/\s{2,}/);
        if (cells.length !== columns.length) {
          const tokens = line.split(/\s+/);
          const nameIndex = columns.indexOf('player');
          const nameLength = tokens.length - columns.length + 1;
          cells =
            nameLength > 0
              ? [
                  ...tokens.slice(0, nameIndex),
                  tokens.slice(nameIndex, nameIndex + nameLength).join(' '),
                  ...tokens.slice(nameIndex + nameLength),
                ]
              : [];
        }
      }
      if (cells.length !== columns.length) {
        errors.push(
          `שורה ${index + 1}: מספר העמודות אינו תואם לכותרת. הדביקו שוב עם טאבים.`,
        );
        continue;
      }
      pastedName = cells[columns.indexOf('player')];
      pointsText = cells[columns.indexOf('points')];
      positionText = columns.includes('position')
        ? cells[columns.indexOf('position')].replace(/[:.)-]$/, '')
        : String(rows.length + 1);
    } else {
      const rank = line.match(/^(\d+)\s*[:.)-]?\s+/);
      const tokens = (rank ? line.slice(rank[0].length) : line).split(/\s+/);
      const pointsIndex = tokens.findIndex((token) =>
        /^-?\d+(?:\.\d+)?$/.test(token),
      );
      pastedName =
        pointsIndex > 0 ? tokens.slice(0, pointsIndex).join(' ') : '';
      pointsText = tokens[pointsIndex];
      positionText = rank ? rank[1] : String(rows.length + 1);
    }
    const points = Number(pointsText);
    const position = Number(positionText);
    if (
      !pastedName ||
      !/^\d+(?:\.\d+)?$/.test(pointsText) ||
      !Number.isInteger(points) ||
      points > 10000 ||
      !/^\d+$/.test(positionText) ||
      position < 1
    ) {
      errors.push(
        `שורה ${index + 1}: יש להזין שם, מיקום וניקוד שלם שאינו שלילי.`,
      );
      continue;
    }
    const row: HistoricalRow = { pastedName, player: '', position, points };
    for (const key of ['omp', 'gwp', 'ogp'] as const) {
      if (!columns?.includes(key)) continue;
      const value = cells[columns.indexOf(key)];
      // A recognized column makes bare numeric values unambiguously percentages.
      const percentage = Number(value.replace('%', '').replace(',', '.'));
      if (/^\d+(?:[.,]\d+)?%?$/.test(value) && percentage <= 100) {
        row[key] = percentage / 100;
      } else {
        warnings.push(
          `שורה ${index + 1}: ${key.toUpperCase()} לא זוהה כאחוז בין 0 ל־100 ונשאר ריק. בדקו את הערך לפני שמירה.`,
        );
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
  return { rows, errors, warnings };
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
      : !name.includes(' ')
        ? teamPlayers.filter((p) => normalizePlayerName(p.firstName) === name)
        : teamPlayers.filter((p) => {
            const full = normalizePlayerName(`${p.firstName} ${p.lastName}`);
            return (
              ` ${full} `.includes(` ${name} `) ||
              ` ${name} `.includes(` ${full} `)
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
