import express from 'express';
import { protect, admin } from '../middleware/authMiddleware.js';
import {
  getPlayers,
  getPlayer,
  createQuarterlyPlayer,
  createTeamPlayer,
  updatePlayer,
} from '../controllers/playerController.js';

const router = express.Router();

router.get('/', protect, admin, getPlayers);
router.get('/:id', protect, admin, getPlayer);
router.post('/quarterly', protect, admin, createQuarterlyPlayer);
router.post('/team', protect, admin, createTeamPlayer);
router.put('/:id', protect, admin, updatePlayer);

export default router;
