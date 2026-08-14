import AppError from '../utils/AppError.js';

/**
 * Handles requests to undefined routes.
 */
export const notFound = (req, res, next) => {
  next(new AppError(`Route not found - ${req.originalUrl}`, 404));
};

/**
 * Centralized error handler. Normalizes known Mongoose/JWT errors
 * into clean, consistent JSON responses and hides internal
 * details/stack traces in production.
 */
export const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';

  // Mongoose invalid ObjectId
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid value for field '${err.path}'`;
  }

  // Mongoose duplicate key (e.g. email already registered, or a
  // duplicate category name slipping past the controller's own
  // pre-check under a race condition)
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0];
    if (field === 'email') {
      message = `An account with this ${field} already exists`;
    } else if (field === 'sku') {
      message = 'A product with this SKU already exists';
    } else {
      message = `A record with this ${field} already exists`;
    }
  }

  // Mongoose schema validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((val) => val.message)
      .join(', ');
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
