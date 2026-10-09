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
          t.source === 'live' &&
          ['setup', 'running'].includes(t.phase) &&
          t.status !== 'completed'),
    })),
  );
});
export const deleteTournament = asyncHandler(async (req, res) => {
  if (!/^[a-f\d]{24}$/i.test(req.params.id)) {
    res.status(404);
    throw new Error('Tournament not found');
  }
  const permanent = req.query.permanent === 'true';
  const tournament = permanent
    ? await Tournament.findByIdAndDelete(req.params.id).setOptions({
        includeDeleted: true,
      })
    : await Tournament.findOneAndUpdate(
        { _id: req.params.id },
        {
          $set: { deletedAt: new Date(), deletedBy: req.user._id },
          $inc: { revision: 1, __v: 1 },
        },
        { new: true },
      );
  if (!tournament) {
    res.status(404);
    throw new Error('Tournament not found');
  }
  if (req.query.deleteSeries === 'true' && tournament.seriesId) {
    const siblings = await Tournament.find({
      seriesId: tournament.seriesId,
      date: { $gte: new Date() },
    }).select('_id revision');
    const filter = { _id: { $in: siblings.map((row) => row._id) } };
    if (permanent) await Tournament.deleteMany(filter);
    else
      await Tournament.updateMany(filter, {
        $set: { deletedAt: new Date(), deletedBy: req.user._id },
        $inc: { revision: 1, __v: 1 },
      });
    for (const sibling of siblings) notifyTournament(req, sibling, true);
  }
  notifyTournament(req, tournament, true);
  res.json({
    message: permanent
      ? 'Tournament permanently deleted'
      : 'Tournament deleted',
  });
});
