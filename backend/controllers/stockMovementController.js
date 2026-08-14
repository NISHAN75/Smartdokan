import mongoose from 'mongoose';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/AppError.js';
import escapeRegex from '../utils/escapeRegex.js';
import Product from '../models/Product.js';
import StockMovement from '../models/StockMovement.js';

const ALLOWED_TYPES = ['in', 'out', 'adjustment'];

const getScope = (req) => ({
  companyId: req.user.companyId || null,
});

const parseWholeNumber = (
  value,
  label,
  { allowNegative = false, required = true } = {}
) => {
  if (value === undefined || value === null || value === '') {
    if (required) {
      throw new AppError(`${label} is required`, 400);
    }

    return undefined;
  }

  const number = Number(value);

  if (!Number.isFinite(number) || !Number.isInteger(number)) {
    throw new AppError(`${label} must be a whole number`, 400);
  }

  if (!allowNegative && number < 0) {
    throw new AppError(`${label} cannot be negative`, 400);
  }

  return number;
};

const parseOptionalNumber = (value, label) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    throw new AppError(
      `${label} must be a valid non-negative number`,
      400
    );
  }

  return number;
};

export const createStockMovement = asyncHandler(async (req, res) => {
  const { productId, type, reason, note } = req.body;

  const { companyId } = getScope(req);

  if (!productId) {
    throw new AppError('Product is required', 400);
  }

  if (!mongoose.isValidObjectId(productId)) {
    throw new AppError('Invalid product id', 400);
  }

  if (!ALLOWED_TYPES.includes(type)) {
    throw new AppError(
      `Type must be one of: ${ALLOWED_TYPES.join(', ')}`,
      400
    );
  }

  const quantity =
    type === 'adjustment'
      ? undefined
      : parseWholeNumber(req.body.quantity, 'Quantity', {
          required: true,
        });

  if (quantity !== undefined && quantity <= 0) {
    throw new AppError('Quantity must be greater than 0', 400);
  }

  const adjustment =
    type === 'adjustment'
      ? parseWholeNumber(
          req.body.quantityChange,
          'Adjustment',
          {
            allowNegative: true,
            required: true,
          }
        )
      : type === 'in'
        ? quantity
        : -quantity;

  if (type === 'adjustment' && adjustment === 0) {
    throw new AppError('Adjustment cannot be zero', 400);
  }

  const unitCost = parseOptionalNumber(
    req.body.unitCost,
    'Unit cost'
  );

  if (type !== 'in' && unitCost !== undefined) {
    throw new AppError(
      'Unit cost is only allowed for stock-in movements',
      400
    );
  }

  if (type === 'in' && unitCost === undefined) {
    throw new AppError(
      'Unit cost is required for stock-in',
      400
    );
  }

  const createMovementWithSession = async (session) => {
    const productQuery = Product.findOne({
      _id: productId,
      companyId,
    }).select('_id openingStock branchId');

    if (session) {
      productQuery.session(session);
    }

    const product = await productQuery;

    if (!product) {
      throw new AppError('Product not found', 404);
    }

    const movementAggregate = StockMovement.aggregate([
      {
        $match: {
          productId: product._id,
          companyId,
        },
      },
      {
        $group: {
          _id: '$productId',
          netMovement: {
            $sum: '$quantityChange',
          },
        },
      },
    ]);

    if (session) {
      movementAggregate.session(session);
    }

    const [sum] = await movementAggregate;

    const previousStock =
      (product.openingStock || 0) +
      (sum?.netMovement || 0);

    const resultingStock =
      previousStock + adjustment;

    if (resultingStock < 0) {
      throw new AppError(
        'Insufficient stock for this movement',
        400
      );
    }

    const movementPayload = {
      productId: product._id,
      companyId,
      branchId: product.branchId || null,
      type,
      quantityChange: adjustment,
      previousStock,
      resultingStock,
      unitCost,
      reason: reason?.trim() || '',
      note: note?.trim() || '',
      createdBy: req.user._id,
    };

    const created = session
      ? await StockMovement.create(
          [movementPayload],
          { session }
        )
      : await StockMovement.create([movementPayload]);

    const [movement] = created;

    return {
      movement,
      resultingStock,
    };
  };

  let createdMovement;
  let resultingStock;

  const session = await mongoose.startSession();

  try {
    try {
      await session.withTransaction(async () => {
        ({
          movement: createdMovement,
          resultingStock,
        } = await createMovementWithSession(session));
      });
    } catch (error) {
      const message = String(error?.message || '');

      const transactionUnsupported =
        message.includes(
          'Transaction numbers are only allowed'
        ) ||
        message.includes('replica set') ||
        message.includes('mongos');

      if (!transactionUnsupported) {
        throw error;
      }

      ({
        movement: createdMovement,
        resultingStock,
      } = await createMovementWithSession(null));
    }
  } finally {
    await session.endSession();
  }

  const populated = await StockMovement.findById(
    createdMovement._id
  )
    .populate(
      'productId',
      'name sku barcode unit'
    )
    .populate(
      'createdBy',
      'name email'
    );

  res.status(201).json({
    success: true,
    data: populated,
    resultingStock,
  });
});

export const getStockMovements = asyncHandler(
  async (req, res) => {
    const { companyId } = getScope(req);

    const page = Math.max(
      Number.parseInt(req.query.page, 10) || 1,
      1
    );

    const limit = Math.min(
      Math.max(
        Number.parseInt(req.query.limit, 10) || 10,
        1
      ),
      100
    );

    const skip = (page - 1) * limit;

    const filter = {
      companyId,
    };

    if (req.query.type) {
      if (!ALLOWED_TYPES.includes(req.query.type)) {
        throw new AppError(
          `Type must be one of: ${ALLOWED_TYPES.join(', ')}`,
          400
        );
      }

      filter.type = req.query.type;
    }

    if (req.query.productId) {
      if (
        !mongoose.isValidObjectId(
          req.query.productId
        )
      ) {
        throw new AppError(
          'Invalid product id',
          400
        );
      }

      filter.productId = req.query.productId;
    }

    if (req.query.search?.trim()) {
      const regex = new RegExp(
        escapeRegex(req.query.search.trim()),
        'i'
      );

      const matchingProducts =
        await Product.find({
          companyId,
          $or: [
            { name: regex },
            { sku: regex },
            { barcode: regex },
          ],
        }).select('_id');

      filter.productId = {
        $in: matchingProducts.map(
          (product) => product._id
        ),
      };
    }

    const [data, totalItems] = await Promise.all([
      StockMovement.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate(
          'productId',
          'name sku barcode unit'
        )
        .populate(
          'createdBy',
          'name email'
        ),

      StockMovement.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      count: data.length,
      currentPage: page,
      totalPages: Math.max(
        Math.ceil(totalItems / limit),
        1
      ),
      totalItems,
      limit,
      data,
    });
  }
);