import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  getPublicPlayer,
  type PublicTeamPlayer,
} from '../services/publicPlayers';
import { requestError } from '../utils/requestError';

export default function AllStarsPlayerPage() {
  const { playerId = '' } = useParams();
  const [player, setPlayer] = useState<PublicTeamPlayer | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setPlayer(null);
    setError('');
    getPublicPlayer(playerId)
      .then((data) => {
        if (active) setPlayer(data);
      })
      .catch((e) => {
        if (active) setError(requestError(e));
      });
    return () => {
      active = false;
    };
  }, [playerId]);
  return (
    <div className="container py-12 space-y-6">
      {error ? (
        <p role="alert">לא הצלחנו לטעון את השחקן. {error}</p>
      ) : !player ? (
        <p role="status">טוען שחקן...</p>
      ) : (
        <>
          <Link
            className="text-blue-500"
            to={player.team ? `/teams/${player.team.id}` : '/all-stars'}
          >
            → חזרה ל{player.team ? 'נבחרת' : 'All Stars'}
          </Link>
          <div className="cs-public-card p-6">
            <p className="text-blue-500 font-bold">ALL STARS</p>
            <h1 className="text-3xl font-extrabold">
              {player.firstName} {player.lastName}
            </h1>
            {player.city && <p>{player.city}</p>}
            {player.team && (
              <Link className="text-blue-500" to={`/teams/${player.team.id}`}>
                {player.team.name}
              </Link>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {(['teamRanking', 'overallRanking'] as const).map((key) => (
              <section key={key} className="cs-public-card p-6">
                <h2 className="text-xl font-bold">
                  {key === 'teamRanking'
                    ? 'דירוג בנבחרת'
                    : 'דירוג All Stars כללי'}
                </h2>
                {player[key] ? (
                  <p>
                    מקום {player[key].position} · {player[key].points} נקודות ·{' '}
                    {player[key].tournaments} טורנירים
                  </p>
                ) : (
                  <p>עדיין אין תוצאות דירוג.</p>
                )}
              </section>
            ))}
          </div>
          {!!player.badges.length && (
            <section>
              <h2 className="text-xl font-bold">תגים שנצברו</h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {player.badges.map((badge, i) => (
                  <li key={i} className="cs-public-card p-4">
                    <h3 className="font-bold">
                      {badge.icon} {badge.name}
                    </h3>
                    <p>{badge.description}</p>
                    <time dateTime={badge.awardedAt}>
                      {new Date(badge.awardedAt).toLocaleDateString('he-IL')}
                    </time>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
