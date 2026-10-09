import api from './api';
import { isAxiosError } from 'axios';
import type {
  InternalTournament,
  InternalTournamentSummary,
  MatchResult,
  AllStarsRankings,
} from '../types/internalTournament';
export const internalTournaments = {
  list: async (teamId?: string) =>
    (
      await api.get<InternalTournamentSummary[]>('/api/internal-tournaments', {
        params: { teamId },
      })
    ).data,
  get: async (id: string) =>
    (await api.get<InternalTournament>(`/api/internal-tournaments/${id}`)).data,
  create: async (teamId: string): Promise<InternalTournament> => {
    try {
      return (
        await api.post<InternalTournament>('/api/internal-tournaments', {
          teamId,
        })
      ).data;
    } catch (error) {
      if (
        isAxiosError<{ code?: string; existingTournamentId?: string }>(error) &&
        error.response?.status === 409 &&
        error.response.data.code === 'OPEN_INTERNAL_TOURNAMENT' &&
        error.response.data.existingTournamentId
      )
        return internalTournaments.get(
          error.response.data.existingTournamentId,
        );
      throw error;
    }
  },
  cancelRound: async (
    id: string,
    expectedRevision: number,
    roundNumber: number,
  ) =>
    (
      await api.delete<InternalTournament>(
        `/api/internal-tournaments/${id}/rounds/${roundNumber}`,
        { data: { expectedRevision } },
      )
    ).data,
  participants: async (
    id: string,
    expectedRevision: number,
    playerIds: string[],
  ) =>
    (
      await api.put<InternalTournament>(
        `/api/internal-tournaments/${id}/participants`,
        { expectedRevision, playerIds },
      )
    ).data,
  pair: async (id: string, expectedRevision: number) =>
    (
      await api.post<InternalTournament>(
        `/api/internal-tournaments/${id}/rounds`,
        { expectedRevision },
      )
    ).data,
  result: async (
    id: string,
    expectedRevision: number,
    round: number,
    match: string,
    result: MatchResult,
    invalidateLaterRounds: boolean,
    expectedResultRevision?: number,
  ) =>
    (
      await api.put<InternalTournament>(
        `/api/internal-tournaments/${id}/rounds/${round}/matches/${match}`,
        { expectedRevision, expectedResultRevision, result, invalidateLaterRounds },
      )
    ).data,
  close: async (id: string, expectedRevision: number) =>
    (
      await api.post<InternalTournament>(
        `/api/internal-tournaments/${id}/close`,
        { expectedRevision },
      )
    ).data,
  historical: async (
    teamId: string,
    date: string,
    results: {
      player: string;
      position: number;
      points: number;
      omp?: number;
      gwp?: number;
      ogp?: number;
    }[],
  ) =>
    (
      await api.post<InternalTournament>(
        '/api/internal-tournaments/historical',
        { teamId, date, results },
      )
    ).data,
  rankings: async (teamId?: string) =>
    (
      await api.get<AllStarsRankings>('/api/all-stars/rankings', {
        params: { teamId },
      })
    ).data,
};
