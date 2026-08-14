import express from 'express';
import {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/categoryController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Every category route requires a logged-in user. No role restriction
// is applied here (per requirements) — any authenticated user (admin,
// manager, or staff) can manage categories.
router.use(protect);

router.route('/').get(getCategories).post(createCategory);

router.route('/:id').get(getCategoryById).put(updateCategory).delete(deleteCategory);

export default router;
