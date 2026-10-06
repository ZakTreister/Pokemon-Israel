import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { internalTournaments } from "../../services/internalTournaments";
import { requestError } from "../../utils/requestError";
import type { InternalTournamentSummary } from "../../types/internalTournament";
import Button from "../../components/ui/Button";
export default function InternalTournamentsPage() {
  const [params] = useSearchParams();
  const teamId = params.get("teamId") || undefined;
  const [tournaments, setTournaments] = useState<
    InternalTournamentSummary[] | null
  >(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setTournaments(null);
    internalTournaments
      .list(teamId)
      .then((data) => {
        if (active) setTournaments(data);
      })
      .catch((e) => {
        if (active) setError(requestError(e));
      });
    return () => {
      active = false;
    };
  }, [teamId]);
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h2 className="text-2xl font-bold">טורנירים פנימיים</h2>
        <Button asChild variant="outline">
          <Link to="/manage/teams">פתח טורניר מעמוד נבחרת</Link>
        </Button>
      </div>
      {teamId && (
        <Link
          to="/manage/internal-tournaments"
          className="text-blue-500 block mb-4"
        >
          הצג את כל הנבחרות
        </Link>
      )}
      {error && <p role="alert">{error}</p>}
      {tournaments === null ? (
        <p>טוען...</p>
      ) : !tournaments.length ? (
        <p>אין טורנירים פנימיים להצגה.</p>
      ) : (
        <div className="space-y-3">
          {tournaments.map((t) => (
            <Link
              key={t.id}
              to={`/manage/internal-tournaments/${t.id}`}
              className="block border rounded-lg p-4 hover:bg-muted"
            >
              <h3 className="font-bold">{t.title}</h3>
              <p className="text-sm text-muted-foreground">
                {t.teamNameSnapshot} ·{" "}
                {new Date(t.date).toLocaleDateString("he-IL")} ·{" "}
                {t.currentParticipants} משתתפים ·{" "}
                {t.phase === "completed"
                  ? "הסתיים"
                  : t.phase === "setup"
                    ? "לפני סיבוב 1"
                    : "בתהליך"}
                {t.source === "historical" ? " · הזנה היסטורית ידנית" : ""}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
