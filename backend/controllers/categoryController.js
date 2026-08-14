import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/AppError.js';
import escapeRegex from '../utils/escapeRegex.js';
import ApiFeatures from '../utils/apiFeatures.js';
import Category from '../models/Category.js';

const ALLOWED_STATUSES = ['active', 'inactive'];

// companyId isn't on the User model yet (no Company module = no real
// tenants), so every request scopes to companyId: null for now. Reading
// it this way (rather than hardcoding null in every query below) means
// the moment companyId is added to User/JWT, every query here scopes
// correctly with zero changes.
const getScope = (req) => ({ companyId: req.user.companyId || null });

// Product doesn't exist yet as a module, so there's no real count to
// query. This keeps the "Product Count" column in the API response
// today, wired to a real aggregate once the Product module ships.
const withProductCount = (category) => ({
  ...category.toObject(),
  productCount: 0,
});

/**
 * @desc    Create a category
 * @route   POST /api/categories
 * @access  Private (any authenticated user)
 */
export const createCategory = asyncHandler(async (req, res) => {
  const { name, description, status } = req.body;

  if (!name || !name.trim()) {
    throw new AppError('Category name is required', 400);
  }

  if (status && !ALLOWED_STATUSES.includes(status)) {
    throw new AppError(`Status must be one of: ${ALLOWED_STATUSES.join(', ')}`, 400);
  }

  const { companyId } = getScope(req);
  const trimmedName = name.trim();

  const existing = await Category.findOne({
    companyId,
    name: { $regex: `^${escapeRegex(trimmedName)}$`, $options: 'i' },
  });
  if (existing) {
    throw new AppError('A category with this name already exists', 409);
  }

  const category = await Category.create({
    name: trimmedName,
    description: description?.trim() || '',
    status: status || 'active',
    companyId,
    branchId: null, // multi-branch not implemented yet
    createdBy: req.user._id,
  });

  res.status(201).json({ success: true, data: withProductCount(category) });
});

/**
 * @desc    List categories (paginated, searchable, filterable)
 * @route   GET /api/categories?page=&limit=&search=&status=&sort=
 * @access  Private (any authenticated user)
 */
export const getCategories = asyncHandler(async (req, res) => {
  const { companyId } = getScope(req);

  if (req.query.status && !ALLOWED_STATUSES.includes(req.query.status)) {
    throw new AppError(`Status must be one of: ${ALLOWED_STATUSES.join(', ')}`, 400);
  }

  const { filter, sort, page, limit, skip } = new ApiFeatures(
    { companyId },
    req.query
  )
    .search(['name', 'description'])
    .applyFilters(['status'])
    .build();

  const [categories, total] = await Promise.all([
    Category.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'name email'),
    Category.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    count: categories.length,
    total,
    page,
    pages: Math.max(Math.ceil(total / limit), 1),
    data: categories.map(withProductCount),
  });
});

/**
 * @desc    Get a single category by id
 * @route   GET /api/categories/:id
 * @access  Private (any authenticated user)
 */
export const getCategoryById = asyncHandler(async (req, res) => {
  const { companyId } = getScope(req);

  const category = await Category.findOne({
    _id: req.params.id,
    companyId,
  }).populate('createdBy', 'name email');

  if (!category) {
    throw new AppError('Category not found', 404);
  }

  res.status(200).json({ success: true, data: withProductCount(category) });
});

/**
 * @desc    Update a category
 * @route   PUT /api/categories/:id
 * @access  Private (any authenticated user)
 */
export const updateCategory = asyncHandler(async (req, res) => {
  const { name, description, status } = req.body;
  const { companyId } = getScope(req);

  const category = await Category.findOne({ _id: req.params.id, companyId });
  if (!category) {
    throw new AppError('Category not found', 404);
  }

  if (name !== undefined) {
    if (!name.trim()) {
      throw new AppError('Category name is required', 400);
    }
    const trimmedName = name.trim();

    const duplicate = await Category.findOne({
      _id: { $ne: category._id },
      companyId,
      name: { $regex: `^${escapeRegex(trimmedName)}$`, $options: 'i' },
    });
    if (duplicate) {
      throw new AppError('A category with this name already exists', 409);
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

  res.status(200).json({ success: true, data: withProductCount(category) });
});

/**
 * @desc    Delete a category
 * @route   DELETE /api/categories/:id
 * @access  Private (any authenticated user)
 */
export const deleteCategory = asyncHandler(async (req, res) => {
  const { companyId } = getScope(req);

  const category = await Category.findOneAndDelete({
    _id: req.params.id,
    companyId,
  });

  if (!category) {
    throw new AppError('Category not found', 404);
  }

  res.status(200).json({
    success: true,
    message: 'Category deleted successfully',
    data: { id: category._id },
  });
});
