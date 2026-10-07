import { io } from 'socket.io-client';
import api from './api';
export function subscribeTournament(
  id: string,
  changed: (deleted?: boolean) => void,
  connectionChanged: (connected: boolean) => void,
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
  return () => {
    socket.emit('tournament:unsubscribe', id);
    socket.disconnect();
  };
}
