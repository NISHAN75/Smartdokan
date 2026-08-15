import mongoose from 'mongoose';

// Minimal Customer structure — just enough for the POS to select an
// existing customer or fall back to walk-in (Sale.customerId stays
// null). Not a full CRM/Customer module; that's a separate future step.
const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
      minlength: [2, 'Customer name must be at least 2 characters'],
      maxlength: [100, 'Customer name cannot exceed 100 characters'],
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

// Phone number unique per company scope — same reasoning as Product's
// SKU index (companyId is null for everyone today, so this currently
// enforces global uniqueness — correct pre-multi-company behavior).
customerSchema.index({ companyId: 1, phone: 1 }, { unique: true });

const Customer = mongoose.model('Customer', customerSchema);

export default Customer;
