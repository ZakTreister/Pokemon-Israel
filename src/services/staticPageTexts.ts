import api from './api';

export const staticTextPages = [{ id: 'all-stars', label: 'עמוד האולסטארז' }] as const;
export type StaticPageTextKey = typeof staticTextPages[number]['id'];
export interface StaticPageText {
  title: string;
  subtitle: string;
  bodyHtml: string;
}
export const staticPageTextsService = {
  get: async (id: StaticPageTextKey) => (await api.get<StaticPageText>('/api/static-page-texts/' + id)).data,
  save: async (id: StaticPageTextKey, input: StaticPageText) => (await api.put<StaticPageText>('/api/static-page-texts/' + id, input)).data,
};
