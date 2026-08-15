import express from 'express';
import { createSale, getSales, getSaleById } from '../controllers/saleController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Every sale route requires a logged-in user, same as every other module.
router.use(protect);

router.route('/').get(getSales).post(createSale);

router.route('/:id').get(getSaleById);

export default router;
