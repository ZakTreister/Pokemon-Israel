import express from 'express';
import { protect, admin } from '../middleware/authMiddleware.js';
import {
  getUpdates,
  getManagedUpdates,
  addUpdateAsset,
  deleteUpdateAsset,
  getUpdate,
  createUpdate,
  updateUpdate,
  deleteUpdate,
} from '../controllers/updateController.js';

const router = express.Router();
router.post('/:id/media',protect,admin,addUpdateAsset);
router.delete('/:id/media/:assetId',protect,admin,deleteUpdateAsset);
router.get('/management', protect, admin, getManagedUpdates);

router.route('/')
  .get(getUpdates)
  .post(protect, admin, createUpdate);

router.route('/:id')
  .get(getUpdate)
  .put(protect, admin, updateUpdate)
  .delete(protect, admin, deleteUpdate);

export default router;