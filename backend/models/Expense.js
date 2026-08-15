import mongoose from 'mongoose';
import { PAYMENT_METHODS } from './Purchase.js';

// Reuses Purchase's PAYMENT_METHODS rather than defining a second enum —
// same reasoning as SupplierPayment: these are the same real-world
// payment channels a shop uses to pay money out, whether that's to a
// supplier or for a general business expense.
export { PAYMENT_METHODS };

const expenseSchema = new mongoose.Schema(
  {
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ExpenseCategory',
      required: [true, 'Expense category is required'],
    },
    // Snapshot, same reasoning as Purchase.supplierName / SupplierPayment.supplierName
    // — survives the category being renamed or deactivated later, so
    // historical expense records always show what the category was
    // called at the time, without an extra populate on every list.
    categoryName: {
      type: String,
      trim: true,
      required: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than zero'],
    },
    expenseDate: {
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
    // Lifecycle flag, same active/inactive convention used across the
    // project (Category/Customer/Supplier) — "deleting" an expense means
    // deactivating it so historical reports stay accurate, rather than
    // a hard delete.
    status: {
      type: String,
      enum: {
        values: ['active', 'inactive'],
        message: '{VALUE} is not a valid status',
      },
      default: 'active',
    },
    // --- Multi-tenancy scaffolding — same shape/reasoning as every other module ---
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
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

// Supports the Expenses list (newest first, scoped to company) — the
// primary access pattern for this collection.
expenseSchema.index({ companyId: 1, expenseDate: -1 });
expenseSchema.index({ companyId: 1, categoryId: 1 });
expenseSchema.index({ companyId: 1, paymentMethod: 1 });
expenseSchema.index({ companyId: 1, status: 1 });

const Expense = mongoose.model('Expense', expenseSchema);

export default Expense;
