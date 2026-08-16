import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/AppError.js';
import generateToken from '../utils/generateToken.js';
import User from '../models/User.js';
import { createRawToken, hashToken } from '../utils/authTokens.js';
import { buildPasswordResetEmail, buildVerificationEmail, sendEmail } from '../utils/email.js';

const FRONTEND_URL = () => (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');
const VERIFICATION_HOURS = 24;
const RESET_MINUTES = 30;

const sendVerificationEmail = async (user, rawToken) => {
  const verificationUrl = `${FRONTEND_URL()}/verify-email?token=${encodeURIComponent(rawToken)}`;
  const email = buildVerificationEmail({ name: user.name, verificationUrl });
  return sendEmail({ to: user.email, ...email });
};

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
export const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const normalizedEmail = email?.toLowerCase().trim();

  if (!name || !normalizedEmail || !password) {
    throw new AppError('Name, email and password are all required', 400);
  }

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw new AppError('An account with this email already exists', 409);
  }

  const rawToken = createRawToken();
  const user = await User.create({
    name,
    email: normalizedEmail,
    password,
    isEmailVerified: false,
    emailVerificationToken: hashToken(rawToken),
    emailVerificationExpires: new Date(Date.now() + VERIFICATION_HOURS * 60 * 60 * 1000),
  });

  try {
    await sendVerificationEmail(user, rawToken);
  } catch (error) {
    await User.deleteOne({ _id: user._id });
    if (error.code === 'EMAIL_CONFIG_MISSING') {
      throw new AppError('Verification email is not configured on the server', 503);
    }
    throw new AppError('Account could not be created because the verification email could not be sent. Please try again later.', 503);
  }

  res.status(201).json({
    success: true,
    message: 'Account created. Please check your email to verify your account.',
    data: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isEmailVerified: false,
    },
  });
});

/**
 * @desc    Verify a user's email address
 * @route   GET /api/auth/verify-email?token=...
 * @access  Public
 */
export const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.query;
  if (!token) throw new AppError('Verification token is required', 400);

  const user = await User.findOne({
    emailVerificationToken: hashToken(token),
    emailVerificationExpires: { $gt: new Date() },
  }).select('+emailVerificationToken +emailVerificationExpires');

  if (!user) {
    throw new AppError('This verification link is invalid or has expired', 400);
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save({ validateBeforeSave: false });

  res.status(200).json({ success: true, message: 'Email verified successfully. You can now sign in.' });
});

/**
 * @desc    Resend verification email
 * @route   POST /api/auth/resend-verification
 * @access  Public
 */
export const resendVerification = asyncHandler(async (req, res) => {
  const normalizedEmail = req.body.email?.toLowerCase().trim();
  const genericMessage = 'If an unverified account exists for this email, a verification email has been sent.';

  if (!normalizedEmail) {
    return res.status(200).json({ success: true, message: genericMessage });
  }

  const user = await User.findOne({ email: normalizedEmail });
  if (!user || user.isEmailVerified || !user.isActive) {
    return res.status(200).json({ success: true, message: genericMessage });
  }

  const rawToken = createRawToken();
  user.emailVerificationToken = hashToken(rawToken);
  user.emailVerificationExpires = new Date(Date.now() + VERIFICATION_HOURS * 60 * 60 * 1000);
  await user.save({ validateBeforeSave: false });

  try {
    await sendVerificationEmail(user, rawToken);
  } catch (error) {
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save({ validateBeforeSave: false });
    if (error.code === 'EMAIL_CONFIG_MISSING') {
      throw new AppError('Verification email is not configured on the server', 503);
    }
    throw new AppError('Verification email could not be sent. Please try again later.', 503);
  }

  res.status(200).json({ success: true, message: genericMessage });
});

/**
 * @desc    Authenticate user & set JWT cookie
 * @route   POST /api/auth/login
 * @access  Public
 */
export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = email?.toLowerCase().trim();

  if (!normalizedEmail || !password) {
    throw new AppError('Email and password are required', 400);
  }

  const user = await User.findOne({ email: normalizedEmail }).select('+password');

  if (!user || !(await user.matchPassword(password))) {
    throw new AppError('Invalid email or password', 401);
  }

  if (!user.isActive) {
    throw new AppError('This account has been deactivated', 403);
  }

  if (!user.isEmailVerified) {
    throw new AppError('Please verify your email before logging in', 403);
  }

  generateToken(res, user._id);

  res.status(200).json({
    success: true,
    data: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
    },
  });
});

/**
 * @desc    Send a password reset email
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
export const forgotPassword = asyncHandler(async (req, res) => {
  const normalizedEmail = req.body.email?.toLowerCase().trim();
  const genericMessage = 'If an account exists for this email, a password reset link has been sent.';

  if (!normalizedEmail) {
    return res.status(200).json({ success: true, message: genericMessage });
  }

  const user = await User.findOne({ email: normalizedEmail });
  if (!user || !user.isActive) {
    return res.status(200).json({ success: true, message: genericMessage });
  }

  const rawToken = createRawToken();
  user.passwordResetToken = hashToken(rawToken);
  user.passwordResetExpires = new Date(Date.now() + RESET_MINUTES * 60 * 1000);
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${FRONTEND_URL()}/reset-password?token=${encodeURIComponent(rawToken)}`;
  const email = buildPasswordResetEmail({ name: user.name, resetUrl });

  try {
    await sendEmail({ to: user.email, ...email });
  } catch (error) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    if (error.code === 'EMAIL_CONFIG_MISSING') {
      throw new AppError('Password reset email is not configured on the server', 503);
    }
    throw new AppError('Password reset email could not be sent. Please try again later.', 503);
  }

  res.status(200).json({ success: true, message: genericMessage });
});

/**
 * @desc    Reset password using a one-time token
 * @route   POST /api/auth/reset-password
 * @access  Public
 */
export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    throw new AppError('Reset token and new password are required', 400);
  }

  if (password.length < 6) {
    throw new AppError('Password must be at least 6 characters', 400);
  }

  const user = await User.findOne({
    passwordResetToken: hashToken(token),
    passwordResetExpires: { $gt: new Date() },
  }).select('+passwordResetToken +passwordResetExpires');

  if (!user) {
    throw new AppError('This password reset link is invalid or has expired', 400);
  }

  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  res.status(200).json({ success: true, message: 'Password reset successfully. You can now sign in.' });
});

/**
 * @desc    Get currently authenticated user's profile
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getMe = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      isActive: req.user.isActive,
      isEmailVerified: req.user.isEmailVerified,
    },
  });
});

/**
 * @desc    Log the user out by clearing the auth cookie
 * @route   POST /api/auth/logout
 * @access  Private
 */
export const logoutUser = asyncHandler(async (req, res) => {
  res.cookie('token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    expires: new Date(0),
    maxAge: 0,
  });

  res.status(200).json({ success: true, message: 'Logged out successfully' });
});
