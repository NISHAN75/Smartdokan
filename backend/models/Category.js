import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      minlength: [2, 'Category name must be at least 2 characters'],
      maxlength: [100, 'Category name cannot exceed 100 characters'],
    },
    slug: {
      type: String,
      trim: true,
      lowercase: true,
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
    // --- Multi-tenancy scaffolding (see codebase analysis, section F) ---
    // The Company/Branch modules don't exist yet. These fields are added
    // now, on the first real business-domain schema, so every future
    // module (Product, Customer, Supplier, ...) can copy this same shape
    // instead of retrofitting tenant scoping onto live data later.
    //
    // Until the Company module ships, companyId is always null and every
    // category effectively lives in one implicit "default" company. The
    // uniqueness index and all queries are already scoped by companyId
    // today, so turning on real multi-company support later is just a
    // matter of populating this field — no schema or query rewrite.
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      default: null,
    },
    // branchId is nullable and unused until the Branch module ships.
    // Kept here for the same forward-compatibility reason as companyId.
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

// Keep slug in sync with name on every validation pass (create + save-based updates).
categorySchema.pre('validate', function generateSlug(next) {
  if (this.name) {
    this.slug = this.name
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-+|-+$)/g, '');
  }
  next();
});

// Prevent duplicate category names/slugs within the same company scope.
// companyId is null for every document today, so this currently enforces
// global uniqueness (single implicit tenant) — the exact behavior we want
// pre-multi-company, with no migration needed once companyId is populated.
categorySchema.index({ companyId: 1, name: 1 }, { unique: true });
categorySchema.index({ companyId: 1, slug: 1 }, { unique: true });

const Category = mongoose.model('Category', categorySchema);

export default Category;
