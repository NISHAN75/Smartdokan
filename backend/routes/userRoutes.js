import express from 'express';
import { getUsers, getUserById, createUser, updateUser } from '../controllers/userController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// User management is the one genuinely admin-only surface in the app —
// every route here requires an authenticated, active admin. A
// manager/staff account hitting these endpoints directly (e.g. via
// Postman) gets a 403 from `authorize('admin')`, not just a hidden
// sidebar link.
router.use(protect, authorize('admin'));

router.route('/').get(getUsers).post(createUser);
router.route('/:id').get(getUserById).patch(updateUser);

export default router;
