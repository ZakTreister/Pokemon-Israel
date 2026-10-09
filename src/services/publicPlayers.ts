import api from './api';
interface PublicRanking {
  position: number;
  points: number;
  tournaments: number;
}
export interface PublicTeamPlayer {
  id: string;
  firstName: string;
  lastName: string;
  city: string;
  team: { id: string; name: string; logo?: string } | null;
  overallRanking: PublicRanking | null;
  teamRanking: PublicRanking | null;
  badges: {
    name: string;
    description: string;
    icon: string;
    awardedAt: string;
  }[];
}
export async function getPublicPlayer(id: string) {
  return (await api.get<PublicTeamPlayer>(`/api/players/public/${id}`)).data;
}
