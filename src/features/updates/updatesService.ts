import api from '../../services/api';
import { Update, UpdateInput } from '../../types/update';

const getUpdates = async () => {
  const { data } = await api.get<Update[]>('/api/updates');
  return data;
};

const createUpdate = async (updateData: UpdateInput) => {
  const { data } = await api.post<Update>('/api/updates', updateData);
  return data;
};

const updateUpdate = async (id: string, updateData: UpdateInput) => {
  const { data } = await api.put<Update>(`/api/updates/${id}`, updateData);
  return data;
};

const deleteUpdate = async (id: string) => {
  await api.delete(`/api/updates/${id}`);
};

const updatesService = {
  getUpdates,
  getUpdate: async (id: string) =>
    (await api.get<Update>(`/api/updates/${id}`)).data,
  createUpdate,
  updateUpdate,
  deleteUpdate,
};

export default updatesService;
