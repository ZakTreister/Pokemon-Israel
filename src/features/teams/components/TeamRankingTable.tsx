import { Link } from 'react-router-dom';
import DataTable from '../../../components/ui/DataTable';
import type { AllStarsRanking } from '../../../types/internalTournament';
export default function TeamRankingTable({
  rows,
}: {
  rows: AllStarsRanking[];
}) {
  return (
    <DataTable
      rows={rows}
      rowKey={(row) => row.playerId}
      rowLink={(row) => `/all-stars/players/${row.playerId}`}
      columns={[
        { key: 'position', label: 'מיקום', value: (row) => row.position },
        {
          key: 'playerName',
          label: 'שם',
          value: (row) => row.playerName,
          render: (row) => (
            <Link
              className="text-blue-500 font-bold"
              to={`/all-stars/players/${row.playerId}`}
            >
              {row.playerName}
            </Link>
          ),
        },
        { key: 'points', label: 'נקודות', value: (row) => row.points },
        {
          key: 'tournaments',
          label: 'טורנירים',
          value: (row) => row.tournaments,
        },
      ]}
    />
  );
}
