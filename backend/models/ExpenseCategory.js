import mongoose from 'mongoose';

// Mirrors backend/models/Category.js exactly (same multi-tenancy
// scaffolding, same active/inactive lifecycle) — Expense categories are
// a separate collection from Product categories because they belong to
// a different domain (money out vs. catalog organization) and letting
// them evolve independently (different fields later, e.g. a monthly
// budget cap) is safer than overloading one shared Category collection.
const expenseCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      minlength: [2, 'Category name must be at least 2 characters'],
      maxlength: [100, 'Category name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: '',
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'inactive'],
        message: '{VALUE} is not a valid status',
      },
      default: 'active',
    },
    // --- Multi-tenancy scaffolding — same shape/reasoning as Category ---
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

// Prevent duplicate category names within the same company scope —
// same reasoning as Category's { companyId, name } index. companyId is
// null for every document today (single implicit tenant), which is the
// exact behavior wanted pre-multi-company.
expenseCategorySchema.index({ companyId: 1, name: 1 }, { unique: true });
expenseCategorySchema.index({ companyId: 1, status: 1 });

const ExpenseCategory = mongoose.model('ExpenseCategory', expenseCategorySchema);

export default ExpenseCategory;
