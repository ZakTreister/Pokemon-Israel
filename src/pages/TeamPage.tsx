import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAppSelector } from '../hooks/redux';
import { publicTeams } from '../services/publicTeams';
import teamsService from '../features/teams/teamsService';
import { internalTournaments } from '../services/internalTournaments';
import api from '../services/api';
import { requestError } from '../utils/requestError';
import type { TeamWithRoster } from '../types/team';
import type { AllStarsRanking } from '../types/internalTournament';
import { TeamEmblem } from '../components/teams/TeamCard';
import Button from '../components/ui/Button';
interface ChildRow {
  firstName: string;
  lastName: string;
  city: string;
}
const emptyChild = (): ChildRow => ({ firstName: '', lastName: '', city: '' });
export default function TeamPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const management = useLocation().pathname.startsWith('/manage/');
  const { user } = useAppSelector((state) => state.auth);
  const staff = user?.role === 'admin' || user?.role === 'judge';
  const [team, setTeam] = useState<TeamWithRoster | null>(null);
  const [rankings, setRankings] = useState<AllStarsRanking[]>([]);
  const [children, setChildren] = useState<ChildRow[]>([emptyChild()]);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    const [t, r] = await Promise.all([
      staff ? teamsService.getTeam(id) : publicTeams.get(id),
      internalTournaments.rankings(id),
    ]);
    setTeam(t);
    setRankings(r.rankings);
  }, [id, staff]);
  useEffect(() => {
    setTeam(null);
    setError('');
    load().catch((e) => setError(requestError(e)));
  }, [load]);
  const create = async () => {
    setBusy(true);
    setError('');
    try {
      const tournament = await internalTournaments.create(id);
      navigate(`/manage/tournaments/${tournament.id}`);
    } catch (e) {
      setError(requestError(e));
    } finally {
      setBusy(false);
    }
  };
  const loadChildren = async () => {
    setBusy(true);
    setError('');
    try {
      await api.post(`/api/teams/${id}/players`, { players: children });
      setChildren([emptyChild()]);
      setEditing(false);
      await load();
    } catch (e) {
      setError(requestError(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className={management ? 'py-6' : 'container py-12'}>
      <Link
        to={staff ? '/manage/teams' : '/all-stars'}
        className="block mb-5 font-bold text-blue-500"
      >
        → חזרה לנבחרות All-Stars
      </Link>
      {error && (
        <p
          role="alert"
          className="mb-4 p-3 bg-destructive/10 text-destructive rounded-md"
        >
          {error}
        </p>
      )}
      {!team ? (
        <p>טוען נבחרת...</p>
      ) : (
        <>
          <div className="cs-public-card flex flex-wrap gap-6 items-center p-6 mb-6">
            <TeamEmblem team={team} />
            <div>
              <p className="text-blue-500 font-bold">ALL STARS</p>
              <h1 className="text-4xl font-extrabold">{team.name}</h1>
              <p className="mt-2">
                {team.playerCount} שחקנים פעילים ·{' '}
                {team.completedInternalTournamentCount ?? 0} טורנירים פנימיים
                שהסתיימו
              </p>
              {!team.isActive && <p>הנבחרת אינה פעילה</p>}
            </div>
          </div>
          {staff && (
            <div className="flex flex-wrap gap-3 mb-6">
              <Button
                disabled={busy || !team.isActive || team.players.length < 2}
                onClick={create}
              >
                פתח טורניר פנימי
              </Button>
              <Button
                variant="outline"
                disabled={busy || !team.isActive}
                onClick={() => setEditing(!editing)}
              >
                הוסף / טען ילדים
              </Button>
              <Button variant="outline" asChild>
                <Link to={`/manage/teams/${id}/historical`}>
                  הזנת טורניר היסטורי
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to={`/manage/teams/${id}/history`}>
                  היסטוריית טורנירים
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/manage/teams">העברה והסרת שחקנים</Link>
              </Button>
            </div>
          )}
          {staff && editing && (
            <form
              className="border bg-card rounded-lg p-4 mb-6 space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                void loadChildren();
              }}
            >
              <h2 className="font-bold text-xl">ילדים חדשים בסגל</h2>
              <p className="text-sm text-muted-foreground">
                ללא חשבונות התחברות. לשיוך ילדים שכבר רשומים, השתמשו בניהול
                נבחרות.
              </p>
              {children.map((row, index) => (
                <div key={index} className="grid gap-2 sm:grid-cols-4">
                  {(['firstName', 'lastName', 'city'] as const).map(
                    (field, i) => (
                      <input
                        key={field}
                        required={field !== 'city'}
                        maxLength={field === 'city' ? 100 : 50}
                        aria-label={`${['שם פרטי', 'שם משפחה', 'עיר'][i]} ${index + 1}`}
                        placeholder={['שם פרטי', 'שם משפחה', 'עיר (רשות)'][i]}
                        value={row[field]}
                        onChange={(e) =>
                          setChildren(
                            children.map((child, j) =>
                              j === index
                                ? { ...child, [field]: e.target.value }
                                : child,
                            ),
                          )
                        }
                        className="p-2 border rounded-md bg-background"
                      />
                    ),
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    disabled={children.length === 1 || busy}
                    onClick={() =>
                      setChildren(children.filter((_, j) => j !== index))
                    }
                  >
                    הסר שורה
                  </Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy || children.length >= 128}
                  onClick={() => setChildren([...children, emptyChild()])}
                >
                  שורה נוספת
                </Button>
                <Button disabled={busy}>
                  {busy ? 'שומר...' : 'שמור ילדים בסגל'}
                </Button>
              </div>
            </form>
          )}
          <h2 className="text-2xl font-bold mb-4">סגל פעיל ודירוג בנבחרת</h2>
          {!team.players.length ? (
            <p>עדיין אין ילדים פעילים בסגל.</p>
          ) : (
            <div className="overflow-x-auto border rounded-lg bg-card">
              <table className="w-full text-right">
                <thead className="bg-muted">
                  <tr>
                    {['שחקן', 'עיר', 'מקום', 'נקודות', 'טורנירים'].map((h) => (
                      <th key={h} className="p-3">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {team.players.map((player) => {
                    const rank = rankings.find(
                      (row) => row.playerId === player.id,
                    );
                    return (
                      <tr key={player.id} className="border-t">
                        <td className="p-3 font-bold">
                          {player.firstName} {player.lastName}
                        </td>
                        <td className="p-3">{player.city || '—'}</td>
                        <td className="p-3">{rank?.position ?? '—'}</td>
                        <td className="p-3">{rank?.points ?? 0}</td>
                        <td className="p-3">{rank?.tournaments ?? 0}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
