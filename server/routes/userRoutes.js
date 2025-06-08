import express from 'express';
import { protect, admin } from '../middleware/authMiddleware.js';
import {
  getUserStats,
  getUserTournaments,
  getUsers,
  deleteUser,
} from '../controllers/userController.js';

const router = express.Router();

router.get('/stats', protect, getUserStats);
router.get('/tournaments', protect, getUserTournaments);

router.route('/')
  .get(protect, admin, getUsers);

router.route('/:id')
  .delete(protect, admin, deleteUser);

export default router;