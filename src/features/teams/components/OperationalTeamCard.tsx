import { useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../../hooks/redux';
import { fetchTeams } from '../teamsSlice';
import { TeamEmblem } from '../../../components/teams/TeamCard';
import TeamEditDialog from './TeamEditDialog';
import { Link } from 'react-router-dom';
import Button from '../../../components/ui/Button';
import type { Team } from '../../../types/team';
import TeamTournamentAction from './TeamTournamentAction';
export default function OperationalTeamCard({
  team,
  members = false,
}: {
  team: Team;
  members?: boolean;
}) {
  const admin = useAppSelector((state) => state.auth.user?.role === 'admin');
  const dispatch = useAppDispatch();
  const [editing, setEditing] = useState(false);
  return (
    <article className="border rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className="shrink-0">
          <TeamEmblem team={team} />
        </div>
        <div>
          <h3 className="font-bold text-lg">
            <Link
              to={`/manage/teams/${team.id}`}
              className="hover:text-blue-500"
            >
              {team.name}
            </Link>
          </h3>
          <p className="text-sm text-muted-foreground">
            {team.playerCount} חברי נבחרת ·{' '}
            {team.isActive ? 'פעילה' : 'לא פעילה'}
          </p>
          <p className="text-sm text-muted-foreground">
            מורה: {team.teacher?.name || 'טרם שויך מורה'}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {admin && members && (
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            עריכת נבחרת
          </Button>
        )}
        <TeamTournamentAction team={team} />
        {members && (
          <Button asChild size="sm" variant="outline">
            <Link to={`/manage/teams/${team.id}`}>חברי נבחרת</Link>
          </Button>
        )}
      </div>
      {editing && admin && (
        <TeamEditDialog
          team={team}
          onClose={() => setEditing(false)}
          onSaved={async () => {
            await dispatch(fetchTeams()).unwrap();
          }}
        />
      )}
    </article>
  );
}
