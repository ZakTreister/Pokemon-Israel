import asyncHandler from 'express-async-handler';
import Tournament from '../models/tournamentModel.js';
import User from '../models/userModel.js';
import { v4 as uuidv4 } from 'uuid';

// @desc    Get all tournaments
// @route   GET /api/tournaments
// @access  Public
export const getTournaments = asyncHandler(async (req, res) => {
  const tournaments = await Tournament.find({})
    .populate('participants.user', 'username')
    .sort({ date: 1 });
  res.json(tournaments);
});

// @desc    Get single tournament
// @route   GET /api/tournaments/:id
// @access  Public
export const getTournamentById = asyncHandler(async (req, res) => {
  const tournament = await Tournament.findById(req.params.id)
    .populate('participants.user', 'username')
    .populate('results.player', 'username')
    .populate({
      path: 'results.deck',
      select: 'archetype iconImage1 iconImage2 attackerImage1 attackerImage2 image'
    });

  if (tournament) {
    res.json(tournament);
  } else {
    res.status(404);
    throw new Error('Tournament not found');
  }
});

// @desc    Create a tournament (single or recurring)
// @route   POST /api/tournaments
// @access  Private/Admin
export const createTournament = asyncHandler(async (req, res) => {
  const { 
    date, 
    location, 
    isRecurring, 
    lastTournamentDate, 
    maxParticipants = 32 
  } = req.body;

  // Validate required fields
  if (!date || !location) {
    res.status(400);
    throw new Error('Date and location are required');
  }

  if (isRecurring && !lastTournamentDate) {
    res.status(400);
    throw new Error('Last tournament date is required for recurring tournaments');
  }

  const tournamentDate = new Date(date);
  const registrationDeadline = new Date(tournamentDate); // Deadline = tournament start time

  // Base tournament data
  const baseTournamentData = {
    title: `טורניר פוקימון - ${location}`,
    description: `טורניר פוקימון ב${location}`,
    location,
    maxParticipants,
    registrationDeadline,
    image: 'https://images.pexels.com/photos/163064/play-stone-network-networked-interactive-163064.jpeg',
    isRecurring,
  };

  const createdTournaments = [];

  if (isRecurring) {
    // Generate a unique series ID for all tournaments in this recurring series
    const seriesId = uuidv4();
    const lastDate = new Date(lastTournamentDate);
    let currentDate = new Date(tournamentDate);
    let weekNumber = 1;

    // Create tournaments for each week until the last tournament date
    while (currentDate <= lastDate) {
      const weeklyTournament = new Tournament({
        ...baseTournamentData,
        title: `טורניר פוקימון שבועי - ${location} (שבוע ${weekNumber})`,
        description: `טורניר פוקימון שבועי ב${location} - שבוע ${weekNumber}`,
        date: new Date(currentDate),
        registrationDeadline: new Date(currentDate), // Registration closes when tournament starts
        seriesId,
      });

      const savedTournament = await weeklyTournament.save();
      createdTournaments.push(savedTournament);

      // Move to next week
      currentDate.setDate(currentDate.getDate() + 7);
      weekNumber++;
    }

    res.status(201).json({
      message: `Created ${createdTournaments.length} recurring tournaments`,
      tournaments: createdTournaments,
      seriesId,
    });
  } else {
    // Create single tournament
    const tournament = new Tournament({
      ...baseTournamentData,
      date: tournamentDate,
    });

    const createdTournament = await tournament.save();
    createdTournaments.push(createdTournament);

    res.status(201).json(createdTournament);
  }
});

// @desc    Update a tournament
// @route   PUT /api/tournaments/:id
// @access  Private/Admin
export const updateTournament = asyncHandler(async (req, res) => {
  const tournament = await Tournament.findById(req.params.id);

  if (tournament) {
    // Check if tournament is in the past
    const now = new Date();
    const tournamentDate = new Date(tournament.date);
    
    if (tournamentDate < now) {
      res.status(400);
      throw new Error('Cannot edit past tournaments');
    }

    tournament.title = req.body.title || tournament.title;
    tournament.description = req.body.description || tournament.description;
    tournament.date = req.body.date || tournament.date;
    tournament.location = req.body.location || tournament.location;
    tournament.maxParticipants = req.body.maxParticipants || tournament.maxParticipants;
    tournament.registrationDeadline = req.body.registrationDeadline || tournament.registrationDeadline;
    tournament.image = req.body.image || tournament.image;
    tournament.status = req.body.status || tournament.status;

    const updatedTournament = await tournament.save();
    res.json(updatedTournament);
  } else {
    res.status(404);
    throw new Error('Tournament not found');
  }
});

// @desc    Delete a tournament or entire series
// @route   DELETE /api/tournaments/:id
// @access  Private/Admin
export const deleteTournament = asyncHandler(async (req, res) => {
  const { deleteSeries } = req.query; // Optional query parameter
  const tournament = await Tournament.findById(req.params.id);

  if (!tournament) {
    res.status(404);
    throw new Error('Tournament not found');
  }

  if (deleteSeries === 'true' && tournament.seriesId) {
    // Delete only future tournaments in the series
    const now = new Date();
    const deleteResult = await Tournament.deleteMany({ 
      seriesId: tournament.seriesId,
      date: { $gte: now } // Only delete future tournaments
    });
    res.json({ 
      message: `Deleted ${deleteResult.deletedCount} future tournaments from series`,
      deletedCount: deleteResult.deletedCount 
    });
  } else {
    // Check if tournament is in the past
    const now = new Date();
    const tournamentDate = new Date(tournament.date);
    
    if (tournamentDate < now) {
      res.status(400);
      throw new Error('Cannot delete past tournaments');
    }

    // Delete single tournament
    await tournament.deleteOne();
    res.json({ message: 'Tournament removed' });
  }
});

// @desc    Get tournaments by series
// @route   GET /api/tournaments/series/:seriesId
// @access  Public
export const getTournamentsBySeries = asyncHandler(async (req, res) => {
  const tournaments = await Tournament.find({ seriesId: req.params.seriesId })
    .populate('participants.user', 'username')
    .sort({ date: 1 });
  
  res.json(tournaments);
});

// @desc    Register for tournament
// @route   POST /api/tournaments/:id/register
// @access  Private
export const registerForTournament = asyncHandler(async (req, res) => {
  const tournament = await Tournament.findById(req.params.id);

  if (!tournament) {
    res.status(404);
    throw new Error('Tournament not found');
  }

  if (tournament.status !== 'upcoming') {
    res.status(400);
    throw new Error('Tournament registration is closed');
  }

  if (tournament.currentParticipants >= tournament.maxParticipants) {
    res.status(400);
    throw new Error('Tournament is full');
  }

  const alreadyRegistered = tournament.participants.find(
    (p) => p.user.toString() === req.user._id.toString()
  );

  if (alreadyRegistered) {
    res.status(400);
    throw new Error('Already registered for this tournament');
  }

  // Check for other tournaments in the same week
  const tournamentDate = new Date(tournament.date);
  const weekStart = new Date(tournamentDate);
  weekStart.setDate(tournamentDate.getDate() - tournamentDate.getDay());
  weekStart.setHours(0, 0, 0, 0);
  
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const conflictingTournament = await Tournament.findOne({
    'participants.user': req.user._id,
    date: {
      $gte: weekStart,
      $lte: weekEnd
    },
    _id: { $ne: tournament._id }
  });

  if (conflictingTournament) {
    res.status(400);
    throw new Error('You are already registered for another tournament this week');
  }

  tournament.participants.push({
    user: req.user._id,
    registeredAt: Date.now(),
  });
  tournament.currentParticipants = tournament.participants.length;

  const updatedTournament = await tournament.save();
  
  // Populate the participants for the response
  await updatedTournament.populate('participants.user', 'username');
  
  res.json(updatedTournament);
});

// @desc    Unregister from tournament
// @route   DELETE /api/tournaments/:id/register
// @access  Private
export const unregisterFromTournament = asyncHandler(async (req, res) => {
  const tournament = await Tournament.findById(req.params.id);

  if (!tournament) {
    res.status(404);
    throw new Error('Tournament not found');
  }

  if (tournament.status !== 'upcoming') {
    res.status(400);
    throw new Error('Cannot unregister from this tournament');
  }

  const participantIndex = tournament.participants.findIndex(
    (p) => p.user.toString() === req.user._id.toString()
  );

  if (participantIndex === -1) {
    res.status(400);
    throw new Error('You are not registered for this tournament');
  }

  // Remove the participant
  tournament.participants.splice(participantIndex, 1);
  tournament.currentParticipants = tournament.participants.length;

  const updatedTournament = await tournament.save();
  
  // Populate the participants for the response
  await updatedTournament.populate('participants.user', 'username');
  
  res.json(updatedTournament);
});

// @desc    Add participant to tournament (Admin only)
// @route   POST /api/tournaments/:id/participants
// @access  Private/Admin
export const addParticipant = asyncHandler(async (req, res) => {
  const tournament = await Tournament.findById(req.params.id);
  const { userId } = req.body;

  if (!tournament) {
    res.status(404);
    throw new Error('Tournament not found');
  }

  if (!userId) {
    res.status(400);
    throw new Error('User ID is required');
  }

  if (tournament.currentParticipants >= tournament.maxParticipants) {
    res.status(400);
    throw new Error('Tournament is full');
  }

  const alreadyRegistered = tournament.participants.find(
    (p) => p.user.toString() === userId
  );

  if (alreadyRegistered) {
    res.status(400);
    throw new Error('User is already registered for this tournament');
  }

  // Check for other tournaments in the same week for this user
  const tournamentDate = new Date(tournament.date);
  const weekStart = new Date(tournamentDate);
  weekStart.setDate(tournamentDate.getDate() - tournamentDate.getDay());
  weekStart.setHours(0, 0, 0, 0);
  
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  const conflictingTournament = await Tournament.findOne({
    'participants.user': userId,
    date: {
      $gte: weekStart,
      $lte: weekEnd
    },
    _id: { $ne: tournament._id }
  });

  if (conflictingTournament) {
    res.status(400);
    throw new Error('User is already registered for another tournament this week');
  }

  tournament.participants.push({
    user: userId,
    registeredAt: Date.now(),
  });
  tournament.currentParticipants = tournament.participants.length;

  const updatedTournament = await tournament.save();
  
  // Populate the participants for the response
  await updatedTournament.populate('participants.user', 'username');
  
  res.json(updatedTournament);
});

// @desc    Remove participant from tournament (Admin only)
// @route   DELETE /api/tournaments/:id/participants/:participantId
// @access  Private/Admin
export const removeParticipant = asyncHandler(async (req, res) => {
  const tournament = await Tournament.findById(req.params.id);

  if (!tournament) {
    res.status(404);
    throw new Error('Tournament not found');
  }

  const participantIndex = tournament.participants.findIndex(
    (p) => p.user.toString() === req.params.participantId
  );

  if (participantIndex === -1) {
    res.status(404);
    throw new Error('Participant not found in this tournament');
  }

  // Remove the participant
  tournament.participants.splice(participantIndex, 1);
  tournament.currentParticipants = tournament.participants.length;

  const updatedTournament = await tournament.save();
  
  // Populate the participants for the response
  await updatedTournament.populate('participants.user', 'username');
  
  res.json(updatedTournament);
});

// @desc    Submit tournament results
// @route   POST /api/tournaments/:id/results
// @access  Private/Admin
export const submitTournamentResults = asyncHandler(async (req, res) => {
  const tournament = await Tournament.findById(req.params.id);

  if (!tournament) {
    res.status(404);
    throw new Error('Tournament not found');
  }

  // Validate that all players in results were tournament participants
  const participantIds = tournament.participants.map(p => p.user.toString());
  const resultsPlayerIds = req.body.results.map(r => r.player);
  
  const invalidPlayers = resultsPlayerIds.filter(id => !participantIds.includes(id));
  if (invalidPlayers.length > 0) {
    res.status(400);
    throw new Error('Results contain players who did not participate in the tournament');
  }

  // Validate that playerName is provided for each result
  const resultsWithoutNames = req.body.results.filter(r => !r.playerName);
  if (resultsWithoutNames.length > 0) {
    res.status(400);
    throw new Error('Player name is required for all results');
  }

  // Update tournament with results and mark as completed
  // Map the results to include both tournament points and raw points
  tournament.results = req.body.results.map(result => ({
    player: result.player,
    playerName: result.playerName,
    position: result.position,
    points: result.points, // Tournament ranking points (4, 3, 2, 1)
    rawPoints: result.rawPoints, // Raw points from games (for calculating wins/draws/losses)
    omp: result.omp || 0,
    gwp: result.gwp || 0,
    ogp: result.ogp || 0,
    deck: result.deck || null
  }));
  
  tournament.status = 'completed';

  const updatedTournament = await tournament.save();
  
  res.json(updatedTournament);
});

// @desc    Get tournament results
// @route   GET /api/tournaments/:id/results
// @access  Public
export const getTournamentResults = asyncHandler(async (req, res) => {
  const tournament = await Tournament.findById(req.params.id)
    .populate('results.player', 'username')
    .populate({
      path: 'results.deck',
      select: 'archetype iconImage1 iconImage2 attackerImage1 attackerImage2 image'
    })
    .select('results');

  if (!tournament) {
    res.status(404);
    throw new Error('Tournament not found');
  }

  res.json(tournament.results);
});