import type { Standing } from '../../../types/internalTournament';

export default function TournamentStandings({ rows }: { rows: Standing[] }) {
  const percentage = (value: number | null) =>
    value === null ? '—' : `${(value * 100).toFixed(2)}%`;
  return (
    <div className="overflow-x-auto border rounded-lg">
      <table className="w-full text-right">
        <thead className="bg-muted">
          <tr>
            {['מקום', 'שחקן', 'Points', 'OMP', 'GWP', 'OGP'].map((h) => (
              <th key={h} className="p-3">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.player} className="border-t">
              <td className="p-3">{row.position}</td>
              <td className="p-3 font-bold">{row.playerName}</td>
              <td className="p-3">{row.points}</td>
              <td className="p-3" dir="ltr">
                {percentage(row.omp)}
              </td>
              <td className="p-3" dir="ltr">
                {percentage(row.gwp)}
              </td>
              <td className="p-3" dir="ltr">
                {percentage(row.ogp)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
