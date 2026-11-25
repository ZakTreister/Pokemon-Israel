import api from './api';

export interface NationalRanking {
  playerId: string;
  playerName: string;
  points: number;
  tournaments: number;
  bestRank: number | null;
  position: number;
  isAllStars: boolean;
  rankChange?: number;
}

export interface RankingCoverage {date:string;precision:'day'|'month';title:string}

export interface NationalRankingsResponse {
  lastUpdatedAt?: string | null;
  resultsThrough?: RankingCoverage | null;
  rankings: NationalRanking[];
  tournamentCount: number;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  topMovers?: NationalRanking[];
}

export interface RankingQuery {
  search?: string;
  includeAllStars?: boolean;
  page?: number;
  pageSize?: number;
  offset?: number;
  sort?: 'position' | 'playerName' | 'points' | 'tournaments';
  descending?: boolean;
}

export const getNationalRankings = async (params: RankingQuery = {}) =>
  (await api.get<NationalRankingsResponse>('/api/rankings', { params })).data;