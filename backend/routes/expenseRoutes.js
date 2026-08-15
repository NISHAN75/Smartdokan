import express from 'express';
import {
  getExpenses,
  getExpenseSummary,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
} from '../controllers/expenseController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Every expense route requires a logged-in user — same convention as
// every other module (no role restriction applied here).
router.use(protect);

router.route('/').get(getExpenses).post(createExpense);

// IMPORTANT: /summary must be registered before the /:id route, or
// Express will try to match "summary" as an :id and hit getExpenseById
// with an invalid ObjectId instead.
router.route('/summary').get(getExpenseSummary);

router.route('/:id').get(getExpenseById).put(updateExpense).delete(deleteExpense);

export default router;
