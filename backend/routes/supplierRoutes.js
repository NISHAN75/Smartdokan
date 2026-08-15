import express from 'express';

import {
  createSupplier,
  getSuppliers,
  getSupplierById,
  getSupplierSummary,
  updateSupplier,
  deleteSupplier,
  getSupplierPurchases,
  getSupplierPayments,
} from '../controllers/supplierController.js';

import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Authentication
|--------------------------------------------------------------------------
| All supplier routes require an authenticated user.
*/
router.use(protect);

/*
|--------------------------------------------------------------------------
| Supplier Summary
|--------------------------------------------------------------------------
| IMPORTANT:
| Keep /summary before /:id so Express does not treat "summary"
| as a supplier ID.
|
| GET /api/suppliers/summary
*/
router.get('/summary', getSupplierSummary);

/*
|--------------------------------------------------------------------------
| Supplier Collection
|--------------------------------------------------------------------------
|
| GET  /api/suppliers
| POST /api/suppliers
|
*/
router
  .route('/')
  .get(getSuppliers)
  .post(createSupplier);

/*
|--------------------------------------------------------------------------
| Single Supplier
|--------------------------------------------------------------------------
|
| GET    /api/suppliers/:id
| PATCH  /api/suppliers/:id
| DELETE /api/suppliers/:id
|
*/
router
  .route('/:id')
  .get(getSupplierById)
  .patch(updateSupplier)
  .delete(deleteSupplier);

/*
|--------------------------------------------------------------------------
| Supplier Purchases
|--------------------------------------------------------------------------
|
| GET /api/suppliers/:id/purchases
|
*/
router.get(
  '/:id/purchases',
  getSupplierPurchases
);

/*
|--------------------------------------------------------------------------
| Supplier Payments
|--------------------------------------------------------------------------
|
| GET /api/suppliers/:id/payments
|
*/
router.get(
  '/:id/payments',
  getSupplierPayments
);

export default router;