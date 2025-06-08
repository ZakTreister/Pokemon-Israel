import api from '../../services/api';
import { Update } from '../../types/update';

const getUpdates = async () => {
  const { data } = await api.get<Update[]>('/api/updates');
  return data;
};

const createUpdate = async (updateData: { title: string; content: string }) => {
  const { data } = await api.post<Update>('/api/updates', updateData);
  return data;
};

const updateUpdate = async (id: string, updateData: { title: string; content: string }) => {
  const { data } = await api.put<Update>(`/api/updates/${id}`, updateData);
  return data;
};

const deleteUpdate = async (id: string) => {
  await api.delete(`/api/updates/${id}`);
};

const updatesService = {
  getUpdates,
  createUpdate,
  updateUpdate,
  deleteUpdate,
};

export default updatesService;