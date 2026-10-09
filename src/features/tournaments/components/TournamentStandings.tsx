import DataTable from '../../../components/ui/DataTable';
import type { Standing } from '../../../types/internalTournament';

export default function TournamentStandings({ rows }: { rows: Standing[] }) {
  const percentage = (value: number | null) =>
    value === null ? '—' : `${(value * 100).toFixed(2)}%`;
  return (
    <DataTable
      rows={rows}
      rowKey={(row) => row.player}
      columns={[
        { key: 'position', label: 'מקום', value: (row) => row.position },
        { key: 'name', label: 'שחקן', value: (row) => row.playerName },
        { key: 'points', label: 'Points', value: (row) => row.points },
        ...(['omp', 'gwp', 'ogp'] as const).map((key) => ({
          key,
          label: key.toUpperCase(),
          value: (row: Standing) => row[key],
          render: (row: Standing) => (
            <span dir="ltr">{percentage(row[key])}</span>
          ),
        })),
      ]}
    />
  );
}
