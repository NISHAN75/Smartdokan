import asyncHandler from '../utils/asyncHandler.js';
import Sale from '../models/Sale.js';
import Purchase from '../models/Purchase.js';
import Expense from '../models/Expense.js';
import Product from '../models/Product.js';
import Customer from '../models/Customer.js';
import Supplier from '../models/Supplier.js';
import SupplierPayment from '../models/SupplierPayment.js';
import StockMovement from '../models/StockMovement.js';

const getScope = (req) => ({
  companyId: req.user.companyId || null,
});

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfDay = (date) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const sum = (rows, field) => rows[0]?.[field] || 0;

const aggregateTotal = async (Model, match, field) => {
  const rows = await Model.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        total: { $sum: `$${field}` },
        count: { $sum: 1 },
      },
    },
  ]);

  return {
    total: sum(rows, 'total'),
    count: rows[0]?.count || 0,
  };
};

const percentChange = (current, previous) => {
  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }

  return ((current - previous) / previous) * 100;
};

const round = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

/**
 * GET /api/dashboard
 *
 * Real dashboard overview:
 * - today's sales/purchases/expenses/profit
 * - comparison with yesterday
 * - customer/supplier due
 * - product/low-stock counts
 * - 7-day sales chart
 * - recent sales/purchases
 */
export const getDashboard = asyncHandler(async (req, res) => {
  const { companyId } = getScope(req);

  const today = startOfDay(new Date());
  const tomorrow = startOfDay(addDays(today, 1));
  const yesterday = startOfDay(addDays(today, -1));
  const dayBeforeYesterday = startOfDay(addDays(today, -2));
  const sevenDaysAgo = startOfDay(addDays(today, -6));

  const todaySalesMatch = {
    companyId,
    createdAt: { $gte: today, $lt: tomorrow },
  };

  const yesterdaySalesMatch = {
    companyId,
    createdAt: { $gte: yesterday, $lt: today },
  };

  const todayPurchaseMatch = {
    companyId,
    createdAt: { $gte: today, $lt: tomorrow },
  };

  const yesterdayPurchaseMatch = {
    companyId,
    createdAt: { $gte: yesterday, $lt: today },
  };

  const todayExpenseMatch = {
    companyId,
    status: 'active',
    expenseDate: { $gte: today, $lt: tomorrow },
  };

  const yesterdayExpenseMatch = {
    companyId,
    status: 'active',
    expenseDate: { $gte: yesterday, $lt: today },
  };

  const [
    todaySales,
    yesterdaySales,
    todayPurchases,
    yesterdayPurchases,
    todayExpenses,
    yesterdayExpenses,
    productCount,
    customerCount,
    supplierCount,
    lowStockRows,
    customerDueRows,
    supplierPurchaseDueRows,
    supplierPaymentRows,
    salesByDay,
    recentSales,
    recentPurchases,
  ] = await Promise.all([
    aggregateTotal(Sale, todaySalesMatch, 'total'),
    aggregateTotal(Sale, yesterdaySalesMatch, 'total'),
    aggregateTotal(Purchase, todayPurchaseMatch, 'total'),
    aggregateTotal(Purchase, yesterdayPurchaseMatch, 'total'),
    aggregateTotal(Expense, todayExpenseMatch, 'amount'),
    aggregateTotal(Expense, yesterdayExpenseMatch, 'amount'),

    Product.countDocuments({
      companyId,
      status: 'active',
    }),

    Customer.countDocuments({ companyId }),

    Supplier.countDocuments({
      companyId,
      status: 'active',
    }),

    Product.aggregate([
      { $match: { companyId, status: 'active' } },
      {
        $lookup: {
          from: StockMovement.collection.name,
          let: { productId: '$_id' },
          pipeline: [
            {
              $match: {
                companyId,
                $expr: {
                  $eq: ['$productId', '$$productId'],
                },
              },
            },
            {
              $group: {
                _id: '$productId',
                net: { $sum: '$quantityChange' },
              },
            },
          ],
          as: 'movements',
        },
      },
      {
        $addFields: {
          currentStock: {
            $add: [
              '$openingStock',
              {
                $ifNull: [
                  { $arrayElemAt: ['$movements.net', 0] },
                  0,
                ],
              },
            ],
          },
        },
      },
      {
        $match: {
          $expr: {
            $lte: ['$currentStock', '$minimumStock'],
          },
        },
      },
      { $count: 'count' },
    ]),

    Sale.aggregate([
      { $match: { companyId } },
      {
        $group: {
          _id: null,
          totalDue: { $sum: '$dueAmount' },
        },
      },
    ]),

    Purchase.aggregate([
      { $match: { companyId } },
      {
        $group: {
          _id: null,
          totalDue: { $sum: '$dueAmount' },
        },
      },
    ]),

    SupplierPayment.aggregate([
      { $match: { companyId } },
      {
        $group: {
          _id: null,
          totalPaid: { $sum: '$amount' },
        },
      },
    ]),

    Sale.aggregate([
      {
        $match: {
          companyId,
          createdAt: {
            $gte: sevenDaysAgo,
            $lt: tomorrow,
          },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$createdAt',
            },
          },
          total: { $sum: '$total' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),

    Sale.find({ companyId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select(
        'invoiceNumber customerName total paidAmount dueAmount paymentMethod paymentStatus createdAt'
      )
      .lean(),

    Purchase.find({ companyId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select(
        'purchaseNumber supplierName total paidAmount dueAmount paymentMethod paymentStatus createdAt'
      )
      .lean(),
  ]);

  const todaySalesTotal = todaySales.total;
  const todayPurchaseTotal = todayPurchases.total;
  const todayExpenseTotal = todayExpenses.total;

  const yesterdaySalesTotal = yesterdaySales.total;
  const yesterdayPurchaseTotal = yesterdayPurchases.total;
  const yesterdayExpenseTotal = yesterdayExpenses.total;

  const todayProfit =
    todaySalesTotal - todayPurchaseTotal - todayExpenseTotal;

  const yesterdayProfit =
    yesterdaySalesTotal -
    yesterdayPurchaseTotal -
    yesterdayExpenseTotal;

  const customerDue = sum(customerDueRows, 'totalDue');
  const supplierPurchaseDue = sum(
    supplierPurchaseDueRows,
    'totalDue'
  );
  const supplierPayments = sum(
    supplierPaymentRows,
    'totalPaid'
  );

  const supplierDue = Math.max(
    supplierPurchaseDue - supplierPayments,
    0
  );

  const chartMap = new Map(
    salesByDay.map((item) => [item._id, item])
  );

  const salesChart = [];
  for (let i = 0; i < 7; i += 1) {
    const date = startOfDay(addDays(sevenDaysAgo, i));
    const key = date.toISOString().slice(0, 10);
    const item = chartMap.get(key);

    salesChart.push({
      date: key,
      label: date.toLocaleDateString('en-US', {
        weekday: 'short',
      }),
      total: round(item?.total || 0),
      count: item?.count || 0,
    });
  }

  res.status(200).json({
    success: true,
    data: {
      summary: {
        todaySales: round(todaySalesTotal),
        todayPurchases: round(todayPurchaseTotal),
        todayExpenses: round(todayExpenseTotal),
        todayProfit: round(todayProfit),
        totalProducts: productCount,
        lowStockProducts: lowStockRows[0]?.count || 0,
        customerDue: round(customerDue),
        supplierDue: round(supplierDue),
        totalCustomers: customerCount,
        totalSuppliers: supplierCount,
      },

      trends: {
        sales: round(
          percentChange(todaySalesTotal, yesterdaySalesTotal)
        ),
        purchases: round(
          percentChange(
            todayPurchaseTotal,
            yesterdayPurchaseTotal
          )
        ),
        expenses: round(
          percentChange(
            todayExpenseTotal,
            yesterdayExpenseTotal
          )
        ),
        profit: round(
          percentChange(todayProfit, yesterdayProfit)
        ),
      },

      salesChart,

      recentSales,
      recentPurchases,
    },
  });
});
