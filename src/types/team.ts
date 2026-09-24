export interface Team {
  id: string;
  name: string;
  isActive: boolean;
  createdBy: {
    id: string;
    username: string;
    name: string;
  };
  playerCount: number;
}

export interface TeamWithRoster extends Team {
  players: ManageablePlayer[];
}

export interface ManageablePlayer {
  id: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  team: {
    id: string;
    name: string;
    isActive: boolean;
  } | null;
  user: {
    id: string;
    username: string;
    name: string;
    role: string;
  } | null;
}

export interface CreateTeamInput {
  name: string;
}

export interface UpdateTeamInput {
  name?: string;
  isActive?: boolean;
}
