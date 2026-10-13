import type { PageQuery, PageResult } from '../../types/pagination';
import api from '../../services/api';
import type {
  Player,
  CreateQuarterlyPlayerInput,
  CreateTeamPlayerInput,
  UpdatePlayerInput,
} from '../../types/player';

const getPlayers = async (
  params?: PageQuery & { type?: 'team' | 'quarterly' },
): Promise<PageResult<Player>> =>
  (await api.get('/api/players', { params })).data;
const deletePlayer = async (id: string) => {
  await api.delete(`/api/players/${id}`);
};
const duplicates = async (input: {
  firstName: string;
  lastName: string;
  city?: string;
  type: 'team' | 'quarterly';
}): Promise<Player[]> =>
  (await api.get('/api/players/duplicates', { params: input })).data;

const getPlayer = async (id: string): Promise<Player> => {
  const { data } = await api.get(`/api/players/${id}`);
  return data;
};

const createQuarterlyPlayer = async (
  input: CreateQuarterlyPlayerInput,
): Promise<Player> => {
  const { data } = await api.post('/api/players/quarterly', input);
  return data;
};

const createTeamPlayer = async (
  input: CreateTeamPlayerInput,
): Promise<Player> => {
  const { data } = await api.post('/api/players/team', input);
  return data;
};

const updatePlayer = async (
  id: string,
  input: UpdatePlayerInput,
): Promise<Player> => {
  const { data } = await api.put(`/api/players/${id}`, input);
  return data;
};

const playersService = {
  getPlayers,
  deletePlayer,
  duplicates,
  getPlayer,
  createQuarterlyPlayer,
  createTeamPlayer,
  updatePlayer,
};

export default playersService;
