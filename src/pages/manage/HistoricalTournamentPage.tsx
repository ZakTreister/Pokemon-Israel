import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import teamsService from "../../features/teams/teamsService";
import { internalTournaments } from "../../services/internalTournaments";
import { requestError } from "../../utils/requestError";
import type { ManageablePlayer, Team } from "../../types/team";
import Button from "../../components/ui/Button";
interface ResultRow {
  player: string;
  position: string;
  points: string;
  omp: string;
  gwp: string;
  ogp: string;
}
export default function HistoricalTournamentPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const route = useParams();
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<ManageablePlayer[]>([]);
  const [teamId, setTeamId] = useState(route.teamId || params.get("teamId") || "");
  const [date, setDate] = useState("2026-10-04");
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [includeTransferred, setIncludeTransferred] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    Promise.all([teamsService.getTeams(), teamsService.getManageablePlayers()])
      .then(([t, p]) => {
        if (active) {
          setTeams(t);
          setPlayers(p);
        }
      })
      .catch((e) => {
        if (active) setError(requestError(e));
      });
    return () => {
      active = false;
    };
  }, []);
  const select = (player: string, checked: boolean) =>
    setRows(
      checked
        ? [
            ...rows,
            {
              player,
              position: String(rows.length + 1),
              points: "",
              omp: "",
              gwp: "",
              ogp: "",
            },
          ]
        : rows.filter((row) => row.player !== player),
    );
  const save = async () => {
    setBusy(true);
    setError("");
    try {
      const results = rows.map((row) => ({
        player: row.player,
        position: Number(row.position),
        points: Number(row.points),
        ...Object.fromEntries(
          (["omp", "gwp", "ogp"] as const)
            .filter((key) => row[key] !== "")
            .map((key) => [key, Number(row[key]) / 100]),
        ),
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
      setBusy(false);
    }
  };
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
        הזנת תוצאות סופיות מהטורנירים שהתקיימו ב־04.10.2026. הניקוד יתווסף
        לדירוג All Stars כמו טורניר שנוהל כאן. אין צורך לשחזר סיבובים שאינם
        ידועים.
      </p>
      {error && (
        <p
          role="alert"
          className="p-3 bg-destructive/10 text-destructive rounded-md"
        >
          {error}
        </p>
      )}
      <div className="grid sm:grid-cols-2 gap-4">
        <label>
          נבחרת
          <select
            required
            className="block w-full p-2 border rounded-md bg-background"
            value={teamId}
            onChange={(e) => {
              setTeamId(e.target.value);
              setRows([]);
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
            type="date"
            max={new Date().toISOString().slice(0, 10)}
            className="block w-full p-2 border rounded-md bg-background"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
      </div>
      {teamId && (
        <>
          <h3 className="font-bold">בחר משתתפים</h3>
          <label className="block text-sm">
            <input
              type="checkbox"
              checked={includeTransferred}
              onChange={(e) => setIncludeTransferred(e.target.checked)}
            />{" "}
            כלול ילדים שעברו מאז לנבחרת אחרת או הוסרו
          </label>
          <div className="flex flex-wrap gap-3">
            {players
              .filter((p) => includeTransferred || p.team?.id === teamId)
              .map((p) => (
                <label key={p.id} className="border rounded-md p-2">
                  <input
                    type="checkbox"
                    checked={rows.some((row) => row.player === p.id)}
                    onChange={(e) => select(p.id, e.target.checked)}
                  />{" "}
                  {p.firstName} {p.lastName}
                  {includeTransferred && p.team ? ` (${p.team.name})` : ""}
                </label>
              ))}
          </div>
        </>
      )}
      {!!rows.length && (
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr>
                {[
                  "שחקן",
                  "מקום",
                  "נקודות",
                  "OMP % (רשות)",
                  "GWP % (רשות)",
                  "OGP % (רשות)",
                ].map((h) => (
                  <th key={h} className="p-2">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const player = players.find((p) => p.id === row.player);
                return (
                  <tr key={row.player}>
                    <td className="p-2">
                      {player?.firstName} {player?.lastName}
                    </td>
                    {(["position", "points", "omp", "gwp", "ogp"] as const).map(
                      (field) => (
                        <td key={field} className="p-2">
                          <input
                            aria-label={`${field} ${player?.firstName} ${player?.lastName}`}
                            className="border p-2 rounded-md w-24 bg-background"
                            type="number"
                            min={field === "position" ? 1 : 0}
                            max={
                              field === "position"
                                ? rows.length
                                : field === "points"
                                  ? 10000
                                  : 100
                            }
                            step={
                              field === "position" || field === "points"
                                ? 1
                                : "any"
                            }
                            required={
                              field === "position" || field === "points"
                            }
                            value={row[field]}
                            onChange={(e) =>
                              setRows(
                                rows.map((r) =>
                                  r.player === row.player
                                    ? { ...r, [field]: e.target.value }
                                    : r,
                                ),
                              )
                            }
                          />
                        </td>
                      ),
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-sm text-muted-foreground">
        הזינו נקודות משחק אמיתיות (3 לניצחון, 1 לתיקו, 0 להפסד), ולא מספר מיקום.
        אחוזים לא ידועים נשארים ריקים.
      </p>
      <Button disabled={busy || !teamId || rows.length < 2}>
        {busy ? "שומר..." : "שמור טורניר היסטורי שהסתיים"}
      </Button>
    </form>
  );
}
