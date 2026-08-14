import express from 'express';
import {
  registerUser,
  loginUser,
  getMe,
  logoutUser,
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', protect, logoutUser);
router.get('/me', protect, getMe);

// Example of a role-protected route, kept here for reference only:
// router.get('/admin-check', protect, authorize('admin'), (req, res) => {
//   res.json({ success: true, message: 'Welcome, admin' });
// });

export default router;
