import api from '../../services/api';
import type {
  Player,
  CreateQuarterlyPlayerInput,
  CreateTeamPlayerInput,
  UpdatePlayerInput,
} from '../../types/player';

const getPlayers = async (params?: {
  type?: 'team' | 'quarterly';
  search?: string;
}): Promise<Player[]> => {
  const query: Record<string, string> = {};
  if (params?.type) query.type = params.type;
  if (params?.search) query.search = params.search;
  const { data } = await api.get('/api/players', { params: query });
  return data;
};

const getPlayer = async (id: string): Promise<Player> => {
  const { data } = await api.get(`/api/players/${id}`);
  return data;
};

const createQuarterlyPlayer = async (
  input: CreateQuarterlyPlayerInput
): Promise<Player> => {
  const { data } = await api.post('/api/players/quarterly', input);
  return data;
};

const createTeamPlayer = async (
  input: CreateTeamPlayerInput
): Promise<Player> => {
  const { data } = await api.post('/api/players/team', input);
  return data;
};

const updatePlayer = async (
  id: string,
  input: UpdatePlayerInput
): Promise<Player> => {
  const { data } = await api.put(`/api/players/${id}`, input);
  return data;
};

const playersService = {
  getPlayers,
  getPlayer,
  createQuarterlyPlayer,
  createTeamPlayer,
  updatePlayer,
};

export default playersService;
