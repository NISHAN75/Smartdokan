import mongoose from 'mongoose';

const stockMovementSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product is required'],
      index: true,
    },

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

    type: {
      type: String,
      enum: ['in', 'out', 'adjustment'],
      required: [true, 'Movement type is required'],
    },

    quantityChange: {
      type: Number,
      required: [true, 'Quantity change is required'],
      validate: {
        validator: (value) => Number.isInteger(value),
        message: 'Quantity must be a whole number',
      },
    },

    previousStock: {
      type: Number,
      required: true,
      min: 0,
    },

    resultingStock: {
      type: Number,
      required: true,
      min: 0,
    },

    unitCost: {
      type: Number,
      min: [0, 'Unit cost cannot be negative'],
    },

    reason: {
      type: String,
      trim: true,
      maxlength: [300, 'Reason cannot exceed 300 characters'],
      default: '',
    },

    note: {
      type: String,
      trim: true,
      maxlength: [300, 'Note cannot exceed 300 characters'],
      default: '',
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

stockMovementSchema.index({
  companyId: 1,
  productId: 1,
  createdAt: -1,
});

stockMovementSchema.index({
  companyId: 1,
  createdAt: -1,
});

const StockMovement = mongoose.model(
  'StockMovement',
  stockMovementSchema
);

export default StockMovement;