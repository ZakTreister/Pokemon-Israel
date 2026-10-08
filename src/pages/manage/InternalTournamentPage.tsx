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
} from '../../types/internalTournament';
import type { TeamRosterPlayer } from '../../types/team';
import Button from '../../components/ui/Button';
import { useAppSelector } from '../../hooks/redux';
import MatchEditor from '../../components/MatchEditor';
import TournamentStandings from '../../features/tournaments/components/TournamentStandings';
import ParticipantList from '../../features/tournaments/components/ParticipantList';
import { participantOptions } from '../../features/tournaments/utils/participantOptions';
import { useConfirm } from '../../components/ui/ConfirmProvider';

export default function InternalTournamentPage() {
  const judge = useAppSelector((state) => state.auth.user?.role === 'judge');
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
  const closed =
    tournament.phase === 'completed' || tournament.status === 'completed';
  const readOnly =
    closed ||
    (judge &&
      (tournament.source !== 'live' ||
        !['setup', 'running'].includes(tournament.phase)));
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
  const cancelRound = async () => {
    if (!round || round.number !== tournament.rounds.length) return;
    if (!(await showConfirm({
      title: 'ביטול הסיבוב האחרון',
      message: 'הסיבוב ותוצאותיו יוסרו מהדירוג ויישמרו בארכיון. הסגל יישאר נעול. לבטל?',
      confirmText: 'בטל סיבוב',
      variant: 'destructive',
    }))) return;
    await mutate(() => internalTournaments.cancelRound(id, tournament.revision, round.number), () => setResultsView(false));
  };
  return (
    <div className="space-y-3 sm:space-y-5">
      <div className="flex flex-wrap gap-3 justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold">{tournament.title}</h2>
          <Link
            to={`/manage/teams/${tournament.team}`}
            className="text-blue-500"
          >
            {tournament.teamNameSnapshot}
          </Link>
          <p className="text-xs text-muted-foreground">
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
        {connected && (
          <span role="status" className="text-xs text-green-700">
            ● עדכון חי מחובר
          </span>
        )}
      </div>
      {tournament.rounds.length > 0 && (
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-lg bg-navy-700 p-3 text-white">
          <label className="flex min-w-0 items-center gap-2 text-sm font-bold">
            סיבוב{' '}
            <select
              aria-label="סיבוב נוכחי"
              className="min-w-0 h-10 p-2 border border-navy-400 rounded-md bg-navy-600 text-white"
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
            contextual
            className="h-auto min-h-10 whitespace-normal px-3 py-2"
            variant="outline"
            disabled={busy || saveFailed || failedMatches.length > 0}
            onClick={() => setResultsView(!resultsView)}
          >
            {resultsView ? 'חזור למשחקים' : 'דירוג ותוצאות'}
          </Button>
        </div>
      )}
      {(error || saveFailed) && (
        <div className="space-y-2" aria-live="polite">
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
      )}
      {!connected && (
        <p
          role="status"
          className="rounded-md bg-amber-50 p-2 text-xs text-amber-900"
        >
          עדכון חי מנותק. מנסים להתחבר מחדש; אפשר לצפות במצב האחרון.
        </p>
      )}
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
      {!readOnly && tournament.phase === 'setup' && (
        <div className="border rounded-lg p-4 space-y-4">
          <h3 className="font-bold">נוכחות לפני סיבוב 1</h3>
          <p className="text-sm">
            הסירו ילדים חסרים. לאחר תחילת הסיבובים הסגל נעול.
          </p>
          <ParticipantList
            options={participantOptions(tournament.playerParticipants, roster)}
            selected={selected}
            disabled={busy}
            onChange={setSelected}
          />
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
      {(resultsView || readOnly) && (
        <>
          <h3 className="font-bold text-xl">
            {closed ? 'דירוג סופי' : 'דירוג נוכחי'}
          </h3>
          <TournamentStandings rows={tournament.standings} />
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
              readOnly={readOnly}
              disabled={busy}
              save={(result, revision) => saveResult(match, result, revision)}
            />
          ))}
        </div>
      )}
      {!readOnly && tournament.phase === 'running' && (
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-4">
          <Button
            variant="cta"
            disabled={
              busy ||
              saveFailed ||
              failedMatches.length > 0 ||
              (!allComplete && tournament.rounds.length > 0) ||
              tournament.rounds.length >= 16
            }
            onClick={() => void pair()}
          >
            {tournament.rounds.length ? 'הגרל סיבוב נוסף' : 'הגרל סיבוב 1'}
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
          {round && round.number === tournament.rounds.length && (
            <Button variant="destructive" disabled={busy || saveFailed || failedMatches.length > 0} onClick={() => void cancelRound()}>
              בטל סיבוב
            </Button>
          )}
          {!allComplete && tournament.rounds.length > 0 && (
            <p className="text-sm text-muted-foreground">
              יש לשמור את כל תוצאות הסיבוב לפני ההמשך או הסיום.
            </p>
          )}
        </div>
      )}
      <details className="text-xs text-muted-foreground">
        <summary className="cursor-pointer py-2">מידע על שמירה וסנכרון</summary>
        <p className="pt-2">
          התוצאות שנשמרו נמצאות בשרת. לאחר רענון או כניסה ממכשיר אחר אפשר להמשיך
          מכאן. בעת עדכון מקביל המצב מתעדכן אוטומטית ויש להזין שוב.
        </p>
      </details>
      {!!tournament.invalidatedRounds.length && (
        <p className="text-sm text-muted-foreground">
          {tournament.invalidatedRounds.length} ביטולים או תיקונים תועדו;
          הסיבובים המקוריים נשמרו בארכיון בשרת.
        </p>
      )}
    </div>
  );
}
