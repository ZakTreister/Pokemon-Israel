import { tournamentLifecycle, clubRegistrationOpen } from '../../shared/tournamentDomain.js';
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
export function publicTournament(t, detail = false, eventCoverUrl = '') {
  const lifecycle = tournamentLifecycle(t);
  const type = t.type || 'quarterly';
  const data = {
    id: t.id,
    eventId: t.eventId ? String(t.eventId) : null,
    title: t.title,
    description: t.description,
    date: t.date,
    location: t.location,
    image: t.eventId && eventCoverUrl ? eventCoverUrl : t.image,
    type,
    lifecycle,
    status: t.status,
    engineVersion: t.engineVersion || null,
    phase: t.phase || null,
    currentParticipants: t.currentParticipants,
    maxParticipants: type === 'quarterly' ? null : t.maxParticipants,
    registrationDeadline: t.registrationDeadline,
    team: t.team ? String(t.team) : null,
    teamNameSnapshot: t.teamNameSnapshot || '',
    canRegister: clubRegistrationOpen(t),
    // Legacy public deck statistics use public result fields; never User references.
    results:
      t.engineVersion === 'swiss-v1' || lifecycle === 'upcoming'
        ? []
        : legacyResults(t),
  };
  if (detail) {
    // Explicit public projection: do not expose player IDs, staff identities,
    // raw match documents, revisions or operational metadata.
    const names = new Map((t.playerParticipants || []).map(row => [String(row.player), row.nameSnapshot]));
    data.rounds = t.engineVersion === 'swiss-v1' && t.phase !== 'setup'
      ? (t.rounds || []).map(round => ({
          number: round.number,
          matches: round.matches.map(match => ({
            table: match.table,
            player1Name: names.get(String(match.player1)) || 'שחקן',
            player2Name: match.player2 ? names.get(String(match.player2)) || 'שחקן' : null,
            result: match.result ? {
              winner: match.result.winner, score1: match.result.score1,
              score2: match.result.score2, drawnGames: match.result.drawnGames || 0,
            } : null,
          })),
        }))
      : [];
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
