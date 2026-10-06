import asyncHandler from 'express-async-handler';
import Player from '../models/playerModel.js';
import Team from '../models/teamModel.js';
import { withRosterLocks } from '../services/rosterLock.js';
import User from '../models/userModel.js';
import { normalizeField } from '../models/playerModel.js';

// @desc    Get players (with optional type filter and search)
// @route   GET /api/players
// @access  Private/Admin
export const getPlayers = asyncHandler(async (req, res) => {
  const { type, search } = req.query;

  const query = req.user.role === 'judge' ? { playerType: 'team' } : {};
  if (req.user.role !== 'judge' && type && (type === 'team' || type === 'quarterly')) {
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

  if (player && req.user.role === 'judge' && player.playerType !== 'team') {
    res.status(403); throw new Error('Not authorized for club players');
  }

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

  if (!club || !club.trim()) {
    res.status(400);
    throw new Error('Club is required for club players');
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
      club: club.trim(),
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

// Team children have no login. Existing User-linked records remain supported.
export const createTeamPlayer = asyncHandler(async (req, res) => {
  const { firstName, lastName, city = '', teamId = req.body.team || null } = req.body;
  if (typeof firstName !== 'string' || !firstName.trim() || typeof lastName !== 'string' || !lastName.trim() || typeof city !== 'string') {
    res.status(400); throw new Error('First name and last name are required; city must be text');
  }
  const player = await withRosterLocks([teamId], async () => {
    if (teamId && !(await Team.findById(teamId))?.isActive) { res.status(400); throw new Error('Team must be active'); }
    return Player.create({ firstName: firstName.trim(), lastName: lastName.trim(), city: city.trim(), playerType: 'team', team: teamId, user: null });
  });
  res.status(201).json(player);
});

// @desc    Update a player
// @route   PUT /api/players/:id
// @access  Private/Admin
export const updatePlayer = asyncHandler(async (req, res) => {
  const { firstName, lastName, club, city, isActive } = req.body;

  const player = await Player.findById(req.params.id);
  if (player && req.user.role === 'judge' && player.playerType !== 'team') {
    res.status(403); throw new Error('Not authorized for club players');
  }

  if (!player) {
    res.status(404);
    throw new Error('Player not found');
  }

  // Snapshot original values for rollback
  const originalFirstName = player.firstName;
  const originalLastName = player.lastName;
  const originalClub = player.club;
  const originalCity = player.city;
  const originalIsActive = player.isActive;
  const originalNormFirst = player.normalizedFirstName;
  const originalNormLast = player.normalizedLastName;
  const originalNormClub = player.normalizedClub;

  if (firstName !== undefined) player.firstName = firstName.trim();
  if (lastName !== undefined) player.lastName = lastName.trim();
  if (club !== undefined) player.club = club ? club.trim() : null;
  if (city !== undefined) {
    if (typeof city !== 'string') { res.status(400); throw new Error('City must be text'); }
    player.city = city.trim();
  }
  if (isActive !== undefined) player.isActive = isActive;

  // Quarterly players must always have a non-empty club
  if (player.playerType === 'quarterly') {
    if (!player.club || !player.club.trim()) {
      res.status(400);
      throw new Error('Club is required for club players');
    }

    const newNormalizedFirstName = normalizeField(player.firstName);
    const newNormalizedLastName = normalizeField(player.lastName);
    const newNormalizedClub = normalizeField(player.club) || '';

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

  // For team players, sync linked User.name when firstName/lastName changed
  let linkedUser = null;
  if (player.playerType === 'team' && player.user) {
    const nameChanged =
      (firstName !== undefined && firstName.trim() !== originalFirstName) ||
      (lastName !== undefined && lastName.trim() !== originalLastName);

    if (nameChanged) {
      linkedUser = await User.findById(player.user);
      if (linkedUser) {
        linkedUser.name = `${player.firstName} ${player.lastName}`;
      }
    }
  }

  try {
    const updatedPlayer = await withRosterLocks([player.team], async () => {
      if (player.team && player.isActive && !(await Team.findById(player.team))?.isActive) { res.status(409); throw new Error('Cannot activate a player in an inactive team'); }
      const current = await Player.findById(player._id);
      if (String(current.team) !== String(player.team)) { res.status(409); throw new Error('Player team changed; reload before editing'); }
      return player.save();
    });

    // Save the linked User after the Player succeeds.
    // If User.save() fails, roll back the Player to its pre-edit state.
    // Standalone MongoDB has no transactions, so we use manual rollback.
    if (linkedUser) {
      try {
        await linkedUser.save();
      } catch (userError) {
        // Roll back Player to original values
        player.firstName = originalFirstName;
        player.lastName = originalLastName;
        player.club = originalClub;
        player.city = originalCity;
        player.isActive = originalIsActive;
        player.normalizedFirstName = originalNormFirst;
        player.normalizedLastName = originalNormLast;
        player.normalizedClub = originalNormClub;
        await player.save();

        res.status(500);
        throw new Error('Failed to sync linked user name');
      }
    }

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
