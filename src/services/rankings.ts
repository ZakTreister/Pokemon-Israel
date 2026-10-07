import api from './api';
export interface NationalRanking {
  playerId: string;
  playerName: string;
  points: number;
  tournaments: number;
  bestRank: number | null;
  position: number;
}
export const getNationalRankings = async () =>
  (
    await api.get<{ rankings: NationalRanking[]; tournamentCount: number }>(
      '/api/rankings',
    )
  ).data;
