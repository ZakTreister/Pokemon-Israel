import api from './api';

export interface NationalRanking {
  playerId: string;
  playerName: string;
  points: number;
  tournaments: number;
  bestRank: number | null;
  position: number;
  isAllStars: boolean;
}

export interface NationalRankingsResponse {
  rankings: NationalRanking[];
  tournamentCount: number;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface RankingQuery {
  search?: string;
  includeAllStars?: boolean;
  page?: number;
  pageSize?: number;
  sort?: 'position' | 'playerName' | 'points' | 'tournaments';
  descending?: boolean;
}

export const getNationalRankings = async (params: RankingQuery = {}) =>
  (await api.get<NationalRankingsResponse>('/api/rankings', { params })).data;