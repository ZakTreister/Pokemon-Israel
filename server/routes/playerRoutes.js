import express from 'express';
import { protect, admin, authorize } from '../middleware/authMiddleware.js';
import {
  getPlayers,
  getPlayer,
  createQuarterlyPlayer,
  createTeamPlayer,
  updatePlayer,
} from '../controllers/playerController.js';

import { getPublicTeamPlayer } from '../controllers/publicPlayerController.js';
const router = express.Router();
router.get('/public/:id', getPublicTeamPlayer);

router.get('/', protect, authorize('admin', 'judge'), getPlayers);
router.get('/:id', protect, authorize('admin', 'judge'), getPlayer);
router.post('/quarterly', protect, admin, createQuarterlyPlayer);
router.post('/team', protect, authorize('admin'), createTeamPlayer);
router.put('/:id', protect, authorize('admin'), updatePlayer);

export default router;
