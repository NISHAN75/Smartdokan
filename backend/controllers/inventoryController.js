import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/AppError.js';
import ApiFeatures from '../utils/apiFeatures.js';
import Product from '../models/Product.js';

const ALLOWED_STOCK_STATUSES = ['in-stock', 'low', 'out-of-stock'];

// Same reasoning as Category/Product's getScope: companyId isn't on the
// User model yet (no Company module = no real tenants), so every request
// scopes to companyId: null for now. The moment companyId is added to
// User/JWT, this scopes correctly with zero changes. Company scope is
// always derived from the authenticated session — never trusted from
// req.body/req.query.
const getScope = (req) => ({ companyId: req.user.companyId || null });

// Inventory Step 1: there is no stock-movement ledger yet, so "current
// stock" is simply Product.openingStock. Stock In/Out/Adjustment and a
// real ledger are later steps — do not add them here.
const computeStockStatus = (openingStock, minimumStock) => {
  if (openingStock === 0) return 'out-of-stock';
  if (openingStock <= minimumStock) return 'low';
  return 'in-stock';
};

// stockStatus isn't a stored field, so it can't go through
// ApiFeatures.applyFilters like `status`/`categoryId` do. Instead we
// translate it into a Mongo filter fragment (comparing two real fields
// via $expr) and merge it into the base scope filter before ApiFeatures
// adds search/category on top.
const buildStockStatusFilter = (stockStatus) => {
  if (!stockStatus) return {};

  if (stockStatus === 'out-of-stock') {
    return { openingStock: 0 };
  }

  if (stockStatus === 'low') {
    return {
      $expr: {
        $and: [{ $gt: ['$openingStock', 0] }, { $lte: ['$openingStock', '$minimumStock'] }],
      },
    };
  }

  // in-stock
  return { $expr: { $gt: ['$openingStock', '$minimumStock'] } };
};

// Shapes a Product document into the flat inventory row the table needs.
const toInventoryItem = (product) => {
  const obj = product.toObject ? product.toObject() : product;
  const openingStock = obj.openingStock ?? 0;
  const minimumStock = obj.minimumStock ?? 0;
  const purchasePrice = obj.purchasePrice ?? 0;

  return {
    _id: obj._id,
    name: obj.name,
    sku: obj.sku,
    barcode: obj.barcode ?? null,
    categoryId: obj.categoryId,
    purchasePrice,
    sellingPrice: obj.sellingPrice,
    stock: openingStock,
    minimumStock,
    stockStatus: computeStockStatus(openingStock, minimumStock),
    stockValue: openingStock * purchasePrice,
    status: obj.status,
  };
};

/**
 * @desc    Inventory stock overview (paginated, searchable, filterable).
 *          Computed directly from Product.openingStock — no separate
 *          Inventory/Stock model exists yet.
 * @route   GET /api/inventory?page=&limit=&search=&category=&stockStatus=&sort=
 * @access  Private (any authenticated user)
 */
export const getInventory = asyncHandler(async (req, res) => {
  const { companyId } = getScope(req);

  if (req.query.stockStatus && !ALLOWED_STOCK_STATUSES.includes(req.query.stockStatus)) {
    throw new AppError(`Stock status must be one of: ${ALLOWED_STOCK_STATUSES.join(', ')}`, 400);
  }

  // `category` is exposed as the query param name (per the API spec,
  // same convention as Products), mapped internally to `categoryId`.
  const queryStringForFilters = {
    ...req.query,
    ...(req.query.category ? { categoryId: req.query.category } : {}),
  };

  const stockStatusFilter = buildStockStatusFilter(req.query.stockStatus);

  const { filter, sort, page, limit, skip } = new ApiFeatures(
    { companyId, ...stockStatusFilter },
    queryStringForFilters
  )
    .search(['name', 'sku', 'barcode'])
    .applyFilters(['categoryId'])
    .build();

  // Overview summary cards (Total Products / Total Stock / Total Stock
  // Value / Low Stock / Out of Stock) reflect the whole inventory in
  // scope, independent of the table's current search/filter/page — they
  // are dashboard-style totals, not a count of the filtered result set.
  const [products, totalItems, allProductsInScope] = await Promise.all([
    Product.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('categoryId', 'name'),
    Product.countDocuments(filter),
    Product.find({ companyId }).select('openingStock purchasePrice minimumStock'),
  ]);

  const overview = allProductsInScope.reduce(
    (acc, p) => {
      const openingStock = p.openingStock ?? 0;
      const minimumStock = p.minimumStock ?? 0;
      const purchasePrice = p.purchasePrice ?? 0;
      const status = computeStockStatus(openingStock, minimumStock);

      acc.totalProducts += 1;
      acc.totalStock += openingStock;
      acc.totalStockValue += openingStock * purchasePrice;
      if (status === 'low') acc.lowStockProducts += 1;
      if (status === 'out-of-stock') acc.outOfStockProducts += 1;

      return acc;
    },
    {
      totalProducts: 0,
      totalStock: 0,
      totalStockValue: 0,
      lowStockProducts: 0,
      outOfStockProducts: 0,
    }
  );

  res.status(200).json({
    success: true,
    ...overview,
    count: products.length,
    currentPage: page,
    totalPages: Math.max(Math.ceil(totalItems / limit), 1),
    totalItems,
    limit,
    data: products.map(toInventoryItem),
  });
});