import { useCallback, useEffect, useState } from 'react';
import { isAxiosError } from 'axios';
import { Link, useParams } from 'react-router-dom';
import { publicTournaments, type PublicTournament } from '../services/publicTournaments';
import { subscribePublicTournament } from '../services/tournamentLive';
import { tournamentTypes, tournamentStatuses } from '../../shared/tournamentDomain';
import { requestError } from '../utils/requestError';
import TournamentStandings from '../features/tournaments/components/TournamentStandings';

export default function TournamentDetailsPage() {
  const { id = '' } = useParams();
  const [t, setTournament] = useState<PublicTournament | null>(null);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    try {
      const data = await publicTournaments.get(id);
      setTournament(data);
      setError('');
    } catch (caught) {
      if (isAxiosError(caught) && caught.response?.status === 404)
        setTournament(null);
      setError(requestError(caught));
    }
  }, [id]);

  useEffect(() => {
    let active = true;
    setTournament(null);
    setError('');
    void publicTournaments.get(id).then(data => {
      if (active) setTournament(data);
    }).catch(caught => {
      if (active) setError(requestError(caught));
    });
    return () => { active = false; };
  }, [id]);

  // Only a genuinely running Swiss event gets a public socket. A finished
  // event (or a merely past-dated upcoming event) uses HTTP only.
  const live = t?.engineVersion === 'swiss-v1' &&
    t.phase === 'running' && t.lifecycle === 'active';
  useEffect(() => {
    if (!live) return;
    return subscribePublicTournament(id, () => { void refresh(); });
  }, [id, live, refresh]);

  return (
    <div className="container py-12 space-y-5">
      <Link className="text-blue-500" to="/tournaments">→ חזרה לאירועים</Link>
      {error && <p role="alert">{error}</p>}
      {!t && !error && <p role="status">טוען טורניר...</p>}
      {t && <>
        <div className="cs-public-card p-6 space-y-3">
          {t.image && <img src={t.image} alt="" className="w-full max-h-72 rounded-lg object-cover" />}
          <h1 className="text-3xl font-extrabold">{t.title}</h1>
          <p>{tournamentTypes[t.type]} · {tournamentStatuses[t.lifecycle]}</p>
          <p>{new Date(t.date).toLocaleDateString('he-IL')} · {t.location}</p>
          {t.description && <p>{t.description}</p>}
          {t.teamNameSnapshot && <p>{t.teamNameSnapshot}</p>}
          <p>{t.currentParticipants} משתתפים</p>
        </div>
        {t.phase === 'running' && t.rounds?.length > 0 && (
          <section className="space-y-4" aria-live="polite">
            <h2 className="text-2xl font-bold">צימודי הטורניר — בזמן אמת</h2>
            {[...t.rounds].reverse().map(round => (
              <section key={round.number} className="space-y-3">
                <h3 className="font-bold text-lg">סבב {round.number}{round.number === t.rounds.length ? ' · נוכחי' : ''}</h3>
                <div className="grid gap-3 md:grid-cols-2">
                  {round.matches.map(match => (
                    <div key={match.table} className="cs-public-card p-4 space-y-2">
                      <p className="text-sm font-bold">שולחן {match.table}</p>
                      <p>{match.player1Name} {match.player2Name ? 'מול ' + match.player2Name : '· BYE'}</p>
                      <p className="text-sm text-muted-foreground">
                        {match.result ? match.result.winner === 'bye' ? 'BYE · 3 נקודות'
                          : `${match.result.score1}–${match.result.score2}${match.result.winner === 'draw' ? ' · תיקו' : ''}`
                          : 'התוצאה טרם הוזנה'}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </section>
        )}
        {t.lifecycle === 'completed' && (
          <section className="space-y-3">
            <h2 className="text-2xl font-bold">דירוג סופי</h2>
            {t.standings.length
              ? <TournamentStandings rows={t.standings} teamPlayers={t.teamPlayers} />
              : <p>טרם הוזן דירוג סופי לטורניר זה.</p>}
          </section>
        )}
        {t.lifecycle === 'completed' && t.rounds?.length > 0 && (
          <details className="cs-public-card p-4">
            <summary className="cursor-pointer font-bold">צימודי סבבים קודמים</summary>
            <div className="mt-3 space-y-3">
              {t.rounds.map(round => <div key={round.number}>
                <h3 className="font-bold">סבב {round.number}</h3>
                {round.matches.map(match => <p key={match.table} className="text-sm">
                  שולחן {match.table}: {match.player1Name} {match.player2Name ? `מול ${match.player2Name}` : '· BYE'}
                  {match.result ? ` · ${match.result.score1}–${match.result.score2}` : ''}
                </p>)}
              </div>)}
            </div>
          </details>
        )}
        {t.lifecycle === 'active' && t.phase !== 'running' && t.standings.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-2xl font-bold">תוצאות נוכחיות</h2>
            <TournamentStandings rows={t.standings} teamPlayers={t.teamPlayers} />
          </section>
        )}
      </>}
    </div>
  );
}
