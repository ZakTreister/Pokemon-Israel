import express from 'express';
import { protect, admin } from '../middleware/authMiddleware.js';
import {
  getUpdates,
  createUpdate,
  updateUpdate,
  deleteUpdate,
} from '../controllers/updateController.js';

const router = express.Router();

router.route('/')
  .get(getUpdates)
  .post(protect, admin, createUpdate);

router.route('/:id')
  .put(protect, admin, updateUpdate)
  .delete(protect, admin, deleteUpdate);

export default router;