import asyncHandler from 'express-async-handler';
import Tournament from '../models/tournamentModel.js';
import { notifyTournament } from '../services/tournamentLive.js';
export const getManagedTournaments = asyncHandler(async (req, res) => {
  const records = await Tournament.find({})
    .select(
      'title date location type status phase engineVersion team teamNameSnapshot currentParticipants source revision',
    )
    .sort({ date: -1 });
  res.json(
    records.map((t) => ({
      ...t.toJSON(),
      type: t.type || 'quarterly',
      lifecycle:
        t.status === 'completed'
          ? 'completed'
          : t.phase === 'running' ||
              (t.phase !== 'setup' && t.date <= new Date())
            ? 'active'
            : 'upcoming',
      canManage:
        req.user.role === 'admin' ||
        (t.engineVersion === 'swiss-v1' &&
          t.source !== 'historical' &&
          t.phase !== 'completed' &&
          t.status !== 'completed'),
    })),
  );
});
export const hardDeleteTournament = asyncHandler(async (req, res) => {
  if (!/^[a-f\d]{24}$/i.test(req.params.id)) {
    res.status(404);
    throw new Error('Tournament not found');
  }
  // Rounds, final results and invalidated-round archives are embedded. Deleting
  // the canonical document atomically removes their ranking contribution too.
  const tournament = await Tournament.findByIdAndDelete(req.params.id);
  if (!tournament) {
    res.status(404);
    throw new Error('Tournament not found');
  }
  if (req.query.deleteSeries === 'true' && tournament.seriesId) {
    const siblings = await Tournament.find({
      seriesId: tournament.seriesId,
      date: { $gte: new Date() },
    }).select('_id revision');
    // Preserve the existing future-series action while allowing the selected past event itself to be deleted.
    await Tournament.deleteMany({
      _id: { $in: siblings.map((row) => row._id) },
    });
    for (const sibling of siblings) notifyTournament(req, sibling, true);
  }
  notifyTournament(req, tournament, true);
  res.json({ message: 'Tournament permanently deleted' });
});
