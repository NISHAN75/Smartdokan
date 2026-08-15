import mongoose from 'mongoose';

// Minimal Supplier structure — just enough for Purchases to select an
// existing supplier. Same shape/reasoning as Customer.js, plus a
// status field (per Purchases requirements) so a supplier can be
// deactivated without deleting its purchase history. Not a full
// supplier-management module; that's a separate future step.
const supplierSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Supplier name is required'],
      trim: true,
      minlength: [2, 'Supplier name must be at least 2 characters'],
      maxlength: [100, 'Supplier name cannot exceed 100 characters'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      maxlength: [20, 'Phone number cannot exceed 20 characters'],
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    address: {
      type: String,
      trim: true,
      maxlength: [300, 'Address cannot exceed 300 characters'],
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

// Phone number unique per company scope — same reasoning as Customer's
// phone index (companyId is null for everyone today, so this currently
// enforces global uniqueness — correct pre-multi-company behavior).
supplierSchema.index({ companyId: 1, phone: 1 }, { unique: true });

const Supplier = mongoose.model('Supplier', supplierSchema);

export default Supplier;
