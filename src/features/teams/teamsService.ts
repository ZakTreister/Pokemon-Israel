import api from '../../services/api';
import type {
  Team,
  TeamWithRoster,
  ManageablePlayer,
  CreateTeamInput,
  UpdateTeamInput,
} from '../../types/team';

const getTeams = async (): Promise<Team[]> => {
  const { data } = await api.get('/api/teams');
  return data;
};

const getManageablePlayers = async (): Promise<ManageablePlayer[]> => {
  const { data } = await api.get('/api/teams/manageable-players');
  return data;
};

const getTeam = async (id: string): Promise<TeamWithRoster> => {
  const { data } = await api.get(`/api/teams/${id}`);
  return data;
};

const createTeam = async (input: CreateTeamInput): Promise<Team> => {
  const { data } = await api.post('/api/teams', input);
  return data;
};

const updateTeam = async (id: string, input: UpdateTeamInput): Promise<Team> => {
  const { data } = await api.put(`/api/teams/${id}`, input);
  return data;
};

const assignPlayer = async (teamId: string, playerId: string): Promise<ManageablePlayer> => {
  const { data } = await api.put(`/api/teams/${teamId}/players/${playerId}`);
  return data;
};

const removePlayer = async (teamId: string, playerId: string): Promise<ManageablePlayer> => {
  const { data } = await api.delete(`/api/teams/${teamId}/players/${playerId}`);
  return data;
};

const teamsService = {
  getTeams,
  getManageablePlayers,
  getTeam,
  createTeam,
  updateTeam,
  assignPlayer,
  removePlayer,
};

export default teamsService;
