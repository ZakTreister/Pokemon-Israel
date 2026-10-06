import api from "./api";
import type {
  InternalTournament,
  InternalTournamentSummary,
  MatchResult,
  AllStarsRankings,
} from "../types/internalTournament";
export const internalTournaments = {
  list: async (teamId?: string) =>
    (
      await api.get<InternalTournamentSummary[]>("/api/internal-tournaments", {
        params: { teamId },
      })
    ).data,
  get: async (id: string) =>
    (await api.get<InternalTournament>(`/api/internal-tournaments/${id}`)).data,
  create: async (teamId: string) =>
    (
      await api.post<InternalTournament>("/api/internal-tournaments", {
        teamId,
      })
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
  ) =>
    (
      await api.put<InternalTournament>(
        `/api/internal-tournaments/${id}/rounds/${round}/matches/${match}`,
        { expectedRevision, result, invalidateLaterRounds },
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
        "/api/internal-tournaments/historical",
        { teamId, date, results },
      )
    ).data,
  rankings: async (teamId?: string) =>
    (
      await api.get<AllStarsRankings>("/api/all-stars/rankings", {
        params: { teamId },
      })
    ).data,
};
