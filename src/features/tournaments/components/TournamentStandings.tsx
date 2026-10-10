import { Link } from 'react-router-dom';
import DataTable from '../../../components/ui/DataTable';
import type { Deck } from '../../../types/deck';
import type { Standing } from '../../../types/internalTournament';

export default function TournamentStandings({
  rows,
  teamPlayers = false,
}: {
  rows: (Standing & { deck?: Deck | null })[];
  teamPlayers?: boolean;
}) {
  const percentage = (value: number | null) =>
    value === null ? '—' : `${(value * 100).toFixed(2)}%`;
  return (
    <DataTable
      rows={rows}
      rowLink={
        teamPlayers ? (row) => `/all-stars/players/${row.player}` : undefined
      }
      rowKey={(row) => row.player}
      columns={[
        { key: 'position', label: 'מקום', value: (row) => row.position },
        {
          key: 'name',
          label: 'שחקן',
          value: (row) => row.playerName,
          render: (row) =>
            teamPlayers ? (
              <Link
                className="text-blue-500 font-bold"
                to={`/all-stars/players/${row.player}`}
              >
                {row.playerName}
              </Link>
            ) : (
              row.playerName
            ),
        },
        { key: 'points', label: 'Points', value: (row) => row.points },
        ...(rows.some((row) => row.deck)
          ? [
              {
                key: 'deck',
                label: 'דק',
                value: (row: Standing & { deck?: Deck | null }) =>
                  row.deck?.archetype,
                render: (row: Standing & { deck?: Deck | null }) => (
                  <div className="flex items-center gap-2">
                    <span>{row.deck?.archetype || '—'}</span>
                    {[
                      row.deck?.iconImage1,
                      row.deck?.iconImage2,
                      row.deck?.attackerImage1,
                      row.deck?.attackerImage2,
                    ]
                      .filter((url): url is string => Boolean(url))
                      .map((url, index) => (
                        <img
                          key={index}
                          src={url}
                          alt=""
                          className="h-6 w-6 object-contain"
                        />
                      ))}
                  </div>
                ),
              },
            ]
          : []),
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
