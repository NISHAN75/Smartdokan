import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/AppError.js';
import escapeRegex from '../utils/escapeRegex.js';
import ApiFeatures from '../utils/apiFeatures.js';
import ExpenseCategory from '../models/ExpenseCategory.js';
import Expense from '../models/Expense.js';

const ALLOWED_STATUSES = ['active', 'inactive'];

// Same reasoning as every other controller's getScope: companyId isn't
// on the User model yet (no Company module = no real tenants), so every
// request scopes to companyId: null for now.
const getScope = (req) => ({ companyId: req.user.companyId || null });

/**
 * @desc    Create an expense category
 * @route   POST /api/expense-categories
 * @access  Private (any authenticated user)
 */
export const createExpenseCategory = asyncHandler(async (req, res) => {
  const { name, description, status } = req.body;

  if (!name || !name.trim()) {
    throw new AppError('Category name is required', 400);
  }
  const trimmedName = name.trim();
  if (trimmedName.length < 2) {
    throw new AppError('Category name must be at least 2 characters', 400);
  }

  if (status && !ALLOWED_STATUSES.includes(status)) {
    throw new AppError(`Status must be one of: ${ALLOWED_STATUSES.join(', ')}`, 400);
  }

  const { companyId } = getScope(req);

  const existing = await ExpenseCategory.findOne({
    companyId,
    name: { $regex: `^${escapeRegex(trimmedName)}$`, $options: 'i' },
  });
  if (existing) {
    throw new AppError('An expense category with this name already exists', 409);
  }

  const category = await ExpenseCategory.create({
    name: trimmedName,
    description: description?.trim() || '',
    status: status || 'active',
    companyId,
    branchId: null,
    createdBy: req.user._id,
  });

  res.status(201).json({ success: true, data: category });
});

/**
 * @desc    List expense categories (paginated, searchable, filterable)
 * @route   GET /api/expense-categories?page=&limit=&search=&status=&sort=
 * @access  Private (any authenticated user)
 */
export const getExpenseCategories = asyncHandler(async (req, res) => {
  const { companyId } = getScope(req);

  if (req.query.status && !ALLOWED_STATUSES.includes(req.query.status)) {
    throw new AppError(`Status must be one of: ${ALLOWED_STATUSES.join(', ')}`, 400);
  }

  const { filter, sort, page, limit, skip } = new ApiFeatures({ companyId }, req.query)
    .search(['name', 'description'])
    .applyFilters(['status'])
    .build();

  const [categories, totalItems] = await Promise.all([
    ExpenseCategory.find(filter).sort(sort).skip(skip).limit(limit).populate('createdBy', 'name email'),
    ExpenseCategory.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    count: categories.length,
    currentPage: page,
    totalPages: Math.max(Math.ceil(totalItems / limit), 1),
    totalItems,
    limit,
    data: categories,
  });
});

/**
 * @desc    Get a single expense category by id
 * @route   GET /api/expense-categories/:id
 * @access  Private (any authenticated user)
 */
export const getExpenseCategoryById = asyncHandler(async (req, res) => {
  const { companyId } = getScope(req);

  const category = await ExpenseCategory.findOne({ _id: req.params.id, companyId }).populate(
    'createdBy',
    'name email'
  );
  if (!category) {
    throw new AppError('Expense category not found', 404);
  }

  res.status(200).json({ success: true, data: category });
});

/**
 * @desc    Update an expense category
 * @route   PUT /api/expense-categories/:id
 * @access  Private (any authenticated user)
 */
export const updateExpenseCategory = asyncHandler(async (req, res) => {
  const { name, description, status } = req.body;
  const { companyId } = getScope(req);

  const category = await ExpenseCategory.findOne({ _id: req.params.id, companyId });
  if (!category) {
    throw new AppError('Expense category not found', 404);
  }

  if (name !== undefined) {
    if (!name.trim()) {
      throw new AppError('Category name is required', 400);
    }
    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      throw new AppError('Category name must be at least 2 characters', 400);
    }

    const duplicate = await ExpenseCategory.findOne({
      _id: { $ne: category._id },
      companyId,
      name: { $regex: `^${escapeRegex(trimmedName)}$`, $options: 'i' },
    });
    if (duplicate) {
      throw new AppError('An expense category with this name already exists', 409);
    }

    category.name = trimmedName;
  }

  if (description !== undefined) {
    category.description = description.trim();
  }

  if (status !== undefined) {
    if (!ALLOWED_STATUSES.includes(status)) {
      throw new AppError(`Status must be one of: ${ALLOWED_STATUSES.join(', ')}`, 400);
    }
    category.status = status;
  }

  await category.save();

  res.status(200).json({ success: true, data: category });
});

/**
 * @desc    Deactivate (soft-delete) an expense category. Categories that
 *          already have expenses recorded against them are never hard
 *          deleted — same reasoning as Customer/Supplier deactivation —
 *          so historical expenses keep a valid category reference and
 *          reports stay accurate. If the category has never been used,
 *          it is safe to hard-delete instead.
 * @route   DELETE /api/expense-categories/:id
 * @access  Private (any authenticated user)
 */
export const deleteExpenseCategory = asyncHandler(async (req, res) => {
  const { companyId } = getScope(req);

  const category = await ExpenseCategory.findOne({ _id: req.params.id, companyId });
  if (!category) {
    throw new AppError('Expense category not found', 404);
  }

  const usageCount = await Expense.countDocuments({ companyId, categoryId: category._id });

  if (usageCount > 0) {
    if (category.status === 'inactive') {
      throw new AppError('This category is already deactivated', 400);
    }
    category.status = 'inactive';
    await category.save();
    return res.status(200).json({
      success: true,
      message: 'Category is in use by existing expenses — deactivated instead of deleted',
      data: category,
    });
  }

  await ExpenseCategory.deleteOne({ _id: category._id, companyId });

  res.status(200).json({
    success: true,
    message: 'Expense category deleted successfully',
    data: { id: category._id },
  });
});
