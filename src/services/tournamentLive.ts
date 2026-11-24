import { io } from 'socket.io-client';
import api from './api';
import type { RoundTimerNotification } from './roundTimer';
export function subscribeTournament(
  id: string,
  changed: (deleted?: boolean) => void,
  connectionChanged: (connected: boolean) => void,
  timerChanged?: (notification: RoundTimerNotification) => void,
) {
  const socket = io(api.defaults.baseURL, {
    auth: { token: localStorage.getItem('token') },
    reconnection: true,
  });
  socket.on('connect', () =>
    socket.emit('tournament:subscribe', id, (response: { ok: boolean }) => {
      connectionChanged(response.ok);
      if (response.ok) changed();
    }),
  );
  socket.on('disconnect', () => connectionChanged(false));
  socket.on('connect_error', () => connectionChanged(false));
  socket.on(
    'tournament:updated',
    (event: { id: string; deleted?: boolean }) => {
      if (event.id === id) changed(event.deleted);
    },
  );
  socket.on('tournament:timer:updated', (event: RoundTimerNotification) => {
    if (event.id === id) timerChanged?.(event);
  });
  return () => {
    socket.emit('tournament:unsubscribe', id);
    socket.disconnect();
  };
}

/** Live public updates; intentionally does not send a staff authentication token. */
export function subscribePublicTournament(id: string, changed: () => void) {
  const socket = io(api.defaults.baseURL, { reconnection: true });
  socket.on('connect', () => {
    socket.emit('tournament:public:subscribe', id, (response: { ok: boolean }) => {
      if (response.ok) changed();
    });
  });
  socket.on('tournament:public:updated', (event: { id: string }) => {
    if (event.id === id) changed();
  });
  return () => {
    socket.emit('tournament:public:unsubscribe', id);
    socket.disconnect();
  };
}
