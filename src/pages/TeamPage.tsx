import TeamAdministration from '../features/teams/components/TeamAdministration';
import TeamTournamentAction from '../features/teams/components/TeamTournamentAction';
import {
  publicTournaments,
  type PublicTournamentSummary,
} from '../services/publicTournaments';
import DataTable from '../components/ui/DataTable';
import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
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
  const management = useLocation().pathname.startsWith('/manage/');
  const { user } = useAppSelector((state) => state.auth);
  const admin = user?.role === 'admin';
  const staff = user?.role === 'admin' || user?.role === 'judge';
  const [section, setSection] = useState('members');
  const [history, setHistory] = useState<PublicTournamentSummary[]>([]);
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
  useEffect(() => {
    if (section !== 'history') return;
    let active = true;
    publicTournaments
      .list()
      .then((events) => {
        if (active) setHistory(events.filter((event) => event.team === id));
      })
      .catch((e) => {
        if (active) setError(requestError(e));
      });
    return () => {
      active = false;
    };
  }, [id, section]);
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
      {!management && (
        <Button asChild variant="outline" className="mb-5">
          <Link to={staff ? '/manage/teams' : '/all-stars'}>
            → חזרה לנבחרות All-Stars
          </Link>
        </Button>
      )}
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
          {management && staff && (
            <div className="mb-5">
              <TeamTournamentAction team={team} />
              <p className="text-sm text-muted-foreground mt-2">
                מורה: {team.teacher?.name || 'טרם שויך מורה'}
              </p>
            </div>
          )}
          <nav aria-label="תוכן נבחרת" className="flex flex-wrap gap-2 mb-6">
            {[
              ['members', 'חברי נבחרת'],
              ['ranking', 'דירוג וסטטיסטיקה'],
              ['history', 'היסטוריית טורנירים'],
              ...(management && admin ? [['settings', 'הגדרות נבחרת']] : []),
            ].map(([key, label]) => (
              <Button
                contextual
                key={key}
                variant={section === key ? 'secondary' : 'outline'}
                aria-pressed={section === key}
                onClick={() => setSection(key)}
              >
                {label}
              </Button>
            ))}
          </nav>
          {section === 'settings' && management && admin && (
            <TeamAdministration teamId={id} onChanged={load} />
          )}
          {section === 'history' && (
            <section className="space-y-3">
              <h2 className="text-2xl font-bold">היסטוריית טורנירים</h2>
              {management && staff && (
                <Button asChild variant="outline">
                  <Link to={`/manage/teams/${id}/history`}>
                    ניהול היסטוריית טורנירים
                  </Link>
                </Button>
              )}
              {management && admin && (
                <details>
                  <summary className="cursor-pointer font-bold">
                    עוד פעולות
                  </summary>
                  <Link
                    className="block p-3 text-blue-500"
                    to={`/manage/teams/${id}/historical`}
                  >
                    הזנת טורניר היסטורי
                  </Link>
                </details>
              )}
              {history.length ? (
                history.map((event) => (
                  <p key={event.id}>
                    <Link
                      className="text-blue-500"
                      to={`/tournaments/${event.id}`}
                    >
                      {event.title}
                    </Link>{' '}
                    · {new Date(event.date).toLocaleDateString('he-IL')}
                  </p>
                ))
              ) : (
                <p>אין טורנירים להצגה.</p>
              )}
            </section>
          )}
          {section === 'members' && management && admin && (
            <details className="mb-5">
              <summary
                className="cursor-pointer font-bold"
                onClick={() => setEditing(true)}
              >
                הוסף / טען ילדים
              </summary>
              {admin && editing && (
                <form
                  className="border bg-card rounded-lg p-4 mb-6 space-y-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void loadChildren();
                  }}
                >
                  <h2 className="font-bold text-xl">חברי נבחרת חדשים</h2>
                  <p className="text-sm text-muted-foreground">
                    ללא חשבונות התחברות. לשיוך ילדים שכבר רשומים, השתמשו בניהול
                    הגדרות הנבחרת.
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
                            placeholder={
                              ['שם פרטי', 'שם משפחה', 'עיר (רשות)'][i]
                            }
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
                        contextual
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
                      {busy ? 'שומר...' : 'שמור חברי נבחרת'}
                    </Button>
                  </div>
                </form>
              )}
            </details>
          )}
          {(section === 'members' || section === 'ranking') && (
            <section>
              <h2 className="text-2xl font-bold mb-4">
                {section === 'members' ? 'חברי נבחרת' : 'דירוג וסטטיסטיקה'}
              </h2>
              {!team.players.length ? (
                <p>עדיין אין חברי נבחרת פעילים.</p>
              ) : (
                <DataTable
                  rowLink={(row) => `/all-stars/players/${row.id}`}
                  rows={team.players.map((player) => ({
                    ...player,
                    rank: rankings.find((row) => row.playerId === player.id),
                  }))}
                  rowKey={(row) => row.id}
                  columns={[
                    {
                      key: 'name',
                      label: 'שחקן',
                      value: (row) => `${row.firstName} ${row.lastName}`,
                      render: (row) => (
                        <Link
                          className="font-bold text-blue-500"
                          to={`/all-stars/players/${row.id}`}
                        >
                          {row.firstName} {row.lastName}
                        </Link>
                      ),
                    },
                    { key: 'city', label: 'עיר', value: (row) => row.city },
                    {
                      key: 'position',
                      label: 'מקום',
                      value: (row) => row.rank?.position,
                    },
                    {
                      key: 'points',
                      label: 'נקודות',
                      value: (row) => row.rank?.points ?? 0,
                    },
                    {
                      key: 'tournaments',
                      label: 'טורנירים',
                      value: (row) => row.rank?.tournaments ?? 0,
                    },
                  ]}
                />
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
