import express from 'express';
import { startClubTournament } from '../controllers/clubTournamentRoundsController.js';
import { getRoundTimer, updateRoundTimer } from '../controllers/roundTimerController.js';
import { getClubParticipants, addClubParticipant, removeClubParticipant } from '../controllers/clubParticipantsController.js';
import {
  getInternalTournament, changeInternalParticipants, pairRound,
  cancelLatestRound, editRoundPairings, enterMatchResult, closeInternalTournament,
} from '../controllers/internalTournamentController.js';
import { qrRegistrationPreview, qrRegistrationDuplicates, qrRegisterPlayer } from '../controllers/qrRegistrationController.js';
import { protect, admin, authorize } from '../middleware/authMiddleware.js';
import {
  getTournaments,
  getTournamentSummary,
  getOwnRegistration,
  getLegacyManagedTournaments,
  getLegacyManagedTournament,
  getTournamentById,
  createTournament,
  updateTournament,
  registerForTournament,
  unregisterFromTournament,
  addParticipant,
  removeParticipant,
  submitTournamentResults,
  getTournamentResults,
  getTournamentsBySeries,
} from '../controllers/tournamentController.js';

import {
  getManagedTournaments,
  deleteTournament,
} from '../controllers/tournamentManagementController.js';
const router = express.Router();
router.get('/management/legacy', protect, admin, getLegacyManagedTournaments);
router.get(
  '/management/legacy/:id',
  protect,
  admin,
  getLegacyManagedTournament,
);
router.get(
  '/management',
  protect,
  authorize('admin', 'judge'),
  getManagedTournaments,
);

router.get('/summary', getTournamentSummary);
const clubRoundScope = (req, res, next) => { req.clubSwiss = true; next(); };
const staff = [protect, authorize('admin', 'judge')];
router.get('/:id/club-participants', ...staff, getClubParticipants);
router.post('/:id/club-participants', ...staff, addClubParticipant);
router.delete('/:id/club-participants/:source/:registrationId', ...staff, removeClubParticipant);
router.post('/:id/start', ...staff, startClubTournament);
router.get('/:id/round-management', ...staff, clubRoundScope, getInternalTournament);
router.put('/:id/round-management/participants', ...staff, clubRoundScope, changeInternalParticipants);
router.post('/:id/round-management/rounds', ...staff, clubRoundScope, pairRound);
router.delete('/:id/round-management/rounds/:roundNumber', ...staff, clubRoundScope, cancelLatestRound);
router.put('/:id/round-management/rounds/:roundNumber/pairings', ...staff, clubRoundScope, editRoundPairings);
router.put('/:id/round-management/rounds/:roundNumber/matches/:matchId', ...staff, clubRoundScope, enterMatchResult);
router.post('/:id/round-management/close', ...staff, clubRoundScope, closeInternalTournament);

router.get('/:id/qr-registration', protect, authorize('admin', 'judge'), qrRegistrationPreview);
router.get('/:id/qr-registration/duplicates', protect, authorize('admin', 'judge'), qrRegistrationDuplicates);
router.post('/:id/qr-registration', protect, authorize('admin', 'judge'), qrRegisterPlayer);
router.route('/').get(getTournaments).post(protect, admin, createTournament);

router
  .route('/:id')
  .get(getTournamentById)
  .put(protect, admin, updateTournament)
  .delete(protect, admin, deleteTournament);

router.get('/series/:seriesId', getTournamentsBySeries);

router
  .route('/:id/register')
  .get(protect, getOwnRegistration)
  .post(protect, registerForTournament)
  .delete(protect, unregisterFromTournament);

router.route('/:id/participants').post(protect, admin, addParticipant);

router.delete(
  '/:id/participants/:participantId',
  protect,
  admin,
  removeParticipant,
);

router
  .route('/:id/results')
  .get(getTournamentResults)
  .post(protect, admin, submitTournamentResults);

export default router;
