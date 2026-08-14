import jwt from 'jsonwebtoken';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/AppError.js';
import User from '../models/User.js';

/**
 * Verifies the JWT (from cookie or Authorization header),
 * loads the corresponding user, and attaches it to req.user.
 */
export const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.cookies?.token) {
    token = req.cookies.token;
  } else if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    throw new AppError('Not authorized, no token provided', 401);
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new AppError('Not authorized, invalid or expired token', 401);
  }

  const user = await User.findById(decoded.id);

  if (!user) {
    throw new AppError('Not authorized, user no longer exists', 401);
  }

  if (!user.isActive) {
    throw new AppError('This account has been deactivated', 403);
  }

  req.user = user;
  next();
});

/**
 * Restricts a route to specific roles.
 * Usage: router.get('/admin-only', protect, authorize('admin'), handler)
 */
export const authorize =
  (...allowedRoles) =>
  (req, res, next) => {
    if (!req.user) {
      throw new AppError('Not authorized, no user context', 401);
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new AppError(
        `Role '${req.user.role}' is not permitted to access this resource`,
        403
      );
    }

    next();
  };
