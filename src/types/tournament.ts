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
  participants: string[];
  seriesId?: string; // For recurring tournaments
  isRecurring: boolean;
}