import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { publicTeams } from "../services/publicTeams";
import { internalTournaments } from "../services/internalTournaments";
import { requestError } from "../utils/requestError";
import type { Team } from "../types/team";
import type { AllStarsRanking } from "../types/internalTournament";
import TeamCard from "../components/teams/TeamCard";
export default function AllStarsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [rankings, setRankings] = useState<AllStarsRanking[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    Promise.all([publicTeams.list(), internalTournaments.rankings()])
      .then(([t, r]) => {
        if (active) {
          setTeams(t);
          setRankings(r.rankings);
        }
      })
      .catch((e) => {
        if (active) setError(requestError(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  return (
    <div className="container py-12">
      <h1 className="text-4xl font-extrabold mb-3">All Stars</h1>
      <p className="text-muted-foreground mb-8">
        הנבחרות ודירוג השחקנים בטורנירים הפנימיים שהסתיימו.
      </p>
      {error && <p role="alert">{error}</p>}
      {loading ? (
        <p>טוען...</p>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
            {teams.map((team) => (
              <TeamCard key={team.id} team={team} />
            ))}
          </div>
          <h2 className="text-2xl font-bold mb-4">דירוג שחקנים כללי</h2>
          {!rankings.length ? (
            <p>הדירוג יופיע לאחר סיום טורנירים פנימיים.</p>
          ) : (
            <div className="overflow-x-auto bg-card border rounded-lg">
              <table className="w-full text-right">
                <thead className="bg-muted">
                  <tr>
                    {["מקום", "שחקן", "נבחרת", "נקודות", "טורנירים"].map(
                      (h) => (
                        <th key={h} className="p-3">
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {rankings.map((row) => (
                    <tr className="border-t" key={row.playerId}>
                      <td className="p-3">{row.position}</td>
                      <td className="p-3 font-bold">{row.playerName}</td>
                      <td className="p-3">
                        {row.team ? (
                          <Link
                            to={`/teams/${row.team.id}`}
                            className="text-blue-500"
                          >
                            {row.team.name}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="p-3">{row.points}</td>
                      <td className="p-3">{row.tournaments}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
