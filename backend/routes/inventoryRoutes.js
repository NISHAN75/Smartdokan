import express from 'express';
import { getInventory } from '../controllers/inventoryController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Every inventory route requires a logged-in user, same as Category and
// Product — no role restriction applied here.
router.use(protect);

router.route('/').get(getInventory);

export default router;