import asyncHandler from 'express-async-handler';
import Tournament from '../models/tournamentModel.js';

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
    .populate('results.deck', 'archetype');

  if (tournament) {
    res.json(tournament);
  } else {
    res.status(404);
    throw new Error('Tournament not found');
  }
});

// @desc    Create a tournament
// @route   POST /api/tournaments
// @access  Private/Admin
export const createTournament = asyncHandler(async (req, res) => {
  const tournament = new Tournament({
    title: req.body.title,
    description: req.body.description,
    date: req.body.date,
    location: req.body.location,
    maxParticipants: req.body.maxParticipants,
    registrationDeadline: req.body.registrationDeadline,
    image: req.body.image,
  });

  const createdTournament = await tournament.save();
  res.status(201).json(createdTournament);
});

// @desc    Update a tournament
// @route   PUT /api/tournaments/:id
// @access  Private/Admin
export const updateTournament = asyncHandler(async (req, res) => {
  const tournament = await Tournament.findById(req.params.id);

  if (tournament) {
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

// @desc    Delete a tournament
// @route   DELETE /api/tournaments/:id
// @access  Private/Admin
export const deleteTournament = asyncHandler(async (req, res) => {
  const tournament = await Tournament.findById(req.params.id);

  if (tournament) {
    await tournament.deleteOne();
    res.json({ message: 'Tournament removed' });
  } else {
    res.status(404);
    throw new Error('Tournament not found');
  }
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

  // Update tournament with results and mark as completed
  tournament.results = req.body.results;
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
    .populate('results.deck', 'archetype')
    .select('results');

  if (!tournament) {
    res.status(404);
    throw new Error('Tournament not found');
  }

  res.json(tournament.results);
});