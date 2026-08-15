import mongoose from 'mongoose';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/AppError.js';
import ApiFeatures from '../utils/apiFeatures.js';
import Purchase, { PAYMENT_METHODS } from '../models/Purchase.js';
import Product from '../models/Product.js';
import Supplier from '../models/Supplier.js';
import StockMovement from '../models/StockMovement.js';

const getScope = (req) => ({ companyId: req.user.companyId || null });

const MAX_PURCHASE_NUMBER_RETRIES = 3;

// Purchase follows the exact same sequential-number pattern as Sale's
// invoiceNumber: count-based generation, race-prone under heavy
// concurrency, but fully covered by the unique {companyId,
// purchaseNumber} index plus createPurchase's retry-on-collision loop
// below — safe at single-shop scale without a separate Counter collection.
const generatePurchaseNumber = async (companyId, session) => {
  const query = Purchase.countDocuments({ companyId });
  if (session) query.session(session);
  const count = await query;
  return `PUR-${String(count + 1).padStart(6, '0')}`;
};

// Unlike Sale's items (only productId + quantity — price comes straight
// from the Product catalog), Purchase items also carry a purchasePrice:
// suppliers can charge differently order to order, so this is a
// legitimate per-purchase input, not something dictated by the Product
// record. It's still fully validated here — never trusted as-is.
const validateItemsPayload = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError('Purchase cart is empty — add at least one product', 400);
  }
  return items.map((item, index) => {
    if (!item.productId || !mongoose.isValidObjectId(item.productId)) {
      throw new AppError(`Invalid product at item ${index + 1}`, 400);
    }
    const quantity = Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new AppError(
        `Quantity must be a positive whole number for item ${index + 1}`,
        400
      );
    }
    const purchasePrice = Number(item.purchasePrice);
    if (!Number.isFinite(purchasePrice) || purchasePrice < 0) {
      throw new AppError(
        `Purchase price must be a valid non-negative number for item ${index + 1}`,
        400
      );
    }
    return { productId: item.productId, quantity, purchasePrice };
  });
};

const validateDiscount = (rawDiscount, subtotal) => {
  const discount =
    rawDiscount === undefined || rawDiscount === null || rawDiscount === ''
      ? 0
      : Number(rawDiscount);
  if (!Number.isFinite(discount) || discount < 0) {
    throw new AppError('Discount must be a valid non-negative number', 400);
  }
  if (discount > subtotal) {
    throw new AppError('Discount cannot exceed the subtotal', 400);
  }
  return discount;
};

const validatePaidAmount = (rawPaidAmount, total) => {
  if (rawPaidAmount === undefined || rawPaidAmount === null || rawPaidAmount === '') {
    throw new AppError('Paid amount is required', 400);
  }
  const paidAmount = Number(rawPaidAmount);
  if (!Number.isFinite(paidAmount) || paidAmount < 0) {
    throw new AppError('Paid amount cannot be negative', 400);
  }
  // Same reasoning as Sale: overpayment/advance-credit handling is a
  // separate future feature — reject rather than silently accept.
  if (paidAmount > total) {
    throw new AppError(
      'Paid amount cannot exceed the total (advance credit is not supported yet)',
      400
    );
  }
  return paidAmount;
};

const derivePaymentStatus = (paidAmount, total) => {
  if (total === 0 || paidAmount >= total) return 'paid';
  if (paidAmount === 0) return 'due';
  return 'partial';
};

// Reads current stock for a product exactly the way Inventory, Sales,
// and StockMovement already do: openingStock + SUM(StockMovement.quantityChange).
// There is no separate "current stock" field on Product — this aggregate
// IS the source of truth, so Purchases must read/write it the same way,
// not invent a second calculation.
const getCurrentStock = async (product, companyId, session) => {
  const aggregate = StockMovement.aggregate([
    { $match: { productId: product._id, companyId } },
    { $group: { _id: '$productId', netMovement: { $sum: '$quantityChange' } } },
  ]);
  if (session) aggregate.session(session);
  const [row] = await aggregate;
  return (product.openingStock || 0) + (row?.netMovement || 0);
};

// Does the actual work of one purchase-confirmation attempt: validate
// everything from the database (never trust frontend names/totals —
// purchasePrice is the one legitimate per-purchase input, still
// validated above), create the Purchase, and create matching
// StockMovement `in` records — all within the given session when
// transactions are available. Mirrors createSaleWithSession exactly,
// with the stock direction reversed.
const createPurchaseWithSession = async (req, session) => {
  const { companyId } = getScope(req);
  const {
    supplierId,
    items: rawItems,
    discount: rawDiscount,
    paidAmount: rawPaidAmount,
    paymentMethod,
    note,
  } = req.body;

  if (!paymentMethod || !PAYMENT_METHODS.includes(paymentMethod)) {
    throw new AppError(`Payment method must be one of: ${PAYMENT_METHODS.join(', ')}`, 400);
  }

  if (!supplierId || !mongoose.isValidObjectId(supplierId)) {
    throw new AppError('A valid supplier is required', 400);
  }

  const supplierQuery = Supplier.findOne({ _id: supplierId, companyId });
  if (session) supplierQuery.session(session);
  const supplier = await supplierQuery;
  if (!supplier) {
    throw new AppError('Selected supplier does not exist', 400);
  }

  const requestedItems = validateItemsPayload(rawItems);

  // Fetch all requested products in one query, scoped to this company —
  // this is where name/sku actually come from (purchasePrice comes from
  // the validated request payload, see validateItemsPayload above).
  const productIds = requestedItems.map((item) => item.productId);
  const productQuery = Product.find({ _id: { $in: productIds }, companyId });
  if (session) productQuery.session(session);
  const products = await productQuery;
  const productMap = new Map(products.map((p) => [String(p._id), p]));

  const purchaseItems = [];
  const stockMovementPayloads = [];

  for (const { productId, quantity, purchasePrice } of requestedItems) {
    const product = productMap.get(String(productId));
    if (!product) {
      throw new AppError('One or more products were not found', 404);
    }

    const previousStock = await getCurrentStock(product, companyId, session);
    const resultingStock = previousStock + quantity;

    const lineTotal = purchasePrice * quantity;
    purchaseItems.push({
      productId: product._id,
      name: product.name,
      sku: product.sku,
      purchasePrice,
      quantity,
      lineTotal,
    });

    stockMovementPayloads.push({
      productId: product._id,
      companyId,
      branchId: product.branchId || null,
      type: 'in',
      quantityChange: quantity,
      previousStock,
      resultingStock,
      unitCost: purchasePrice,
      createdBy: req.user._id,
    });
  }

  const subtotal = purchaseItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const discount = validateDiscount(rawDiscount, subtotal);
  const total = subtotal - discount;
  const paidAmount = validatePaidAmount(rawPaidAmount, total);
  const dueAmount = Math.max(total - paidAmount, 0);
  const paymentStatus = derivePaymentStatus(paidAmount, total);

  const purchaseNumber = await generatePurchaseNumber(companyId, session);

  const purchasePayload = {
    purchaseNumber,
    supplierId: supplier._id,
    supplierName: supplier.name,
    items: purchaseItems,
    subtotal,
    discount,
    total,
    paidAmount,
    dueAmount,
    paymentMethod,
    paymentStatus,
    note: note?.trim() || '',
    companyId,
    branchId: null,
    createdBy: req.user._id,
  };

  const createdPurchases = session
    ? await Purchase.create([purchasePayload], { session })
    : await Purchase.create([purchasePayload]);
  const [purchase] = createdPurchases;

  // Stamp the real purchase number into each movement's reason now that
  // it exists, then create them all — same session as the Purchase
  // itself, so a failed purchase never leaves partially updated stock.
  const finalMovementPayloads = stockMovementPayloads.map((movement) => ({
    ...movement,
    reason: `Purchase ${purchaseNumber}`,
  }));

  const movements = session
    ? await StockMovement.create(finalMovementPayloads, { session })
    : await StockMovement.create(finalMovementPayloads);

  return { purchase, movements };
};

/**
 * @desc    Create a purchase. Validates supplier/products from the
 *          database, recalculates totals server-side, creates the
 *          Purchase and matching StockMovement `in` records atomically
 *          (transaction where supported, safe fallback otherwise — same
 *          pattern as saleController.createSale).
 * @route   POST /api/purchases
 * @access  Private (any authenticated user)
 */
export const createPurchase = asyncHandler(async (req, res) => {
  let result;

  for (let attempt = 1; attempt <= MAX_PURCHASE_NUMBER_RETRIES; attempt += 1) {
    const session = await mongoose.startSession();

    try {
      try {
        await session.withTransaction(async () => {
          result = await createPurchaseWithSession(req, session);
        });
      } catch (error) {
        const message = String(error?.message || '');
        const transactionUnsupported =
          message.includes('Transaction numbers are only allowed') ||
          message.includes('replica set') ||
          message.includes('mongos');

        if (!transactionUnsupported) {
          throw error;
        }

        // Standalone MongoDB (no replica set) — same fallback used by
        // saleController.createSale and stockMovementController.createStockMovement.
        result = await createPurchaseWithSession(req, null);
      }
      break; // success — exit the retry loop
    } catch (error) {
      const isPurchaseNumberCollision =
        error.code === 11000 && error.keyPattern?.purchaseNumber;
      if (isPurchaseNumberCollision && attempt < MAX_PURCHASE_NUMBER_RETRIES) {
        continue; // regenerate a fresh purchase number and retry
      }
      throw error;
    } finally {
      await session.endSession();
    }
  }

  const populated = await Purchase.findById(result.purchase._id)
    .populate('supplierId', 'name phone')
    .populate('createdBy', 'name email');

  res.status(201).json({ success: true, data: populated });
});

/**
 * @desc    List purchases (paginated, searchable, filterable) — Purchase History
 * @route   GET /api/purchases?page=&limit=&search=&paymentStatus=&paymentMethod=&from=&to=
 * @access  Private (any authenticated user)
 */
export const getPurchases = asyncHandler(async (req, res) => {
  const { companyId } = getScope(req);

  const { filter, sort, page, limit, skip } = new ApiFeatures({ companyId }, req.query)
    .search(['purchaseNumber', 'supplierName'])
    .applyFilters(['paymentStatus', 'paymentMethod'])
    .build();

  // Simple inclusive date-range filter on createdAt — same conventions
  // as saleController.
  if (req.query.from || req.query.to) {
    filter.createdAt = {};
    if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
    if (req.query.to) filter.createdAt.$lte = new Date(req.query.to);
  }

  const [purchases, totalItems] = await Promise.all([
    Purchase.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('supplierId', 'name phone')
      .populate('createdBy', 'name email'),
    Purchase.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    count: purchases.length,
    currentPage: page,
    totalPages: Math.max(Math.ceil(totalItems / limit), 1),
    totalItems,
    limit,
    data: purchases,
  });
});

/**
 * @desc    Get a single purchase by id (purchase details/invoice)
 * @route   GET /api/purchases/:id
 * @access  Private (any authenticated user)
 */
export const getPurchaseById = asyncHandler(async (req, res) => {
  const { companyId } = getScope(req);

  const purchase = await Purchase.findOne({ _id: req.params.id, companyId })
    .populate('supplierId', 'name phone')
    .populate('createdBy', 'name email');

  if (!purchase) {
    throw new AppError('Purchase not found', 404);
  }

  res.status(200).json({ success: true, data: purchase });
});
