import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { getSalesReport,getPurchasesReport,getExpensesReport,getProfitLossReport,getProductsReport,getCustomersReport,getSuppliersReport,getInventoryReport } from '../controllers/reportController.js';
const router=express.Router();
router.use(protect);
router.get('/sales',getSalesReport); router.get('/purchases',getPurchasesReport); router.get('/expenses',getExpensesReport); router.get('/profit-loss',getProfitLossReport); router.get('/products',getProductsReport); router.get('/customers',getCustomersReport); router.get('/suppliers',getSuppliersReport); router.get('/inventory',getInventoryReport);
export default router;
