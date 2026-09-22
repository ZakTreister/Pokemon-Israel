export interface Tournament {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  maxParticipants: number;
  currentParticipants: number;
  format: string;
  entryFee: number;
  status: 'upcoming' | 'completed';
  prizePool: string;
  registrationDeadline: string;
  image: string;
  participants: TournamentParticipant[];
  seriesId?: string; // For recurring tournaments
  isRecurring: boolean;
  type?: 'team_internal' | 'inter_team' | 'quarterly' | null;
  season?: string | null; // Season ID reference
}

export interface TournamentParticipant {
  user: {
    _id: string;
    username: string;
  } | string;
  registeredAt: string;
}