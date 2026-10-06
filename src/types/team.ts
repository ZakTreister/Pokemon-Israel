export interface Team {
  id: string;
  name: string;
  isActive: boolean;
  logo?: string;
  completedInternalTournamentCount?: number;
  officialStats?: { position: number; gamesPlayed: number; winRate: number } | null;
  createdBy?: {
    id: string;
    username: string;
    name: string;
  };
  playerCount: number;
}

export interface TeamWithRoster extends Team {
  players: TeamRosterPlayer[];
}

export interface TeamRosterPlayer {
  id: string;
  firstName: string;
  lastName: string;
  city?: string;
}

export interface ManageablePlayer extends TeamRosterPlayer {
  isActive: boolean;
  team: {
    id: string;
    name: string;
    isActive: boolean;
  } | null;
  user?: {
    id: string;
    username: string;
    name: string;
    role: string;
  } | null;
}

export interface CreateTeamInput {
  logo?: string;
  name: string;
}

export interface UpdateTeamInput {
  logo?: string;
  name?: string;
  isActive?: boolean;
}
