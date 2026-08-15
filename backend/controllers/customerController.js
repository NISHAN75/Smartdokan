import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/AppError.js';
import ApiFeatures from '../utils/apiFeatures.js';
import Customer from '../models/Customer.js';

// Same reasoning as every other controller's getScope: companyId isn't
// on the User model yet, so every request scopes to companyId: null
// for now.
const getScope = (req) => ({ companyId: req.user.companyId || null });

const assertPhoneAvailable = async (phone, companyId, excludeId) => {
  const duplicate = await Customer.findOne({
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    companyId,
    phone,
  });
  if (duplicate) {
    throw new AppError('A customer with this phone number already exists', 409);
  }
};

/**
 * @desc    Create a customer
 * @route   POST /api/customers
 * @access  Private (any authenticated user)
 */
export const createCustomer = asyncHandler(async (req, res) => {
  const { name, phone, email, address } = req.body;

  if (!name || !name.trim()) {
    throw new AppError('Customer name is required', 400);
  }
  if (!phone || !phone.trim()) {
    throw new AppError('Phone number is required', 400);
  }

  const { companyId } = getScope(req);
  const trimmedPhone = phone.trim();

  await assertPhoneAvailable(trimmedPhone, companyId);

  const customer = await Customer.create({
    name: name.trim(),
    phone: trimmedPhone,
    email: email?.trim() || '',
    address: address?.trim() || '',
    companyId,
    branchId: null,
    createdBy: req.user._id,
  });

  res.status(201).json({ success: true, data: customer });
});

/**
 * @desc    List customers (paginated, searchable) — used by the POS
 *          customer picker
 * @route   GET /api/customers?page=&limit=&search=
 * @access  Private (any authenticated user)
 */
export const getCustomers = asyncHandler(async (req, res) => {
  const { companyId } = getScope(req);

  const { filter, sort, page, limit, skip } = new ApiFeatures({ companyId }, req.query)
    .search(['name', 'phone', 'email'])
    .build();

  const [customers, totalItems] = await Promise.all([
    Customer.find(filter).sort(sort).skip(skip).limit(limit),
    Customer.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    count: customers.length,
    currentPage: page,
    totalPages: Math.max(Math.ceil(totalItems / limit), 1),
    totalItems,
    limit,
    data: customers,
  });
});

/**
 * @desc    Get a single customer by id
 * @route   GET /api/customers/:id
 * @access  Private (any authenticated user)
 */
export const getCustomerById = asyncHandler(async (req, res) => {
  const { companyId } = getScope(req);

  const customer = await Customer.findOne({ _id: req.params.id, companyId });
  if (!customer) {
    throw new AppError('Customer not found', 404);
  }

  res.status(200).json({ success: true, data: customer });
});
