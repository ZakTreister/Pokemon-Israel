export interface InternalParticipant {
  player: string;
  nameSnapshot: string;
  citySnapshot?: string;
}
export interface MatchResult {
  winner: "player1" | "player2" | "draw" | "bye";
  score1: number;
  score2: number;
  drawnGames: number;
  enteredAt?: string;
}
export interface InternalMatch {
  _id: string;
  table: number;
  player1: string;
  player2: string | null;
  result: MatchResult | null;
}
export interface InternalRound {
  _id: string;
  number: number;
  matches: InternalMatch[];
}
export interface Standing {
  player: string;
  playerName: string;
  position: number;
  points: number;
  omp: number | null;
  gwp: number | null;
  ogp: number | null;
  matchesPlayed?: number;
  wins?: number;
  draws?: number;
  losses?: number;
  byes?: number;
}
export interface InternalTournamentSummary {
  id: string;
  title: string;
  date: string;
  team: string;
  teamNameSnapshot: string;
  phase: "setup" | "running" | "completed";
  status: "upcoming" | "completed";
  source: "live" | "historical";
  revision: number;
  currentParticipants: number;
  competitionYear: string;
}
export interface InternalTournament extends InternalTournamentSummary {
  playerParticipants: InternalParticipant[];
  rounds: InternalRound[];
  standings: Standing[];
  finalStandings: Standing[];
  invalidatedRounds: { reason: string; invalidatedAt: string }[];
}
export interface AllStarsRanking {
  playerId: string;
  playerName: string;
  points: number;
  tournaments: number;
  position: number;
  team: { id: string; name: string; logo: string } | null;
}
export interface AllStarsRankings {
  competitionYear: string;
  rankings: AllStarsRanking[];
}
