export interface Player {
  description?: string;
  dateOfBirth?: string;
  photoUrl?: string;
  photoMedia?: import('../services/media').StoredMedia | null;
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
  photoUploadId?: string | null;
  firstName: string;
  lastName: string;
  club: string;
}

export interface CreateTeamPlayerInput {
  description?: string;
  dateOfBirth?: string;
  photoUploadId?: string | null;
  playerNumber: string;
  firstName: string;
  lastName: string;
  city?: string;
  teamId: string;
}

export interface UpdatePlayerInput {
  description?: string;
  dateOfBirth?: string;
  photoUploadId?: string | null;
  playerNumber?: string;
  city?: string;
  firstName?: string;
  lastName?: string;
  club?: string | null;
  isActive?: boolean;
}
