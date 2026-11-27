import { paginate, tournamentQuery } from '../services/pagination.js';
import { publicTournament } from '../services/publicTournament.js';
import asyncHandler from 'express-async-handler';
import Event from '../models/eventModel.js';
import { publicMediaUrl } from '../services/storage/mediaMetadata.js';
import Tournament from '../models/tournamentModel.js';
import User from '../models/userModel.js';
import Player from '../models/playerModel.js';
import { clubDateKey, clubRegistrationOpen, isClubTournament } from '../../shared/tournamentDomain.js';
import { v4 as uuidv4 } from 'uuid';


// A regular/club event is a calendar day. Store it at UTC noon so Israel
// renders the intended day even around DST transitions; no event time is implied.
function calendarInput(value) {
  if (typeof value !== 'string') {
    const error = new Error('יש לבחור תאריך תקין');
    error.statusCode = 400;
    throw error;
  }
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? value
    : (Number.isFinite(new Date(value).getTime()) ? clubDateKey(value) : '');
  const date = new Date(normalized + 'T12:00:00.000Z');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized) ||
      Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== normalized) {
    const error = new Error('יש לבחור תאריך תקין');
    error.statusCode = 400;
    throw error;
  }
  return normalized;
}
const clubEventDay = day => new Date(day + 'T12:00:00.000Z');
const clubEndDay = day => new Date(day + 'T23:59:59.999Z');

// @desc    Get all tournaments
// @route   GET /api/tournaments
// @access  Public
const deckFields =
  'archetype iconImage1 iconImage2 attackerImage1 attackerImage2 image';
// Resolve current published event covers in one query, not once per tournament.
async function eventCoverMap(tournaments) {
  const ids = [...new Set(tournaments.filter(t=>t.eventId).map(t=>String(t.eventId)))];
  if(!ids.length)return new Map();
  const events=await Event.find({_id:{$in:ids},status:'published'}).select('coverMedia');
  return new Map(events.map(e=>[String(e._id),publicMediaUrl(e.coverMedia)]));
}
const coverFor=(t,covers)=>covers.get(String(t.eventId))||'';
export const getTournaments = asyncHandler(async (req, res) => {
  const result = await paginate(
    Tournament,
    tournamentQuery(req.query),
    req.query,
    (q) =>
      q
        .populate('results.deck', deckFields)
        .sort({ date: req.query.order === 'asc' ? 1 : -1, _id: 1 }),
  );
  const covers=await eventCoverMap(result.items);
  res.json({ ...result, items: result.items.map(t=>publicTournament(t,false,coverFor(t,covers))) });
});
// A date-based active status is not proof of a running public competition.
// Expose only the minimal data required by the live homepage cards.
export const getLiveClubTournaments = asyncHandler(async (_req,res)=>{
  const rows=await Tournament.find({type:'quarterly',engineVersion:'swiss-v1',phase:'running',status:'upcoming'})
    .select('title location date').sort({date:1,_id:1}).lean();
  res.set('Cache-Control','no-store').json(rows.map(row=>({id:String(row._id),title:row.title,location:row.location,date:row.date})));
});
export const getTournamentById = asyncHandler(async (req, res) => {
  if (!/^[a-f\d]{24}$/i.test(req.params.id)) {
    res.status(404);
    throw new Error('Tournament not found');
  }
  const tournament = await Tournament.findById(req.params.id).populate(
    'results.deck',
    deckFields,
  );
  // Public live tournament pages are exclusive to club events. Inter-team
  // meetings are staff-only, and active internal-team rounds are not public.
  if (!tournament ||
      (tournament.type === 'inter_team' && ['setup', 'running'].includes(tournament.phase)) ||
      (tournament.type === 'team_internal' && tournament.phase === 'running')) {
    res.status(404);
    throw new Error('Tournament not found');
  }
  const covers=await eventCoverMap([tournament]);
  res.json(publicTournament(tournament,true,coverFor(tournament,covers)));
});
// The existing legacy staff editor retains its full authenticated DTO.
export const getLegacyManagedTournaments = asyncHandler(async (req, res) => {
  res.json(
    await Tournament.find({ engineVersion: { $ne: 'swiss-v1' } })
      .populate('participants.user', 'username')
      .populate('results.deck', deckFields)
      .sort({ date: 1 }),
  );
});
export const getLegacyManagedTournament = asyncHandler(async (req, res) => {
  const t = await Tournament.findOne({
    _id: req.params.id,
    $or: [
      { engineVersion: { $ne: 'swiss-v1' } },
      { type: 'quarterly' },
    ],
  })
    .populate('participants.user', 'username')
    // Result IDs can be either legacy Users or canonical Players; keep IDs unpopulated.
    .populate('results.deck', deckFields);
  if (!t) {
    res.status(404);
    throw new Error('Tournament not found');
  }
  res.json(t);
});

// @desc    Create a tournament (single or recurring)
// @route   POST /api/tournaments
// @access  Private/Admin
export const createTournament = asyncHandler(async (req, res) => {
  const { date, location, isRecurring = false, lastTournamentDate } = req.body;
  if (typeof location !== 'string' || !location.trim() || !date) {
    res.status(400);
    throw new Error('תאריך ומיקום הם שדות חובה');
  }
  const type = req.body.type || 'quarterly';
  if (!['quarterly', 'inter_team'].includes(type)) {
    res.status(400);
    throw new Error('סוג טורניר לא חוקי; טורניר נבחרת פותחים מעמוד הנבחרת');
  }
  const club = type === 'quarterly';
  const firstDay = club ? calendarInput(date) : null;
  const tournamentDate = club ? clubEventDay(firstDay) : new Date(date);
  if (Number.isNaN(tournamentDate.getTime())) {
    res.status(400);
    throw new Error('תאריך לא תקין');
  }
  if (isRecurring && !lastTournamentDate) {
    res.status(400);
    throw new Error('יש לבחור תאריך אחרון לטורניר שבועי');
  }
  const lastDay = isRecurring && club ? calendarInput(lastTournamentDate) : null;
  const lastDate = isRecurring ? (club ? clubEventDay(lastDay) : new Date(lastTournamentDate)) : null;
  if (isRecurring && (Number.isNaN(lastDate.getTime()) || lastDate < tournamentDate)) {
    res.status(400);
    throw new Error('התאריך האחרון חייב להיות בתאריך הטורניר הראשון או אחריו');
  }
  const eventId = req.body.eventId;
  if (eventId != null) {
    if (!club || isRecurring || typeof eventId !== 'string' || !/^[a-f\d]{24}$/i.test(eventId) || !(await Event.exists({_id:eventId,category:'club'}))) {
      res.status(400);
      throw new Error('יש לבחור אירוע חוגים תקין לטורניר יחיד');
    }
    if (firstDay < clubDateKey(new Date())) {
      res.status(400);
      throw new Error('יש לבחור תאריך עתידי');
    }
  }
  const baseTournamentData = {
    ...(eventId != null ? {eventId} : {}),
    title: `טורניר פוקימון - ${location.trim()}`,
    description: `טורניר פוקימון ב${location.trim()}`,
    location: location.trim(),
    type,
    // A club event has no participant limit. Preserve legacy caps for other event types.
    maxParticipants: club ? null : (req.body.maxParticipants ?? 32),
    registrationDeadline: club ? clubEndDay(firstDay) : new Date(tournamentDate),
    image: req.body.image || 'https://images.pexels.com/photos/163064/play-stone-network-networked-interactive-163064.jpeg',
    isRecurring: Boolean(isRecurring),
  };
  if (isRecurring) {
    const seriesId = uuidv4();
    const createdTournaments = [];
    let currentDate = new Date(tournamentDate);
    let weekNumber = 1;
    while (currentDate <= lastDate) {
      const day = currentDate.toISOString().slice(0, 10);
      const saved = await Tournament.create({
        ...baseTournamentData,
        title: `טורניר פוקימון שבועי - ${location.trim()} (שבוע ${weekNumber})`,
        description: `טורניר פוקימון שבועי ב${location.trim()} - שבוע ${weekNumber}`,
        date: new Date(currentDate),
        registrationDeadline: club ? clubEndDay(day) : new Date(currentDate),
        seriesId,
      });
      createdTournaments.push(saved);
      currentDate.setUTCDate(currentDate.getUTCDate() + 7);
      weekNumber++;
    }
    return res.status(201).json({
      message: `Created ${createdTournaments.length} recurring tournaments`,
      tournaments: createdTournaments,
      seriesId,
    });
  }
  return res.status(201).json(await Tournament.create({
    ...baseTournamentData,
    date: tournamentDate,
  }));
});

// @desc    Update a tournament
// @route   PUT /api/tournaments/:id
// @access  Private/Admin
export const updateTournament = asyncHandler(async (req, res) => {
  const tournament = await Tournament.findOne({
    _id: req.params.id,
    $or: [
      { engineVersion: { $ne: 'swiss-v1' } },
      { type: 'quarterly' },
    ],
  });
  if (!tournament) {
    res.status(404);
    throw new Error('Tournament not found');
  }
  const club = isClubTournament(tournament);
  if (req.body.date !== undefined) {
    if (club) {
      const day = calendarInput(req.body.date);
      tournament.date = clubEventDay(day);
      tournament.registrationDeadline = clubEndDay(day);
    } else {
      const value = new Date(req.body.date);
      if (Number.isNaN(value.getTime())) {
        res.status(400);
        throw new Error('תאריך לא תקין');
      }
      tournament.date = value;
    }
  }
  for (const key of ['title', 'description', 'location']) {
    if (req.body[key] === undefined) continue;
    if (typeof req.body[key] !== 'string' || !req.body[key].trim()) {
      res.status(400);
      throw new Error('יש להזין פרטים תקינים');
    }
    tournament[key] = req.body[key].trim();
  }
  if (req.body.image !== undefined) {
    if (typeof req.body.image !== 'string') {
      res.status(400);
      throw new Error('קישור תמונה לא תקין');
    }
    if (req.body.image.trim()) tournament.image = req.body.image.trim();
  }
  // Existing team/encounter behavior remains unchanged. Club events are unlimited.
  if (club) tournament.maxParticipants = null;
  else if (req.body.maxParticipants !== undefined)
    tournament.maxParticipants = req.body.maxParticipants;
  if (req.body.status !== undefined) tournament.status = req.body.status;
  const saved = await tournament.save();
  res.json(saved);
});

// @desc    Get tournaments by series
// @route   GET /api/tournaments/series/:seriesId
// @access  Public
export const getTournamentsBySeries = asyncHandler(async (req, res) => {
  const tournaments = await Tournament.find({ seriesId: req.params.seriesId, engineVersion: { $ne: 'swiss-v1' } })
    .populate('results.deck', 'archetype image iconImage1 iconImage2 attackerImage1 attackerImage2')
    .sort({ date: 1 });
  const covers=await eventCoverMap(tournaments);
  res.json(tournaments.map(t=>publicTournament(t,false,coverFor(t,covers))));
});


// A team/All-Stars Player is not eligible for regular club tournaments.
async function preventTeamPlayerClubRegistration(userId, linkedId, tournament, res) {
  if (!isClubTournament(tournament)) return;
  const player = linkedId
    ? await Player.findById(linkedId)
    : await Player.findOne({ user: userId });
  if (player?.playerType === 'team') {
    res.status(409);
    throw new Error('שחקן נבחרת אינו יכול להירשם לטורניר חוגים');
  }
}

// @desc    Register for tournament
// @route   POST /api/tournaments/:id/register
// @access  Private
export const registerForTournament = asyncHandler(async (req, res) => {
  const tournament = await Tournament.findOne({ _id: req.params.id, engineVersion: { $ne: 'swiss-v1' } });

  if (!tournament) {
    res.status(404);
    throw new Error('Tournament not found');
  }

  if (isClubTournament(tournament) && req.user.role !== 'player') {
    res.status(403);
    throw new Error('שופטים ומנהלים אינם משתתפים בטורנירי חוגים');
  }
  if (tournament.status !== 'upcoming' ||
      (isClubTournament(tournament) && !clubRegistrationOpen(tournament))) {
    res.status(400);
    throw new Error('Tournament registration is closed');
  }

  if (!isClubTournament(tournament) && tournament.currentParticipants >= tournament.maxParticipants) {
    res.status(400);
    throw new Error('Tournament is full');
  }

  await preventTeamPlayerClubRegistration(req.user._id, req.user.player, tournament, res);

  // A linked Player already enrolled via club QR cannot be enrolled again as a User.
  if (req.user.player && tournament.clubRegistrations.some(
    (entry) => String(entry.player) === String(req.user.player)
  )) {
    res.status(409);
    throw new Error('Already registered for this tournament');
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
  tournament.currentParticipants = tournament.participants.length + tournament.clubRegistrations.length;

  const updatedTournament = await tournament.save();
  
  // Populate the participants for the response
  await updatedTournament.populate('participants.user', 'username');
  
  res.json(updatedTournament);
});

// @desc    Unregister from tournament
// @route   DELETE /api/tournaments/:id/register
// @access  Private
export const unregisterFromTournament = asyncHandler(async (req, res) => {
  const tournament = await Tournament.findOne({ _id: req.params.id, engineVersion: { $ne: 'swiss-v1' } });

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
  tournament.currentParticipants = tournament.participants.length + tournament.clubRegistrations.length;

  const updatedTournament = await tournament.save();
  
  // Populate the participants for the response
  await updatedTournament.populate('participants.user', 'username');
  
  res.json(updatedTournament);
});

// @desc    Add participant to tournament (Admin only)
// @route   POST /api/tournaments/:id/participants
// @access  Private/Admin
export const addParticipant = asyncHandler(async (req, res) => {
  const tournament = await Tournament.findOne({ _id: req.params.id, engineVersion: { $ne: 'swiss-v1' } });
  const { userId } = req.body;

  if (!tournament) {
    res.status(404);
    throw new Error('Tournament not found');
  }

  if (isClubTournament(tournament)) {
    res.status(400);
    throw new Error('הוספת משתתפים לטורניר חוגים מתבצעת מתוך רשימת שחקני החוגים');
  }
  if (!userId) {
    res.status(400);
    throw new Error('User ID is required');
  }
  const registrant = await User.findById(userId).select('player');
  await preventTeamPlayerClubRegistration(userId, registrant?.player, tournament, res);
  if (registrant?.player && tournament.clubRegistrations.some(
    (entry) => String(entry.player) === String(registrant.player)
  )) {
    res.status(409);
    throw new Error('Already registered for this tournament');
  }

  if (!isClubTournament(tournament) && tournament.currentParticipants >= tournament.maxParticipants) {
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
  tournament.currentParticipants = tournament.participants.length + tournament.clubRegistrations.length;

  const updatedTournament = await tournament.save();
  
  // Populate the participants for the response
  await updatedTournament.populate('participants.user', 'username');
  
  res.json(updatedTournament);
});

// @desc    Remove participant from tournament (Admin only)
// @route   DELETE /api/tournaments/:id/participants/:participantId
// @access  Private/Admin
export const removeParticipant = asyncHandler(async (req, res) => {
  const tournament = await Tournament.findOne({ _id: req.params.id, engineVersion: { $ne: 'swiss-v1' } });

  if (!tournament) {
    res.status(404);
    throw new Error('Tournament not found');
  }
  if (isClubTournament(tournament)) {
    res.status(400);
    throw new Error('הסרת משתתפי חוגים מתבצעת מתוך רשימת השחקנים המאוחדת');
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
  tournament.currentParticipants = tournament.participants.length + tournament.clubRegistrations.length;

  const updatedTournament = await tournament.save();
  
  // Populate the participants for the response
  await updatedTournament.populate('participants.user', 'username');
  
  res.json(updatedTournament);
});

// @desc    Submit tournament results
// @route   POST /api/tournaments/:id/results
// @access  Private/Admin
export const submitTournamentResults = asyncHandler(async (req, res) => {
  const tournament = await Tournament.findOne({ _id: req.params.id, engineVersion: { $ne: 'swiss-v1' } });

  if (!tournament) {
    res.status(404);
    throw new Error('Tournament not found');
  }

  // Club QR entrants use canonical Player IDs, while legacy registrations use User IDs.
  if (!Array.isArray(req.body.results)) {
    res.status(400);
    throw new Error('Results must be a list');
  }
  const legacyIds = new Set(tournament.participants.map(p => String(p.user)));
  const clubIds = new Set(tournament.clubRegistrations.map(p => String(p.player)));
  const invalidPlayers = req.body.results.filter(row => {
    if (!row || typeof row.player !== 'string') return true;
    return row.playerModel === 'Player'
      ? !clubIds.has(row.player)
      : row.playerModel === undefined || row.playerModel === 'User'
        ? !legacyIds.has(row.player)
        : true;
  });
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
    playerModel: result.playerModel === 'Player' ? 'Player' : 'User',
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
  if (!/^[a-f\d]{24}$/i.test(req.params.id)) { res.status(404); throw new Error('Tournament not found'); }
  const t = await Tournament.findById(req.params.id).populate('results.deck', deckFields);
  if (!t) { res.status(404); throw new Error('Tournament not found'); }
  res.json(publicTournament(t,true).standings);
});

export const getOwnRegistration = asyncHandler(async (req, res) => {
  if (!/^[a-f\d]{24}$/i.test(req.params.id)) { res.status(404); throw new Error('טורניר לא נמצא'); }
  const tournament = await Tournament.findById(req.params.id).select('participants clubRegistrations');
  if (!tournament) { res.status(404); throw new Error('טורניר לא נמצא'); }
  res.json({ registered: tournament.participants.some(p => String(p.user) === String(req.user._id)) ||
    (!!req.user.player && tournament.clubRegistrations.some(p => String(p.player) === String(req.user.player))) });
});

export const getTournamentSummary = asyncHandler(async (req, res) => {
  const query = tournamentQuery(req.query);
  const [totals] = await Tournament.aggregate([
    { $match: { ...query, deletedAt: null } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        participants: { $sum: '$currentParticipants' },
        capacity: { $sum: '$maxParticipants' },
      },
    },
  ]);
  const upcomingQuery = {
    $and: [query, tournamentQuery({ status: 'upcoming' })],
  };
  const [upcoming, nearest] = await Promise.all([
    Tournament.countDocuments(upcomingQuery),
    Tournament.findOne(upcomingQuery).sort({ date: 1, _id: 1 }),
  ]);
  const covers=await eventCoverMap(nearest?[nearest]:[]);
  res.json({
    total: totals?.total || 0,
    participants: totals?.participants || 0,
    capacity: totals?.capacity || 0,
    upcoming,
    nearest: nearest ? publicTournament(nearest,false,coverFor(nearest,covers)) : null,
  });
});
