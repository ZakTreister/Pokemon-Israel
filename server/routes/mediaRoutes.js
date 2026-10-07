import express from 'express';
import asyncHandler from 'express-async-handler';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { uploadImage, MAX_IMAGE_BYTES } from '../services/mediaUpload.js';
const router = express.Router();
router.post(
  '/images',
  protect,
  authorize('admin', 'judge'),
  express.raw({ type: () => true, limit: MAX_IMAGE_BYTES }),
  asyncHandler(async (req, res) => {
    res
      .status(201)
      .json(
        await uploadImage(req.body, req.headers['content-type']?.split(';')[0]),
      );
  }),
);
export default router;
