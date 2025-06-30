export interface PlayerStats {
  totalTournaments: number;
  wins: number;
  losses: number;
  draws: number;
  points: number;
  winRate: number;
  bestRank: number;
  achievements: Achievement[];
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  date: string;
}

export interface UserTournament {
  id: string;
  title: string;
  date: string;
  result: {
    position: number;
    wins: number;
    losses: number;
    draws: number;
    points: number;
  };
}