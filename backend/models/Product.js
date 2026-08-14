import mongoose from 'mongoose';

// Product Management — built incrementally, one field-group at a time:
// Step 1 (name, category, description, status) -> SKU -> Barcode ->
// Purchase Price -> Product Foundation (sellingPrice, minimumStock,
// openingStock, unit). Inventory/stock-movement history, expiry, brand,
// image, and supplier are still later, separate steps — do not add them
// here. openingStock is only a static Product field at this stage; it is
// NOT a stock-movement ledger.
const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      minlength: [2, 'Product name must be at least 2 characters'],
      maxlength: [150, 'Product name cannot exceed 150 characters'],
    },
    sku: {
        type: String,
        required: [true, 'SKU is required'],
        trim: true,
        maxlength: [50, 'SKU cannot exceed 50 characters'],
    },
    barcode: {
        type: String,
        trim: true,
        maxlength: [50, 'Barcode cannot exceed 50 characters'],
    },
    purchasePrice: {
      type: Number,
      required: [true, 'Purchase price is required'],
      min: [0, 'Purchase price cannot be negative'],
      default: 0,
    },
        sellingPrice: {
      type: Number,
      required: [true, 'Selling price is required'],
      min: [0, 'Selling price cannot be negative'],
    },
    minimumStock: {
      type: Number,
      required: [true, 'Minimum stock is required'],
      min: [0, 'Minimum stock cannot be negative'],
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: 'Minimum stock must be a whole number',
      },
    },
    openingStock: {
      type: Number,
      required: [true, 'Opening stock is required'],
      min: [0, 'Opening stock cannot be negative'],
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: 'Opening stock must be a whole number',
      },
    },
    unit: {
      type: String,
      enum: {
        values: ['pcs', 'kg', 'gram', 'liter', 'ml', 'box', 'packet', 'piece', 'dozen', 'other'],
        message: '{VALUE} is not a valid unit',
      },
      default: 'pcs',
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
productSchema.index(
  { companyId: 1, sku: 1 },
  {
    unique: true,
    collation: { locale: 'en', strength: 2 },
    partialFilterExpression: { barcode: { $exists: true } },
  }
);

// Products are looked up by category constantly (list filters, future
// Inventory/Sales joins) — index it now rather than retrofitting later.
productSchema.index({ companyId: 1, categoryId: 1 });

const Product = mongoose.model('Product', productSchema);

export default Product;