import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';
import Tournament from '../models/tournamentModel.js';

const validId = value => typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);
const staffRoom = id => `internal-tournament:${id}`;
const publicRoom = id => `public-tournament:${id}`;

export function configureTournamentLive(io) {
  io.use(async (socket, next) => {
    // Anonymous viewers are allowed to subscribe to a public, running event.
    // Management subscriptions remain staff-only, verified below.
    const token = socket.handshake.auth?.token;
    if (!token) return next();
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('role');
      if (!user || !['admin', 'judge'].includes(user.role)) throw new Error();
      socket.data.userId = user.id;
      socket.data.staff = true;
      next();
    } catch {
      next(new Error('Not authorized'));
    }
  });
  io.on('connection', socket => {
    socket.on('tournament:subscribe', async (id, acknowledge) => {
      try {
        if (!socket.data.staff || !validId(id) ||
          !(await Tournament.exists({ _id: id, engineVersion: 'swiss-v1',
            source: 'live', phase: { $in: ['setup', 'running'] }, status: 'upcoming' }))) throw new Error();
        for (const joined of socket.rooms)
          if (joined.startsWith('internal-tournament:')) socket.leave(joined);
        await socket.join(staffRoom(id));
        if (typeof acknowledge === 'function') acknowledge({ ok: true });
      } catch {
        if (typeof acknowledge === 'function') acknowledge({ ok: false });
      }
    });
    socket.on('tournament:public:subscribe', async (id, acknowledge) => {
      try {
        if (!validId(id) || !(await Tournament.exists({ _id: id,
          engineVersion: 'swiss-v1', source: 'live', phase: 'running',
          type: { $in: ['quarterly', null] }, status: 'upcoming' }))) throw new Error();
        for (const joined of socket.rooms)
          if (joined.startsWith('public-tournament:')) socket.leave(joined);
        await socket.join(publicRoom(id));
        if (typeof acknowledge === 'function') acknowledge({ ok: true });
      } catch {
        if (typeof acknowledge === 'function') acknowledge({ ok: false });
      }
    });
    socket.on('tournament:unsubscribe', id => {
      if (validId(id)) socket.leave(staffRoom(id));
    });
    socket.on('tournament:public:unsubscribe', id => {
      if (validId(id)) socket.leave(publicRoom(id));
    });
  });
}

export function notifyTournament(req, tournament, deleted = false) {
  const event = { id: tournament.id, revision: tournament.revision, deleted };
  req.app.get('io')?.to(staffRoom(tournament.id)).emit('tournament:updated', event);
  // Only an event identifier is sent over the public channel; viewers fetch a
  // freshly projected public DTO over HTTP. This final update also closes live
  // viewers' sockets when the tournament finishes.
  // Only club events have a public live viewer. Team meeting updates stay in
  // the authenticated staff room, even if older clients kept a public socket.
  if (tournament.type === 'quarterly' || tournament.type == null) {
    req.app.get('io')?.to(publicRoom(tournament.id)).emit('tournament:public:updated', {
      id: tournament.id,
    });
  }
}
