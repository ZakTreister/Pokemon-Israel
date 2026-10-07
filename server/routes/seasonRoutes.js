import express from 'express';
import { protect, admin } from '../middleware/authMiddleware.js';
import {
  getSeasons,
  getActiveSeason,
  createSeason,
  closeSeason,
} from '../controllers/seasonController.js';

const router = express.Router();

router.get('/', protect, admin, getSeasons);
router.get('/active', protect, admin, getActiveSeason);
router.post('/', protect, admin, createSeason);
router.post('/:id/close', protect, admin, closeSeason);

export default router;
