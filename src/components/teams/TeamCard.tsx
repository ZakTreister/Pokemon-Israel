import { Link } from "react-router-dom";
import { Shield } from "lucide-react";
import type { Team } from "../../types/team";
export function TeamEmblem({ team }: { team: Pick<Team, "name" | "logo"> }) {
  return team.logo ? (
    <img
      src={team.logo}
      alt={`סמל ${team.name}`}
      className="h-24 w-24 object-contain"
    />
  ) : (
    <Shield className="h-20 w-20 text-blue-500" aria-hidden="true" />
  );
}
export default function TeamCard({ team }: { team: Team }) {
  return (
    <Link
      to={`/teams/${team.id}`}
      style={{borderTopColor:team.themeColor||undefined}}
      className="flex min-h-[235px] flex-col items-center justify-between rounded-lg border border-line border-t-4 border-t-gold bg-card p-6 text-center shadow-panel hover:border-blue-500 transition-colors"
    >
      <TeamEmblem team={team} />
      <h3 className="text-xl font-extrabold">{team.name}</h3>
      {team.region && <p className="text-sm text-muted-foreground">אזור פעילות: {team.region}</p>}
      <div className="w-full grid grid-cols-2 gap-2 border-t pt-4 text-sm">
        <div>
          <strong className="block text-2xl text-blue-500">
            {team.playerCount}
          </strong>
          שחקנים פעילים
        </div>
        <div>
          <strong className="block text-2xl text-blue-500">
            {team.completedInternalTournamentCount ?? 0}
          </strong>
          טורנירי אימון
        </div>
      </div>
      <p className="font-bold text-blue-500">{team.fanCount??0} אוהדים</p>
      {team.officialStats && (
        <p>
          מקום {team.officialStats.position} · {team.officialStats.gamesPlayed}{" "}
          משחקים · {Math.round(team.officialStats.winRate * 100)}% ניצחונות
        </p>
      )}
      <span className="mt-3 font-bold text-blue-500">הכירו את הנבחרת ←</span>
    </Link>
  );
}
