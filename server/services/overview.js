import Team from '../models/teamModel.js';
import Player from '../models/playerModel.js';
import Tournament from '../models/tournamentModel.js';
import { tournamentQuery } from './pagination.js';
import { calendarDate } from './playerProfile.js';
// Compare grouped current-year internal tournament counts for every active team.
export function encounterBalance(activeTeams, source) {
  if (!source?.competitionYear || !Array.isArray(source.counts))
    return { status: 'unavailable' };
  if (
    source.counts.some((row) => !Number.isInteger(row.count) || row.count < 0)
  )
    return { status: 'unavailable' };
  if (!activeTeams.length)
    return { status: 'empty', competitionYear: source.competitionYear };
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
// Convert the calendar boundary with IANA timezone rules rather than a fixed UTC
// offset. September is currently daylight time, but no offset is hard-coded.
function jerusalemMidnight(year, month, day) {
  const target = Date.UTC(year, month - 1, day);
  let instant = target;
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  for (let attempt = 0; attempt < 3; attempt++) {
    const parts = Object.fromEntries(
      formatter
        .formatToParts(new Date(instant))
        .map((part) => [part.type, part.value]),
    );
    const wall = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
    );
    instant += target - wall;
  }
  return new Date(instant);
}
export function teamMeetingYear(now = new Date()) {
  const [year, month] = calendarDate(now).split('-').map(Number);
  const startYear = month >= 9 ? year : year - 1;
  return {
    competitionYear: `${startYear}-${startYear + 1}`,
    start: jerusalemMidnight(startYear, 9, 1),
    end: jerusalemMidnight(startYear + 1, 9, 1),
  };
}
export async function internalMeetingBalance(teams, now = new Date()) {
  const window = teamMeetingYear(now);
  const counts = teams.length
    ? await Tournament.aggregate([
        {
          $match: {
            ...tournamentQuery({ status: 'completed' }, now),
            type: 'team_internal',
            team: { $in: teams.map((team) => team._id) },
            deletedAt: null,
            date: { $gte: window.start, $lt: window.end },
          },
        },
        { $group: { _id: '$team', count: { $sum: 1 } } },
      ])
    : [];
  return encounterBalance(teams, {
    competitionYear: window.competitionYear,
    counts: counts.map((row) => ({ teamId: row._id, count: row.count })),
  });
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
    Team.find({ isActive: true })
      .select('name')
      .sort({ normalizedName: 1, _id: 1 }),
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
    activeTeams: activeTeams.length,
    activeTeamPlayers,
    activeQuarterlyPlayers,
    activeTournaments,
    completedQuarterlyTournaments,
    encounterBalance: await internalMeetingBalance(activeTeams, now).catch(
      () => {
        console.warn('Internal meeting overview counts unavailable');
        return { status: 'unavailable' };
      },
    ),
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
