export interface Player {
  id: string;
  firstName: string;
  lastName: string;
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
  username: string;
  password: string;
}

export interface UpdatePlayerInput {
  firstName?: string;
  lastName?: string;
  club?: string | null;
  isActive?: boolean;
}
