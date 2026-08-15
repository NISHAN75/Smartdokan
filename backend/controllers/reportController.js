import mongoose from 'mongoose';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/AppError.js';
import ApiFeatures from '../utils/apiFeatures.js';
import {
  applyDateRangeFilter,
  getDateRange,
} from '../utils/applyDateRangeFilter.js';

import Sale from '../models/Sale.js';
import Purchase from '../models/Purchase.js';
import Expense from '../models/Expense.js';
import Product from '../models/Product.js';
import Customer from '../models/Customer.js';
import Supplier from '../models/Supplier.js';
import StockMovement from '../models/StockMovement.js';

/**
 * Company scope
 */
const scope = (req) => ({
  companyId: req.user.companyId || null,
});

/**
 * Apply date range
 */
const rangeMatch = (req, field, base = {}) =>
  applyDateRangeFilter(
    { ...base },
    field,
    ...Object.values(getDateRange(req))
  );

/**
 * Convert ApiFeatures sort string to MongoDB aggregation sort object.
 *
 * Example:
 * "-createdAt" => { createdAt: -1 }
 * "name"       => { name: 1 }
 * "-createdAt,name" => { createdAt: -1, name: 1 }
 */
const parseAggregationSort = (
  sort,
  allowedFields = []
) => {
  const result = {};

  if (!sort) {
    return {
      createdAt: -1,
    };
  }

  const sortString = String(sort);

  sortString
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((item) => {
      const direction = item.startsWith('-') ? -1 : 1;
      const field = item.replace(/^-/, '');

      if (
        !allowedFields.length ||
        allowedFields.includes(field)
      ) {
        result[field] = direction;
      }
    });

  return Object.keys(result).length
    ? result
    : { createdAt: -1 };
};

/**
 * ============================================================
 * SALES REPORT
 * ============================================================
 */
export const getSalesReport = asyncHandler(
  async (req, res) => {
    const { companyId } = scope(req);

    const match = rangeMatch(
      req,
      'createdAt',
      { companyId }
    );

    if (req.query.paymentStatus) {
      match.paymentStatus =
        req.query.paymentStatus;
    }

    const {
      page,
      limit,
      skip,
      sort,
    } = new ApiFeatures(
      match,
      req.query
    ).build();

    const [rows, totalItems, summary] =
      await Promise.all([
        Sale.find(match)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .select(
            'invoiceNumber customerName subtotal discount total paidAmount dueAmount paymentMethod paymentStatus createdAt'
          ),

        Sale.countDocuments(match),

        Sale.aggregate([
          {
            $match: match,
          },
          {
            $group: {
              _id: null,
              count: { $sum: 1 },
              subtotal: {
                $sum: '$subtotal',
              },
              discount: {
                $sum: '$discount',
              },
              total: {
                $sum: '$total',
              },
              paid: {
                $sum: '$paidAmount',
              },
              due: {
                $sum: '$dueAmount',
              },
            },
          },
        ]),
      ]);

    res.json({
      success: true,
      data: rows,
      summary:
        summary[0] || {
          count: 0,
          subtotal: 0,
          discount: 0,
          total: 0,
          paid: 0,
          due: 0,
        },
      currentPage: page,
      totalPages: Math.max(
        1,
        Math.ceil(totalItems / limit)
      ),
      totalItems,
      limit,
    });
  }
);

/**
 * ============================================================
 * PURCHASES REPORT
 * ============================================================
 */
export const getPurchasesReport =
  asyncHandler(async (req, res) => {
    const { companyId } = scope(req);

    const match = rangeMatch(
      req,
      'createdAt',
      { companyId }
    );

    if (req.query.paymentStatus) {
      match.paymentStatus =
        req.query.paymentStatus;
    }

    const {
      page,
      limit,
      skip,
      sort,
    } = new ApiFeatures(
      match,
      req.query
    ).build();

    const [rows, totalItems, summary] =
      await Promise.all([
        Purchase.find(match)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .select(
            'purchaseNumber supplierName subtotal discount total paidAmount dueAmount paymentMethod paymentStatus createdAt'
          ),

        Purchase.countDocuments(match),

        Purchase.aggregate([
          {
            $match: match,
          },
          {
            $group: {
              _id: null,
              count: { $sum: 1 },
              subtotal: {
                $sum: '$subtotal',
              },
              discount: {
                $sum: '$discount',
              },
              total: {
                $sum: '$total',
              },
              paid: {
                $sum: '$paidAmount',
              },
              due: {
                $sum: '$dueAmount',
              },
            },
          },
        ]),
      ]);

    res.json({
      success: true,
      data: rows,
      summary:
        summary[0] || {
          count: 0,
          subtotal: 0,
          discount: 0,
          total: 0,
          paid: 0,
          due: 0,
        },
      currentPage: page,
      totalPages: Math.max(
        1,
        Math.ceil(totalItems / limit)
      ),
      totalItems,
      limit,
    });
  });

/**
 * ============================================================
 * EXPENSES REPORT
 * ============================================================
 */
export const getExpensesReport =
  asyncHandler(async (req, res) => {
    const { companyId } = scope(req);

    const match = rangeMatch(
      req,
      'expenseDate',
      {
        companyId,
        status: 'active',
      }
    );

    if (req.query.categoryId) {
      if (
        !mongoose.isValidObjectId(
          req.query.categoryId
        )
      ) {
        throw new AppError(
          'Invalid category',
          400
        );
      }

      match.categoryId =
        new mongoose.Types.ObjectId(
          req.query.categoryId
        );
    }

    const {
      page,
      limit,
      skip,
      sort,
    } = new ApiFeatures(
      match,
      req.query
    )
      .search([
        'categoryName',
        'reference',
        'note',
      ])
      .build();

    const [rows, totalItems, summary, byCategory] =
      await Promise.all([
        Expense.find(match)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .select(
            'categoryName amount expenseDate paymentMethod reference note'
          ),

        Expense.countDocuments(match),

        Expense.aggregate([
          {
            $match: match,
          },
          {
            $group: {
              _id: null,
              count: { $sum: 1 },
              total: {
                $sum: '$amount',
              },
            },
          },
        ]),

        Expense.aggregate([
          {
            $match: match,
          },
          {
            $group: {
              _id: '$categoryName',
              total: {
                $sum: '$amount',
              },
              count: {
                $sum: 1,
              },
            },
          },
          {
            $sort: {
              total: -1,
            },
          },
          {
            $limit: 10,
          },
        ]),
      ]);

    res.json({
      success: true,
      data: rows,
      summary:
        summary[0] || {
          count: 0,
          total: 0,
        },
      byCategory,
      currentPage: page,
      totalPages: Math.max(
        1,
        Math.ceil(totalItems / limit)
      ),
      totalItems,
      limit,
    });
  });

/**
 * ============================================================
 * PROFIT / LOSS REPORT
 * ============================================================
 */
export const getProfitLossReport =
  asyncHandler(async (req, res) => {
    const { companyId } = scope(req);

    const sales = rangeMatch(
      req,
      'createdAt',
      { companyId }
    );

    const purchases = rangeMatch(
      req,
      'createdAt',
      { companyId }
    );

    const expenses = rangeMatch(
      req,
      'expenseDate',
      {
        companyId,
        status: 'active',
      }
    );

    const [salesResult, purchasesResult, expensesResult] =
      await Promise.all([
        Sale.aggregate([
          {
            $match: sales,
          },
          {
            $group: {
              _id: null,
              total: {
                $sum: '$total',
              },
              count: {
                $sum: 1,
              },
            },
          },
        ]),

        Purchase.aggregate([
          {
            $match: purchases,
          },
          {
            $group: {
              _id: null,
              total: {
                $sum: '$total',
              },
              count: {
                $sum: 1,
              },
            },
          },
        ]),

        Expense.aggregate([
          {
            $match: expenses,
          },
          {
            $group: {
              _id: null,
              total: {
                $sum: '$amount',
              },
              count: {
                $sum: 1,
              },
            },
          },
        ]),
      ]);

    const revenue =
      salesResult[0]?.total || 0;

    const purchaseCost =
      purchasesResult[0]?.total || 0;

    const expenseCost =
      expensesResult[0]?.total || 0;

    const grossProfit =
      revenue - purchaseCost;

    const netProfit =
      grossProfit - expenseCost;

    res.json({
      success: true,
      data: {
        revenue,
        purchaseCost,
        expenses: expenseCost,
        grossProfit,
        netProfit,
        salesCount:
          salesResult[0]?.count || 0,
        purchaseCount:
          purchasesResult[0]?.count || 0,
        expenseCount:
          expensesResult[0]?.count || 0,
      },
    });
  });

/**
 * ============================================================
 * PRODUCTS REPORT
 * ============================================================
 */
export const getProductsReport =
  asyncHandler(async (req, res) => {
    const { companyId } = scope(req);

    const {
      page,
      limit,
      skip,
      sort,
    } = new ApiFeatures(
      { companyId },
      req.query
    )
      .search([
        'name',
        'sku',
        'barcode',
      ])
      .applyFilters([
        'status',
        'categoryId',
      ])
      .build();

    const match = {
      companyId,
    };

    if (req.query.status) {
      match.status =
        req.query.status;
    }

    if (req.query.categoryId) {
      if (
        !mongoose.isValidObjectId(
          req.query.categoryId
        )
      ) {
        throw new AppError(
          'Invalid category',
          400
        );
      }

      match.categoryId =
        req.query.categoryId;
    }

    if (req.query.search) {
      const searchRegex =
        new RegExp(
          req.query.search,
          'i'
        );

      match.$or = [
        {
          name: searchRegex,
        },
        {
          sku: searchRegex,
        },
        {
          barcode: searchRegex,
        },
      ];
    }

    const [rows, totalItems] =
      await Promise.all([
        Product.find(match)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .select(
            'name sku barcode purchasePrice sellingPrice openingStock minimumStock unit status categoryId'
          ),

        Product.countDocuments(match),
      ]);

    res.json({
      success: true,
      data: rows,
      currentPage: page,
      totalPages: Math.max(
        1,
        Math.ceil(totalItems / limit)
      ),
      totalItems,
      limit,
    });
  });

/**
 * ============================================================
 * CUSTOMERS REPORT
 * ============================================================
 */
export const getCustomersReport =
  asyncHandler(async (req, res) => {
    const { companyId } = scope(req);

    const {
      page,
      limit,
      skip,
      sort,
    } = new ApiFeatures(
      { companyId },
      req.query
    )
      .search([
        'name',
        'phone',
        'email',
      ])
      .build();

    const match = {
      companyId,
    };

    if (req.query.search) {
      const searchRegex =
        new RegExp(
          req.query.search,
          'i'
        );

      match.$or = [
        {
          name: searchRegex,
        },
        {
          phone: searchRegex,
        },
        {
          email: searchRegex,
        },
      ];
    }

    const [rows, totalItems] =
      await Promise.all([
        Customer.find(match)
          .sort(sort)
          .skip(skip)
          .limit(limit),

        Customer.countDocuments(match),
      ]);

    res.json({
      success: true,
      data: rows,
      currentPage: page,
      totalPages: Math.max(
        1,
        Math.ceil(totalItems / limit)
      ),
      totalItems,
      limit,
    });
  });

/**
 * ============================================================
 * SUPPLIERS REPORT
 * ============================================================
 */
export const getSuppliersReport =
  asyncHandler(async (req, res) => {
    const { companyId } = scope(req);

    const {
      page,
      limit,
      skip,
      sort,
    } = new ApiFeatures(
      { companyId },
      req.query
    )
      .search([
        'name',
        'phone',
        'email',
      ])
      .applyFilters(['status'])
      .build();

    const match = {
      companyId,
    };

    if (req.query.status) {
      match.status =
        req.query.status;
    }

    if (req.query.search) {
      const searchRegex =
        new RegExp(
          req.query.search,
          'i'
        );

      match.$or = [
        {
          name: searchRegex,
        },
        {
          phone: searchRegex,
        },
        {
          email: searchRegex,
        },
      ];
    }

    const [rows, totalItems] =
      await Promise.all([
        Supplier.find(match)
          .sort(sort)
          .skip(skip)
          .limit(limit),

        Supplier.countDocuments(match),
      ]);

    res.json({
      success: true,
      data: rows,
      currentPage: page,
      totalPages: Math.max(
        1,
        Math.ceil(totalItems / limit)
      ),
      totalItems,
      limit,
    });
  });

/**
 * ============================================================
 * INVENTORY REPORT
 * ============================================================
 */
export const getInventoryReport =
  asyncHandler(async (req, res) => {
    const { companyId } = scope(req);

    const {
      page,
      limit,
      skip,
      sort,
    } = new ApiFeatures(
      { companyId },
      req.query
    )
      .search([
        'name',
        'sku',
        'barcode',
      ])
      .applyFilters([
        'status',
        'categoryId',
      ])
      .build();

    /**
     * Base product match
     */
    const match = {
      companyId,
    };

    /**
     * Status filter
     */
    if (req.query.status) {
      match.status =
        req.query.status;
    }

    /**
     * Category filter
     */
    if (req.query.categoryId) {
      if (
        !mongoose.isValidObjectId(
          req.query.categoryId
        )
      ) {
        throw new AppError(
          'Invalid category',
          400
        );
      }

      match.categoryId =
        new mongoose.Types.ObjectId(
          req.query.categoryId
        );
    }

    /**
     * Search filter
     */
    if (req.query.search) {
      const searchRegex =
        new RegExp(
          req.query.search,
          'i'
        );

      match.$or = [
        {
          name: searchRegex,
        },
        {
          sku: searchRegex,
        },
        {
          barcode: searchRegex,
        },
      ];
    }

    /**
     * IMPORTANT:
     *
     * ApiFeatures returns sort as a string.
     * MongoDB aggregation $sort requires an object.
     *
     * Example:
     * "-createdAt" -> { createdAt: -1 }
     */
    const aggregationSort =
      parseAggregationSort(
        sort,
        [
          'name',
          'sku',
          'barcode',
          'purchasePrice',
          'sellingPrice',
          'openingStock',
          'minimumStock',
          'status',
          'createdAt',
          'updatedAt',
        ]
      );

    /**
     * Inventory aggregation
     *
     * Current stock =
     * openingStock + total quantityChange
     */
    const pipeline = [
      {
        $match: match,
      },

      /**
       * Get stock movements for each product
       */
      {
        $lookup: {
          from: 'stockmovements',

          let: {
            productId: '$_id',
          },

          pipeline: [
            {
              $match: {
                companyId,
                $expr: {
                  $eq: [
                    '$productId',
                    '$$productId',
                  ],
                },
              },
            },

            {
              $group: {
                _id: '$productId',

                net: {
                  $sum: '$quantityChange',
                },
              },
            },
          ],

          as: 'movement',
        },
      },

      /**
       * Calculate current stock
       */
      {
        $addFields: {
          currentStock: {
            $add: [
              {
                $ifNull: [
                  '$openingStock',
                  0,
                ],
              },

              {
                $ifNull: [
                  {
                    $arrayElemAt: [
                      '$movement.net',
                      0,
                    ],
                  },
                  0,
                ],
              },
            ],
          },
        },
      },

      /**
       * Remove unnecessary lookup data
       */
      {
        $project: {
          movement: 0,
        },
      },

      /**
       * Correct MongoDB sort object
       */
      {
        $sort: aggregationSort,
      },

      /**
       * Pagination
       */
      {
        $facet: {
          data: [
            {
              $skip: skip,
            },
            {
              $limit: limit,
            },
          ],

          total: [
            {
              $count: 'count',
            },
          ],
        },
      },
    ];

    const result =
      await Product.aggregate(
        pipeline
      );

    const data =
      result[0]?.data || [];

    const totalItems =
      result[0]?.total?.[0]?.count || 0;

    res.json({
      success: true,
      data,
      currentPage: page,
      totalPages: Math.max(
        1,
        Math.ceil(
          totalItems / limit
        )
      ),
      totalItems,
      limit,
    });
  });