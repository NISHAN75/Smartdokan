import bcrypt from 'bcryptjs';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/AppError.js';
import User from '../models/User.js';
import Settings from '../models/Settings.js';

const DEFAULT_SETTINGS = {
  shopName: 'SmartDokan',
  shopPhone: '',
  shopEmail: '',
  shopAddress: '',
  logoUrl: '',
  invoicePrefix: 'INV',
  currency: 'BDT',
  timezone: 'Asia/Dhaka',
  dateFormat: 'DD/MM/YYYY',
  defaultPaymentMethod: 'cash',
  taxRate: 0,
  defaultDiscount: 0,
  lowStockThreshold: 5,
  invoiceFooter: 'Thank you for your business.',
};

const cleanEmail = (email) => (email || '').trim().toLowerCase();

export const getSettings = asyncHandler(async (req, res) => {
  let settings = await Settings.findOne({
    userId: req.user._id,
  }).lean();

  if (!settings) {
    settings = await Settings.create({
      userId: req.user._id,
      ...DEFAULT_SETTINGS,
    });

    settings = settings.toObject();
  }

  res.json({
    success: true,
    data: {
      profile: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        isActive: req.user.isActive,
      },
      business: settings,
    },
  });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const { name, email } = req.body;

  if (!name || name.trim().length < 2) {
    throw new AppError(
      'Name must be at least 2 characters',
      400
    );
  }

  if (
    !email ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  ) {
    throw new AppError(
      'Please provide a valid email address',
      400
    );
  }

  const normalizedEmail = cleanEmail(email);

  const duplicate = await User.findOne({
    email: normalizedEmail,
    _id: { $ne: req.user._id },
  });

  if (duplicate) {
    throw new AppError(
      'An account with this email already exists',
      409
    );
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        name: name.trim(),
        email: normalizedEmail,
      },
    },
    {
      new: true,
      runValidators: true,
    }
  );

  res.json({
    success: true,
    data: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    },
  });
});

export const updatePassword = asyncHandler(async (req, res) => {
  const {
    currentPassword,
    newPassword,
    confirmPassword,
  } = req.body;

  if (!currentPassword || !newPassword || !confirmPassword) {
    throw new AppError(
      'Current password, new password and confirmation are required',
      400
    );
  }

  if (newPassword.length < 6) {
    throw new AppError(
      'New password must be at least 6 characters',
      400
    );
  }

  if (newPassword !== confirmPassword) {
    throw new AppError(
      'New password and confirmation do not match',
      400
    );
  }

  const user = await User.findById(req.user._id).select('+password');

  if (
    !user ||
    !(await bcrypt.compare(currentPassword, user.password))
  ) {
    throw new AppError(
      'Current password is incorrect',
      401
    );
  }

  user.password = newPassword;
  await user.save();

  res.json({
    success: true,
    message: 'Password changed successfully',
  });
});

export const updateBusinessSettings = asyncHandler(
  async (req, res) => {
    const allowed = [
      'shopName',
      'shopPhone',
      'shopEmail',
      'shopAddress',
      'logoUrl',
      'invoicePrefix',
      'currency',
      'timezone',
      'dateFormat',
      'defaultPaymentMethod',
      'taxRate',
      'defaultDiscount',
      'lowStockThreshold',
      'invoiceFooter',
    ];

    const payload = {};

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        payload[key] = req.body[key];
      }
    }

    if (
      payload.shopName !== undefined &&
      !String(payload.shopName).trim()
    ) {
      throw new AppError(
        'Shop name is required',
        400
      );
    }

    if (
      payload.shopEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        String(payload.shopEmail).trim()
      )
    ) {
      throw new AppError(
        'Please provide a valid shop email',
        400
      );
    }

    for (const key of [
      'taxRate',
      'defaultDiscount',
      'lowStockThreshold',
    ]) {
      if (
        payload[key] !== undefined &&
        (
          Number.isNaN(Number(payload[key])) ||
          Number(payload[key]) < 0
        )
      ) {
        throw new AppError(
          `${key} must be a valid non-negative number`,
          400
        );
      }
    }

    let settings = await Settings.findOne({
      userId: req.user._id,
    });

    if (!settings) {
      settings = await Settings.create({
        userId: req.user._id,
        ...DEFAULT_SETTINGS,
        ...payload,
      });
    } else {
      settings = await Settings.findOneAndUpdate(
        {
          userId: req.user._id,
        },
        {
          $set: payload,
        },
        {
          new: true,
          runValidators: true,
        }
      );
    }

    res.json({
      success: true,
      data: settings,
    });
  }
);