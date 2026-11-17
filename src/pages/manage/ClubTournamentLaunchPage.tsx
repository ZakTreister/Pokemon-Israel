import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { publicTournaments, type PublicTournament } from '../../services/publicTournaments';
import { requestError } from '../../utils/requestError';
import ClubTournamentStartAction from '../../features/tournaments/components/ClubTournamentStartAction';
import ClubParticipantsManager from '../../features/tournaments/components/ClubParticipantsManager';
export default function ClubTournamentLaunchPage() {
  const { id = '' } = useParams();
  const [tournament, setTournament] = useState<PublicTournament | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setError('');
    setTournament(null);
    publicTournaments.get(id).then(data => {
      if (!active) return;
      if (data.type !== 'quarterly') setError('זה אינו טורניר חוגים');
      else setTournament(data);
    }).catch(caught => {
      if (active) setError(requestError(caught));
    });
    return () => { active = false; };
  }, [id]);
  return (
    <div className="space-y-4">
      <Link className="text-blue-500" to="/manage/tournaments">← חזרה לטורנירים</Link>
      {error && <p role="alert" className="text-destructive">{error}</p>}
      {!tournament && !error && <p role="status">טוען טורניר חוגים…</p>}
      {tournament && <>
        <h2 className="text-2xl font-bold">{tournament.title}</h2>
        <p>{new Date(tournament.date).toLocaleDateString('he-IL')} · {tournament.location}</p>
        <p>{tournament.currentParticipants} שחקנים רשומים</p>
        <ClubTournamentStartAction tournament={tournament} />
        <ClubParticipantsManager tournamentId={id}
          onChanged={() => { void publicTournaments.get(id).then(setTournament); }} />
      </>}
    </div>
  );
}
