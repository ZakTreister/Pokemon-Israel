import asyncHandler from 'express-async-handler';
import Season from '../models/seasonModel.js';
import {
  withBadgeSeasonLock,
  ensureSeasonIndex,
} from '../services/badgeLifecycle.js';
import { fail } from '../services/mediaUpload.js';
export const getSeasons = asyncHandler(async (req, res) =>
  res.json(
    await Season.find({ deletedAt: null })
      .populate('createdBy', 'username name')
      .sort({ startedAt: -1 }),
  ),
);
export const getActiveSeason = asyncHandler(async (req, res) => {
  const season = await Season.findOne({
    status: 'active',
    deletedAt: null,
  }).populate('createdBy', 'username name');
  if (!season) fail(404, 'אין עונת תגים פעילה');
  res.json(season);
});
export const createSeason = asyncHandler(async (req, res) =>
  withBadgeSeasonLock(async () => {
    await ensureSeasonIndex(Season);
    const { name } = req.body;
    if (
      typeof name !== 'string' ||
      name.trim().length < 2 ||
      name.trim().length > 100
    )
      fail(400, 'שם עונה הוא חובה ובין 2 ל-100 תווים');
    if (await Season.exists({ status: 'active', deletedAt: null }))
      fail(400, 'יש לסגור את העונה הפעילה לפני פתיחת עונה חדשה');
    let season;
    try {
      season = await Season.create({
        name: name.trim(),
        createdBy: req.user._id,
      });
    } catch (error) {
      if (error.code === 11000) fail(409, 'כבר קיימת עונה פעילה');
      throw error;
    }
    await season.populate('createdBy', 'username name');
    res.status(201).json(season);
  }),
);
export const closeSeason = asyncHandler(async (req, res) =>
  withBadgeSeasonLock(async () => {
    const season = await Season.findOneAndUpdate(
      { _id: req.params.id, status: 'active', deletedAt: null },
      { $set: { status: 'closed', closedAt: new Date() } },
      { new: true },
    ).populate('createdBy', 'username name');
    if (!season) fail(400, 'העונה אינה פעילה או אינה קיימת');
    res.json(season);
  }),
);
export const deleteSeason = asyncHandler(async (req, res) =>
  withBadgeSeasonLock(async () => {
    const season = await Season.findOneAndUpdate(
      { _id: req.params.id, deletedAt: null },
      {
        $set: {
          deletedAt: new Date(),
          deletedBy: req.user._id,
          status: 'closed',
          closedAt: new Date(),
        },
      },
      { new: true },
    );
    if (!season) fail(404, 'העונה לא נמצאה');
    res.json({ id: season.id, deletedAt: season.deletedAt });
  }),
);
