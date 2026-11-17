import api from './api';

export interface QrPlayer {
  id: string;
  firstName: string;
  lastName: string;
  city: string;
  birthYear: number | null;
  playerType: 'team' | 'quarterly';
}
export interface QrTournament {
  id: string;
  title: string;
  phase: string;
  status: string;
  type: string;
  revision: number;
  maxParticipants: number | null;
  currentParticipants: number;
}
export type QrFields = {
  firstName: string;
  lastName: string;
  city: string;
  birthYear: number | null;
};
export const qrRegistration = {
  preview: async (id: string, playerId?: string) =>
    (await api.get<{ tournament: QrTournament; player: QrPlayer | null }>(
      `/api/tournaments/${id}/qr-registration`, { params: { playerId } },
    )).data,
  duplicates: async (id: string, fields: QrFields) =>
    (await api.get<{ matches: QrPlayer[] }>(
      `/api/tournaments/${id}/qr-registration/duplicates`, { params: fields },
    )).data.matches,
  submit: async (id: string, payload: QrFields & {
    playerId?: string;
    allowDuplicate?: boolean;
    updateExisting?: boolean;
    expectedRevision: number;
  }) =>
    (await api.post<{ player: QrPlayer; tournament: QrTournament; created: boolean }>(
      `/api/tournaments/${id}/qr-registration`, payload,
    )).data,
};
