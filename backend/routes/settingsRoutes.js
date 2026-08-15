import express from 'express';
import {
  getSettings,
  updateProfile,
  updatePassword,
  updateBusinessSettings,
} from '../controllers/settingsController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/', getSettings);
router.patch('/profile', updateProfile);
router.patch('/password', updatePassword);
router.patch('/business', updateBusinessSettings);

export default router;
