import mongoose from 'mongoose';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/AppError.js';
import ApiFeatures from '../utils/apiFeatures.js';
import User from '../models/User.js';

const ALLOWED_ROLES = ['admin', 'manager', 'staff'];
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const shapeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  isActive: user.isActive,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

/**
 * Guards against ever leaving the system with zero active admins —
 * used before deactivating a user or changing a user's role away from
 * 'admin'. Counts *other* active admins (excluding the user currently
 * being changed), so an admin can still freely edit their own
 * name/email, or edit themselves as long as another active admin exists.
 */
const assertNotLastActiveAdmin = async (targetUser) => {
  if (targetUser.role !== 'admin' || !targetUser.isActive) return;

  const otherActiveAdmins = await User.countDocuments({
    _id: { $ne: targetUser._id },
    role: 'admin',
    isActive: true,
  });

  if (otherActiveAdmins === 0) {
    throw new AppError('Cannot deactivate or demote the last active admin', 400);
  }
};

/**
 * @desc    List users (admin only)
 * @route   GET /api/users
 * @access  Private/Admin
 */
export const getUsers = asyncHandler(async (req, res) => {
  if (req.query.role && !ALLOWED_ROLES.includes(req.query.role)) {
    throw new AppError(`Role must be one of: ${ALLOWED_ROLES.join(', ')}`, 400);
  }

  const { filter, sort, page, limit, skip } = new ApiFeatures({}, req.query)
    .search(['name', 'email'])
    .applyFilters(['role'])
    .build();

  const [users, totalItems] = await Promise.all([
    User.find(filter).sort(sort).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    count: users.length,
    currentPage: page,
    totalPages: Math.max(Math.ceil(totalItems / limit), 1),
    totalItems,
    limit,
    data: users.map(shapeUser),
  });
});

/**
 * @desc    Get a single user by id (admin only)
 * @route   GET /api/users/:id
 * @access  Private/Admin
 */
export const getUserById = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    throw new AppError('Invalid user id', 400);
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  res.status(200).json({ success: true, data: shapeUser(user) });
});

/**
 * @desc    Create a staff/manager/admin user (admin only)
 * @route   POST /api/users
 * @access  Private/Admin
 */
export const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !name.trim() || name.trim().length < 2) {
    throw new AppError('Name must be at least 2 characters', 400);
  }
  if (!email || !emailRegex.test(email.trim())) {
    throw new AppError('Please provide a valid email address', 400);
  }
  if (!password || password.length < 6) {
    throw new AppError('Password must be at least 6 characters', 400);
  }
  if (role && !ALLOWED_ROLES.includes(role)) {
    throw new AppError(`Role must be one of: ${ALLOWED_ROLES.join(', ')}`, 400);
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw new AppError('An account with this email already exists', 409);
  }

  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    password,
    role: role || 'staff',
  });

  res.status(201).json({ success: true, data: shapeUser(user) });
});

/**
 * @desc    Update a user's name/email/role/active status (admin only)
 * @route   PATCH /api/users/:id
 * @access  Private/Admin
 *
 * Deliberately a single endpoint instead of separate role-change /
 * activate / deactivate endpoints — same "don't invent a complicated
 * permission system" spirit as the rest of the app. Every safety check
 * (last-admin protection) runs regardless of which field changed.
 */
export const updateUser = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    throw new AppError('Invalid user id', 400);
  }

  const { name, email, role, isActive } = req.body;

  const user = await User.findById(req.params.id);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const updates = {};

  if (name !== undefined) {
    if (!name.trim() || name.trim().length < 2) {
      throw new AppError('Name must be at least 2 characters', 400);
    }
    updates.name = name.trim();
  }

  if (email !== undefined) {
    if (!emailRegex.test(email.trim())) {
      throw new AppError('Please provide a valid email address', 400);
    }
    const normalizedEmail = email.trim().toLowerCase();
    const duplicate = await User.findOne({ email: normalizedEmail, _id: { $ne: user._id } });
    if (duplicate) {
      throw new AppError('An account with this email already exists', 409);
    }
    updates.email = normalizedEmail;
  }

  if (role !== undefined) {
    if (!ALLOWED_ROLES.includes(role)) {
      throw new AppError(`Role must be one of: ${ALLOWED_ROLES.join(', ')}`, 400);
    }
    if (user.role === 'admin' && role !== 'admin') {
      // Demoting an admin away from the role — verify another active
      // admin exists before allowing it.
      await assertNotLastActiveAdmin(user);
    }
    updates.role = role;
  }

  if (isActive !== undefined) {
    if (typeof isActive !== 'boolean') {
      throw new AppError('isActive must be true or false', 400);
    }
    if (isActive === false) {
      await assertNotLastActiveAdmin(user);
    }
    updates.isActive = isActive;
  }

  const updatedUser = await User.findByIdAndUpdate(
    user._id,
    { $set: updates },
    { new: true, runValidators: true }
  );

  res.status(200).json({ success: true, data: shapeUser(updatedUser) });
});
