import type { PageQuery, PageResult } from '../types/pagination';
import api from './api';
import type { Deck } from '../types/deck';
import type { Standing } from '../types/internalTournament';
import type {
  TournamentType,
  TournamentLifecycle,
} from '../../shared/tournamentDomain';
export interface PublicTournamentSummary {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  image: string;
  prizePool?: string;
  type: TournamentType;
  lifecycle: TournamentLifecycle;
  status: string;
  currentParticipants: number;
  maxParticipants: number;
  registrationDeadline: string;
  team: string | null;
  teamNameSnapshot: string;
  canRegister: boolean;
}
export interface PublicTournament extends PublicTournamentSummary {
  standings: (Standing & { deck?: Deck | null })[];
  teamPlayers: boolean;
}
export const publicTournaments = {
  summary: async (type?: string) =>
    (
      await api.get<{
        total: number;
        participants: number;
        capacity: number;
        upcoming: number;
        nearest: PublicTournamentSummary | null;
      }>('/api/tournaments/summary', { params: { type } })
    ).data,
  list: async (
    params?: PageQuery & {
      type?: string;
      status?: string;
      teamId?: string;
      order?: 'asc';
    },
  ) =>
    (
      await api.get<PageResult<PublicTournamentSummary>>('/api/tournaments', {
        params,
      })
    ).data,
  get: async (id: string) =>
    (await api.get<PublicTournament>(`/api/tournaments/${id}`)).data,
};
