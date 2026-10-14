import { UserRound } from 'lucide-react';
import { TeamEmblem } from '../components/teams/TeamCard';
import { pokemonImageUrl } from '../features/players/utils/playerProfile';
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
          <div className="cs-public-card p-6 flex flex-wrap items-start justify-between gap-6">
            <div className="w-40 sm:w-48 min-w-0 max-w-full">
              {player.photoUrl ? (
                <img
                  src={player.photoUrl}
                  alt={`תמונה של ${player.firstName}`}
                  className="aspect-square w-full rounded-lg object-cover border"
                />
              ) : (
                <div
                  role="img"
                  aria-label="אין תמונת שחקן"
                  className="aspect-square w-full rounded-lg bg-muted flex items-center justify-center"
                >
                  <UserRound
                    className="w-1/2 h-1/2 max-w-full text-muted-foreground"
                    aria-hidden="true"
                  />
                </div>
              )}
              {!!player.pokemon?.length && (
                <ul
                  aria-label="הפוקימונים של השחקן"
                  className="cs-pokemon-row mt-3"
                >
                  {player.pokemon.slice(0, 6).map((name, index) => (
                    <li
                      key={`${name}-${index}`}
                      title={name}
                      className="cs-pokemon-frame"
                    >
                      <img
                        src={pokemonImageUrl(name)}
                        alt={name}
                        className="object-contain"
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {player.team && (
              <Link
                aria-label={`לנבחרת ${player.team.name}`}
                to={`/teams/${player.team.id}`}
                className="flex flex-col items-center gap-2 text-blue-500 font-bold focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500"
              >
                <TeamEmblem team={player.team} />
              </Link>
            )}
          </div>
          <section
            aria-label="פרטי שחקן"
            className="cs-public-card p-6 space-y-3"
          >
            <p className="text-blue-500 font-bold">ALL STARS</p>
            <h1 className="text-3xl font-extrabold">
              {player.firstName} {player.lastName}
            </h1>
            {player.city && <p>{player.city}</p>}
            {player.playerNumber && <p>מספר שחקן: {player.playerNumber}</p>}
            {player.team && (
              <Link className="text-blue-500" to={`/teams/${player.team.id}`}>
                {player.team.name}
              </Link>
            )}
            {player.age !== undefined && <p>גיל: {player.age}</p>}
            {player.tenureYears !== undefined && (
              <p>וותק: {player.tenureYears} שנים</p>
            )}
            {player.description && (
              <p className="whitespace-pre-wrap break-words mt-3">
                {player.description}
              </p>
            )}
          </section>
          <section className="cs-public-card p-6">
            <h2 className="text-xl font-bold">דירוג בנבחרת</h2>
            {player.teamRanking ? (
              <p>
                מקום {player.teamRanking.position} · {player.teamRanking.points}{' '}
                נקודות · {player.teamRanking.tournaments} טורנירים
              </p>
            ) : (
              <p>עדיין אין תוצאות דירוג.</p>
            )}
          </section>
          {!!player.badges.length && (
            <section>
              <h2 className="text-xl font-bold">תגים שנצברו</h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {player.badges.map((badge, i) => (
                  <li key={i} className="cs-public-card p-4">
                    {badge.image && (
                      <img
                        src={badge.image}
                        alt={badge.name}
                        className="w-14 h-14 object-contain"
                      />
                    )}
                    {badge.seasonName && (
                      <p className="text-sm text-muted-foreground">
                        {badge.seasonName}
                      </p>
                    )}
                    <h3 className="font-bold">
                      {!badge.image && badge.icon} {badge.name}
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
          {player.deckUrl && (
            <section aria-label="דק נוכחי" className="cs-public-card p-6">
              <h2 className="text-xl font-bold mb-4">דק נוכחי</h2>
              <img
                src={player.deckUrl}
                alt="דק נוכחי"
                className="w-full max-h-[36rem] object-contain rounded-md"
              />
            </section>
          )}
        </>
      )}
    </div>
  );
}
