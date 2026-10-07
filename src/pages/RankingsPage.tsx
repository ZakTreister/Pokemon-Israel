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
          <div className="overflow-x-auto rounded-lg border bg-card shadow-panel">
            <table className="w-full text-right">
              <thead className="bg-navy-700 text-white">
                <tr>
                  {['מקום', 'שחקן', 'נקודות', 'טורנירים', 'מיקום שיא'].map(
                    (h) => (
                      <th key={h} className="p-4">
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {rows
                  .filter((row) => row.playerName.includes(search.trim()))
                  .map((row) => (
                    <tr key={row.playerId} className="border-t">
                      <td className="p-4 font-bold">{row.position}</td>
                      <td className="p-4 font-bold">{row.playerName}</td>
                      <td className="p-4 text-blue-500 font-extrabold">
                        {row.points}
                      </td>
                      <td className="p-4">{row.tournaments}</td>
                      <td className="p-4">{row.bestRank ?? '—'}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {!rows.some((row) => row.playerName.includes(search.trim())) && (
              <p className="p-6 text-muted-foreground">אין תוצאות להצגה.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
