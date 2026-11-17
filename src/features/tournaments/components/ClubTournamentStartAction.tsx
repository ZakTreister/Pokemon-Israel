import { useState } from 'react';
import { isAxiosError } from 'axios';
import { useNavigate } from 'react-router-dom';
import Button from '../../../components/ui/Button';
import { useConfirm } from '../../../components/ui/ConfirmProvider';
import { clubTournamentRounds } from '../../../services/clubTournamentRounds';
import { requestError } from '../../../utils/requestError';

interface ClubTournamentInfo {
  id: string;
  type?: string | null;
  engineVersion?: string | null;
  phase?: string | null;
  status: string;
  currentParticipants: number;
}
export default function ClubTournamentStartAction({ tournament }: { tournament: ClubTournamentInfo }) {
  const navigate = useNavigate();
  const { showConfirm } = useConfirm();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const started = tournament.engineVersion === 'swiss-v1';
  if (tournament.type && tournament.type !== 'quarterly') return null;
  const roundsUrl = `/manage/tournaments/regular/${tournament.id}/rounds`;
  const start = async () => {
    if (busy) return;
    if (!(await showConfirm({
      title: 'התחלת טורניר חוגים',
      message: 'המערכת תגריל ותשמור עכשיו את סיבוב 1 מכל המשתתפים הרשומים. לאחר ההתחלה הרישום ייסגר. להמשיך?',
      confirmText: 'הגרל סיבוב 1',
    }))) return;
    setBusy(true);
    setError('');
    try {
      await clubTournamentRounds.start(tournament.id);
      navigate(roundsUrl);
    } catch (caught) {
      const code = isAxiosError<{ code?: string }>(caught)
        ? caught.response?.data?.code : undefined;
      if (code === 'ALREADY_STARTED') navigate(roundsUrl);
      else setError(requestError(caught));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-2">
      {started ? (
        <Button variant="cta" onClick={() => navigate(roundsUrl)}>ניהול סבבים</Button>
      ) : tournament.status === 'upcoming' ? (
        <Button variant="cta" disabled={busy || tournament.currentParticipants < 2}
          onClick={() => void start()}>
          {busy ? 'מגריל סיבוב ראשון…' : 'התחל טורניר'}
        </Button>
      ) : null}
      {!started && tournament.currentParticipants < 2 && tournament.status === 'upcoming' && (
        <p className="text-sm text-muted-foreground">כדי להתחיל נדרשים לפחות שני משתתפים רשומים.</p>
      )}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
