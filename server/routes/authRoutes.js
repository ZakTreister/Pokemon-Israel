import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { login, register, getProfile, updateProfile } from '../controllers/authController.js';

const router = express.Router();

router.post('/login', login);
router.post('/register', register);
router.route('/profile')
  .get(protect, getProfile)
  .put(protect, updateProfile);

export default router;