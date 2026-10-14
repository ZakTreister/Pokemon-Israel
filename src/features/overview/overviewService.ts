import api from '../../services/api';
import type { Team } from '../../types/team';
export type EncounterBalance =
  | { status: 'unavailable' }
  | { status: 'empty'; competitionYear: string }
  | { status: 'equal'; competitionYear: string; count: number; maximum: number }
  | {
      status: 'uneven';
      competitionYear: string;
      maximum: number;
      lagging: { id: string; name: string; gap: number }[];
    };
export interface AdminOverviewSummary {
  role: 'admin';
  activeTeams: number;
  activeTeamPlayers: number;
  activeQuarterlyPlayers: number;
  activeTournaments: number;
  completedQuarterlyTournaments: number;
  encounterBalance: EncounterBalance;
  nearest: {
    id: string;
    title: string;
    date: string;
    location: string;
    currentParticipants: number;
    maxParticipants: number;
    managementPath: string;
  } | null;
}
export interface JudgeOverviewTeam extends Team {
  leaguePosition: { position: number; totalTeams: number } | null;
}
export interface JudgeOverviewSummary {
  role: 'judge';
  teams: JudgeOverviewTeam[];
}
export const getOverview = async () =>
  (
    await api.get<AdminOverviewSummary | JudgeOverviewSummary>(
      '/api/teams/overview',
    )
  ).data;
