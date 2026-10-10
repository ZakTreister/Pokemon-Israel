import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  publicTournaments,
  type PublicTournament,
} from '../services/publicTournaments';
import {
  tournamentTypes,
  tournamentStatuses,
} from '../../shared/tournamentDomain';
import { requestError } from '../utils/requestError';
import TournamentStandings from '../features/tournaments/components/TournamentStandings';
import { useAppSelector } from '../hooks/redux';
import api from '../services/api';
import { useConfirm } from '../components/ui/ConfirmProvider';
import Button from '../components/ui/Button';
export default function TournamentDetailsPage() {
  const { id = '' } = useParams();
  const { showConfirm } = useConfirm();
  const user = useAppSelector((state) => state.auth.user);
  const [t, setTournament] = useState<PublicTournament | null>(null);
  const [registered, setRegistered] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    setRegistered(false);
    if (user)
      api
        .get<{ registered: boolean }>(`/api/tournaments/${id}/register`)
        .then(({ data }) => {
          if (active) setRegistered(data.registered);
        })
        .catch((e) => {
          if (active) setError(requestError(e));
        });
    return () => {
      active = false;
    };
  }, [id, user]);
  useEffect(() => {
    let active = true;
    setTournament(null);
    setError('');
    publicTournaments
      .get(id)
      .then((data) => {
        if (active) setTournament(data);
      })
      .catch((e) => {
        if (active) setError(requestError(e));
      });
    return () => {
      active = false;
    };
  }, [id]);
  const register = async () => {
    if (busy) return;
    if (
      registered &&
      !(await showConfirm({
        title: 'ביטול הרשמה',
        message: 'האם אתה בטוח שברצונך לבטל את ההרשמה לטורניר?',
        confirmText: 'בטל הרשמה',
        cancelText: 'חזור',
        variant: 'destructive',
      }))
    )
      return;
    setBusy(true);
    setError('');
    try {
      if (registered) await api.delete(`/api/tournaments/${id}/register`);
      else await api.post(`/api/tournaments/${id}/register`);
      setRegistered(!registered);
      setTournament(await publicTournaments.get(id));
    } catch (e) {
      setError(requestError(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="container py-12 space-y-5">
      <Link className="text-blue-500" to="/tournaments">
        → חזרה לאירועים
      </Link>
      {error && <p role="alert">{error}</p>}
      {!t && !error ? (
        <p role="status">טוען טורניר...</p>
      ) : (
        t && (
          <>
            <div className="cs-public-card p-6 space-y-3">
              {t.image && (
                <img
                  src={t.image}
                  alt=""
                  className="w-full max-h-72 rounded-lg object-cover"
                />
              )}
              <h1 className="text-3xl font-extrabold">{t.title}</h1>
              <p>
                {tournamentTypes[t.type]} · {tournamentStatuses[t.lifecycle]}
              </p>
              <p>
                {new Date(t.date).toLocaleDateString('he-IL')} · {t.location}
              </p>
              <p>{t.description}</p>
              {t.teamNameSnapshot && <p>{t.teamNameSnapshot}</p>}
              <p>{t.currentParticipants} משתתפים</p>
              {t.canRegister && (
                <div>
                  <h2 className="font-bold">הרשמה</h2>
                  <p>
                    ההרשמה פתוחה עד{' '}
                    {new Date(t.registrationDeadline).toLocaleString('he-IL')}.
                  </p>
                  {user ? (
                    <Button disabled={busy} onClick={() => void register()}>
                      {busy
                        ? 'שומר…'
                        : registered
                          ? 'בטל הרשמה'
                          : 'הירשם לטורניר'}
                    </Button>
                  ) : (
                    <Button asChild>
                      <Link to="/login" state={{ from: `/tournaments/${id}` }}>
                        התחבר כדי להירשם
                      </Link>
                    </Button>
                  )}
                </div>
              )}
            </div>
            {t.lifecycle !== 'upcoming' && (
              <section className="space-y-3">
                <h2 className="text-2xl font-bold">
                  {t.lifecycle === 'completed'
                    ? 'תוצאות סופיות'
                    : 'תוצאות נוכחיות — בתהליך'}
                </h2>
                {t.standings.length ? (
                  <TournamentStandings
                    rows={t.standings}
                    teamPlayers={t.teamPlayers}
                  />
                ) : (
                  <p>עדיין לא נשמרו תוצאות לטורניר זה.</p>
                )}
              </section>
            )}
          </>
        )
      )}
    </div>
  );
}
