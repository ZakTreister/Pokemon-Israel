import api from '../../services/api';
import type {
  BadgeDefinition,
  BadgeAward,
  CreateBadgeInput,
  UpdateBadgeInput,
} from '../../types/badge';

const getBadges = async (): Promise<BadgeDefinition[]> => {
  const { data } = await api.get('/api/badges');
  return data;
};

const createBadge = async (input: CreateBadgeInput): Promise<BadgeDefinition> => {
  const { data } = await api.post('/api/badges', input);
  return data;
};

const updateBadge = async (id: string, input: UpdateBadgeInput): Promise<BadgeDefinition> => {
  const { data } = await api.put(`/api/badges/${id}`, input);
  return data;
};

const getBadgeAwards = async (params?: {
  playerId?: string;
  teamId?: string;
}): Promise<BadgeAward[]> => {
  const query: Record<string, string> = {};
  if (params?.playerId) query.playerId = params.playerId;
  if (params?.teamId) query.teamId = params.teamId;
  const { data } = await api.get('/api/badges/awards', { params: query });
  return data;
};

const awardBadge = async (
  badgeId: string,
  playerId: string
): Promise<BadgeAward> => {
  const { data } = await api.post(`/api/badges/${badgeId}/players/${playerId}`);
  return data;
};

const badgesService = {
  getBadges,
  createBadge,
  updateBadge,
  getBadgeAwards,
  awardBadge,
};

export default badgesService;
