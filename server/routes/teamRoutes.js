import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import {
  getTeams,
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
router.get('/public', getPublicTeams);
router.get('/public/:id', getPublicTeam);
router.post('/:teamId/players', protect, authorize('admin'), loadTeamPlayers);
router.get('/', protect, authorize('admin', 'judge'), getTeams);
router.get('/manageable-players', protect, authorize('admin', 'judge'), getManageablePlayers);
router.get('/:id', protect, authorize('admin', 'judge'), getTeam);
router.post('/', protect, authorize('admin'), createTeam);
router.put('/:id', protect, authorize('admin'), updateTeam);
router.put('/:teamId/players/:playerId', protect, authorize('admin'), assignPlayerToTeam);
router.delete('/:teamId/players/:playerId', protect, authorize('admin'), removePlayerFromTeam);

export default router;
