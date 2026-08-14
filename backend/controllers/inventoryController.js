import mongoose from 'mongoose';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/AppError.js';
import escapeRegex from '../utils/escapeRegex.js';
import Product from '../models/Product.js';
import StockMovement from '../models/StockMovement.js';

const ALLOWED_STOCK_STATUSES = [
  'in-stock',
  'low',
  'out-of-stock',
];

const getScope = (req) => ({
  companyId: req.user.companyId || null,
});

const computeStockStatus = (
  stock,
  minimumStock
) => {
  if (stock === 0) {
    return 'out-of-stock';
  }

  if (stock <= minimumStock) {
    return 'low';
  }

  return 'in-stock';
};

const parseSort = (sort) => {
  const allowed = new Set([
    'name',
    'sku',
    'currentStock',
    'minimumStock',
    'purchasePrice',
    'sellingPrice',
    'createdAt',
  ]);

  if (!sort) {
    return { createdAt: -1 };
  }

  const result = {};

  for (const part of String(sort).split(' ')) {
    if (!part) continue;

    const field = part.startsWith('-')
      ? part.slice(1)
      : part;

    if (allowed.has(field)) {
      result[field] = part.startsWith('-')
        ? -1
        : 1;
    }
  }

  return Object.keys(result).length
    ? result
    : { createdAt: -1 };
};

const buildStockMatch = (stockStatus) => {
  if (!stockStatus) {
    return {};
  }

  if (stockStatus === 'out-of-stock') {
    return {
      currentStock: 0,
    };
  }

  if (stockStatus === 'low') {
    return {
      $and: [
        {
          currentStock: {
            $gt: 0,
          },
        },
        {
          $expr: {
            $lte: [
              '$currentStock',
              '$minimumStock',
            ],
          },
        },
      ],
    };
  }

  return {
    $expr: {
      $gt: [
        '$currentStock',
        '$minimumStock',
      ],
    },
  };
};

const inventoryPipeline = ({
  companyId,
  search,
  category,
  stockStatus,
  skip,
  limit,
  sort,
  projectOnly = false,
}) => {
  const pipeline = [
    {
      $match: {
        companyId,
      },
    },

    {
      $lookup: {
        from: StockMovement.collection.name,

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

              netMovement: {
                $sum: '$quantityChange',
              },
            },
          },
        ],

        as: 'movementSummary',
      },
    },

    {
      $addFields: {
        currentStock: {
          $add: [
            '$openingStock',

            {
              $ifNull: [
                {
                  $arrayElemAt: [
                    '$movementSummary.netMovement',
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
  ];

  if (search?.trim()) {
    const regex = new RegExp(
      escapeRegex(search.trim()),
      'i'
    );

    pipeline.push({
      $match: {
        $or: [
          { name: regex },
          { sku: regex },
          { barcode: regex },
        ],
      },
    });
  }

  if (category) {
    pipeline.push({
      $match: {
        categoryId:
          new mongoose.Types.ObjectId(category),
      },
    });
  }

  if (stockStatus) {
    pipeline.push({
      $match: buildStockMatch(stockStatus),
    });
  }

  pipeline.push({
    $sort: sort,
  });

  if (!projectOnly) {
    pipeline.push(
      {
        $skip: skip,
      },

      {
        $limit: limit,
      },

      {
        $lookup: {
          from: 'categories',
          localField: 'categoryId',
          foreignField: '_id',
          as: 'categoryData',
        },
      }
    );
  }

  return pipeline;
};

const shapeItem = (item) => ({
  _id: item._id,
  name: item.name,
  sku: item.sku,
  barcode: item.barcode ?? null,

  categoryId: item.categoryData?.[0]
    ? {
        _id: item.categoryData[0]._id,
        name: item.categoryData[0].name,
      }
    : item.categoryId,

  purchasePrice: item.purchasePrice ?? 0,
  sellingPrice: item.sellingPrice ?? 0,

  stock: item.currentStock ?? 0,

  minimumStock:
    item.minimumStock ?? 0,

  stockStatus: computeStockStatus(
    item.currentStock ?? 0,
    item.minimumStock ?? 0
  ),

  stockValue:
    (item.currentStock ?? 0) *
    (item.purchasePrice ?? 0),

  status: item.status,
  unit: item.unit,
});

export const getInventory = asyncHandler(
  async (req, res) => {
    const { companyId } = getScope(req);

    if (
      req.query.stockStatus &&
      !ALLOWED_STOCK_STATUSES.includes(
        req.query.stockStatus
      )
    ) {
      throw new AppError(
        `Stock status must be one of: ${ALLOWED_STOCK_STATUSES.join(', ')}`,
        400
      );
    }

    if (
      req.query.category &&
      !mongoose.isValidObjectId(
        req.query.category
      )
    ) {
      throw new AppError(
        'Invalid category id',
        400
      );
    }

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

    const sort = parseSort(
      req.query.sort
    );

    const baseArgs = {
      companyId,
      search: req.query.search,
      category: req.query.category,
      stockStatus: req.query.stockStatus,
      sort,
    };

    const [
      items,
      countRows,
      overviewRows,
    ] = await Promise.all([
      Product.aggregate(
        inventoryPipeline({
          ...baseArgs,
          skip,
          limit,
        })
      ),

      Product.aggregate([
        ...inventoryPipeline({
          ...baseArgs,
          skip: 0,
          limit: 0,
          projectOnly: true,
        }),

        {
          $count: 'total',
        },
      ]),

      Product.aggregate([
        ...inventoryPipeline({
          companyId,
          sort: { _id: 1 },
          projectOnly: true,
        }),

        {
          $project: {
            currentStock: 1,
            minimumStock: 1,
            purchasePrice: 1,
          },
        },
      ]),
    ]);

    const totalItems =
      countRows[0]?.total || 0;

    const overview =
      overviewRows.reduce(
        (acc, item) => {
          const stock =
            item.currentStock ?? 0;

          const minimumStock =
            item.minimumStock ?? 0;

          const status =
            computeStockStatus(
              stock,
              minimumStock
            );

          acc.totalProducts += 1;

          acc.totalStock += stock;

          acc.totalStockValue +=
            stock *
            (item.purchasePrice ?? 0);

          if (status === 'low') {
            acc.lowStockProducts += 1;
          }

          if (
            status === 'out-of-stock'
          ) {
            acc.outOfStockProducts += 1;
          }

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

      count: items.length,

      currentPage: page,

      totalPages: Math.max(
        Math.ceil(
          totalItems / limit
        ),
        1
      ),

      totalItems,

      limit,

      data: items.map(shapeItem),
    });
  }
);