import { isAxiosError } from 'axios';
import { subscribeTournament } from '../../services/tournamentLive';
import { useCallback, useEffect, useState, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { internalTournaments } from '../../services/internalTournaments';
import teamsService from '../../features/teams/teamsService';
import { requestError } from '../../utils/requestError';
import type {
  InternalTournament,
  InternalMatch,
  MatchResult,
  Standing,
} from '../../types/internalTournament';
import type { TeamRosterPlayer } from '../../types/team';
import Button from '../../components/ui/Button';
import MatchEditor from '../../components/MatchEditor';
import { useConfirm } from '../../components/ui/ConfirmProvider';

function Standings({ rows }: { rows: Standing[] }) {
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
export default function InternalTournamentPage() {
  const { id = '' } = useParams();
  const { showConfirm } = useConfirm();
  const [tournament, setTournament] = useState<InternalTournament | null>(null);
  const [roster, setRoster] = useState<TeamRosterPlayer[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [roundNumber, setRoundNumber] = useState(0);
  const [resultsView, setResultsView] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [syncError, setSyncError] = useState('');
  const [saveFailed, setSaveFailed] = useState(false);
  const [failedMatches, setFailedMatches] = useState<string[]>([]);
  const busyRef = useRef(false);
  const connectedRef = useRef(false);
  const [connected, setConnected] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const revisionRef = useRef(-1);
  const accept = useCallback((data: InternalTournament) => {
    if (data.revision <= revisionRef.current) return;
    revisionRef.current = data.revision;
    setTournament(data);
    setSelected(data.playerParticipants.map((p) => p.player));
    setRoundNumber((current) =>
      current && current <= data.rounds.length ? current : data.rounds.length,
    );
  }, []);
  const reload = useCallback(async () => {
    const data = await internalTournaments.get(id);
    accept(data);
    return data;
  }, [id, accept]);
  useEffect(() => {
    let active = true;
    revisionRef.current = -1;
    setDeleted(false);
    setSaveFailed(false);
    setFailedMatches([]);
    setSyncError('');
    setRoster([]);
    setTournament(null);
    setError('');
    internalTournaments
      .get(id)
      .then(async (data) => {
        if (!active) return;
        accept(data);
        const team = await teamsService.getTeam(data.team);
        if (active) setRoster(team.players);
      })
      .catch((e) => {
        if (active) setError(requestError(e));
      });
    return () => {
      active = false;
    };
  }, [id, accept]);
  useEffect(() => {
    let active = true;
    const sync = async (removed?: boolean) => {
      if (removed) {
        setDeleted(true);
        return;
      }
      try {
        const data = await internalTournaments.get(id);
        if (active) {
          accept(data);
          setSyncError('');
        }
      } catch (e) {
        if (active && isAxiosError(e) && e.response?.status === 404)
          setDeleted(true);
        else if (active)
          setSyncError(
            'לא הצלחנו לרענן את הטורניר. אפשר לצפות במצב האחרון; בדקו את החיבור ונסו לרענן.',
          );
      }
    };
    const unsubscribe = subscribeTournament(
      id,
      (removed) => {
        if (active) void sync(removed);
      },
      (value) => {
        if (active) {
          setConnected(value);
          connectedRef.current = value;
        }
      },
    );
    // Automatically recover canonical state while a socket connection is unavailable.
    const fallback = window.setInterval(() => {
      if (active && !connectedRef.current) void sync();
    }, 10000);
    return () => {
      active = false;
      unsubscribe();
      window.clearInterval(fallback);
    };
  }, [id, accept]);
  if (deleted)
    return (
      <div>
        <p>הטורניר נמחק על ידי מנהל.</p>
      </div>
    );
  const mutate = async (
    operation: () => Promise<InternalTournament>,
    after?: (data: InternalTournament) => void,
    resultMutation = false,
  ): Promise<'saved' | 'failed'> => {
    if (busyRef.current) return 'failed';
    busyRef.current = true;
    setBusy(true);
    setError('');
    try {
      const data = await operation();
      accept(data);
      after?.(data);
      if (!resultMutation) setSaveFailed(false);
      return 'saved';
    } catch (e) {
      if (!resultMutation) setSaveFailed(true);
      setError(
        `השינוי לא אושר כשמור. ${requestError(e)} אל תמשיכו לסיבוב הבא או לסיום לפני אישור השמירה.`,
      );
      try {
        await reload();
      } catch {
        /* Keep the visible error and last server snapshot for retry. */
      }
      return 'failed';
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };
  if (!tournament)
    return (
      <div>
        {error && <p role="alert">{error}</p>}
        {error ? (
          <Button
            onClick={() => {
              setError('');
              void reload()
                .then(async (data) => {
                  const team = await teamsService.getTeam(data.team);
                  setRoster(team.players);
                })
                .catch((e) =>
                  setError(`לא הצלחנו לטעון את הטורניר. ${requestError(e)}`),
                );
            }}
          >
            נסה לטעון שוב
          </Button>
        ) : (
          <p role="status">טוען טורניר...</p>
        )}
      </div>
    );
  const closed = tournament.phase === 'completed';
  const round = tournament.rounds.find((r) => r.number === roundNumber);
  const name = (player: string | null) =>
    tournament.playerParticipants.find((p) => p.player === player)
      ?.nameSnapshot || 'Bye';
  const allComplete =
    !!tournament.rounds.length &&
    tournament.rounds.every((r) => r.matches.every((m) => m.result));
  const participantsChanged =
    selected.length !== tournament.playerParticipants.length ||
    selected.some(
      (player) =>
        !tournament.playerParticipants.some((p) => p.player === player),
    );
  const saveResult = async (
    match: InternalMatch,
    result: MatchResult,
    revision: number,
  ) => {
    if (!round) return 'cancelled' as const;
    const changed =
      !match.result ||
      (['winner', 'score1', 'score2', 'drawnGames'] as const).some(
        (key) => result[key] !== match.result?.[key],
      );
    const invalidate = changed && round.number < tournament.rounds.length;
    if (
      invalidate &&
      !(await showConfirm({
        title: 'תיקון סיבוב קודם',
        message:
          'תיקון זה יבטל את כל הסיבובים המאוחרים ותוצאותיהם מהדירוג. הם יישמרו בארכיון, ויש להגריל אותם מחדש.',
        confirmText: 'תקן ובטל סיבובים מאוחרים',
        variant: 'destructive',
      }))
    )
      return 'cancelled' as const;
    const outcome = await mutate(
      () =>
        internalTournaments.result(
          id,
          revision,
          round.number,
          match._id,
          result,
          invalidate,
        ),
      undefined,
      true,
    );
    setFailedMatches((current) =>
      outcome === 'saved'
        ? current.filter((value) => value !== match._id)
        : [...new Set([...current, match._id])],
    );
    return outcome;
  };
  const pair = () =>
    mutate(
      () => internalTournaments.pair(id, tournament.revision),
      (data) => {
        setRoundNumber(data.rounds.length);
        setResultsView(false);
      },
    );
  const close = async () => {
    if (
      await showConfirm({
        title: 'סיום טורניר',
        message:
          'התוצאות הסופיות יישמרו והניקוד יתווסף לדירוג All Stars. לאחר הסיום הטורניר אינו ניתן לעריכה.',
        confirmText: 'סיים טורניר',
      })
    )
      await mutate(
        () => internalTournaments.close(id, tournament.revision),
        () => setResultsView(true),
      );
  };
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3 justify-between">
        <div>
          <h2 className="text-2xl font-bold">{tournament.title}</h2>
          <Link
            to={`/manage/teams/${tournament.team}`}
            className="text-blue-500"
          >
            {tournament.teamNameSnapshot}
          </Link>
          <p className="text-sm text-muted-foreground">
            {new Date(tournament.date).toLocaleDateString('he-IL')} ·{' '}
            {tournament.currentParticipants} משתתפים ·{' '}
            {closed
              ? 'הסתיים'
              : tournament.phase === 'setup'
                ? 'הכנה'
                : 'בתהליך'}
            {tournament.source === 'historical' ? ' · הזנה היסטורית ידנית' : ''}
          </p>
        </div>
      </div>
      <div className="min-h-16" aria-live="polite">
        {error && (
          <p
            role="alert"
            className="p-3 bg-destructive/10 text-destructive rounded-md"
          >
            {error}
          </p>
        )}
        {saveFailed && (
          <Button
            variant="outline"
            disabled={busy}
            onClick={() =>
              void reload()
                .then(() => {
                  setSaveFailed(false);
                  setError('');
                })
                .catch(() =>
                  setError(
                    'לא הצלחנו לבדוק אם השינוי נשמר. בדקו את החיבור ונסו שוב.',
                  ),
                )
            }
          >
            בדוק את המצב האחרון מהשרת לפני המשך
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground" role="status">
        {connected
          ? 'עדכון חי מחובר'
          : 'החיבור לעדכון חי נותק. אפשר להמשיך לצפות; מנסים להתחבר מחדש והמצב מתרענן אוטומטית.'}
      </p>
      {syncError && (
        <div role="status">
          <p>{syncError}</p>
          <Button
            variant="outline"
            onClick={() =>
              void reload()
                .then(() => setSyncError(''))
                .catch(() =>
                  setSyncError('הרענון נכשל. בדקו את החיבור ונסו שוב.'),
                )
            }
          >
            רענן טורניר
          </Button>
        </div>
      )}
      <p className="text-sm text-muted-foreground">
        כל תוצאה נשמרת מיד בשרת. לאחר רענון או כניסה ממכשיר אחר אפשר להמשיך
        מכאן. בעת עדכון מקביל המצב מתעדכן אוטומטית ויש להזין שוב.
      </p>
      {tournament.phase === 'setup' && (
        <div className="border rounded-lg p-4 space-y-4">
          <h3 className="font-bold">נוכחות לפני סיבוב 1</h3>
          <p className="text-sm">
            הסירו ילדים חסרים. לאחר תחילת הסיבובים הסגל נעול.
          </p>
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-4">
            {[
              ...tournament.playerParticipants.map((p) => ({
                id: p.player,
                label: p.nameSnapshot,
              })),
              ...roster
                .filter(
                  (p) =>
                    !tournament.playerParticipants.some(
                      (row) => row.player === p.id,
                    ),
                )
                .map((p) => ({
                  id: p.id,
                  label: `${p.firstName} ${p.lastName}`,
                })),
            ].map((p) => (
              <label key={p.id} className="border rounded-md p-2">
                <input
                  type="checkbox"
                  disabled={busy}
                  checked={selected.includes(p.id)}
                  onChange={(e) =>
                    setSelected(
                      e.target.checked
                        ? [...selected, p.id]
                        : selected.filter((value) => value !== p.id),
                    )
                  }
                />{' '}
                {p.label}
              </label>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-4">
            <Button
              disabled={busy || selected.length < 2 || !participantsChanged}
              onClick={() =>
                void mutate(() =>
                  internalTournaments.participants(
                    id,
                    tournament.revision,
                    selected,
                  ),
                )
              }
            >
              {busy ? 'שומר…' : 'שמור נוכחות'}
            </Button>
            <Button
              variant="outline"
              disabled={
                busy ||
                saveFailed ||
                failedMatches.length > 0 ||
                participantsChanged
              }
              onClick={() => void pair()}
            >
              הגרל סיבוב 1
            </Button>
          </div>
        </div>
      )}
      {tournament.rounds.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-4 sm:items-center">
          <label>
            סיבוב{' '}
            <select
              className="p-2 border rounded-md bg-background"
              disabled={busy || saveFailed || failedMatches.length > 0}
              value={roundNumber}
              onChange={(e) => {
                setRoundNumber(Number(e.target.value));
                setResultsView(false);
              }}
            >
              {tournament.rounds.map((r) => (
                <option key={r.number} value={r.number}>
                  סיבוב {r.number}
                </option>
              ))}
            </select>
          </label>
          <Button
            variant="outline"
            disabled={busy || saveFailed || failedMatches.length > 0}
            onClick={() => setResultsView(!resultsView)}
          >
            {resultsView ? 'חזור למשחקים' : 'הצג דירוג ותוצאות'}
          </Button>
        </div>
      )}
      {(resultsView || closed) && (
        <>
          <h3 className="font-bold text-xl">
            {closed ? 'דירוג סופי' : 'דירוג נוכחי'}
          </h3>
          <Standings rows={tournament.standings} />
          <p className="text-xs text-muted-foreground">
            3 נקודות לניצחון, 1 לתיקו. שוברי שוויון: OMP, GWP, OGP. אחוזים שאינם
            ידועים בהזנה היסטורית מוצגים כ־—.
          </p>
        </>
      )}
      {round && !resultsView && (
        <div className="grid gap-3 xl:grid-cols-2">
          {round.matches.map((match) => (
            <MatchEditor
              key={match._id}
              match={match}
              name={name}
              revision={tournament.revision}
              discard={async () => {
                await reload();
                setFailedMatches((current) =>
                  current.filter((value) => value !== match._id),
                );
                setError('');
              }}
              readOnly={closed}
              disabled={busy}
              save={(result, revision) => saveResult(match, result, revision)}
            />
          ))}
        </div>
      )}
      {!closed && tournament.phase === 'running' && (
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-4">
          <Button
            disabled={
              busy ||
              saveFailed ||
              failedMatches.length > 0 ||
              !allComplete ||
              tournament.rounds.length >= 16
            }
            onClick={() => void pair()}
          >
            הגרל סיבוב נוסף
          </Button>
          <Button
            variant="outline"
            disabled={
              busy || saveFailed || failedMatches.length > 0 || !allComplete
            }
            onClick={() => void close()}
          >
            סיים טורניר
          </Button>
          {!allComplete && (
            <p className="text-sm text-muted-foreground">
              יש לשמור את כל תוצאות הסיבוב לפני ההמשך או הסיום.
            </p>
          )}
        </div>
      )}
      {!!tournament.invalidatedRounds.length && (
        <p className="text-sm text-muted-foreground">
          {tournament.invalidatedRounds.length} תיקונים ביטלו סיבובים מאוחרים;
          הסיבובים המקוריים נשמרו בארכיון בשרת.
        </p>
      )}
    </div>
  );
}
