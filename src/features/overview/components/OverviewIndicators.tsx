import { Link } from 'react-router-dom';
import StatCard from '../../../components/ui/StatCard';
import type {
  EncounterBalance,
  AdminOverviewSummary,
  JudgeOverviewTeam,
} from '../overviewService';
import type { ReactNode } from 'react';
function Indicator({
  label,
  value,
  to,
}: {
  label: string;
  value: ReactNode;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="block min-w-0 h-full rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
    >
      <StatCard label={label} value={value} />
    </Link>
  );
}
export function EncounterValue({ balance }: { balance: EncounterBalance }) {
  if (balance.status === 'unavailable')
    return (
      <span className="text-lg leading-normal">
        טרם זמין — נתוני הליגה הרשמיים טרם נקבעו
      </span>
    );
  if (balance.status === 'equal')
    return (
      <div>
        {balance.count}
        <p className="text-sm font-normal leading-normal mt-2">
          לכל נבחרת השנה
        </p>
      </div>
    );
  return (
    <div className="text-sm leading-relaxed">
      <p>בהשוואה לנבחרת עם הכי הרבה מפגשים: {balance.maximum}</p>
      <ul className="mt-2 space-y-1">
        {balance.lagging.map((team) => (
          <li key={team.id}>
            {team.name} — {team.gap === 1 ? 'חסר 1' : `חסרים ${team.gap}`}
          </li>
        ))}
      </ul>
      <p className="font-normal mt-2">
        הפער במספר המפגשים; אינו מצביע על מפגש שתוכנן או הוחמץ.
      </p>
    </div>
  );
}
export function AdminIndicators({
  summary,
}: {
  summary: AdminOverviewSummary;
}) {
  return (
    <section
      aria-label="מדדי מערכת"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8"
    >
      <Indicator
        label="נבחרות פעילות"
        value={summary.activeTeams}
        to="/manage/teams"
      />
      <Indicator
        label="שחקני נבחרות"
        value={summary.activeTeamPlayers}
        to="/manage/players"
      />
      <Indicator
        label="מפגשי נבחרות השנה"
        value={<EncounterValue balance={summary.encounterBalance} />}
        to="/manage/tournaments"
      />
      <Indicator
        label="טורנירים פעילים"
        value={summary.activeTournaments}
        to="/manage/tournaments"
      />
      <Indicator
        label="שחקני חוגים"
        value={summary.activeQuarterlyPlayers}
        to="/manage/players"
      />
      <Indicator
        label="טורנירים רבעוניים שהושלמו"
        value={
          <div>
            {summary.completedQuarterlyTournaments}
            <p className="text-sm font-normal leading-normal mt-2">בכל השנים</p>
          </div>
        }
        to="/manage/tournaments"
      />
    </section>
  );
}
export function JudgeIndicators({ team }: { team: JudgeOverviewTeam }) {
  return (
    <section
      aria-label={`מדדי נבחרת ${team.name}`}
      className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3"
    >
      <Indicator
        label="שחקנים פעילים"
        value={team.playerCount}
        to={`/manage/teams/${team.id}`}
      />
      <Indicator
        label="מיקום בליגה"
        value={
          team.leaguePosition
            ? `${team.leaguePosition.position} / ${team.leaguePosition.totalTeams}`
            : 'טרם נקבע'
        }
        to={`/manage/teams/${team.id}`}
      />
      <Indicator
        label="טורנירים פנימיים שהושלמו"
        value={team.completedInternalTournamentCount ?? 0}
        to={`/manage/teams/${team.id}/history`}
      />
    </section>
  );
}
