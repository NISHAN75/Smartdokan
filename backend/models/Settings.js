import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    shopName: { type: String, trim: true, maxlength: 120, default: 'SmartDokan' },
    shopPhone: { type: String, trim: true, maxlength: 30, default: '' },
    shopEmail: { type: String, trim: true, lowercase: true, maxlength: 120, default: '' },
    shopAddress: { type: String, trim: true, maxlength: 300, default: '' },
    logoUrl: { type: String, trim: true, maxlength: 500, default: '' },
    invoicePrefix: { type: String, trim: true, uppercase: true, maxlength: 20, default: 'INV' },
    currency: { type: String, enum: ['BDT'], default: 'BDT' },
    timezone: { type: String, enum: ['Asia/Dhaka'], default: 'Asia/Dhaka' },
    dateFormat: {
      type: String,
      enum: ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'],
      default: 'DD/MM/YYYY',
    },
    defaultPaymentMethod: {
      type: String,
      enum: ['cash', 'bkash', 'card', 'other'],
      default: 'cash',
    },
    taxRate: { type: Number, min: 0, max: 100, default: 0 },
    defaultDiscount: { type: Number, min: 0, max: 100, default: 0 },
    lowStockThreshold: { type: Number, min: 0, max: 1000000, default: 5 },
    invoiceFooter: { type: String, trim: true, maxlength: 500, default: 'Thank you for your business.' },
  },
  { timestamps: true }
);

const Settings = mongoose.model('Settings', settingsSchema);

export default Settings;
