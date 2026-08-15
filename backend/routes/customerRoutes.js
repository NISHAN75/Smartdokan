import express from 'express';
import {
  createCustomer,
  getCustomers,
  getCustomerById,
} from '../controllers/customerController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Every customer route requires a logged-in user, same as
// Category/Product — no role restriction applied here.
router.use(protect);

router.route('/').get(getCustomers).post(createCustomer);

router.route('/:id').get(getCustomerById);

export default router;
