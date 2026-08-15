import mongoose from 'mongoose';

// Snapshot of the product at time of sale — deliberately duplicated
// from Product rather than populated live, so later Product edits
// (price changes, renames) never alter historical invoices.
const saleItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    name: { type: String, required: true },
    sku: { type: String, required: true },
    sellingPrice: { type: Number, required: true, min: 0 },
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

const saleSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      trim: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      default: null, // null = walk-in customer
    },
    // Snapshot too, same reasoning as item snapshots — survives the
    // customer record being edited later, and covers walk-ins that
    // never had a Customer document at all.
    customerName: {
      type: String,
      trim: true,
      default: 'Walk-in Customer',
    },
    items: {
      type: [saleItemSchema],
      required: true,
      validate: {
        validator: (items) => Array.isArray(items) && items.length > 0,
        message: 'Sale must include at least one item',
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
    // --- Multi-tenancy scaffolding — same shape/reasoning as Category/Product ---
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

// Invoice numbers are unique per company (see saleController's
// retry-on-collision generation logic).
saleSchema.index({ companyId: 1, invoiceNumber: 1 }, { unique: true });
saleSchema.index({ companyId: 1, createdAt: -1 });
saleSchema.index({ companyId: 1, customerId: 1 });

const Sale = mongoose.model('Sale', saleSchema);

export default Sale;
