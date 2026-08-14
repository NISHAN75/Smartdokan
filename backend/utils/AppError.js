/**
 * Custom error class for known, operational errors
 * (e.g. invalid credentials, duplicate email, forbidden access).
 * Distinguishes expected errors from unexpected programming errors.
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export default AppError;
