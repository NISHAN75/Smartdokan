import mongoose from 'mongoose';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/AppError.js';
import ApiFeatures from '../utils/apiFeatures.js';
import Sale, { PAYMENT_METHODS } from '../models/Sale.js';
import Product from '../models/Product.js';
import Customer from '../models/Customer.js';
import StockMovement from '../models/StockMovement.js';

const getScope = (req) => ({ companyId: req.user.companyId || null });

const MAX_INVOICE_RETRIES = 3;

// Sale is the first module needing a human-readable sequential number.
// count-based generation is simple and race-prone under heavy concurrency,
// but that risk is fully covered by the unique {companyId, invoiceNumber}
// index plus createSale's retry-on-collision loop below — safe at
// single-shop POS scale without adding a separate Counter collection.
const generateInvoiceNumber = async (companyId, session) => {
  const query = Sale.countDocuments({ companyId });
  if (session) query.session(session);
  const count = await query;
  return `INV-${String(count + 1).padStart(6, '0')}`;
};

const validateItemsPayload = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError('Cart is empty — add at least one product', 400);
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
    return { productId: item.productId, quantity };
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
  // Change/return handling is a separate future feature — overpayment is
  // rejected rather than silently accepted or truncated.
  if (paidAmount > total) {
    throw new AppError(
      'Paid amount cannot exceed the total (change/return is not supported yet)',
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

// Reads current stock for a product exactly the way Inventory and
// StockMovement already do: openingStock + SUM(StockMovement.quantityChange).
// There is no separate "current stock" field on Product — this aggregate
// IS the source of truth, so Sales must read it the same way, not invent
// a second calculation.
const getCurrentStock = async (product, companyId, session) => {
  const aggregate = StockMovement.aggregate([
    { $match: { productId: product._id, companyId } },
    { $group: { _id: '$productId', netMovement: { $sum: '$quantityChange' } } },
  ]);
  if (session) aggregate.session(session);
  const [row] = await aggregate;
  return (product.openingStock || 0) + (row?.netMovement || 0);
};

// Does the actual work of one checkout attempt: validate everything from
// the database (never trust frontend price/name/totals), check stock,
// create the Sale, and create matching StockMovement `out` records — all
// within the given session when transactions are available.
const createSaleWithSession = async (req, session) => {
  const { companyId } = getScope(req);
  const {
    customerId,
    items: rawItems,
    discount: rawDiscount,
    paidAmount: rawPaidAmount,
    paymentMethod,
  } = req.body;

  if (!paymentMethod || !PAYMENT_METHODS.includes(paymentMethod)) {
    throw new AppError(`Payment method must be one of: ${PAYMENT_METHODS.join(', ')}`, 400);
  }

  const requestedItems = validateItemsPayload(rawItems);

  // Resolve customer — optional, walk-in when omitted.
  let customer = null;
  if (customerId) {
    if (!mongoose.isValidObjectId(customerId)) {
      throw new AppError('Invalid customer id', 400);
    }
    const customerQuery = Customer.findOne({ _id: customerId, companyId });
    if (session) customerQuery.session(session);
    customer = await customerQuery;
    if (!customer) {
      throw new AppError('Selected customer does not exist', 400);
    }
  }

  // Fetch all requested products in one query, scoped to this company —
  // this is where name/sku/sellingPrice actually come from.
  const productIds = requestedItems.map((item) => item.productId);
  const productQuery = Product.find({ _id: { $in: productIds }, companyId });
  if (session) productQuery.session(session);
  const products = await productQuery;
  const productMap = new Map(products.map((p) => [String(p._id), p]));

  const saleItems = [];
  const stockMovementPayloads = [];

  for (const { productId, quantity } of requestedItems) {
    const product = productMap.get(String(productId));
    if (!product) {
      throw new AppError('One or more products were not found', 404);
    }
    if (product.status !== 'active') {
      throw new AppError(`"${product.name}" is not available for sale`, 400);
    }

    const previousStock = await getCurrentStock(product, companyId, session);
    const resultingStock = previousStock - quantity;
    if (resultingStock < 0) {
      throw new AppError(
        `Insufficient stock for "${product.name}" (available: ${previousStock}, requested: ${quantity})`,
        400
      );
    }

    const lineTotal = product.sellingPrice * quantity;
    saleItems.push({
      productId: product._id,
      name: product.name,
      sku: product.sku,
      sellingPrice: product.sellingPrice,
      quantity,
      lineTotal,
    });

    stockMovementPayloads.push({
      productId: product._id,
      companyId,
      branchId: product.branchId || null,
      type: 'out',
      quantityChange: -quantity,
      previousStock,
      resultingStock,
      createdBy: req.user._id,
    });
  }

  const subtotal = saleItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const discount = validateDiscount(rawDiscount, subtotal);
  const total = subtotal - discount;
  const paidAmount = validatePaidAmount(rawPaidAmount, total);
  const dueAmount = Math.max(total - paidAmount, 0);
  const paymentStatus = derivePaymentStatus(paidAmount, total);

  const invoiceNumber = await generateInvoiceNumber(companyId, session);

  const salePayload = {
    invoiceNumber,
    customerId: customer ? customer._id : null,
    customerName: customer ? customer.name : 'Walk-in Customer',
    items: saleItems,
    subtotal,
    discount,
    total,
    paidAmount,
    dueAmount,
    paymentMethod,
    paymentStatus,
    companyId,
    branchId: null,
    createdBy: req.user._id,
  };

  const createdSales = session
    ? await Sale.create([salePayload], { session })
    : await Sale.create([salePayload]);
  const [sale] = createdSales;

  // Stamp the real invoice number into each movement's reason now that
  // it exists, then create them all — same session as the Sale itself,
  // so a failed sale never leaves partially updated stock.
  const finalMovementPayloads = stockMovementPayloads.map((movement) => ({
    ...movement,
    reason: `Sale ${invoiceNumber}`,
  }));

  const movements = session
    ? await StockMovement.create(finalMovementPayloads, { session })
    : await StockMovement.create(finalMovementPayloads);

  return { sale, movements };
};

/**
 * @desc    Create a sale (POS checkout). Validates products/stock from
 *          the database, recalculates totals server-side, creates the
 *          Sale and matching StockMovement `out` records atomically
 *          (transaction where supported, safe fallback otherwise — same
 *          pattern as stockMovementController.createStockMovement).
 * @route   POST /api/sales
 * @access  Private (any authenticated user)
 */
export const createSale = asyncHandler(async (req, res) => {
  let result;

  for (let attempt = 1; attempt <= MAX_INVOICE_RETRIES; attempt += 1) {
    const session = await mongoose.startSession();

    try {
      try {
        await session.withTransaction(async () => {
          result = await createSaleWithSession(req, session);
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
        // stockMovementController.createStockMovement.
        result = await createSaleWithSession(req, null);
      }
      break; // success — exit the retry loop
    } catch (error) {
      const isInvoiceCollision = error.code === 11000 && error.keyPattern?.invoiceNumber;
      if (isInvoiceCollision && attempt < MAX_INVOICE_RETRIES) {
        continue; // regenerate a fresh invoice number and retry
      }
      throw error;
    } finally {
      await session.endSession();
    }
  }

  const populated = await Sale.findById(result.sale._id)
    .populate('customerId', 'name phone')
    .populate('createdBy', 'name email');

  res.status(201).json({ success: true, data: populated });
});

/**
 * @desc    List sales (paginated, searchable, filterable) — Sales History
 * @route   GET /api/sales?page=&limit=&search=&paymentStatus=&paymentMethod=&from=&to=
 * @access  Private (any authenticated user)
 */
export const getSales = asyncHandler(async (req, res) => {
  const { companyId } = getScope(req);

  const { filter, sort, page, limit, skip } = new ApiFeatures({ companyId }, req.query)
    .search(['invoiceNumber', 'customerName'])
    .applyFilters(['paymentStatus', 'paymentMethod'])
    .build();

  // Simple inclusive date-range filter on createdAt — same conventions
  // as the rest of ApiFeatures, just not generic enough to build in yet
  // since this is the first module needing it.
  if (req.query.from || req.query.to) {
    filter.createdAt = {};
    if (req.query.from) filter.createdAt.$gte = new Date(req.query.from);
    if (req.query.to) filter.createdAt.$lte = new Date(req.query.to);
  }

  const [sales, totalItems] = await Promise.all([
    Sale.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('customerId', 'name phone')
      .populate('createdBy', 'name email'),
    Sale.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    count: sales.length,
    currentPage: page,
    totalPages: Math.max(Math.ceil(totalItems / limit), 1),
    totalItems,
    limit,
    data: sales,
  });
});

/**
 * @desc    Get a single sale by id (invoice / sale details)
 * @route   GET /api/sales/:id
 * @access  Private (any authenticated user)
 */
export const getSaleById = asyncHandler(async (req, res) => {
  const { companyId } = getScope(req);

  const sale = await Sale.findOne({ _id: req.params.id, companyId })
    .populate('customerId', 'name phone')
    .populate('createdBy', 'name email');

  if (!sale) {
    throw new AppError('Sale not found', 404);
  }

  res.status(200).json({ success: true, data: sale });
});
