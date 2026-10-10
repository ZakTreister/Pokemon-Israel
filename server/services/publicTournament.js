import { tournamentLifecycle } from '../../shared/tournamentDomain.js';
import { calculateStandings } from './swiss.js';
const percentage = (value) =>
  typeof value === 'number' ? (value > 1 ? value / 100 : value) : null;
function legacyResults(t) {
  return t.results.map((row) => ({
    playerName: row.playerName,
    position: row.position,
    points: row.points,
    rawPoints: row.rawPoints,
    omp: percentage(row.omp),
    gwp: percentage(row.gwp),
    ogp: percentage(row.ogp),
    deck: row.deck?.archetype
      ? {
          id: row.deck.id,
          archetype: row.deck.archetype,
          image: row.deck.image,
          iconImage1: row.deck.iconImage1,
          iconImage2: row.deck.iconImage2,
          attackerImage1: row.deck.attackerImage1,
          attackerImage2: row.deck.attackerImage2,
        }
      : null,
  }));
}
export function publicTournament(t, detail = false) {
  const lifecycle = tournamentLifecycle(t);
  const type = t.type || 'quarterly';
  const data = {
    id: t.id,
    title: t.title,
    description: t.description,
    date: t.date,
    location: t.location,
    image: t.image,
    type,
    lifecycle,
    status: t.status,
    currentParticipants: t.currentParticipants,
    maxParticipants: t.maxParticipants,
    registrationDeadline: t.registrationDeadline,
    team: t.team ? String(t.team) : null,
    teamNameSnapshot: t.teamNameSnapshot || '',
    canRegister:
      type === 'quarterly' &&
      lifecycle === 'upcoming' &&
      t.registrationDeadline > new Date(),
    // Legacy public deck statistics use public result fields; never User references.
    results:
      t.engineVersion === 'swiss-v1' || lifecycle === 'upcoming'
        ? []
        : legacyResults(t),
  };
  if (detail) {
    data.standings =
      lifecycle === 'upcoming'
        ? []
        : t.engineVersion === 'swiss-v1'
          ? (lifecycle === 'completed'
              ? t.finalStandings
              : calculateStandings(t.playerParticipants, t.rounds)
            ).map((row) => ({
              player: String(row.player),
              playerName: row.playerName,
              position: row.position,
              points: row.points,
              omp: row.omp ?? null,
              gwp: row.gwp ?? null,
              ogp: row.ogp ?? null,
            }))
          : data.results.map((row, index) => ({
              player: `legacy-${index}`,
              ...row,
            }));
    data.teamPlayers =
      t.engineVersion === 'swiss-v1' && type === 'team_internal';
  }
  return data;
}
