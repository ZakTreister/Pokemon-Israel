import type { Deck } from './deck';

export interface Tournament {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  maxParticipants: number | null;
  currentParticipants: number;
  format: string;
  entryFee: number;
  status: 'upcoming' | 'completed';
  engineVersion?: string | null;
  phase?: 'setup' | 'running' | 'completed' | null;
  prizePool: string;
  registrationDeadline: string;
  image: string;
  participants: TournamentParticipant[];
  results: TournamentResult[];
  clubRegistrations?: ClubTournamentRegistration[];
  seriesId?: string; // For recurring tournaments
  isRecurring: boolean;
  type?: 'team_internal' | 'inter_team' | 'quarterly' | null;
  season?: string | null; // Season ID reference
}

export interface TournamentResult {
  player?: string | { _id?: string; id?: string } | null;
  playerName: string;
  position: number;
  points: number;
  rawPoints?: number;
  omp?: number;
  gwp?: number;
  ogp?: number;
  deck?: string | Deck | null;
}

export interface TournamentParticipant {
  user: {
    _id: string;
    id?: string;
    username: string;
  } | string;
  registeredAt: string;
}
export interface ClubTournamentRegistration {
  player: string;
  nameSnapshot: string;
  citySnapshot?: string;
  registeredAt: string;
}
