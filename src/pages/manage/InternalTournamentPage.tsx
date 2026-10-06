import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { internalTournaments } from "../../services/internalTournaments";
import teamsService from "../../features/teams/teamsService";
import { requestError } from "../../utils/requestError";
import type {
  InternalTournament,
  InternalMatch,
  MatchResult,
  Standing,
} from "../../types/internalTournament";
import type { TeamRosterPlayer } from "../../types/team";
import Button from "../../components/ui/Button";
import { useConfirm } from "../../components/ui/ConfirmProvider";

function Standings({ rows }: { rows: Standing[] }) {
  const percentage = (value: number | null) =>
    value === null ? "—" : `${(value * 100).toFixed(2)}%`;
  return (
    <div className="overflow-x-auto border rounded-lg">
      <table className="w-full text-right">
        <thead className="bg-muted">
          <tr>
            {["מקום", "שחקן", "Points", "OMP", "GWP", "OGP"].map((h) => (
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
interface MatchEditorProps {
  match: InternalMatch;
  name: (id: string | null) => string;
  disabled: boolean;
  revision: number;
  save: (result: MatchResult, revision: number) => Promise<void>;
}
function MatchEditor({
  match,
  name,
  disabled,
  revision,
  save,
}: MatchEditorProps) {
  const [winner, setWinner] = useState<MatchResult["winner"] | "">(
    match.result?.winner || "",
  );
  const [score, setScore] = useState(
    match.result ? `${match.result.score1}-${match.result.score2}` : "",
  );
  const [drawnGames, setDrawnGames] = useState(match.result?.drawnGames ?? 0);
  // The revision captured when this editor was loaded protects an unsaved draft
  // from silently replacing another judge's more recent result.
  const [draftRevision] = useState(revision);
  const options =
    winner === "player1"
      ? ["2-0", "2-1", "1-0"]
      : winner === "player2"
        ? ["0-2", "1-2", "0-1"]
        : ["0-0", "1-1"];
  if (!match.player2)
    return (
      <div className="border rounded-lg p-4 bg-muted">
        <strong>
          שולחן {match.table}: {name(match.player1)}
        </strong>
        <p>Bye · 3 נקודות</p>
      </div>
    );
  return (
    <div className="border rounded-lg p-4 space-y-3">
      <p className="font-bold">
        שולחן {match.table}: {name(match.player1)} מול {name(match.player2)}
      </p>
      {disabled ? (
        <p>
          {match.result
            ? `${match.result.winner === "draw" ? "תיקו" : name(match.result.winner === "player1" ? match.player1 : match.player2)} · ${match.result.score1}–${match.result.score2}${match.result.drawnGames ? ` · ${match.result.drawnGames} משחקים בתיקו` : ""}`
            : "טרם הוזנה תוצאה"}
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {(["player1", "draw", "player2"] as const).map((value) => (
              <Button
                key={value}
                size="sm"
                variant={winner === value ? "default" : "outline"}
                onClick={() => {
                  setWinner(value);
                  setScore("");
                  setDrawnGames(0);
                }}
              >
                {value === "draw"
                  ? "תיקו"
                  : name(value === "player1" ? match.player1 : match.player2)}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap gap-3 items-end">
            <label className="text-sm">
              תוצאה (Bo3)
              <select
                aria-label={`תוצאה בשולחן ${match.table}`}
                disabled={!winner}
                className="block border rounded-md p-2 bg-background"
                value={score}
                onChange={(e) => {
                  setScore(e.target.value);
                  setDrawnGames(0);
                }}
              >
                <option value="">בחר ניקוד</option>
                {options.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              משחקים בתיקו
              <input
                aria-label={`משחקים בתיקו בשולחן ${match.table}`}
                type="number"
                min={0}
                max={
                  score
                    ? 3 -
                      score
                        .split("-")
                        .reduce((sum, value) => sum + Number(value), 0)
                    : 3
                }
                className="block border rounded-md p-2 w-24 bg-background"
                value={drawnGames}
                onChange={(e) => setDrawnGames(Number(e.target.value))}
              />
            </label>
            <Button
              size="sm"
              disabled={!winner || !score}
              onClick={() => {
                const [score1, score2] = score.split("-").map(Number);
                void save(
                  {
                    winner: winner as MatchResult["winner"],
                    score1,
                    score2,
                    drawnGames,
                  },
                  draftRevision,
                );
              }}
            >
              שמור תוצאה
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {match.result
              ? "תוצאה שמורה; שינויים נשמרים רק בלחיצה על שמור."
              : "תוצאה זו עדיין לא נשמרה."}
          </p>
        </>
      )}
    </div>
  );
}
export default function InternalTournamentPage() {
  const { id = "" } = useParams();
  const { showConfirm } = useConfirm();
  const [tournament, setTournament] = useState<InternalTournament | null>(null);
  const [roster, setRoster] = useState<TeamRosterPlayer[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [roundNumber, setRoundNumber] = useState(0);
  const [resultsView, setResultsView] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const accept = useCallback((data: InternalTournament) => {
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
    setTournament(null);
    setError("");
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
  const mutate = async (
    operation: () => Promise<InternalTournament>,
    after?: (data: InternalTournament) => void,
  ) => {
    setBusy(true);
    setError("");
    try {
      const data = await operation();
      accept(data);
      after?.(data);
    } catch (e) {
      setError(requestError(e));
      try {
        await reload();
      } catch {
        /* Keep the visible error and last server snapshot for retry. */
      }
    } finally {
      setBusy(false);
    }
  };
  if (!tournament)
    return (
      <div>
        {error && <p role="alert">{error}</p>}
        <p>טוען טורניר...</p>
      </div>
    );
  const closed = tournament.phase === "completed";
  const round = tournament.rounds.find((r) => r.number === roundNumber);
  const name = (player: string | null) =>
    tournament.playerParticipants.find((p) => p.player === player)
      ?.nameSnapshot || "Bye";
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
    if (!round) return;
    const changed =
      !match.result ||
      (["winner", "score1", "score2", "drawnGames"] as const).some(
        (key) => result[key] !== match.result?.[key],
      );
    const invalidate = changed && round.number < tournament.rounds.length;
    if (
      invalidate &&
      !(await showConfirm({
        title: "תיקון סיבוב קודם",
        message:
          "תיקון זה יבטל את כל הסיבובים המאוחרים ותוצאותיהם מהדירוג. הם יישמרו בארכיון, ויש להגריל אותם מחדש.",
        confirmText: "תקן ובטל סיבובים מאוחרים",
        variant: "destructive",
      }))
    )
      return;
    await mutate(() =>
      internalTournaments.result(
        id,
        revision,
        round.number,
        match._id,
        result,
        invalidate,
      ),
    );
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
        title: "סיום טורניר",
        message:
          "התוצאות הסופיות יישמרו והניקוד יתווסף לדירוג All Stars. לאחר הסיום הטורניר אינו ניתן לעריכה.",
        confirmText: "סיים טורניר",
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
          <Link to={`/teams/${tournament.team}`} className="text-blue-500">
            {tournament.teamNameSnapshot}
          </Link>
          <p className="text-sm text-muted-foreground">
            {new Date(tournament.date).toLocaleDateString("he-IL")} ·{" "}
            {tournament.currentParticipants} משתתפים ·{" "}
            {closed
              ? "הסתיים"
              : tournament.phase === "setup"
                ? "הכנה"
                : "בתהליך"}
            {tournament.source === "historical" ? " · הזנה היסטורית ידנית" : ""}
          </p>
        </div>
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            setError("");
            reload()
              .catch((e) => setError(requestError(e)))
              .finally(() => setBusy(false));
          }}
        >
          רענן מהשרת
        </Button>
      </div>
      {error && (
        <p
          role="alert"
          className="p-3 bg-destructive/10 text-destructive rounded-md"
        >
          {error}
        </p>
      )}
      <p className="text-sm text-muted-foreground">
        כל תוצאה נשמרת מיד בשרת. לאחר רענון או כניסה ממכשיר אחר אפשר להמשיך
        מכאן. בעת עדכון מקביל יש לרענן ולהזין שוב.
      </p>
      {tournament.phase === "setup" && (
        <div className="border rounded-lg p-4 space-y-4">
          <h3 className="font-bold">נוכחות לפני סיבוב 1</h3>
          <p className="text-sm">
            הסירו ילדים חסרים. לאחר תחילת הסיבובים הסגל נעול.
          </p>
          <div className="flex flex-wrap gap-3">
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
                />{" "}
                {p.label}
              </label>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
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
              שמור נוכחות
            </Button>
            <Button
              variant="outline"
              disabled={busy || participantsChanged}
              onClick={() => void pair()}
            >
              הגרל סיבוב 1
            </Button>
          </div>
        </div>
      )}
      {tournament.rounds.length > 0 && (
        <div className="flex flex-wrap gap-3 items-center">
          <label>
            סיבוב{" "}
            <select
              className="p-2 border rounded-md bg-background"
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
            onClick={() => setResultsView(!resultsView)}
          >
            {resultsView ? "חזור למשחקים" : "הצג דירוג ותוצאות"}
          </Button>
        </div>
      )}
      {(resultsView || closed) && (
        <>
          <h3 className="font-bold text-xl">
            {closed ? "דירוג סופי" : "דירוג נוכחי"}
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
              key={`${match._id}:${tournament.revision}`}
              match={match}
              name={name}
              revision={tournament.revision}
              disabled={closed || busy}
              save={(result, revision) => saveResult(match, result, revision)}
            />
          ))}
        </div>
      )}
      {!closed && tournament.phase === "running" && (
        <div className="flex flex-wrap gap-3">
          <Button
            disabled={busy || !allComplete || tournament.rounds.length >= 16}
            onClick={() => void pair()}
          >
            הגרל סיבוב נוסף
          </Button>
          <Button
            variant="outline"
            disabled={busy || !allComplete}
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
