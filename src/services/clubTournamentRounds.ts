import api from './api';
import type { InternalTournament, MatchResult } from '../types/internalTournament';

const root = (id: string) => `/api/tournaments/${id}/round-management`;

export const clubTournamentRounds = {
  get: async (id: string) =>
    (await api.get<InternalTournament>(root(id))).data,
  start: async (id: string) =>
    (await api.post<{ id: string; roundNumber: number }>(`/api/tournaments/${id}/start`)).data,
  participants: async (id: string, expectedRevision: number, playerIds: string[]) =>
    (await api.put<InternalTournament>(root(id) + '/participants', { expectedRevision, playerIds })).data,
  pair: async (id: string, expectedRevision: number) =>
    (await api.post<InternalTournament>(root(id) + '/rounds', { expectedRevision })).data,
  cancelRound: async (id: string, expectedRevision: number, roundNumber: number) =>
    (await api.delete<InternalTournament>(`${root(id)}/rounds/${roundNumber}`, {
      data: { expectedRevision },
    })).data,
  result: async (
    id: string, expectedRevision: number, round: number, match: string,
    result: MatchResult, invalidateLaterRounds: boolean, expectedResultRevision?: number,
  ) =>
    (await api.put<InternalTournament>(`${root(id)}/rounds/${round}/matches/${match}`, {
      expectedRevision, expectedResultRevision, result, invalidateLaterRounds,
    })).data,
  editPairings: async (id: string, roundNumber: number, expectedRevision: number,
    matches: { matchId: string; table: number; player1: string; player2: string | null }[],
    clearResults: boolean) =>
    (await api.put<InternalTournament>(root(id) + `/rounds/${roundNumber}/pairings`, {
      expectedRevision, matches, clearResults,
    })).data,
  close: async (id: string, expectedRevision: number) =>
    (await api.post<InternalTournament>(root(id) + '/close', { expectedRevision })).data,
};
