import asyncHandler from '../utils/asyncHandler.js';
import Product from '../models/Product.js';
import StockMovement from '../models/StockMovement.js';
import Sale from '../models/Sale.js';
import Purchase from '../models/Purchase.js';
import Supplier from '../models/Supplier.js';

const getScope = (req) => ({ companyId: req.user.companyId || null });

const inventoryPipeline = (companyId) => [
  { $match: { companyId, status: 'active' } },
  {
    $lookup: {
      from: StockMovement.collection.name,
      let: { productId: '$_id' },
      pipeline: [
        {
          $match: {
            companyId,
            $expr: { $eq: ['$productId', '$$productId'] },
          },
        },
        {
          $group: {
            _id: '$productId',
            quantityChange: { $sum: '$quantityChange' },
          },
        },
      ],
      as: 'movement',
    },
  },
  {
    $addFields: {
      currentStock: {
        $add: [
          '$openingStock',
          { $ifNull: [{ $arrayElemAt: ['$movement.quantityChange', 0] }, 0] },
        ],
      },
    },
  },
  {
    $match: {
      $expr: { $lte: ['$currentStock', '$minimumStock'] },
    },
  },
  { $sort: { currentStock: 1, name: 1 } },
  { $limit: 10 },
  {
    $project: {
      _id: 1,
      name: 1,
      sku: 1,
      currentStock: 1,
      minimumStock: 1,
      unit: 1,
    },
  },
];

export const getNotifications = asyncHandler(async (req, res) => {
  const { companyId } = getScope(req);

  const [lowStockProducts, customerDue, supplierDue, recentSales, recentPurchases] =
    await Promise.all([
      Product.aggregate(inventoryPipeline(companyId)),
      Sale.aggregate([
        { $match: { companyId, dueAmount: { $gt: 0 } } },
        {
          $group: {
            _id: '$customerId',
            customerName: { $first: '$customerName' },
            due: { $sum: '$dueAmount' },
          },
        },
        { $match: { due: { $gt: 0 } } },
        { $sort: { due: -1 } },
        { $limit: 5 },
      ]),
      Purchase.aggregate([
        { $match: { companyId, dueAmount: { $gt: 0 } } },
        {
          $group: {
            _id: '$supplierId',
            supplierName: { $first: '$supplierName' },
            due: { $sum: '$dueAmount' },
          },
        },
        { $match: { due: { $gt: 0 } } },
        { $sort: { due: -1 } },
        { $limit: 5 },
      ]),
      Sale.find({ companyId })
        .sort({ createdAt: -1 })
        .limit(3)
        .select('invoiceNumber total paymentStatus createdAt'),
      Purchase.find({ companyId })
        .sort({ createdAt: -1 })
        .limit(3)
        .select('purchaseNumber total paymentStatus createdAt'),
    ]);

  // Avoid showing a generic "customer due" alert for walk-in sales.
  const notifications = [];

  lowStockProducts.forEach((product) => {
    const outOfStock = product.currentStock <= 0;
    notifications.push({
      id: `stock-${product._id}`,
      type: outOfStock ? 'danger' : 'warning',
      title: outOfStock ? 'Out of stock' : 'Low stock',
      message: outOfStock
        ? `${product.name} is out of stock.`
        : `${product.name} has only ${product.currentStock} ${product.unit || 'units'} left.`,
      link: '/inventory',
      createdAt: new Date().toISOString(),
      priority: outOfStock ? 1 : 2,
    });
  });

  customerDue.forEach((item) => {
    if (!item._id) return;
    notifications.push({
      id: `customer-due-${item._id}`,
      type: 'info',
      title: 'Customer due pending',
      message: `${item.customerName || 'Customer'} has BDT ${Number(item.due).toLocaleString()} due.`,
      link: '/customers',
      createdAt: new Date().toISOString(),
      priority: 3,
    });
  });

  supplierDue.forEach((item) => {
    notifications.push({
      id: `supplier-due-${item._id}`,
      type: 'info',
      title: 'Supplier due pending',
      message: `${item.supplierName || 'Supplier'} has BDT ${Number(item.due).toLocaleString()} payable.`,
      link: '/suppliers',
      createdAt: new Date().toISOString(),
      priority: 3,
    });
  });

  if (recentSales.length > 0) {
    notifications.push({
      id: `sales-${recentSales[0]._id}`,
      type: 'success',
      title: 'Recent sale recorded',
      message: `${recentSales[0].invoiceNumber} — BDT ${Number(recentSales[0].total).toLocaleString()}.`,
      link: '/sales/history',
      createdAt: recentSales[0].createdAt,
      priority: 4,
    });
  }

  if (recentPurchases.length > 0) {
    notifications.push({
      id: `purchase-${recentPurchases[0]._id}`,
      type: 'success',
      title: 'Recent purchase recorded',
      message: `${recentPurchases[0].purchaseNumber} — BDT ${Number(recentPurchases[0].total).toLocaleString()}.`,
      link: '/purchases',
      createdAt: recentPurchases[0].createdAt,
      priority: 4,
    });
  }

  notifications.sort((a, b) => a.priority - b.priority);

  res.json({
    success: true,
    data: {
      notifications,
      unreadCount: notifications.length,
      counts: {
        lowStock: lowStockProducts.length,
        customerDue: customerDue.length,
        supplierDue: supplierDue.length,
      },
    },
  });
});
