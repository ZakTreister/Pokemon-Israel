import api from '../../services/api';
import type { ProfileUpdate } from './utils/profile';
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

// Verify the old password without replacing the currently authenticated token.
const verifyCurrentPassword = async (username: string | undefined, password: string) => {
  await api.post('/api/auth/login', { username, password });
};

const updateProfile = async (input: ProfileUpdate) => {
  await api.put('/api/auth/profile', input);
};

const userService = {
  verifyCurrentPassword,
  updateProfile,
  getUserStats,
  getUserTournaments,
  getUsers,
  deleteUser,
};

export default userService;