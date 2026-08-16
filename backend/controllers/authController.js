import crypto from 'crypto';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/AppError.js';
import generateToken from '../utils/generateToken.js';
import sendEmail from '../utils/sendEmail.js';
import User from '../models/User.js';

const FRONTEND_URL = () => (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');
const TOKEN_MINUTES = 30;

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
const createRawToken = () => crypto.randomBytes(32).toString('hex');

const userData = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  isActive: user.isActive,
  emailVerified: user.emailVerified !== false,
});

const sendVerificationEmail = async (user, rawToken) => {
  const url = `${FRONTEND_URL()}/verify-email?token=${encodeURIComponent(rawToken)}`;
  await sendEmail({
    to: user.email,
    subject: 'Verify your SmartDokan email',
    text: `Hi ${user.name}, verify your SmartDokan email: ${url}. This link expires in ${TOKEN_MINUTES} minutes.`,
    html: `<p>Hi ${user.name},</p><p>Please verify your SmartDokan email address.</p><p><a href="${url}">Verify email</a></p><p>This link expires in ${TOKEN_MINUTES} minutes.</p>`,
  });
};

export const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) throw new AppError('Name, email and password are all required', 400);

  const normalizedEmail = email.toLowerCase().trim();
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) throw new AppError('An account with this email already exists', 409);

  const rawToken = createRawToken();
  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    password,
    emailVerified: false,
    emailVerificationToken: hashToken(rawToken),
    emailVerificationExpires: new Date(Date.now() + TOKEN_MINUTES * 60 * 1000),
  });

  try {
    await sendVerificationEmail(user, rawToken);
  } catch (error) {
    await User.deleteOne({ _id: user._id });
    throw new AppError('Account could not be created because the verification email could not be sent. Please try again later.', 503);
  }

  res.status(201).json({
    success: true,
    message: 'Registration successful. Please check your email to verify your account.',
    data: userData(user),
  });
});

export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new AppError('Email and password are required', 400);

  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password +emailVerificationToken +emailVerificationExpires');
  if (!user || !(await user.matchPassword(password))) throw new AppError('Invalid email or password', 401);
  if (!user.isActive) throw new AppError('This account has been deactivated', 403);
  if (user.emailVerified === false) throw new AppError('Please verify your email before signing in', 403);

  generateToken(res, user._id);
  res.status(200).json({ success: true, data: userData(user) });
});

export const getMe = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, data: userData(req.user) });
});

export const logoutUser = asyncHandler(async (req, res) => {
  const isProduction = process.env.NODE_ENV === 'production';
  res.clearCookie('token', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
  });
  res.status(200).json({ success: true, message: 'Logged out successfully' });
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.body;
  if (!token) throw new AppError('Verification token is required', 400);

  const user = await User.findOne({
    emailVerificationToken: hashToken(token),
    emailVerificationExpires: { $gt: new Date() },
  }).select('+emailVerificationToken +emailVerificationExpires');

  if (!user) throw new AppError('Verification link is invalid or expired', 400);

  user.emailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save({ validateBeforeSave: false });

  res.status(200).json({ success: true, message: 'Email verified successfully. You can now sign in.' });
});

export const resendVerificationEmail = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) throw new AppError('Email is required', 400);

  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+emailVerificationToken +emailVerificationExpires');
  if (!user || user.emailVerified !== false) {
    return res.status(200).json({ success: true, message: 'If an unverified account exists for that email, a verification email has been sent.' });
  }

  const rawToken = createRawToken();
  user.emailVerificationToken = hashToken(rawToken);
  user.emailVerificationExpires = new Date(Date.now() + TOKEN_MINUTES * 60 * 1000);
  await user.save({ validateBeforeSave: false });
  await sendVerificationEmail(user, rawToken);

  res.status(200).json({ success: true, message: 'Verification email sent.' });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) throw new AppError('Email is required', 400);

  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+passwordResetToken +passwordResetExpires');
  const genericMessage = 'If an account exists for that email, a password reset link has been sent.';
  if (!user) return res.status(200).json({ success: true, message: genericMessage });

  const rawToken = createRawToken();
  user.passwordResetToken = hashToken(rawToken);
  user.passwordResetExpires = new Date(Date.now() + 30 * 60 * 1000);
  await user.save({ validateBeforeSave: false });

  const url = `${FRONTEND_URL()}/reset-password?token=${encodeURIComponent(rawToken)}`;
  try {
    await sendEmail({
      to: user.email,
      subject: 'Reset your SmartDokan password',
      text: `Hi ${user.name}, reset your SmartDokan password: ${url}. This link expires in 30 minutes.`,
      html: `<p>Hi ${user.name},</p><p>Reset your SmartDokan password using the link below.</p><p><a href="${url}">Reset password</a></p><p>This link expires in 30 minutes.</p>`,
    });
  } catch (error) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    throw new AppError('Password reset email could not be sent. Please try again later.', 503);
  }

  res.status(200).json({ success: true, message: genericMessage });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) throw new AppError('Reset token and new password are required', 400);
  if (password.length < 6) throw new AppError('Password must be at least 6 characters', 400);

  const user = await User.findOne({
    passwordResetToken: hashToken(token),
    passwordResetExpires: { $gt: new Date() },
  }).select('+passwordResetToken +passwordResetExpires');

  if (!user) throw new AppError('Password reset link is invalid or expired', 400);

  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  res.status(200).json({ success: true, message: 'Password reset successful. You can now sign in.' });
});
