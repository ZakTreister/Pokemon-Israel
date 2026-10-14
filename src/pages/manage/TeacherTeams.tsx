import { useAppSelector } from '../../hooks/redux';
import {
  getOverview,
  type JudgeOverviewTeam,
} from '../../features/overview/overviewService';
import { JudgeIndicators } from '../../features/overview/components/OverviewIndicators';
import { useEffect, useState } from 'react';
import teamsService from '../../features/teams/teamsService';
import OperationalTeamCard from '../../features/teams/components/OperationalTeamCard';
import type { Team } from '../../types/team';
import { requestError } from '../../utils/requestError';
export default function TeacherTeams() {
  const judge = useAppSelector((state) => state.auth.user?.role === 'judge');
  const [teams, setTeams] = useState<
    (Team & Partial<JudgeOverviewTeam>)[] | null
  >(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    const query = judge
      ? getOverview().then((data) => (data.role === 'judge' ? data.teams : []))
      : teamsService.getMyTeams();
    query
      .then((rows) => {
        if (active) setTeams(rows);
      })
      .catch((e) => {
        if (active) setError(requestError(e));
      });
    return () => {
      active = false;
    };
  }, [judge]);
  return (
    <section className="space-y-3 mb-8">
      <h2 className="text-2xl font-bold">הנבחרות שלי</h2>
      {error ? (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      ) : teams === null ? (
        <p>טוען נבחרות…</p>
      ) : !teams.length ? (
        <p>אין נבחרות המשויכות אליכם כמורה.</p>
      ) : (
        teams.map((team) => (
          <div key={team.id}>
            {judge && (
              <JudgeIndicators
                team={{ ...team, leaguePosition: team.leaguePosition || null }}
              />
            )}
            <OperationalTeamCard team={team} />
          </div>
        ))
      )}
    </section>
  );
}
