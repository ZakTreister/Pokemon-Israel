export interface Player {
  id: string;
  firstName: string;
  lastName: string;
  city?: string;
  playerNumber?: string;
  team?: string | null;
  club: string | null;
  playerType: 'team' | 'quarterly';
  user: {
    id: string;
    username: string;
    name: string;
    role: string;
  } | null;
  isActive: boolean;
}

export interface CreateQuarterlyPlayerInput {
  firstName: string;
  lastName: string;
  club: string;
}

export interface CreateTeamPlayerInput {
  playerNumber: string;
  firstName: string;
  lastName: string;
  city?: string;
  teamId: string;
}

export interface UpdatePlayerInput {
  playerNumber?: string;
  city?: string;
  firstName?: string;
  lastName?: string;
  club?: string | null;
  isActive?: boolean;
}
