import express from 'express';
import asyncHandler from 'express-async-handler';
import {recordFavorite,favoriteRateLimit} from '../services/teamFavorites.js';
import { resolveTrialPlayer } from '../controllers/trialPlayerController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import {
  getTeams, getOverview,
  getTeachers,
  getMyTeams,
  getPublicTeams,
  getPublicTeam,
  loadTeamPlayers,
  getManageablePlayers,
  getTeam,
  createTeam,
  updateTeam,
  assignPlayerToTeam,
  removePlayerFromTeam,
} from '../controllers/teamController.js';

const router = express.Router();

// /manageable-players must be declared before /:id
router.get('/teachers', protect, authorize('admin'), getTeachers);
router.get('/overview', protect, authorize('admin', 'judge'), getOverview);
router.get('/mine', protect, authorize('admin', 'judge'), getMyTeams);
router.get('/public', getPublicTeams);
router.post('/public/favorite',favoriteRateLimit,asyncHandler(async(req,res)=>res.json({counts:await recordFavorite(req.body)})));
router.get('/public/:id', getPublicTeam);
router.post('/:teamId/players', protect, authorize('admin'), loadTeamPlayers);
router.get('/', protect, authorize('admin', 'judge'), getTeams);
router.get('/manageable-players', protect, authorize('admin', 'judge'), getManageablePlayers);
router.get('/:id', protect, authorize('admin', 'judge'), getTeam);
router.post('/', protect, authorize('admin'), createTeam);
router.put('/:id', protect, authorize('admin'), updateTeam);
router.put('/:teamId/players/:playerId', protect, authorize('admin'), assignPlayerToTeam);
router.delete('/:teamId/players/:playerId', protect, authorize('admin'), removePlayerFromTeam);
router.put('/:teamId/trials/:playerId/resolve', protect, authorize('admin'), resolveTrialPlayer);

export default router;
