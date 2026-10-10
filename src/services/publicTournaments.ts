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
  list: async () =>
    (await api.get<PublicTournamentSummary[]>('/api/tournaments')).data,
  get: async (id: string) =>
    (await api.get<PublicTournament>(`/api/tournaments/${id}`)).data,
};
