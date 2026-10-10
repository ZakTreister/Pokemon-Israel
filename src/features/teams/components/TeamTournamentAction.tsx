import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../../components/ui/Button';
import { useToast } from '../../../components/ui/ToastProvider';
import { internalTournaments } from '../../../services/internalTournaments';
import { requestError } from '../../../utils/requestError';
import type { Team } from '../../../types/team';
export default function TeamTournamentAction({ team }: { team: Team }) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const start = async () => {
    if (team.openInternalTournament) {
      navigate(`/manage/tournaments/${team.openInternalTournament.id}`);
      return;
    }
    if (lock.current || !team.isActive || team.playerCount < 2) return;
    lock.current = true;
    setBusy(true);
    try {
      const tournament = await internalTournaments.create(team.id);
      navigate(`/manage/tournaments/${tournament.id}`);
    } catch (e) {
      showToast(requestError(e), 'error');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <Button
      size="sm"
      disabled={
        busy ||
        (!team.openInternalTournament &&
          (!team.isActive || team.playerCount < 2))
      }
      onClick={() => void start()}
    >
      {busy
        ? 'פותח טורניר…'
        : team.openInternalTournament
          ? 'המשך טורניר'
          : 'התחל טורניר'}
    </Button>
  );
}
