import api from './api';
interface PublicRanking {
  position: number;
  points: number;
  tournaments: number;
}
export interface PublicTeamPlayer {
  tenureYears?: number;
  deckUrl?: string;
  pokemon?: string[];
  description?: string;
  age?: number;
  photoUrl?: string;
  id: string;
  firstName: string;
  lastName: string;
  city: string;
  team: { id: string; name: string; logo?: string } | null;
  playerNumber?: string;
  teamRanking: PublicRanking | null;
  badges: {
    image?: string;
    seasonName?: string;
    name: string;
    description: string;
    icon: string;
    awardedAt: string;
  }[];
}
export async function getPublicPlayer(id: string) {
  return (await api.get<PublicTeamPlayer>(`/api/players/public/${id}`)).data;
}
