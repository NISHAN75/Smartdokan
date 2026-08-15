import express from 'express';
import {
  createSupplier,
  getSuppliers,
  getSupplierById,
} from '../controllers/supplierController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Every supplier route requires a logged-in user, same as
// Category/Product/Customer — no role restriction applied here.
router.use(protect);

router.route('/').get(getSuppliers).post(createSupplier);

router.route('/:id').get(getSupplierById);

export default router;
