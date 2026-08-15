import mongoose from 'mongoose';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/AppError.js';
import ApiFeatures from '../utils/apiFeatures.js';
import Expense, { PAYMENT_METHODS } from '../models/Expense.js';
import ExpenseCategory from '../models/ExpenseCategory.js';

const ALLOWED_STATUSES = ['active', 'inactive'];

// Same reasoning as every other controller's getScope: companyId isn't
// on the User model yet, so every request scopes to companyId: null
// for now.
const getScope = (req) => ({ companyId: req.user.companyId || null });

const validateAmount = (rawAmount) => {
  if (rawAmount === undefined || rawAmount === null || rawAmount === '') {
    throw new AppError('Amount is required', 400);
  }
  const amount = Number(rawAmount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new AppError('Amount must be a positive number', 400);
  }
  return amount;
};

const validateExpenseDate = (rawDate) => {
  if (!rawDate) return new Date();
  const date = new Date(rawDate);
  if (Number.isNaN(date.getTime())) {
    throw new AppError('Expense date is invalid', 400);
  }
  return date;
};

const validatePaymentMethod = (paymentMethod) => {
  if (!paymentMethod || !PAYMENT_METHODS.includes(paymentMethod)) {
    throw new AppError(`Payment method must be one of: ${PAYMENT_METHODS.join(', ')}`, 400);
  }
  return paymentMethod;
};

// Loads the category scoped to this company, or throws — every create/
// update needs this same ownership + existence check before an expense
// can reference it. Rejecting inactive categories on create keeps new
// spending pointed at categories the business is still actively using;
// existing expenses that reference a category deactivated later are
// left untouched (see ExpenseCategory's deactivate-on-use reasoning).
const loadActiveCategoryOrThrow = async (categoryId, companyId) => {
  if (!categoryId || !mongoose.isValidObjectId(categoryId)) {
    throw new AppError('A valid expense category is required', 400);
  }
  const category = await ExpenseCategory.findOne({ _id: categoryId, companyId });
  if (!category) {
    throw new AppError('Selected expense category does not exist', 400);
  }
  if (category.status !== 'active') {
    throw new AppError(
      `"${category.name}" is deactivated and cannot be selected for a new expense`,
      400
    );
  }
  return category;
};

/**
 * @desc    Create an expense. Category is validated from the database
 *          (must exist, must be active) — never trusted from the
 *          request body beyond its id.
 * @route   POST /api/expenses
 * @access  Private (any authenticated user)
 */
export const createExpense = asyncHandler(async (req, res) => {
  const { companyId } = getScope(req);
  const { categoryId, amount: rawAmount, expenseDate, paymentMethod, reference, note } = req.body;

  const category = await loadActiveCategoryOrThrow(categoryId, companyId);
  const amount = validateAmount(rawAmount);
  const resolvedDate = validateExpenseDate(expenseDate);
  const method = validatePaymentMethod(paymentMethod);

  const expense = await Expense.create({
    categoryId: category._id,
    categoryName: category.name,
    amount,
    expenseDate: resolvedDate,
    paymentMethod: method,
    reference: reference?.trim() || '',
    note: note?.trim() || '',
    status: 'active',
    companyId,
    branchId: null,
    createdBy: req.user._id,
  });

  const populated = await Expense.findById(expense._id)
    .populate('categoryId', 'name status')
    .populate('createdBy', 'name email');

  res.status(201).json({ success: true, data: populated });
});

/**
 * @desc    List expenses (paginated, searchable, filterable)
 * @route   GET /api/expenses?page=&limit=&search=&categoryId=&paymentMethod=&status=&from=&to=&sort=
 * @access  Private (any authenticated user)
 */
export const getExpenses = asyncHandler(async (req, res) => {
  const { companyId } = getScope(req);

  if (req.query.status && !ALLOWED_STATUSES.includes(req.query.status)) {
    throw new AppError(`Status must be one of: ${ALLOWED_STATUSES.join(', ')}`, 400);
  }
  if (req.query.paymentMethod && !PAYMENT_METHODS.includes(req.query.paymentMethod)) {
    throw new AppError(`Payment method must be one of: ${PAYMENT_METHODS.join(', ')}`, 400);
  }
  if (req.query.categoryId && !mongoose.isValidObjectId(req.query.categoryId)) {
    throw new AppError('Invalid category filter', 400);
  }

  const { filter, sort, page, limit, skip } = new ApiFeatures({ companyId }, req.query)
    .search(['reference', 'note', 'categoryName'])
    .applyFilters(['paymentMethod', 'status', 'categoryId'])
    .build();

  // Simple inclusive date-range filter on expenseDate — same convention
  // as saleController/purchaseController's `from`/`to` handling on createdAt.
  if (req.query.from || req.query.to) {
    filter.expenseDate = {};
    if (req.query.from) filter.expenseDate.$gte = new Date(req.query.from);
    if (req.query.to) filter.expenseDate.$lte = new Date(req.query.to);
  }

  const [expenses, totalItems] = await Promise.all([
    Expense.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('categoryId', 'name status')
      .populate('createdBy', 'name email'),
    Expense.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    count: expenses.length,
    currentPage: page,
    totalPages: Math.max(Math.ceil(totalItems / limit), 1),
    totalItems,
    limit,
    data: expenses,
  });
});

/**
 * @desc    Expense summary for dashboard/summary cards — total spend,
 *          this month's spend, counts, and a per-category breakdown.
 *          Computed entirely via aggregation, never by loading the full
 *          collection into Node.
 * @route   GET /api/expenses/summary
 * @access  Private (any authenticated user)
 *
 * NOTE: registered before GET /api/expenses/:id in expenseRoutes.js so
 * "summary" is never interpreted as an :id.
 */
export const getExpenseSummary = asyncHandler(async (req, res) => {
  const { companyId } = getScope(req);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const activeMatch = { companyId, status: 'active' };

  const [totals] = await Expense.aggregate([
    { $match: activeMatch },
    {
      $facet: {
        overall: [
          {
            $group: {
              _id: null,
              totalAmount: { $sum: '$amount' },
              totalCount: { $sum: 1 },
            },
          },
        ],
        thisMonth: [
          { $match: { expenseDate: { $gte: monthStart, $lt: monthEnd } } },
          {
            $group: {
              _id: null,
              amount: { $sum: '$amount' },
              count: { $sum: 1 },
            },
          },
        ],
        byCategory: [
          {
            $group: {
              _id: '$categoryId',
              categoryName: { $first: '$categoryName' },
              totalAmount: { $sum: '$amount' },
              count: { $sum: 1 },
            },
          },
          { $sort: { totalAmount: -1 } },
        ],
      },
    },
  ]);

  const overall = totals.overall[0] || { totalAmount: 0, totalCount: 0 };
  const thisMonth = totals.thisMonth[0] || { amount: 0, count: 0 };
  const byCategory = (totals.byCategory || []).map((row) => ({
    categoryId: row._id,
    categoryName: row.categoryName,
    totalAmount: row.totalAmount,
    count: row.count,
  }));
  const topCategory = byCategory[0] || null;

  res.status(200).json({
    success: true,
    data: {
      totalAmount: overall.totalAmount,
      totalCount: overall.totalCount,
      thisMonthAmount: thisMonth.amount,
      thisMonthCount: thisMonth.count,
      byCategory,
      topCategory,
    },
  });
});

/**
 * @desc    Get a single expense by id
 * @route   GET /api/expenses/:id
 * @access  Private (any authenticated user)
 */
export const getExpenseById = asyncHandler(async (req, res) => {
  const { companyId } = getScope(req);

  const expense = await Expense.findOne({ _id: req.params.id, companyId })
    .populate('categoryId', 'name status')
    .populate('createdBy', 'name email')
    .populate('updatedBy', 'name email');

  if (!expense) {
    throw new AppError('Expense not found', 404);
  }

  res.status(200).json({ success: true, data: expense });
});

/**
 * @desc    Update an expense. Category (if changed) is re-validated the
 *          same way as create.
 * @route   PUT /api/expenses/:id
 * @access  Private (any authenticated user)
 */
export const updateExpense = asyncHandler(async (req, res) => {
  const { companyId } = getScope(req);
  const { categoryId, amount, expenseDate, paymentMethod, reference, note, status } = req.body;

  const expense = await Expense.findOne({ _id: req.params.id, companyId });
  if (!expense) {
    throw new AppError('Expense not found', 404);
  }

  if (categoryId !== undefined) {
    const category = await loadActiveCategoryOrThrow(categoryId, companyId);
    expense.categoryId = category._id;
    expense.categoryName = category.name;
  }

  if (amount !== undefined) {
    expense.amount = validateAmount(amount);
  }

  if (expenseDate !== undefined) {
    expense.expenseDate = validateExpenseDate(expenseDate);
  }

  if (paymentMethod !== undefined) {
    expense.paymentMethod = validatePaymentMethod(paymentMethod);
  }

  if (reference !== undefined) {
    expense.reference = reference?.trim() || '';
  }

  if (note !== undefined) {
    expense.note = note?.trim() || '';
  }

  if (status !== undefined) {
    if (!ALLOWED_STATUSES.includes(status)) {
      throw new AppError(`Status must be one of: ${ALLOWED_STATUSES.join(', ')}`, 400);
    }
    expense.status = status;
  }

  expense.updatedBy = req.user._id;

  await expense.save();

  const populated = await Expense.findById(expense._id)
    .populate('categoryId', 'name status')
    .populate('createdBy', 'name email')
    .populate('updatedBy', 'name email');

  res.status(200).json({ success: true, data: populated });
});

/**
 * @desc    Deactivate (soft-delete) an expense. Same reasoning as
 *          Customer/Supplier/ExpenseCategory — expenses are financial
 *          history, so they are marked inactive rather than hard
 *          deleted, keeping past reports accurate.
 * @route   DELETE /api/expenses/:id
 * @access  Private (any authenticated user)
 */
export const deleteExpense = asyncHandler(async (req, res) => {
  const { companyId } = getScope(req);

  const expense = await Expense.findOne({ _id: req.params.id, companyId });
  if (!expense) {
    throw new AppError('Expense not found', 404);
  }

  if (expense.status === 'inactive') {
    throw new AppError('This expense is already deactivated', 400);
  }

  expense.status = 'inactive';
  expense.updatedBy = req.user._id;
  await expense.save();

  res.status(200).json({
    success: true,
    message: 'Expense deactivated successfully',
    data: expense,
  });
});
