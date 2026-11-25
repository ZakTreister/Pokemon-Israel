import {LeagueLogo} from '../features/siteSettings/LeagueLogo';
import { useCallback, useEffect, useState } from 'react';
import { isAxiosError } from 'axios';
import { Link, useParams } from 'react-router-dom';
import { publicTournaments, type PublicTournament } from '../services/publicTournaments';
import { subscribePublicTournament } from '../services/tournamentLive';
import { tournamentTypes, tournamentStatuses } from '../../shared/tournamentDomain';
import { requestError } from '../utils/requestError';
import TournamentStandings from '../features/tournaments/components/TournamentStandings';
import PublicMatchCard from '../components/tournaments/PublicMatchCard';

export default function TournamentDetailsPage() {
  const { id = '' } = useParams();
  const [t, setTournament] = useState<PublicTournament | null>(null);
  const [error, setError] = useState('');
  const [selectedRound, setSelectedRound] = useState<number | null>(null);
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
    setSelectedRound(null);
    void publicTournaments.get(id).then(data => {
      if (active) setTournament(data);
    }).catch(caught => {
      if (active) setError(requestError(caught));
    });
    return () => { active = false; };
  }, [id]);

  // Only a genuinely running Swiss event gets a public socket. A finished
  // event (or a merely past-dated upcoming event) uses HTTP only.
  const live = t?.type === 'quarterly' && t.engineVersion === 'swiss-v1' &&
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
          <div className="flex items-center gap-3"><LeagueLogo league={t.type==='quarterly'?'kids':'allStars'} decorative className="size-16 shrink-0"/><h1 className="text-3xl font-extrabold">{t.title}</h1></div>
          <p>{tournamentTypes[t.type]} · {tournamentStatuses[t.lifecycle]}</p>
          <p>{new Date(t.date).toLocaleDateString('he-IL')} · {t.location}</p>
          {t.description && <p>{t.description}</p>}
          {t.teamNameSnapshot && <p>{t.teamNameSnapshot}</p>}
          <p>{t.currentParticipants} משתתפים</p>
        </div>
        {t.phase === 'running' && t.rounds?.length > 0 && (
          <section className="space-y-4" aria-live="polite">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-2xl font-bold">צימודי הטורניר</h2>
              <label className="flex items-center gap-2 text-sm font-semibold">
                סבב
                <select aria-label="בחר סבב להצגה"
                  className="rounded-lg border border-border bg-background p-2 min-h-11"
                  value={selectedRound && t.rounds.some(r => r.number === selectedRound) ? selectedRound : t.rounds[t.rounds.length - 1].number}
                  onChange={event => setSelectedRound(Number(event.target.value))}>
                  {t.rounds.map(round => <option key={round.number} value={round.number}>סבב {round.number}</option>)}
                </select>
              </label>
            </div>
            <div className="grid gap-3 xl:grid-cols-2">
              {(t.rounds.find(r => r.number === selectedRound) || t.rounds[t.rounds.length - 1]).matches
                .slice().sort((a,b) => a.table - b.table).map(match => (
                  <PublicMatchCard key={match.table} match={match} />
                ))}
            </div>
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
            <summary className="cursor-pointer font-bold">היסטוריית צימודים ותוצאות</summary>
            <div className="mt-4 space-y-5">
              {t.rounds.map(round => <section key={round.number} className="space-y-3">
                <h3 className="font-bold text-lg">סבב {round.number}</h3>
                <div className="grid gap-3 xl:grid-cols-2">
                  {round.matches.slice().sort((a,b) => a.table - b.table).map(match =>
                    <PublicMatchCard key={match.table} match={match} />)}
                </div>
              </section>)}
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
