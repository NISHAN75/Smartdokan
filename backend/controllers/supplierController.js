import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/AppError.js';
import ApiFeatures from '../utils/apiFeatures.js';
import Supplier from '../models/Supplier.js';

// Same reasoning as every other controller's getScope: companyId isn't
// on the User model yet, so every request scopes to companyId: null
// for now.
const getScope = (req) => ({ companyId: req.user.companyId || null });

const ALLOWED_STATUSES = ['active', 'inactive'];

const assertPhoneAvailable = async (phone, companyId, excludeId) => {
  const duplicate = await Supplier.findOne({
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    companyId,
    phone,
  });
  if (duplicate) {
    throw new AppError('A supplier with this phone number already exists', 409);
  }
};

/**
 * @desc    Create a supplier
 * @route   POST /api/suppliers
 * @access  Private (any authenticated user)
 */
export const createSupplier = asyncHandler(async (req, res) => {
  const { name, phone, email, address, status } = req.body;

  if (!name || !name.trim()) {
    throw new AppError('Supplier name is required', 400);
  }
  if (!phone || !phone.trim()) {
    throw new AppError('Phone number is required', 400);
  }
  if (status && !ALLOWED_STATUSES.includes(status)) {
    throw new AppError(`Status must be one of: ${ALLOWED_STATUSES.join(', ')}`, 400);
  }

  const { companyId } = getScope(req);
  const trimmedPhone = phone.trim();

  await assertPhoneAvailable(trimmedPhone, companyId);

  const supplier = await Supplier.create({
    name: name.trim(),
    phone: trimmedPhone,
    email: email?.trim() || '',
    address: address?.trim() || '',
    status: status || 'active',
    companyId,
    branchId: null,
    createdBy: req.user._id,
  });

  res.status(201).json({ success: true, data: supplier });
});

/**
 * @desc    List suppliers (paginated, searchable) — used by the
 *          Purchases supplier picker
 * @route   GET /api/suppliers?page=&limit=&search=&status=
 * @access  Private (any authenticated user)
 */
export const getSuppliers = asyncHandler(async (req, res) => {
  const { companyId } = getScope(req);

  if (req.query.status && !ALLOWED_STATUSES.includes(req.query.status)) {
    throw new AppError(`Status must be one of: ${ALLOWED_STATUSES.join(', ')}`, 400);
  }

  const { filter, sort, page, limit, skip } = new ApiFeatures({ companyId }, req.query)
    .search(['name', 'phone', 'email'])
    .applyFilters(['status'])
    .build();

  const [suppliers, totalItems] = await Promise.all([
    Supplier.find(filter).sort(sort).skip(skip).limit(limit),
    Supplier.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    count: suppliers.length,
    currentPage: page,
    totalPages: Math.max(Math.ceil(totalItems / limit), 1),
    totalItems,
    limit,
    data: suppliers,
  });
});

/**
 * @desc    Get a single supplier by id
 * @route   GET /api/suppliers/:id
 * @access  Private (any authenticated user)
 */
export const getSupplierById = asyncHandler(async (req, res) => {
  const { companyId } = getScope(req);

  const supplier = await Supplier.findOne({ _id: req.params.id, companyId });
  if (!supplier) {
    throw new AppError('Supplier not found', 404);
  }

  res.status(200).json({ success: true, data: supplier });
});
