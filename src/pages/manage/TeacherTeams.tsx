import { useEffect, useState } from 'react';
import teamsService from '../../features/teams/teamsService';
import OperationalTeamCard from '../../features/teams/components/OperationalTeamCard';
import type { Team } from '../../types/team';
import { requestError } from '../../utils/requestError';
export default function TeacherTeams() {
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    teamsService
      .getMyTeams()
      .then((rows) => {
        if (active) setTeams(rows);
      })
      .catch((e) => {
        if (active) setError(requestError(e));
      });
    return () => {
      active = false;
    };
  }, []);
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
        teams.map((team) => <OperationalTeamCard key={team.id} team={team} />)
      )}
    </section>
  );
}
