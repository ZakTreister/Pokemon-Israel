import asyncHandler from 'express-async-handler';
import User from '../models/userModel.js';
import Tournament from '../models/tournamentModel.js';

// Helper function to calculate tournament rounds and player record
const calculatePlayerRecord = (rawPoints, tournamentResults) => {
  // Find the highest raw points in the tournament to determine total rounds
  const maxRawPoints = Math.max(...tournamentResults.map(result => result.rawPoints || 0));
  const totalRounds = Math.ceil(maxRawPoints / 3);
  
  // Calculate wins, draws, and losses for the player based on raw points
  const wins = Math.floor(rawPoints / 3);
  const draws = rawPoints % 3;
  const losses = totalRounds - wins - draws;
  
  return { wins, draws, losses, totalRounds };
};

// @desc    Get user stats
// @route   GET /api/users/stats
// @access  Private
export const getUserStats = asyncHandler(async (req, res) => {
  const tournaments = await Tournament.find({
    'results.player': req.user._id,
  }).select('results');

  // Calculate stats from tournament results
  let totalTournaments = 0;
  let totalWins = 0;
  let totalLosses = 0;
  let totalDraws = 0;
  let points = 0;
  let bestRank = Infinity;

  tournaments.forEach(tournament => {
    const playerResult = tournament.results.find(
      r => r.player.toString() === req.user._id.toString()
    );
    
    if (playerResult) {
      totalTournaments++;
      points += playerResult.points; // Tournament ranking points
      bestRank = Math.min(bestRank, playerResult.position);
      
      // Calculate wins, draws, and losses based on raw points and tournament structure
      const { wins, draws, losses } = calculatePlayerRecord(
        playerResult.rawPoints || 0, // Use raw points for calculation
        tournament.results
      );
      
      totalWins += wins;
      totalDraws += draws;
      totalLosses += losses;
    }
  });

  const totalGames = totalWins + totalLosses + totalDraws;
  const winRate = totalGames > 0 ? (totalWins / totalGames) * 100 : 0;

  res.json({
    totalTournaments,
    wins: totalWins,
    losses: totalLosses,
    draws: totalDraws,
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

    if (result) {
      // Calculate wins, draws, and losses for this specific tournament
      const { wins, draws, losses } = calculatePlayerRecord(
        result.rawPoints || 0, // Use raw points for calculation
        tournament.results
      );

      return {
        id: tournament._id,
        title: tournament.title,
        date: tournament.date,
        result: {
          position: result.position,
          points: result.points, // Tournament ranking points
          wins,
          draws,
          losses,
        },
      };
    }

    return null;
  }).filter(Boolean); // Remove any null entries

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