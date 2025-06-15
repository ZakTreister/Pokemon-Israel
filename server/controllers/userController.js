import asyncHandler from 'express-async-handler';
import User from '../models/userModel.js';
import Tournament from '../models/tournamentModel.js';

// @desc    Get user stats
// @route   GET /api/users/stats
// @access  Private
export const getUserStats = asyncHandler(async (req, res) => {
  const tournaments = await Tournament.find({
    'results.player': req.user._id,
  }).select('results');

  // Calculate stats from tournament results
  let totalTournaments = 0;
  let wins = 0;
  let losses = 0;
  let points = 0;
  let bestRank = Infinity;

  tournaments.forEach(tournament => {
    const playerResult = tournament.results.find(
      r => r.player.toString() === req.user._id.toString()
    );
    
    if (playerResult) {
      totalTournaments++;
      points += playerResult.points;
      bestRank = Math.min(bestRank, playerResult.position);
      
      // Calculate wins/losses based on GWP
      const matches = Math.round((playerResult.gwp / 100) * 6); // Assuming 6 rounds per tournament
      wins += matches;
      losses += 6 - matches;
    }
  });

  const winRate = totalTournaments > 0 ? (wins / (wins + losses)) * 100 : 0;

  res.json({
    totalTournaments,
    wins,
    losses,
    points,
    winRate,
    bestRank: bestRank === Infinity ? 0 : bestRank,
  });
});

// @desc    Get user tournament history
// @route   GET /api/users/tournaments
// @access  Private
export const getUserTournaments = asyncHandler(async (req, res) => {
  const tournaments = await Tournament.find({
    'results.player': req.user._id,
  })
  .select('title date results')
  .sort('-date');

  const userTournaments = tournaments.map(tournament => {
    const result = tournament.results.find(
      r => r.player.toString() === req.user._id.toString()
    );

    return {
      id: tournament._id,
      title: tournament.title,
      date: tournament.date,
      result: {
        position: result.position,
        points: result.points,
        wins: Math.round((result.gwp / 100) * 6), // Assuming 6 rounds
        losses: 6 - Math.round((result.gwp / 100) * 6),
      },
    };
  });

  res.json(userTournaments);
});

// @desc    Get all users (admin only)
// @route   GET /api/users
// @access  Private/Admin
export const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find({}).select('-password');
  res.json(users);
});

// @desc    Update user (admin only)
// @route   PUT /api/users/:id
// @access  Private/Admin
export const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // Update user fields
  user.name = req.body.name || user.name;
  user.username = req.body.username || user.username;
  user.role = req.body.role || user.role;

  // Only update password if provided
  if (req.body.password) {
    user.password = req.body.password;
  }

  const updatedUser = await user.save();

  res.json({
    id: updatedUser._id,
    name: updatedUser.name,
    username: updatedUser.username,
    role: updatedUser.role,
  });
});

// @desc    Delete user (admin only)
// @route   DELETE /api/users/:id
// @access  Private/Admin
export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (user) {
    if (user.role === 'admin') {
      res.status(400);
      throw new Error('Cannot delete admin user');
    }
    await user.deleteOne();
    res.json({ message: 'User removed' });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
});