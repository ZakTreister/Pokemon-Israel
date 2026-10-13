import asyncHandler from 'express-async-handler';
import BadgeDefinition, {
  normalizeBadgeName,
} from '../models/badgeDefinitionModel.js';
import BadgeAward from '../models/badgeAwardModel.js';
import Player from '../models/playerModel.js';
import Season from '../models/seasonModel.js';
import {
  resolveUpload,
  finishAttachment,
  fail,
} from '../services/mediaUpload.js';
import {
  withBadgeSeasonLock,
  ensureBadgeAwardIndex,
} from '../services/badgeLifecycle.js';
const populateAward = (value) =>
  value.populate([
    { path: 'player', select: 'firstName lastName' },
    {
      path: 'badge',
      select: 'name description icon image imageMedia isActive',
    },
    { path: 'season', select: 'name deletedAt' },
    { path: 'awardedBy', select: 'username name' },
  ]);
function definitionFields(input, creating = false) {
  const result = {};
  if (creating || input.name !== undefined) {
    if (
      typeof input.name !== 'string' ||
      !input.name.trim() ||
      input.name.trim().length > 100
    )
      fail(400, 'שם תג הוא חובה ועד 100 תווים');
    result.name = input.name.trim();
    result.normalizedName = normalizeBadgeName(result.name);
  }
  for (const [field, max] of [
    ['description', 500],
    ['icon', 50],
  ]) {
    if (input[field] !== undefined) {
      if (typeof input[field] !== 'string' || input[field].length > max)
        fail(400, 'פרטי התג אינם תקינים');
      result[field] = input[field].trim();
    }
  }
  if (input.isActive !== undefined) {
    if (typeof input.isActive !== 'boolean') fail(400, 'מצב תג לא תקין');
    result.isActive = input.isActive;
  }
  return result;
}
export const getBadges = asyncHandler(async (req, res) =>
  res.json(
    await BadgeDefinition.find({})
      .populate('createdBy', 'username name')
      .sort({ normalizedName: 1 }),
  ),
);
export const createBadge = asyncHandler(async (req, res) => {
  const fields = definitionFields(req.body, true);
  const attachment = await resolveUpload(req, 'badge-image');
  let badge;
  try {
    badge = await BadgeDefinition.create({
      ...fields,
      createdBy: req.user._id,
      ...(attachment?.id ? { _id: attachment.id } : {}),
      imageMedia: attachment?.media || null,
    });
  } catch (error) {
    if (error.code === 11000) fail(409, 'תג בשם זה כבר קיים');
    throw error;
  }
  await finishAttachment(req, attachment);
  await badge.populate('createdBy', 'username name');
  res.status(201).json(badge);
});
export const updateBadge = asyncHandler(async (req, res) => {
  const fields = definitionFields(req.body);
  const badge = await BadgeDefinition.findById(req.params.id);
  if (!badge) fail(404, 'תג לא נמצא');
  const previous = badge.imageMedia;
  const attachment = await resolveUpload(
    req,
    'badge-image',
    badge._id,
    previous,
  );
  Object.assign(badge, fields);
  if (attachment) {
    badge.imageMedia = attachment.media;
    badge.image = '';
  }
  try {
    await badge.save();
  } catch (error) {
    if (error.code === 11000) fail(409, 'תג בשם זה כבר קיים');
    throw error;
  }
  await finishAttachment(req, attachment, previous);
  await badge.populate('createdBy', 'username name');
  res.json(badge);
});
export const getBadgeAwards = asyncHandler(async (req, res) => {
  const query = { revokedAt: null };
  if (req.query.playerId) query.player = req.query.playerId;
  if (req.query.teamId)
    query.player = {
      $in: (await Player.find({ team: req.query.teamId }).select('_id')).map(
        (p) => p._id,
      ),
    };
  const awards = await populateAward(BadgeAward.find(query)).sort({
    awardedAt: -1,
  });
  res.json(
    awards.map((award) => {
      const data = award.toJSON();
      if (award.season?.deletedAt) data.season = { name: 'עונה שנמחקה' };
      return data;
    }),
  );
});
export const awardBadge = asyncHandler(async (req, res) =>
  withBadgeSeasonLock(async () => {
    await ensureBadgeAwardIndex(BadgeAward);
    const badge = await BadgeDefinition.findById(req.params.badgeId);
    if (!badge) fail(404, 'תג לא נמצא');
    if (!badge.isActive) fail(400, 'לא ניתן להעניק תג לא פעיל');
    const player = await Player.findById(req.params.playerId);
    if (!player) fail(404, 'שחקן לא נמצא');
    if (player.playerType !== 'team' || !player.isActive)
      fail(400, 'רק שחקני נבחרת פעילים יכולים לקבל תגים');
    const season = await Season.findOne({ status: 'active', deletedAt: null });
    if (!season) fail(409, 'יש לפתוח עונת תגים פעילה לפני הענקת תג');
    let award;
    try {
      award = await BadgeAward.create({
        player: player._id,
        badge: badge._id,
        season: season._id,
        awardedBy: req.user._id,
      });
    } catch (error) {
      if (error.code === 11000) fail(409, 'השחקן כבר קיבל תג זה בעונה הנוכחית');
      throw error;
    }
    await populateAward(award);
    res.status(201).json(award);
  }),
);
export const revokeBadgeAward = asyncHandler(async (req, res) => {
  const award = await BadgeAward.findOneAndUpdate(
    { _id: req.params.id, revokedAt: null },
    { $set: { revokedAt: new Date(), revokedBy: req.user._id } },
    { new: true },
  );
  if (!award) fail(404, 'הענקת התג לא נמצאה');
  res.json({ id: award.id, revokedAt: award.revokedAt });
});
