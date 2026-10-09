import DataTable from '../components/ui/DataTable';
import { useEffect, useState } from 'react';
import {
  getNationalRankings,
  type NationalRanking,
} from '../services/rankings';
import { requestError } from '../utils/requestError';
import { PageHero } from '../components/ui/PageHero';
export default function RankingsPage() {
  const [rows, setRows] = useState<NationalRanking[] | null>(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    getNationalRankings()
      .then((data) => {
        if (active) setRows(data.rankings);
      })
      .catch((e) => {
        if (active) setError(requestError(e));
      });
    return () => {
      active = false;
    };
  }, []);
  return (
    <div>
      <PageHero
        title="הליגה הישראלית"
        highlightWord="הישראלית"
        subtitle="הדירוג הארצי המצטבר של שחקני החוגים — לאורך כל שנות הפעילות"
      />
      <div className="container py-12">
        <label className="block mb-6 font-bold">
          חיפוש שחקן
          <input
            className="block w-full mt-2 p-3 border rounded-lg bg-card"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="שם שחקן"
          />
        </label>
        {error && (
          <p role="alert" className="text-destructive">
            {error}
          </p>
        )}
        {rows === null ? (
          <p>טוען דירוג...</p>
        ) : (
          <DataTable
            headerClassName="bg-navy-700 text-white"
            rows={rows.filter((row) => row.playerName.includes(search.trim()))}
            rowKey={(row) => row.playerId}
            columns={[
              { key: 'position', label: 'מקום', value: (row) => row.position },
              {
                key: 'playerName',
                label: 'שחקן',
                value: (row) => row.playerName,
              },
              { key: 'points', label: 'נקודות', value: (row) => row.points },
              {
                key: 'tournaments',
                label: 'טורנירים',
                value: (row) => row.tournaments,
              },
              {
                key: 'bestRank',
                label: 'מיקום שיא',
                value: (row) => row.bestRank,
              },
            ]}
          />
        )}
      </div>
    </div>
  );
}
