import express from 'express';
import {
  getExpenseCategories,
  getExpenseCategoryById,
  createExpenseCategory,
  updateExpenseCategory,
  deleteExpenseCategory,
} from '../controllers/expenseCategoryController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Every expense-category route requires a logged-in user. No role
// restriction is applied here — same convention as categoryRoutes.js —
// any authenticated user can manage expense categories.
router.use(protect);

router.route('/').get(getExpenseCategories).post(createExpenseCategory);

router
  .route('/:id')
  .get(getExpenseCategoryById)
  .put(updateExpenseCategory)
  .delete(deleteExpenseCategory);

export default router;
