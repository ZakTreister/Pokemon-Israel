import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';
import Tournament from '../models/tournamentModel.js';
const validId = (value) =>
  typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);
const room = (id) => `internal-tournament:${id}`;
export function configureTournamentLive(io) {
  io.use(async (socket, next) => {
    try {
      const decoded = jwt.verify(
        socket.handshake.auth?.token,
        process.env.JWT_SECRET,
      );
      const user = await User.findById(decoded.id).select('role');
      if (!user || !['admin', 'judge'].includes(user.role)) throw new Error();
      socket.data.userId = user.id;
      next();
    } catch {
      next(new Error('Not authorized'));
    }
  });
  io.on('connection', (socket) => {
    socket.on('tournament:subscribe', async (id, acknowledge) => {
      try {
        if (
          !validId(id) ||
          !(await Tournament.exists({ _id: id, engineVersion: 'swiss-v1' }))
        )
          throw new Error();
        for (const joined of socket.rooms)
          if (joined.startsWith('internal-tournament:')) socket.leave(joined);
        await socket.join(room(id));
        if (typeof acknowledge === 'function') acknowledge({ ok: true });
      } catch {
        if (typeof acknowledge === 'function') acknowledge({ ok: false });
      }
    });
    socket.on('tournament:unsubscribe', (id) => {
      if (validId(id)) socket.leave(room(id));
    });
  });
}
export function notifyTournament(req, tournament, deleted = false) {
  req.app
    .get('io')
    ?.to(room(tournament.id))
    .emit('tournament:updated', {
      id: tournament.id,
      revision: tournament.revision,
      deleted,
    });
}
