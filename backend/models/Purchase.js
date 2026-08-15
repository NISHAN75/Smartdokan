import mongoose from 'mongoose';

// Snapshot of the product at time of purchase — deliberately duplicated
// from Product rather than populated live, so later Product edits
// (price changes, renames) never alter historical purchase records.
// purchasePrice is a per-purchase snapshot too: it starts from the
// product's current purchasePrice but can be overridden for this
// specific purchase (a supplier may charge more/less on a given order),
// and never writes back onto Product.purchasePrice.
const purchaseItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    name: { type: String, required: true },
    sku: { type: String, required: true },
    purchasePrice: { type: Number, required: true, min: 0 },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
      validate: {
        validator: Number.isInteger,
        message: 'Quantity must be a whole number',
      },
    },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

export const PAYMENT_METHODS = ['cash', 'bkash', 'card', 'other'];
export const PAYMENT_STATUSES = ['paid', 'partial', 'due'];

const purchaseSchema = new mongoose.Schema(
  {
    purchaseNumber: {
      type: String,
      required: true,
      trim: true,
    },
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true,
    },
    // Snapshot too, same reasoning as item snapshots — survives the
    // supplier record being edited later.
    supplierName: {
      type: String,
      trim: true,
      required: true,
    },
    items: {
      type: [purchaseItemSchema],
      required: true,
      validate: {
        validator: (items) => Array.isArray(items) && items.length > 0,
        message: 'Purchase must include at least one item',
      },
    },
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, required: true, min: 0, default: 0 },
    total: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, required: true, min: 0 },
    dueAmount: { type: Number, required: true, min: 0 },
    paymentMethod: {
      type: String,
      enum: {
        values: PAYMENT_METHODS,
        message: '{VALUE} is not a valid payment method',
      },
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: {
        values: PAYMENT_STATUSES,
        message: '{VALUE} is not a valid payment status',
      },
      required: true,
    },
    note: {
      type: String,
      trim: true,
      maxlength: [300, 'Note cannot exceed 300 characters'],
      default: '',
    },
    // --- Multi-tenancy scaffolding — same shape/reasoning as Category/Product/Sale ---
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

// Purchase numbers are unique per company (see purchaseController's
// retry-on-collision generation logic — same pattern as Sale/invoiceNumber).
purchaseSchema.index({ companyId: 1, purchaseNumber: 1 }, { unique: true });
purchaseSchema.index({ companyId: 1, createdAt: -1 });
purchaseSchema.index({ companyId: 1, supplierId: 1 });

const Purchase = mongoose.model('Purchase', purchaseSchema);

export default Purchase;
