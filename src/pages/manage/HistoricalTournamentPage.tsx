import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import teamsService from '../../features/teams/teamsService';
import { internalTournaments } from '../../services/internalTournaments';
import { requestError } from '../../utils/requestError';
import type { ManageablePlayer, Team } from '../../types/team';
import Button from '../../components/ui/Button';
import {
  parseHistoricalStandings,
  matchHistoricalPlayers,
  historicalMappingsResolved,
  type HistoricalRow,
} from '../../features/tournaments/utils/historicalStandings';

export default function HistoricalTournamentPage() {
  const [params] = useSearchParams();
  const route = useParams();
  const navigate = useNavigate();
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<ManageablePlayer[]>([]);
  const [teamId, setTeamId] = useState(
    route.teamId || params.get('teamId') || '',
  );
  const [date, setDate] = useState('2026-10-04');
  const [input, setInput] = useState('');
  const [rows, setRows] = useState<HistoricalRow[]>([]);
  const [parsedInput, setParsedInput] = useState('');
  const [includeTransferred, setIncludeTransferred] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    Promise.all([teamsService.getTeams(), teamsService.getManageablePlayers()])
      .then(([t, p]) => {
        if (active) {
          setTeams(t);
          setPlayers(p);
          setLoaded(true);
        }
      })
      .catch((e) => {
        if (active) setError(requestError(e));
      });
    return () => {
      active = false;
    };
  }, []);
  const parse = () => {
    const result = parseHistoricalStandings(input);
    setError([...result.errors, ...result.warnings].join(' '));
    setRows(
      result.errors.length
        ? []
        : matchHistoricalPlayers(result.rows, players, teamId),
    );
    setParsedInput(input);
  };
  const ready =
    loaded &&
    !!teamId &&
    input === parsedInput &&
    historicalMappingsResolved(rows);
  const save = async () => {
    if (!ready || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError('');
    try {
      const results = rows.map((row) => ({
        player: row.player,
        position: row.position,
        points: row.points,
        omp: row.omp,
        gwp: row.gwp,
        ogp: row.ogp,
      }));
      const tournament = await internalTournaments.historical(
        teamId,
        date,
        results,
      );
      navigate(`/manage/tournaments/${tournament.id}`);
    } catch (e) {
      setError(requestError(e));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };
  const pool = players.filter(
    (p) => includeTransferred || p.team?.id === teamId,
  );
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
      className="space-y-5"
    >
      <h2 className="text-2xl font-bold">הזנת טורניר פנימי היסטורי</h2>
      <p className="text-muted-foreground">
        הדביקו תוצאות סופיות ממערכת הטורנירים. הניקוד המקורי יתווסף לדירוג All
        Stars; אין צורך לשחזר סיבובים שאינם ידועים.
      </p>
      {error && (
        <p
          role="alert"
          className="p-3 bg-destructive/10 text-destructive rounded-md"
        >
          {error}
        </p>
      )}
      {!loaded && <p role="status">טוען שחקנים ונבחרות...</p>}
      <div className="grid sm:grid-cols-2 gap-4">
        <label>
          נבחרת
          <select
            required
            disabled={busy}
            className="block w-full p-2 border rounded-md bg-background"
            value={teamId}
            onChange={(e) => {
              setTeamId(e.target.value);
              setRows([]);
              setParsedInput('');
            }}
          >
            <option value="">בחר נבחרת</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          תאריך היסטורי
          <input
            required
            disabled={busy}
            type="date"
            max={new Date().toISOString().slice(0, 10)}
            className="block w-full p-2 border rounded-md bg-background"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
      </div>
      <label className="block">
        טבלת תוצאות מודבקת
        <textarea
          aria-label="טבלת תוצאות מודבקת"
          disabled={busy}
          rows={10}
          className="block w-full p-3 border rounded-md bg-background"
          placeholder={'1: שם שחקן 9\n2: שם שחקן נוסף 6'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
      </label>
      <p className="text-sm text-muted-foreground">
        פורמטים: מקום, שם ונקודות; או שם ונקודות. אפשר להדביק טבלה עם רווחים או
        טאבים. בעמודות OMP / GWP / OGP אפשר להזין אחוזים עם או בלי סימן %, למשל
        55.56.
      </p>
      <Button
        type="button"
        disabled={busy || !loaded || !teamId || !input.trim()}
        onClick={parse}
      >
        עבד והתאם שחקנים
      </Button>
      {!!rows.length && (
        <>
          <h3 className="font-bold">תצוגה מקדימה והתאמת שחקנים</h3>
          <label className="block text-sm">
            <input
              type="checkbox"
              disabled={busy}
              checked={includeTransferred}
              onChange={(e) => setIncludeTransferred(e.target.checked)}
            />{' '}
            כלול ילדים שעברו מאז לנבחרת אחרת או הוסרו
          </label>
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr>
                  {[
                    'מקום',
                    'שם מודבק',
                    'נקודות',
                    'שחקן תואם',
                    'OMP',
                    'GWP',
                    'OGP',
                  ].map((h) => (
                    <th key={h} className="p-2">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={index} className="border-t">
                    <td className="p-2">{row.position}</td>
                    <td className="p-2">{row.pastedName}</td>
                    <td className="p-2">{row.points}</td>
                    <td className="p-2">
                      <select
                        aria-label={`התאמת שחקן שורה ${index + 1}`}
                        disabled={busy}
                        className="min-w-40 w-full border rounded-md p-2 bg-background"
                        value={row.player}
                        onChange={(e) =>
                          setRows((current) =>
                            current.map((r, i) =>
                              i === index
                                ? { ...r, player: e.target.value }
                                : r,
                            ),
                          )
                        }
                      >
                        <option value="">בחרו שחקן — ההתאמה לא הוכרעה</option>
                        {players
                          .filter(
                            (p) => pool.includes(p) || p.id === row.player,
                          )
                          .map((p) => (
                            <option
                              key={p.id}
                              value={p.id}
                              disabled={rows.some(
                                (r, i) => i !== index && r.player === p.id,
                              )}
                            >
                              {p.firstName} {p.lastName}
                              {p.team ? ` (${p.team.name})` : ' (ללא נבחרת)'}
                            </option>
                          ))}
                      </select>
                    </td>
                    {(['omp', 'gwp', 'ogp'] as const).map((key) => (
                      <td key={key} dir="ltr" className="p-2">
                        {row[key] === undefined
                          ? '—'
                          : `${(row[key]! * 100).toFixed(2)}%`}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!historicalMappingsResolved(rows) && (
            <p role="status">יש לבחור שחקן ייחודי לכל שורה לפני שמירה.</p>
          )}
          {input !== parsedInput && (
            <p role="status">הטקסט השתנה. עבדו והתאימו שוב לפני שמירה.</p>
          )}
        </>
      )}
      <Button type="submit" disabled={busy || !ready}>
        {busy ? 'שומר...' : 'שמור טורניר היסטורי שהסתיים'}
      </Button>
    </form>
  );
}
