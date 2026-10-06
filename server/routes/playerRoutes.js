import express from 'express';
import { protect, admin, authorize } from '../middleware/authMiddleware.js';
import {
  getPlayers,
  getPlayer,
  createQuarterlyPlayer,
  createTeamPlayer,
  updatePlayer,
} from '../controllers/playerController.js';

const router = express.Router();

router.get('/', protect, authorize('admin', 'judge'), getPlayers);
router.get('/:id', protect, authorize('admin', 'judge'), getPlayer);
router.post('/quarterly', protect, admin, createQuarterlyPlayer);
router.post('/team', protect, authorize('admin', 'judge'), createTeamPlayer);
router.put('/:id', protect, authorize('admin', 'judge'), updatePlayer);

export default router;
