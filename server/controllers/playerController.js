import asyncHandler from 'express-async-handler';
import Player from '../models/playerModel.js';
import User from '../models/userModel.js';
import { normalizeField } from '../models/playerModel.js';

// @desc    Get players (with optional type filter and search)
// @route   GET /api/players
// @access  Private/Admin
export const getPlayers = asyncHandler(async (req, res) => {
  const { type, search } = req.query;

  const query = {};
  if (type && (type === 'team' || type === 'quarterly')) {
    query.playerType = type;
  }

  if (search) {
    const searchRegex = new RegExp(search.trim(), 'i');
    query.$or = [
      { firstName: searchRegex },
      { lastName: searchRegex },
      { club: searchRegex },
    ];
  }

  const players = await Player.find(query)
    .populate('user', 'username name role')
    .sort({ firstName: 1, lastName: 1 });

  res.json(players);
});

// @desc    Get a single player
// @route   GET /api/players/:id
// @access  Private/Admin
export const getPlayer = asyncHandler(async (req, res) => {
  const player = await Player.findById(req.params.id).populate(
    'user',
    'username name role'
  );

  if (!player) {
    res.status(404);
    throw new Error('Player not found');
  }

  res.json(player);
});

// @desc    Create a quarterly (club) player
// @route   POST /api/players/quarterly
// @access  Private/Admin
export const createQuarterlyPlayer = asyncHandler(async (req, res) => {
  const { firstName, lastName, club } = req.body;

  if (!firstName || !firstName.trim() || !lastName || !lastName.trim()) {
    res.status(400);
    throw new Error('First name and last name are required');
  }

  const normalizedFirstName = normalizeField(firstName);
  const normalizedLastName = normalizeField(lastName);
  const normalizedClub = normalizeField(club) || '';

  // Check for existing quarterly player with same normalized identity
  const existing = await Player.findOne({
    playerType: 'quarterly',
    normalizedFirstName,
    normalizedLastName,
    normalizedClub,
  });

  if (existing) {
    res.status(409);
    throw new Error('A club player with this name and club already exists');
  }

  let player;
  try {
    player = await Player.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      club: club ? club.trim() : null,
      playerType: 'quarterly',
      user: null,
      isActive: true,
      normalizedFirstName,
      normalizedLastName,
      normalizedClub,
    });
  } catch (error) {
    if (error.code === 11000) {
      res.status(409);
      throw new Error('A club player with this name and club already exists');
    }
    throw error;
  }

  res.status(201).json(player);
});

// @desc    Create a team player (Player + linked User)
// @route   POST /api/players/team
// @access  Private/Admin
export const createTeamPlayer = asyncHandler(async (req, res) => {
  const { firstName, lastName, username, password } = req.body;

  if (!firstName || !firstName.trim() || !lastName || !lastName.trim()) {
    res.status(400);
    throw new Error('First name and last name are required');
  }

  if (!username || !username.trim() || !password || !password.trim()) {
    res.status(400);
    throw new Error('Username and password are required');
  }

  // Check if username already exists
  const userExists = await User.findOne({ username: username.trim() });
  if (userExists) {
    res.status(400);
    throw new Error('Username already exists');
  }

  // Create Player first, then User, then link them.
  // Manual rollback since standalone MongoDB doesn't support transactions.
  let player;
  let user;

  try {
    player = await Player.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      club: null,
      playerType: 'team',
      user: null,
      isActive: true,
    });
  } catch (error) {
    res.status(400);
    throw new Error('Failed to create player: ' + (error.message || 'Unknown error'));
  }

  try {
    user = await User.create({
      name: `${firstName.trim()} ${lastName.trim()}`,
      username: username.trim(),
      password,
      role: 'player',
      player: player._id,
    });
  } catch (error) {
    // Rollback: delete the orphaned Player
    await Player.findByIdAndDelete(player._id);

    if (error.code === 11000) {
      res.status(400);
      throw new Error('Username already exists');
    }

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err) => err.message);
      res.status(400);
      throw new Error(messages.join(', '));
    }

    res.status(400);
    throw new Error('Failed to create user: ' + (error.message || 'Unknown error'));
  }

  // Link Player to User
  try {
    player.user = user._id;
    await player.save();
  } catch (error) {
    // Rollback both
    await User.findByIdAndDelete(user._id);
    await Player.findByIdAndDelete(player._id);
    res.status(500);
    throw new Error('Failed to link player and user');
  }

  await player.populate('user', 'username name role');
  res.status(201).json(player);
});

// @desc    Update a player
// @route   PUT /api/players/:id
// @access  Private/Admin
export const updatePlayer = asyncHandler(async (req, res) => {
  const { firstName, lastName, club, isActive } = req.body;

  const player = await Player.findById(req.params.id);
  if (!player) {
    res.status(404);
    throw new Error('Player not found');
  }

  // Recalculate normalized fields if quarterly and identity fields changed
  if (firstName !== undefined) player.firstName = firstName.trim();
  if (lastName !== undefined) player.lastName = lastName.trim();
  if (club !== undefined) player.club = club ? club.trim() : null;
  if (isActive !== undefined) player.isActive = isActive;

  // For quarterly players, recompute normalized fields and check uniqueness
  if (player.playerType === 'quarterly') {
    const newNormalizedFirstName = normalizeField(player.firstName);
    const newNormalizedLastName = normalizeField(player.lastName);
    const newNormalizedClub = normalizeField(player.club) || '';

    // Check if identity changed
    const identityChanged =
      newNormalizedFirstName !== player.normalizedFirstName ||
      newNormalizedLastName !== player.normalizedLastName ||
      newNormalizedClub !== player.normalizedClub;

    if (identityChanged) {
      const existing = await Player.findOne({
        playerType: 'quarterly',
        normalizedFirstName: newNormalizedFirstName,
        normalizedLastName: newNormalizedLastName,
        normalizedClub: newNormalizedClub,
        _id: { $ne: player._id },
      });

      if (existing) {
        res.status(409);
        throw new Error('A club player with this name and club already exists');
      }

      player.normalizedFirstName = newNormalizedFirstName;
      player.normalizedLastName = newNormalizedLastName;
      player.normalizedClub = newNormalizedClub;
    }
  }

  try {
    const updatedPlayer = await player.save();
    await updatedPlayer.populate('user', 'username name role');
    res.json(updatedPlayer);
  } catch (error) {
    if (error.code === 11000) {
      res.status(409);
      throw new Error('A club player with this name and club already exists');
    }
    throw error;
  }
});
