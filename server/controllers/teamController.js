import asyncHandler from 'express-async-handler';
import Team from '../models/teamModel.js';
import { normalizeTeamName } from '../models/teamModel.js';
import Player from '../models/playerModel.js';
import Season from '../models/seasonModel.js';

async function assertNoActiveSeason(res) {
  const active = await Season.findOne({ status: 'active' });
  if (active) {
    res.status(409);
    throw new Error('לא ניתן לבצע שינויי מבנה נבחרות בזמן עונה פעילה');
  }
}

// @desc    Get all teams with player count
// @route   GET /api/teams
// @access  Private (admin, judge)
export const getTeams = asyncHandler(async (req, res) => {
  const teams = await Team.find({})
    .populate('createdBy', 'username name')
    .sort({ normalizedName: 1 });

  const teamsWithCounts = await Promise.all(
    teams.map(async (team) => {
      const playerCount = await Player.countDocuments({
        team: team._id,
        isActive: true,
      });
      return { ...team.toJSON(), playerCount };
    })
  );

  res.json(teamsWithCounts);
});

// @desc    Get manageable players (team-type only)
// @route   GET /api/teams/manageable-players
// @access  Private (admin, judge)
export const getManageablePlayers = asyncHandler(async (req, res) => {
  const players = await Player.find({ playerType: 'team' })
    .populate('team', 'name isActive')
    .select('firstName lastName isActive team')
    .sort({ firstName: 1, lastName: 1 });

  res.json(players);
});

// @desc    Get single team with roster
// @route   GET /api/teams/:id
// @access  Private (admin, judge)
export const getTeam = asyncHandler(async (req, res) => {
  const team = await Team.findById(req.params.id).populate(
    'createdBy',
    'username name'
  );

  if (!team) {
    res.status(404);
    throw new Error('נבחרת לא נמצאה');
  }

  const players = await Player.find({ team: team._id, isActive: true })
    .select('firstName lastName isActive team')
    .sort({ firstName: 1, lastName: 1 });

  res.json({ ...team.toJSON(), players });
});

// @desc    Create a team
// @route   POST /api/teams
// @access  Private (admin, judge)
export const createTeam = asyncHandler(async (req, res) => {
  await assertNoActiveSeason(res);

  const { name } = req.body;

  if (!name || !name.trim()) {
    res.status(400);
    throw new Error('שם נבחרת הוא שדה חובה');
  }

  const normalizedName = normalizeTeamName(name);

  const existing = await Team.findOne({ normalizedName });
  if (existing) {
    res.status(409);
    throw new Error('נבחרת בשם זה כבר קיימת');
  }

  let team;
  try {
    team = await Team.create({
      name: name.trim(),
      normalizedName,
      isActive: true,
      createdBy: req.user._id,
    });
  } catch (error) {
    if (error.code === 11000) {
      res.status(409);
      throw new Error('נבחרת בשם זה כבר קיימת');
    }
    throw error;
  }

  await team.populate('createdBy', 'username name');
  res.status(201).json({ ...team.toJSON(), playerCount: 0 });
});

// @desc    Update a team (rename / activate / deactivate)
// @route   PUT /api/teams/:id
// @access  Private (admin, judge)
export const updateTeam = asyncHandler(async (req, res) => {
  await assertNoActiveSeason(res);

  const { name, isActive } = req.body;

  const team = await Team.findById(req.params.id);
  if (!team) {
    res.status(404);
    throw new Error('נבחרת לא נמצאה');
  }

  if (name !== undefined) {
    if (!name.trim()) {
      res.status(400);
      throw new Error('שם נבחרת הוא שדה חובה');
    }

    const normalizedName = normalizeTeamName(name);
    if (normalizedName !== team.normalizedName) {
      const existing = await Team.findOne({
        normalizedName,
        _id: { $ne: team._id },
      });
      if (existing) {
        res.status(409);
        throw new Error('נבחרת בשם זה כבר קיימת');
      }
      team.name = name.trim();
      team.normalizedName = normalizedName;
    }
  }

  if (isActive !== undefined) {
    team.isActive = isActive;
  }

  try {
    await team.save();
  } catch (error) {
    if (error.code === 11000) {
      res.status(409);
      throw new Error('נבחרת בשם זה כבר קיימת');
    }
    throw error;
  }

  await team.populate('createdBy', 'username name');
  const playerCount = await Player.countDocuments({
    team: team._id,
    isActive: true,
  });
  res.json({ ...team.toJSON(), playerCount });
});

// @desc    Assign or transfer a player to a team
// @route   PUT /api/teams/:teamId/players/:playerId
// @access  Private (admin, judge)
export const assignPlayerToTeam = asyncHandler(async (req, res) => {
  await assertNoActiveSeason(res);

  const { teamId, playerId } = req.params;

  const team = await Team.findById(teamId);
  if (!team) {
    res.status(404);
    throw new Error('נבחרת לא נמצאה');
  }

  if (!team.isActive) {
    res.status(400);
    throw new Error('לא ניתן לשייך שחקן לנבחרת לא פעילה');
  }

  const player = await Player.findById(playerId);
  if (!player) {
    res.status(404);
    throw new Error('שחקן לא נמצא');
  }

  if (player.playerType !== 'team') {
    res.status(400);
    throw new Error('רק שחקני נבחרת יכולים להיות משויכים לנבחרת');
  }

  if (!player.isActive) {
    res.status(400);
    throw new Error('לא ניתן לשייך שחקן לא פעיל');
  }

  player.team = team._id;
  await player.save();

  await player.populate('team', 'name isActive');
  res.json({
    id: player._id,
    firstName: player.firstName,
    lastName: player.lastName,
    isActive: player.isActive,
    team: player.team ? { id: player.team._id, name: player.team.name, isActive: player.team.isActive } : null,
  });
});

// @desc    Remove a player from a team
// @route   DELETE /api/teams/:teamId/players/:playerId
// @access  Private (admin, judge)
export const removePlayerFromTeam = asyncHandler(async (req, res) => {
  await assertNoActiveSeason(res);

  const { teamId, playerId } = req.params;

  const player = await Player.findById(playerId);
  if (!player) {
    res.status(404);
    throw new Error('שחקן לא נמצא');
  }

  if (!player.team || player.team.toString() !== teamId) {
    res.status(400);
    throw new Error('השחקן אינו משויך לנבחרת זו');
  }

  if (player.playerType !== 'team') {
    res.status(400);
    throw new Error('רק שחקני נבחרת יכולים להיות משויכים לנבחרת');
  }

  player.team = null;
  await player.save();

  res.json({
    id: player._id,
    firstName: player.firstName,
    lastName: player.lastName,
    isActive: player.isActive,
    team: null,
  });
});
