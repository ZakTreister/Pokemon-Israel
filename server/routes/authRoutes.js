import express from 'express';
import { protect, admin } from '../middleware/authMiddleware.js';
import { login, register, getProfile, updateProfile } from '../controllers/authController.js';

const router = express.Router();

router.post('/login', login);
router.post('/register', protect, admin, register);
router.route('/profile')
  .get(protect, getProfile)
  .put(protect, updateProfile);

export default router;