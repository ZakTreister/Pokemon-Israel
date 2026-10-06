export interface Player {
  id: string;
  firstName: string;
  lastName: string;
  city?: string;
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
  firstName: string;
  lastName: string;
  city?: string;
  teamId?: string;
}

export interface UpdatePlayerInput {
  city?: string;
  firstName?: string;
  lastName?: string;
  club?: string | null;
  isActive?: boolean;
}
