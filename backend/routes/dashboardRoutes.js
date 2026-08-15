import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { getDashboard } from '../controllers/dashboardController.js';

const router = express.Router();

router.use(protect);
router.get('/', getDashboard);

export default router;
