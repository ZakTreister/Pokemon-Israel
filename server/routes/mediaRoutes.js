import express from 'express';
import asyncHandler from 'express-async-handler';
import { protect, authorize } from '../middleware/authMiddleware.js';
import {
  presignUpload,
  completeUpload,
  privatePlayerPhoto,
} from '../services/mediaUpload.js';
const router = express.Router();
router.use(protect, authorize('admin'));
router.post(
  '/presign',
  asyncHandler(async (req, res) =>
    res.status(201).json(await presignUpload(req)),
  ),
);
router.post(
  '/:id/complete',
  asyncHandler(async (req, res) => res.json(await completeUpload(req))),
);
router.get(
  '/players/:id/photo',
  asyncHandler(async (req, res) => res.json(await privatePlayerPhoto(req))),
);
export default router;
