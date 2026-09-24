import express from 'express';
import { protect, authorize } from '../middleware/authMiddleware.js';
import {
  getBadges,
  createBadge,
  updateBadge,
  getBadgeAwards,
  awardBadge,
} from '../controllers/badgeController.js';

const router = express.Router();

// /awards must be declared before /:id pattern conflicts
router.get('/', protect, authorize('admin', 'judge'), getBadges);
router.get('/awards', protect, authorize('admin', 'judge'), getBadgeAwards);
router.post('/', protect, authorize('admin', 'judge'), createBadge);
router.put('/:id', protect, authorize('admin', 'judge'), updateBadge);
router.post('/:badgeId/players/:playerId', protect, authorize('admin', 'judge'), awardBadge);

export default router;
