import asyncHandler from 'express-async-handler';
import Season from '../models/seasonModel.js';

// @desc    Get all seasons
// @route   GET /api/seasons
// @access  Private
export const getSeasons = asyncHandler(async (req, res) => {
  const seasons = await Season.find({})
    .populate('createdBy', 'username name')
    .sort({ startedAt: -1 });
  res.json(seasons);
});

// @desc    Get active season
// @route   GET /api/seasons/active
// @access  Private
export const getActiveSeason = asyncHandler(async (req, res) => {
  const season = await Season.findOne({ status: 'active' })
    .populate('createdBy', 'username name');

  if (!season) {
    res.status(404);
    throw new Error('No active season');
  }

  res.json(season);
});

// @desc    Create a new season
// @route   POST /api/seasons
// @access  Private/Admin
export const createSeason = asyncHandler(async (req, res) => {
  const { name } = req.body;

  if (!name || !name.trim()) {
    res.status(400);
    throw new Error('Season name is required');
  }

  const activeSeason = await Season.findOne({ status: 'active' });
  if (activeSeason) {
    res.status(400);
    throw new Error('Cannot open a new season while another season is active');
  }

  const season = await Season.create({
    name: name.trim(),
    status: 'active',
    startedAt: new Date(),
    createdBy: req.user._id,
  });

  await season.populate('createdBy', 'username name');
  res.status(201).json(season);
});

// @desc    Close the active season
// @route   POST /api/seasons/:id/close
// @access  Private/Admin
export const closeSeason = asyncHandler(async (req, res) => {
  const season = await Season.findById(req.params.id);

  if (!season) {
    res.status(404);
    throw new Error('Season not found');
  }

  if (season.status === 'closed') {
    res.status(400);
    throw new Error('Season is already closed');
  }

  season.status = 'closed';
  season.closedAt = new Date();
  await season.save();

  await season.populate('createdBy', 'username name');
  res.json(season);
});
