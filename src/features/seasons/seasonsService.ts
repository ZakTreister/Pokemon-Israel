import api from '../../services/api';
import type { Season } from '../../types/season';

const getSeasons = async (): Promise<Season[]> => {
  const { data } = await api.get('/api/seasons');
  return data;
};

const getActiveSeason = async (): Promise<Season> => {
  const { data } = await api.get('/api/seasons/active');
  return data;
};

const createSeason = async (name: string): Promise<Season> => {
  const { data } = await api.post('/api/seasons', { name });
  return data;
};

const closeSeason = async (id: string): Promise<Season> => {
  const { data } = await api.post(`/api/seasons/${id}/close`);
  return data;
};

const seasonsService = {
  getSeasons,
  getActiveSeason,
  createSeason,
  closeSeason,
};

export default seasonsService;
