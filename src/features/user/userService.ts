import api from '../../services/api';
import { PlayerStats, UserTournament } from '../../types/user';

const getUserStats = async () => {
  const { data } = await api.get<PlayerStats>('/api/users/stats');
  return data;
};

const getUserTournaments = async () => {
  const { data } = await api.get<UserTournament[]>('/api/users/tournaments');
  return data;
};

const getUsers = async () => {
  const { data } = await api.get('/api/users');
  return data;
};

const deleteUser = async (id: string) => {
  await api.delete(`/api/users/${id}`);
};

const userService = {
  getUserStats,
  getUserTournaments,
  getUsers,
  deleteUser,
};

export default userService;