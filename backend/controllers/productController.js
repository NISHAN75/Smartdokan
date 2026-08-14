import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/AppError.js';
import escapeRegex from '../utils/escapeRegex.js';
import ApiFeatures from '../utils/apiFeatures.js';
import Product from '../models/Product.js';
import Category from '../models/Category.js';

const ALLOWED_STATUSES = ['active', 'inactive'];
const ALLOWED_UNITS = ['pcs', 'kg', 'gram', 'liter', 'ml', 'box', 'packet', 'piece', 'dozen', 'other'];

// Same reasoning as Category's getScope: companyId isn't on the User
// model yet (no Company module = no real tenants), so every request
// scopes to companyId: null for now. The moment companyId is added to
// User/JWT, every query here scopes correctly with zero changes.
const getScope = (req) => ({ companyId: req.user.companyId || null });

// Confirms the given categoryId exists AND belongs to the same company
// scope as the requester — a product must never reference another
// company's category once multi-company is real.
const assertCategoryInScope = async (categoryId, companyId) => {
  if (!categoryId) {
    throw new AppError('Category is required', 400);
  }

  const category = await Category.findOne({ _id: categoryId, companyId });
  if (!category) {
    throw new AppError('Selected category does not exist', 400);
  }

  return category;
};
const assertSkuAvailable = async (sku, companyId, excludeId) => {
  const duplicate = await Product.findOne({
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    companyId,
    sku: { $regex: `^${escapeRegex(sku)}$`, $options: 'i' },
  });
  if (duplicate) {
    throw new AppError('A product with this SKU already exists', 409);
  }
};
// Validates purchasePrice is present, numeric, and non-negative.
// Accepts number or numeric-string input (form fields arrive as strings)
// and returns the coerced Number for storage.
const validatePurchasePrice = (rawValue) => {
  if (rawValue === undefined || rawValue === null || rawValue === '') {
    throw new AppError('Purchase price is required', 400);
  }

  const value = Number(rawValue);
  if (Number.isNaN(value)) {
    throw new AppError('Purchase price must be a valid number', 400);
  }
  if (value < 0) {
    throw new AppError('Purchase price cannot be negative', 400);
  }

  return value;
};
// Validates sellingPrice is present, numeric, and non-negative.
// Decimal values are allowed (same rules as purchasePrice, different
// field name in the error messages).
const validateSellingPrice = (rawValue) => {
  if (rawValue === undefined || rawValue === null || rawValue === '') {
    throw new AppError('Selling price is required', 400);
  }

  const value = Number(rawValue);
  if (Number.isNaN(value)) {
    throw new AppError('Selling price must be a valid number', 400);
  }
  if (value < 0) {
    throw new AppError('Selling price cannot be negative', 400);
  }

  return value;
};

// Shared validator for minimumStock/openingStock: required, numeric,
// non-negative, and a whole number (no decimals) — unlike purchasePrice/
// sellingPrice which explicitly allow decimals.
const validateStockInteger = (rawValue, fieldLabel) => {
  if (rawValue === undefined || rawValue === null || rawValue === '') {
    throw new AppError(`${fieldLabel} is required`, 400);
  }

  const value = Number(rawValue);
  if (Number.isNaN(value)) {
    throw new AppError(`${fieldLabel} must be a valid number`, 400);
  }
  if (value < 0) {
    throw new AppError(`${fieldLabel} cannot be negative`, 400);
  }
  if (!Number.isInteger(value)) {
    throw new AppError(`${fieldLabel} must be a whole number`, 400);
  }

  return value;
};
// Validates unit against the fixed, controlled dropdown list. Falls back
// to the 'pcs' default only when the caller explicitly wants a
// creation-time default (see createProduct) — update calls this only
// when a unit value was actually sent.
const validateUnit = (rawValue) => {
  if (!ALLOWED_UNITS.includes(rawValue)) {
    throw new AppError(`Unit must be one of: ${ALLOWED_UNITS.join(', ')}`, 400);
  }
  return rawValue;
};
const assertBarcodeAvailable = async (barcode, companyId, excludeId) => {
  const duplicate = await Product.findOne({
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    companyId,
    barcode: { $regex: `^${escapeRegex(barcode)}$`, $options: 'i' },
  });
  if (duplicate) {
    throw new AppError('A product with this barcode already exists', 409);
  }
};

/**
 * @desc    Create a product
 * @route   POST /api/products
 * @access  Private (any authenticated user)
 */
export const createProduct = asyncHandler(async (req, res) => {
  const {
      name,
      sku,
      barcode,
      categoryId,
      description,
      status,
      purchasePrice,
      sellingPrice,
      minimumStock,
      openingStock,
      unit,
    } = req.body;

  if (!name || !name.trim()) {
    throw new AppError('Product name is required', 400);
  }
  if (!sku || !sku.trim()) {
    throw new AppError('SKU is required', 400);
  }
  
  if (status && !ALLOWED_STATUSES.includes(status)) {
    throw new AppError(`Status must be one of: ${ALLOWED_STATUSES.join(', ')}`, 400);
  }

  const { companyId } = getScope(req);
  const validatedPurchasePrice = validatePurchasePrice(purchasePrice);
  const validatedSellingPrice = validateSellingPrice(sellingPrice);
  const validatedMinimumStock = validateStockInteger(minimumStock, 'Minimum stock');
  const validatedOpeningStock = validateStockInteger(openingStock, 'Opening stock');
  const validatedUnit = validateUnit(unit || 'pcs');
  const trimmedName = name.trim();
  const trimmedSku = sku.trim();
  const trimmedBarcode = barcode?.trim() || undefined;

  // Validates the category exists and belongs to this company scope —
  // also catches a malformed categoryId via Mongo's CastError, which
  // the existing errorHandler already turns into a clean 400.
  await assertCategoryInScope(categoryId, companyId);
  
  await assertSkuAvailable(trimmedSku, companyId);
  if (trimmedBarcode) {
    await assertBarcodeAvailable(trimmedBarcode, companyId);
  }


  const existing = await Product.findOne({
    companyId,
    name: { $regex: `^${escapeRegex(trimmedName)}$`, $options: 'i' },
  });
  if (existing) {
    throw new AppError('A product with this name already exists', 409);
  }

  const product = await Product.create({
    name: trimmedName,
    sku: trimmedSku,
    barcode: trimmedBarcode,
    purchasePrice: validatedPurchasePrice,
    sellingPrice: validatedSellingPrice,
    minimumStock: validatedMinimumStock,
    openingStock: validatedOpeningStock,
    unit: validatedUnit,
    categoryId,
    description: description?.trim() || '',
    status: status || 'active',
    companyId,
    branchId: null, // multi-branch not implemented yet
    createdBy: req.user._id,
  });

  const populated = await product.populate('categoryId', 'name');

  res.status(201).json({ success: true, data: populated });
});

/**
 * @desc    List products (paginated, searchable, filterable)
 * @route   GET /api/products?page=&limit=&search=&category=&status=&sort=
 * @access  Private (any authenticated user)
 */
export const getProducts = asyncHandler(async (req, res) => {
  const { companyId } = getScope(req);

  if (req.query.status && !ALLOWED_STATUSES.includes(req.query.status)) {
    throw new AppError(`Status must be one of: ${ALLOWED_STATUSES.join(', ')}`, 400);
  }

  // `category` is exposed as the query param name (per the API spec),
  // mapped internally to the `categoryId` schema field.
  const queryStringForFilters = {
    ...req.query,
    ...(req.query.category ? { categoryId: req.query.category } : {}),
  };

  const { filter, sort, page, limit, skip } = new ApiFeatures(
    { companyId },
    queryStringForFilters
  )
    .search(['name', 'description', 'sku','barcode']) 
    .applyFilters(['status', 'categoryId'])
    .build();

  const [products, totalItems] = await Promise.all([
    Product.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('categoryId', 'name')
      .populate('createdBy', 'name email'),
    Product.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    count: products.length,
    currentPage: page,
    totalPages: Math.max(Math.ceil(totalItems / limit), 1),
    totalItems,
    limit,
    data: products,
  });
});

/**
 * @desc    Get a single product by id
 * @route   GET /api/products/:id
 * @access  Private (any authenticated user)
 */
export const getProductById = asyncHandler(async (req, res) => {
  const { companyId } = getScope(req);

  const product = await Product.findOne({ _id: req.params.id, companyId })
    .populate('categoryId', 'name')
    .populate('createdBy', 'name email');

  if (!product) {
    throw new AppError('Product not found', 404);
  }

  res.status(200).json({ success: true, data: product });
});

/**
 * @desc    Update a product
 * @route   PUT /api/products/:id
 * @access  Private (any authenticated user)
 */
export const updateProduct = asyncHandler(async (req, res) => {
  const {
      name,
      sku,
      barcode,
      categoryId,
      description,
      status,
      purchasePrice,
      sellingPrice,
      minimumStock,
      openingStock,
      unit,
    } = req.body;
  const { companyId } = getScope(req);
  const product = await Product.findOne({ _id: req.params.id, companyId });
  if (!product) {
    throw new AppError('Product not found', 404);
  }

  if (name !== undefined) {
    if (!name.trim()) {
      throw new AppError('Product name is required', 400);
    }
    const trimmedName = name.trim();

    const duplicate = await Product.findOne({
      _id: { $ne: product._id },
      companyId,
      name: { $regex: `^${escapeRegex(trimmedName)}$`, $options: 'i' },
    });
    if (duplicate) {
      throw new AppError('A product with this name already exists', 409);
    }

    product.name = trimmedName;
  }
  if (sku !== undefined) {
    if (!sku.trim()) {
        throw new AppError('SKU is required', 400);
    }
    const trimmedSku = sku.trim();
    await assertSkuAvailable(trimmedSku, companyId, product._id);
    product.sku = trimmedSku;
  }
  if (barcode !== undefined) {
        const trimmedBarcode = barcode?.trim() || undefined;
        if (trimmedBarcode) {
            await assertBarcodeAvailable(trimmedBarcode, companyId, product._id);
            product.barcode = trimmedBarcode;
        } else {
            product.barcode = undefined;
        }
  } 

  if (categoryId !== undefined) {
    await assertCategoryInScope(categoryId, companyId);
    product.categoryId = categoryId;
  }

  if (description !== undefined) {
    product.description = description.trim();
  }

  if (status !== undefined) {
    if (!ALLOWED_STATUSES.includes(status)) {
      throw new AppError(`Status must be one of: ${ALLOWED_STATUSES.join(', ')}`, 400);
    }
    product.status = status;
  }
  if (purchasePrice !== undefined) {
    product.purchasePrice = validatePurchasePrice(purchasePrice);
  }
  if (sellingPrice !== undefined) {
    product.sellingPrice = validateSellingPrice(sellingPrice);
  }

  if (minimumStock !== undefined) {
    product.minimumStock = validateStockInteger(minimumStock, 'Minimum stock');
  }

  if (openingStock !== undefined) {
    product.openingStock = validateStockInteger(openingStock, 'Opening stock');
  }

  if (unit !== undefined) {
    product.unit = validateUnit(unit);
  }

  await product.save();
  await product.populate('categoryId', 'name');

  res.status(200).json({ success: true, data: product });
});

/**
 * @desc    Delete a product
 * @route   DELETE /api/products/:id
 * @access  Private (any authenticated user)
 */
export const deleteProduct = asyncHandler(async (req, res) => {
  const { companyId } = getScope(req);

  const product = await Product.findOneAndDelete({ _id: req.params.id, companyId });
  if (!product) {
    throw new AppError('Product not found', 404);
  }

  res.status(200).json({
    success: true,
    message: 'Product deleted successfully',
    data: { id: product._id },
  });
});