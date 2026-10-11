import { useEffect, useState } from 'react';
import { publicTeams } from '../services/publicTeams';
import { requestError } from '../utils/requestError';
import type { Team } from '../types/team';
import TeamCard from '../components/teams/TeamCard';
export default function AllStarsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    publicTeams
      .list()
      .then((t) => {
        if (active) {
          setTeams(t);
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
        הנבחרות ופעילות הליגה. דירוג השחקנים מופיע בעמוד של כל נבחרת.
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
        </>
      )}
    </div>
  );
}
