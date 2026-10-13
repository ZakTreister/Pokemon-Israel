export interface StaffTeacher {
  id: string;
  name: string;
  role: 'admin' | 'judge';
}
export interface Team {
  teacher?: StaffTeacher | null;
  openInternalTournament?: {
    id: string;
    phase: 'setup' | 'running' | null;
  } | null;
  id: string;
  name: string;
  isActive: boolean;
  logo?: string;
  logoPublicId?: string;
  logoUploadId?: string | null;
  completedInternalTournamentCount?: number;
  officialStats?: {
    position: number;
    gamesPlayed: number;
    winRate: number;
  } | null;
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
  joinedAt?: string;
  pokemon?: string[];
  deckUrl?: string;
  deckMedia?: import('../services/media').StoredMedia | null;
  isActive?: boolean;
  description?: string;
  dateOfBirth?: string;
  photoUrl?: string;
  photoMedia?: import('../services/media').StoredMedia | null;
  playerNumber?: string;
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
  teacher: string;
  logo?: string;
  logoPublicId?: string;
  logoUploadId?: string | null;
  name: string;
}

export interface UpdateTeamInput {
  teacher?: string;
  logo?: string;
  logoPublicId?: string;
  logoUploadId?: string | null;
  name?: string;
  isActive?: boolean;
}
