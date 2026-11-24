import express from 'express';
import { protect, admin } from '../middleware/authMiddleware.js';
import {
  getUpdates,
  getManagedUpdates,
  getUpdate,
  createUpdate,
  updateUpdate,
  deleteUpdate,
} from '../controllers/updateController.js';

const router = express.Router();
router.get('/management', protect, admin, getManagedUpdates);

router.route('/')
  .get(getUpdates)
  .post(protect, admin, createUpdate);

router.route('/:id')
  .get(getUpdate)
  .put(protect, admin, updateUpdate)
  .delete(protect, admin, deleteUpdate);

export default router;