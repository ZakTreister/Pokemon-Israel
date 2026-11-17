export type TournamentType = 'quarterly' | 'team_internal' | 'inter_team';
export type TournamentLifecycle = 'upcoming' | 'active' | 'completed';
export interface TournamentFiltersValue {
  status: string;
  type: string;
  search: string;
}
export const tournamentTypes: Record<TournamentType, string>;
export const tournamentStatuses: Record<TournamentLifecycle, string>;
export function clubDateKey(value: string | Date): string;
export function isClubTournament(t: { type?: string | null; engineVersion?: string | null }): boolean;
export function clubRegistrationOpen(t: { type?: string | null; engineVersion?: string | null; date: string | Date; status?: string }, now?: Date): boolean;
export function tournamentLifecycle(
  t: { date: string | Date; status?: string; phase?: string | null; type?: string | null; engineVersion?: string | null },
  now?: Date,
): TournamentLifecycle;
export function filterTournaments<
  T extends {
    lifecycle: string;
    type?: string | null;
    title: string;
    location?: string;
    teamNameSnapshot?: string;
  },
>(rows: T[], filters: TournamentFiltersValue): T[];
