import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import {
  getTeams,
  getManageablePlayers,
  getTeam,
  createTeam,
  updateTeam,
  assignPlayerToTeam,
  removePlayerFromTeam,
} from '../controllers/teamController.js';

const router = express.Router();

// /manageable-players must be declared before /:id
router.get('/', protect, authorize('admin', 'judge'), getTeams);
router.get('/manageable-players', protect, authorize('admin', 'judge'), getManageablePlayers);
router.get('/:id', protect, authorize('admin', 'judge'), getTeam);
router.post('/', protect, authorize('admin', 'judge'), createTeam);
router.put('/:id', protect, authorize('admin', 'judge'), updateTeam);
router.put('/:teamId/players/:playerId', protect, authorize('admin', 'judge'), assignPlayerToTeam);
router.delete('/:teamId/players/:playerId', protect, authorize('admin', 'judge'), removePlayerFromTeam);

export default router;
