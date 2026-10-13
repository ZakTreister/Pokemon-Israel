import { resolveUpload, finishAttachment } from '../services/mediaUpload.js';
import { profileFields } from '../services/playerProfile.js';
import { playerNumber as normalizePlayerNumber } from '../services/playerNumber.js';
import asyncHandler from 'express-async-handler';
import Player from '../models/playerModel.js';
import Team from '../models/teamModel.js';
import { withRosterLocks } from '../services/rosterLock.js';
import User from '../models/userModel.js';
import { paginate, escapeSearch } from '../services/pagination.js';
import { warnDuplicate, likelyPlayers } from '../services/playerDuplicates.js';
import { fail } from '../utils/httpError.js';

// @desc    Get players (with optional type filter and search)
// @route   GET /api/players
// @access  Private/Admin
export const getPlayers = asyncHandler(async (req, res) => {
  const { type, search } = req.query;

  const query = req.user.role === 'judge' ? { playerType: 'team' } : {};
  if (
    req.user.role !== 'judge' &&
    type &&
    (type === 'team' || type === 'quarterly')
  ) {
    query.playerType = type;
  }

  if (req.query.teamId) query.team = req.query.teamId;
  if (req.query.active === 'true') query.isActive = true;
  if (search?.trim()) {
    const regex = new RegExp(escapeSearch(search.trim()), 'i');
    query.$or = ['firstName', 'lastName', 'city'].map((key) => ({
      [key]: regex,
    }));
  }
  res.json(
    await paginate(Player, query, req.query, (q) =>
      q
        .select(req.user.role === 'judge' ? '-dateOfBirth' : '')
        .populate('user', 'username name role')
        .sort({ firstName: 1, lastName: 1, _id: 1 }),
    ),
  );
});

// @desc    Get a single player
// @route   GET /api/players/:id
// @access  Private/Admin
export const getPlayer = asyncHandler(async (req, res) => {
  const player = await Player.findById(req.params.id)
    .select(req.user.role === 'judge' ? '-dateOfBirth' : '')
    .populate('user', 'username name role');

  if (player && req.user.role === 'judge' && player.playerType !== 'team') {
    res.status(403);
    throw new Error('Not authorized for club players');
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
  const { firstName, lastName, city } = req.body;
  if (
    ![firstName, lastName, city].every(
      (value) => typeof value === 'string' && value.trim(),
    )
  )
    fail(400, 'שם פרטי, שם משפחה ועיר הם שדות חובה');
  if (req.body.photoUploadId !== undefined)
    fail(400, 'תמונת שחקן זמינה לנבחרות בלבד');
  if (await warnDuplicate(req, res, 'quarterly')) return;
  res.status(201).json(
    await Player.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      city: city.trim(),
      playerType: 'quarterly',
      user: null,
      isActive: true,
    }),
  );
});

// Team children have no login. Existing User-linked records remain supported.
export const createTeamPlayer = asyncHandler(async (req, res) => {
  const {
    firstName,
    lastName,
    city = '',
    playerNumber,
    teamId = req.body.team || null,
  } = req.body;
  if (
    typeof firstName !== 'string' ||
    !firstName.trim() ||
    typeof lastName !== 'string' ||
    !lastName.trim() ||
    typeof city !== 'string'
  ) {
    res.status(400);
    throw new Error('First name and last name are required; city must be text');
  }
  if (await warnDuplicate(req, res, 'team')) return;
  req.body.playerType = 'team';
  const attachment = await resolveUpload(req, 'player-photo');
  const deck = await resolveUpload(req, 'player-deck', attachment?.id);
  const profile = profileFields(req.body);
  const number = normalizePlayerNumber(playerNumber, true);
  if (typeof teamId !== 'string' || !/^[a-f\d]{24}$/i.test(teamId)) {
    res.status(400);
    throw new Error('יש לבחור נבחרת פעילה');
  }
  const player = await withRosterLocks([teamId], async () => {
    if (teamId && !(await Team.findById(teamId))?.isActive) {
      res.status(400);
      throw new Error('Team must be active');
    }
    return Player.create({
      ...profile,
      ...(attachment?.id || deck?.id ? { _id: attachment?.id || deck.id } : {}),
      deckMedia: deck?.media || null,
      photoMedia: attachment?.media || null,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      city: city.trim(),
      playerNumber: number,
      playerType: 'team',
      team: teamId,
      user: null,
    });
  });
  await finishAttachment(req, attachment);
  await finishAttachment(req, deck);
  res.status(201).json(player);
});

// @desc    Update a player
// @route   PUT /api/players/:id
// @access  Private/Admin
export const updatePlayer = asyncHandler(async (req, res) => {
  const { firstName, lastName, city, isActive, playerNumber } = req.body;

  const player = await Player.findById(req.params.id);
  if (player && req.user.role === 'judge' && player.playerType !== 'team') {
    res.status(403);
    throw new Error('Not authorized for club players');
  }

  if (!player) {
    res.status(404);
    throw new Error('Player not found');
  }

  const previousMedia = player.photoMedia;
  const previousProfile = {
    description: player.description,
    dateOfBirth: player.dateOfBirth,
    joinedAt: player.joinedAt,
    pokemon: player.pokemon,
    deckMedia: player.deckMedia,
  };
  if (
    player.playerType !== 'team' &&
    (req.body.photoUploadId !== undefined ||
      req.body.deckUploadId !== undefined)
  )
    fail(400, 'תמונת שחקן זמינה לנבחרות בלבד');
  const deck =
    player.playerType === 'team'
      ? await resolveUpload(req, 'player-deck', player._id, player.deckMedia)
      : null;
  if (deck) player.deckMedia = deck.media;
  const attachment = await resolveUpload(
    req,
    'player-photo',
    player._id,
    previousMedia,
  );
  if (attachment) player.photoMedia = attachment.media;
  if (player.playerType === 'team')
    Object.assign(player, profileFields(req.body));

  // Snapshot original values for rollback
  const originalFirstName = player.firstName;
  const originalLastName = player.lastName;
  const originalCity = player.city;
  const originalNumber = player.playerNumber;
  const originalIsActive = player.isActive;
  const originalNormFirst = player.normalizedFirstName;
  const originalNormLast = player.normalizedLastName;

  if (firstName !== undefined) player.firstName = firstName.trim();
  if (lastName !== undefined) player.lastName = lastName.trim();
  if (city !== undefined) {
    if (typeof city !== 'string') {
      res.status(400);
      throw new Error('City must be text');
    }
    player.city = city.trim();
  }
  if (player.playerType === 'team' && playerNumber !== undefined)
    player.playerNumber = normalizePlayerNumber(playerNumber);
  if (isActive !== undefined) player.isActive = isActive;

  if (player.playerType === 'quarterly' && !player.city?.trim())
    fail(400, 'עיר היא שדה חובה');
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
      if (
        player.team &&
        player.isActive &&
        !(await Team.findById(player.team))?.isActive
      ) {
        res.status(409);
        throw new Error('Cannot activate a player in an inactive team');
      }
      const current = await Player.findById(player._id);
      if (!current) fail(409, 'השחקן הועבר לארכיון. יש לרענן');
      if (String(current.team) !== String(player.team)) {
        res.status(409);
        throw new Error('Player team changed; reload before editing');
      }
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
        player.photoMedia = previousMedia;
        Object.assign(player, previousProfile);
        player.firstName = originalFirstName;
        player.lastName = originalLastName;
        player.city = originalCity;
        player.playerNumber = originalNumber;
        player.isActive = originalIsActive;
        player.normalizedFirstName = originalNormFirst;
        player.normalizedLastName = originalNormLast;
        await player.save();

        res.status(500);
        throw new Error('Failed to sync linked user name');
      }
    }

    await updatedPlayer.populate('user', 'username name role');
    await finishAttachment(req, attachment, previousMedia);
    await finishAttachment(req, deck, previousProfile.deckMedia);
    res.json(updatedPlayer);
  } catch (error) {
    if (error.code === 11000) {
      res.status(409);
      throw new Error('לא ניתן לשמור את השחקן. בדקו את הפרטים ונסו שוב');
    }
    throw error;
  }
});

export const getDuplicatePlayers = asyncHandler(async (req, res) => {
  if (!['team', 'quarterly'].includes(req.query.type))
    fail(400, 'סוג שחקן לא תקין');
  res.json(await likelyPlayers(req.query, req.query.type));
});
export const deletePlayer = asyncHandler(async (req, res) => {
  const player = await Player.findById(req.params.id);
  if (!player) fail(404, 'שחקן לא נמצא');
  await withRosterLocks([player.team], async () => {
    await Player.updateOne(
      { _id: player._id, deletedAt: null },
      {
        $set: {
          deletedAt: new Date(),
          deletedBy: req.user._id,
          isActive: false,
        },
      },
    );
  });
  res.json({ id: player.id, message: 'השחקן הועבר לארכיון; ההיסטוריה נשמרה' });
});
