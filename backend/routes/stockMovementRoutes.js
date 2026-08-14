import express from 'express';

import {
  createStockMovement,
  getStockMovements,
} from '../controllers/stockMovementController.js';

import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router
  .route('/')
  .get(getStockMovements)
  .post(createStockMovement);

export default router;