import mongoose from 'mongoose';

// Product Management — Step 1. Intentionally minimal: name, category,
// description, status, and the same companyId/branchId/createdBy
// scaffolding Category already uses. SKU, barcode, prices, stock,
// expiry, brand, image, and supplier are later steps — do not add them
// here.
const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      minlength: [2, 'Product name must be at least 2 characters'],
      maxlength: [150, 'Product name cannot exceed 150 characters'],
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category is required'],
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
    // companyId is always null until the Company module ships (see
    // Category.js). Kept here so every business-domain schema stays
    // consistent and future modules (Inventory, Sales, ...) can rely on
    // Product already carrying it.
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      default: null,
    },
    // branchId is nullable and unused until the Branch module ships.
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

// Prevent duplicate product names within the same company scope. Same
// reasoning as Category's index: companyId is null for everyone today,
// so this currently enforces global uniqueness — correct pre-multi-company
// behavior, with no migration needed once companyId is populated.
productSchema.index({ companyId: 1, name: 1 }, { unique: true });

// Products are looked up by category constantly (list filters, future
// Inventory/Sales joins) — index it now rather than retrofitting later.
productSchema.index({ companyId: 1, categoryId: 1 });

const Product = mongoose.model('Product', productSchema);

export default Product;