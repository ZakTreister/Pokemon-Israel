import express from 'express';
import { protect, admin } from '../middleware/authMiddleware.js';
import {
  getTournaments,
  getTournamentById,
  createTournament,
  updateTournament,
  deleteTournament,
  registerForTournament,
  unregisterFromTournament,
  submitTournamentResults,
  getTournamentResults,
  getTournamentsBySeries,
} from '../controllers/tournamentController.js';

const router = express.Router();

router.route('/')
  .get(getTournaments)
  .post(protect, admin, createTournament);

router.route('/:id')
  .get(getTournamentById)
  .put(protect, admin, updateTournament)
  .delete(protect, admin, deleteTournament);

router.get('/series/:seriesId', getTournamentsBySeries);

router.route('/:id/register')
  .post(protect, registerForTournament)
  .delete(protect, unregisterFromTournament);

router.route('/:id/results')
  .get(getTournamentResults)
  .post(protect, admin, submitTournamentResults);

export default router;