import type { Tournament } from '../../../types/tournament';

/** Preserve the legacy admin list's date-derived display status, without mutation. */
export function selectLegacyTournamentList(
  tournaments: Tournament[],
  searchQuery: string,
  filterStatus: 'all' | Tournament['status'],
  now?: Date,
): Tournament[] {
  return tournaments
    .map((tournament) => {
      if (
        new Date(tournament.date) < (now ?? new Date()) &&
        tournament.status !== 'completed'
      ) {
        return { ...tournament, status: 'completed' as const };
      }
      return tournament;
    })
    .filter((tournament) => {
      const matchesSearch =
        tournament.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tournament.description
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        tournament.location.toLowerCase().includes(searchQuery.toLowerCase());
      return (
        matchesSearch &&
        (filterStatus === 'all' || tournament.status === filterStatus)
      );
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}
