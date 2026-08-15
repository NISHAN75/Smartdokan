import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/AppError.js';
import ApiFeatures from '../utils/apiFeatures.js';
import Supplier from '../models/Supplier.js';
import { PAYMENT_METHODS } from '../models/Purchase.js';
import SupplierPayment from '../models/SupplierPayment.js';

const getScope = (req) => ({ companyId: req.user.companyId || null });

const validateAmount = (rawAmount) => {
  if (rawAmount === undefined || rawAmount === null || rawAmount === '') {
    throw new AppError('Payment amount is required', 400);
  }
  const amount = Number(rawAmount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new AppError('Payment amount must be a positive number', 400);
  }
  return amount;
};

// Loads the supplier scoped to this company, or throws 404 — every
// payment route needs this same ownership check before touching
// SupplierPayment records.
const loadSupplierOrThrow = async (id, companyId) => {
  const supplier = await Supplier.findOne({ _id: id, companyId });
  if (!supplier) {
    throw new AppError('Supplier not found', 404);
  }
  return supplier;
};

/**
 * @desc    Record a payment made to a supplier. Reduces the supplier's
 *          current due — see supplierController's balance math for how
 *          this is combined with openingDue and Purchase.dueAmount.
 * @route   POST /api/suppliers/:id/payments
 * @access  Private (any authenticated user)
 */
export const createSupplierPayment = asyncHandler(async (req, res) => {
  const { companyId } = getScope(req);
  const supplier = await loadSupplierOrThrow(req.params.id, companyId);

  const { amount: rawAmount, paymentDate, paymentMethod, reference, note } = req.body;

  if (!paymentMethod || !PAYMENT_METHODS.includes(paymentMethod)) {
    throw new AppError(`Payment method must be one of: ${PAYMENT_METHODS.join(', ')}`, 400);
  }

  const amount = validateAmount(rawAmount);

  let resolvedDate = new Date();
  if (paymentDate) {
    resolvedDate = new Date(paymentDate);
    if (Number.isNaN(resolvedDate.getTime())) {
      throw new AppError('Payment date is invalid', 400);
    }
  }

  const payment = await SupplierPayment.create({
    supplierId: supplier._id,
    supplierName: supplier.name,
    amount,
    paymentDate: resolvedDate,
    paymentMethod,
    reference: reference?.trim() || '',
    note: note?.trim() || '',
    companyId,
    branchId: null,
    createdBy: req.user._id,
  });

  res.status(201).json({ success: true, data: payment });
});

/**
 * @desc    Paginated payment history for one supplier.
 * @route   GET /api/suppliers/:id/payments?page=&limit=
 * @access  Private (any authenticated user)
 */
export const getSupplierPayments = asyncHandler(async (req, res) => {
  const { companyId } = getScope(req);
  const supplier = await loadSupplierOrThrow(req.params.id, companyId);

  const { filter, sort, page, limit, skip } = new ApiFeatures(
    { companyId, supplierId: supplier._id },
    req.query
  ).build();

  const [payments, totalItems] = await Promise.all([
    SupplierPayment.find(filter).sort(sort).skip(skip).limit(limit),
    SupplierPayment.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    count: payments.length,
    currentPage: page,
    totalPages: Math.max(Math.ceil(totalItems / limit), 1),
    totalItems,
    limit,
    data: payments,
  });
});
