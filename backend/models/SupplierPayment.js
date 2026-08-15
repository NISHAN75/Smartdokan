import mongoose from 'mongoose';
import { PAYMENT_METHODS } from './Purchase.js';

// A supplier payment is a standalone transaction against a supplier's
// running balance — separate from the paidAmount recorded at the time
// of a Purchase. Purchase.paidAmount/dueAmount cover the down payment
// made at checkout; SupplierPayment covers any later payment made
// against the outstanding due (see supplierController's balance math).
// Reuses Purchase's PAYMENT_METHODS rather than defining a second enum,
// since these are the same real-world payment channels.
const supplierPaymentSchema = new mongoose.Schema(
  {
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true,
    },
    // Snapshot, same reasoning as Purchase.supplierName — survives the
    // supplier record being edited/renamed later.
    supplierName: {
      type: String,
      trim: true,
      required: true,
    },
    amount: {
      type: Number,
      required: [true, 'Payment amount is required'],
      min: [0.01, 'Payment amount must be greater than zero'],
    },
    paymentDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    paymentMethod: {
      type: String,
      enum: {
        values: PAYMENT_METHODS,
        message: '{VALUE} is not a valid payment method',
      },
      required: true,
    },
    reference: {
      type: String,
      trim: true,
      maxlength: [100, 'Reference cannot exceed 100 characters'],
      default: '',
    },
    note: {
      type: String,
      trim: true,
      maxlength: [300, 'Note cannot exceed 300 characters'],
      default: '',
    },
    // --- Multi-tenancy scaffolding — same shape/reasoning as Purchase/Supplier ---
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      default: null,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

// Supports "payment history for this supplier, newest first" — the
// only access pattern this collection needs.
supplierPaymentSchema.index({ companyId: 1, supplierId: 1, createdAt: -1 });

const SupplierPayment = mongoose.model('SupplierPayment', supplierPaymentSchema);

export default SupplierPayment;
