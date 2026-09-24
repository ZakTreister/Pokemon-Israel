import asyncHandler from 'express-async-handler';
import BadgeDefinition from '../models/badgeDefinitionModel.js';
import { normalizeBadgeName } from '../models/badgeDefinitionModel.js';
import BadgeAward from '../models/badgeAwardModel.js';
import Player from '../models/playerModel.js';

// @desc    Get all badge definitions
// @route   GET /api/badges
// @access  Private (admin, judge)
export const getBadges = asyncHandler(async (req, res) => {
  const badges = await BadgeDefinition.find({})
    .populate('createdBy', 'username name')
    .sort({ normalizedName: 1 });
  res.json(badges);
});

// @desc    Create a badge definition
// @route   POST /api/badges
// @access  Private (admin, judge)
export const createBadge = asyncHandler(async (req, res) => {
  const { name, description, icon } = req.body;

  if (!name || !name.trim()) {
    res.status(400);
    throw new Error('שם תג הוא שדה חובה');
  }

  const normalizedName = normalizeBadgeName(name);

  const existing = await BadgeDefinition.findOne({ normalizedName });
  if (existing) {
    res.status(409);
    throw new Error('תג בשם זה כבר קיים');
  }

  let badge;
  try {
    badge = await BadgeDefinition.create({
      name: name.trim(),
      normalizedName,
      description: description?.trim() || '',
      icon: icon?.trim() || '',
      isActive: true,
      createdBy: req.user._id,
    });
  } catch (error) {
    if (error.code === 11000) {
      res.status(409);
      throw new Error('תג בשם זה כבר קיים');
    }
    throw error;
  }

  await badge.populate('createdBy', 'username name');
  res.status(201).json(badge);
});

// @desc    Update a badge definition
// @route   PUT /api/badges/:id
// @access  Private (admin, judge)
export const updateBadge = asyncHandler(async (req, res) => {
  const { name, description, icon, isActive } = req.body;

  const badge = await BadgeDefinition.findById(req.params.id);
  if (!badge) {
    res.status(404);
    throw new Error('תג לא נמצא');
  }

  if (name !== undefined) {
    if (!name.trim()) {
      res.status(400);
      throw new Error('שם תג הוא שדה חובה');
    }
    const normalizedName = normalizeBadgeName(name);
    if (normalizedName !== badge.normalizedName) {
      const existing = await BadgeDefinition.findOne({
        normalizedName,
        _id: { $ne: badge._id },
      });
      if (existing) {
        res.status(409);
        throw new Error('תג בשם זה כבר קיים');
      }
      badge.name = name.trim();
      badge.normalizedName = normalizedName;
    }
  }

  if (description !== undefined) badge.description = description.trim();
  if (icon !== undefined) badge.icon = icon.trim();
  if (isActive !== undefined) badge.isActive = isActive;

  try {
    await badge.save();
  } catch (error) {
    if (error.code === 11000) {
      res.status(409);
      throw new Error('תג בשם זה כבר קיים');
    }
    throw error;
  }

  await badge.populate('createdBy', 'username name');
  res.json(badge);
});

// @desc    Get badge awards (optionally filtered by player or team)
// @route   GET /api/badges/awards
// @access  Private (admin, judge)
export const getBadgeAwards = asyncHandler(async (req, res) => {
  const { playerId, teamId } = req.query;

  const query = {};
  if (playerId) {
    query.player = playerId;
  }
  if (teamId) {
    const players = await Player.find({ team: teamId }).select('_id');
    const playerIds = players.map((p) => p._id);
    query.player = { $in: playerIds };
  }

  const awards = await BadgeAward.find(query)
    .populate('player', 'firstName lastName')
    .populate('badge', 'name description icon isActive')
    .populate('awardedBy', 'username name')
    .sort({ awardedAt: -1 });

  res.json(awards);
});

// @desc    Award a badge to a player
// @route   POST /api/badges/:badgeId/players/:playerId
// @access  Private (admin, judge)
export const awardBadge = asyncHandler(async (req, res) => {
  const { badgeId, playerId } = req.params;

  const badge = await BadgeDefinition.findById(badgeId);
  if (!badge) {
    res.status(404);
    throw new Error('תג לא נמצא');
  }

  if (!badge.isActive) {
    res.status(400);
    throw new Error('לא ניתן להעניק תג לא פעיל');
  }

  const player = await Player.findById(playerId);
  if (!player) {
    res.status(404);
    throw new Error('שחקן לא נמצא');
  }

  if (player.playerType !== 'team') {
    res.status(400);
    throw new Error('רק שחקני נבחרת יכולים לקבל תגים');
  }

  const existing = await BadgeAward.findOne({ player: playerId, badge: badgeId });
  if (existing) {
    res.status(409);
    throw new Error('השחקן כבר קיבל תג זה');
  }

  let award;
  try {
    award = await BadgeAward.create({
      player: playerId,
      badge: badgeId,
      awardedBy: req.user._id,
    });
  } catch (error) {
    if (error.code === 11000) {
      res.status(409);
      throw new Error('השחקן כבר קיבל תג זה');
    }
    throw error;
  }

  await award.populate('player', 'firstName lastName');
  await award.populate('badge', 'name description icon isActive');
  await award.populate('awardedBy', 'username name');
  res.status(201).json(award);
});
