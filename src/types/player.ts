export interface Player {
  joinedAt?: string;
  pokemon?: string[];
  deckUploadId?: string | null;
  deckUrl?: string;
  deckMedia?: import('../services/media').StoredMedia | null;
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
  allowDuplicate?: boolean;
  firstName: string;
  lastName: string;
  city: string;
}

export interface CreateTeamPlayerInput {
  allowDuplicate?: boolean;
  joinedAt?: string;
  pokemon?: string[];
  deckUploadId?: string | null;
  deckUrl?: string;
  deckMedia?: import('../services/media').StoredMedia | null;
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
  joinedAt?: string;
  pokemon?: string[];
  deckUploadId?: string | null;
  deckUrl?: string;
  deckMedia?: import('../services/media').StoredMedia | null;
  description?: string;
  dateOfBirth?: string;
  photoUploadId?: string | null;
  playerNumber?: string;
  city?: string;
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
}
