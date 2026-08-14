import express from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../controllers/productController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Every product route requires a logged-in user, same as Category —
// no role restriction applied here.
router.use(protect);

router.route('/').get(getProducts).post(createProduct);

router.route('/:id').get(getProductById).put(updateProduct).delete(deleteProduct);

export default router;