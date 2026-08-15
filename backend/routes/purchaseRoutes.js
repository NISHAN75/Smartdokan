import express from 'express';
import { createPurchase, getPurchases, getPurchaseById } from '../controllers/purchaseController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Every purchase route requires a logged-in user, same as every other module.
router.use(protect);

router.route('/').get(getPurchases).post(createPurchase);

router.route('/:id').get(getPurchaseById);

export default router;
