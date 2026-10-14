import Team from '../models/teamModel.js';
import Player from '../models/playerModel.js';
import Tournament from '../models/tournamentModel.js';
import { tournamentQuery } from './pagination.js';
// Only consume authoritative current-year grouped participation counts. No year
// is inferred from dates, badge Seasons or the existing single-team field.
export function encounterBalance(activeTeams, source) {
  if (!source?.competitionYear || !Array.isArray(source.counts))
    return { status: 'unavailable' };
  if (
    source.counts.some((row) => !Number.isInteger(row.count) || row.count < 0)
  )
    return { status: 'unavailable' };
  const byId = new Map(
    source.counts.map((row) => [String(row.teamId), row.count]),
  );
  const rows = activeTeams.map((team) => ({
    id: String(team.id),
    name: team.name,
    count: byId.get(String(team.id)) || 0,
  }));
  const maximum = Math.max(0, ...rows.map((team) => team.count));
  const lagging = rows
    .filter((team) => team.count < maximum)
    .map((team) => ({
      id: team.id,
      name: team.name,
      gap: maximum - team.count,
    }))
    .sort(
      (a, b) =>
        b.gap - a.gap ||
        a.name.localeCompare(b.name, 'he') ||
        a.id.localeCompare(b.id),
    );
  return {
    status: lagging.length ? 'uneven' : 'equal',
    competitionYear: source.competitionYear,
    maximum,
    ...(lagging.length ? { lagging } : { count: maximum }),
  };
}
export async function adminOverview(now = new Date()) {
  const [
    activeTeams,
    activeTeamPlayers,
    activeQuarterlyPlayers,
    activeTournaments,
    completedQuarterlyTournaments,
    nearest,
  ] = await Promise.all([
    Team.countDocuments({ isActive: true }),
    Player.countDocuments({ playerType: 'team', isActive: true }),
    Player.countDocuments({ playerType: 'quarterly', isActive: true }),
    Tournament.countDocuments(tournamentQuery({ status: 'active' }, now)),
    Tournament.countDocuments(
      tournamentQuery({ type: 'quarterly', status: 'completed' }, now),
    ),
    Tournament.findOne(tournamentQuery({ status: 'upcoming' }, now))
      .select(
        'title date location currentParticipants maxParticipants engineVersion',
      )
      .sort({ date: 1, _id: 1 }),
  ]);
  return {
    role: 'admin',
    activeTeams,
    activeTeamPlayers,
    activeQuarterlyPlayers,
    activeTournaments,
    completedQuarterlyTournaments,
    // The official two-team encounter association/current annual-reset source is
    // not implemented. An unavailable state is deliberately different from zero.
    encounterBalance: encounterBalance([], null),
    nearest: nearest
      ? {
          id: nearest.id,
          title: nearest.title,
          date: nearest.date,
          location: nearest.location,
          currentParticipants: nearest.currentParticipants,
          maxParticipants: nearest.maxParticipants,
          managementPath:
            nearest.engineVersion === 'swiss-v1'
              ? `/manage/tournaments/${nearest.id}`
              : `/manage/tournaments/regular/${nearest.id}`,
        }
      : null,
  };
}
