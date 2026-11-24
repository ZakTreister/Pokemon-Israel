import api from './api';

export type RoundTimerStatus = 'ready' | 'running' | 'paused' | 'finished';

export interface RoundTimerState {
  durationSeconds: number;
  remainingSeconds: number;
  status: RoundTimerStatus;
  startedAt: string | null;
  version: number;
}

export interface RoundTimerSnapshot {
  roundNumber: number;
  timer: RoundTimerState;
  serverTime: string;
}

export interface RoundTimerNotification extends RoundTimerSnapshot {
  id: string;
}

export const roundTimerApi = {
  get: async (endpoint: string) =>
    (await api.get<RoundTimerSnapshot>(endpoint)).data,
  update: async (
    endpoint: string,
    expectedTimerVersion: number,
    action: 'start' | 'pause' | 'reset' | 'configure',
    durationSeconds?: number,
  ) =>
    (await api.put<RoundTimerSnapshot>(endpoint, {
      expectedTimerVersion,
      action,
      ...(durationSeconds === undefined ? {} : { durationSeconds }),
    })).data,
};
