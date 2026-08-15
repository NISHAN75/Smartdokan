import mongoose from 'mongoose';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/AppError.js';
import ApiFeatures from '../utils/apiFeatures.js';

import Supplier from '../models/Supplier.js';
import Purchase from '../models/Purchase.js';
import SupplierPayment from '../models/SupplierPayment.js';

/* =========================================================
   HELPERS
========================================================= */

const getScope = (req) => ({
  companyId: req.user.companyId || null,
});

const ALLOWED_STATUSES = ['active', 'inactive'];

const assertValidObjectId = (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new AppError('Invalid supplier ID', 400);
  }
};

const assertPhoneAvailable = async (
  phone,
  companyId,
  excludeId = null
) => {
  const duplicate = await Supplier.findOne({
    ...(excludeId
      ? {
          _id: {
            $ne: excludeId,
          },
        }
      : {}),
    companyId,
    phone,
  });

  if (duplicate) {
    throw new AppError(
      'A supplier with this phone number already exists',
      409
    );
  }
};

/* =========================================================
   CREATE SUPPLIER
   POST /api/suppliers
========================================================= */

export const createSupplier = asyncHandler(async (req, res) => {
  const {
    name,
    phone,
    email,
    address,
    openingDue,
    status,
  } = req.body;

  if (!name || !name.trim()) {
    throw new AppError(
      'Supplier name is required',
      400
    );
  }

  if (!phone || !phone.trim()) {
    throw new AppError(
      'Phone number is required',
      400
    );
  }

  if (
    status &&
    !ALLOWED_STATUSES.includes(status)
  ) {
    throw new AppError(
      `Status must be one of: ${ALLOWED_STATUSES.join(', ')}`,
      400
    );
  }

  if (
    openingDue !== undefined &&
    openingDue !== '' &&
    (
      !Number.isFinite(Number(openingDue)) ||
      Number(openingDue) < 0
    )
  ) {
    throw new AppError(
      'Opening due must be a valid non-negative number',
      400
    );
  }

  const { companyId } = getScope(req);

  const trimmedPhone = phone.trim();

  await assertPhoneAvailable(
    trimmedPhone,
    companyId
  );

  const supplier = await Supplier.create({
    name: name.trim(),

    phone: trimmedPhone,

    email: email?.trim() || '',

    address: address?.trim() || '',

    openingDue:
      openingDue !== undefined &&
      openingDue !== ''
        ? Number(openingDue)
        : 0,

    status: status || 'active',

    companyId,

    branchId: null,

    createdBy: req.user._id,
  });

  res.status(201).json({
    success: true,
    data: supplier,
  });
});

/* =========================================================
   GET SUPPLIERS
   GET /api/suppliers
========================================================= */

export const getSuppliers = asyncHandler(async (req, res) => {
  const { companyId } = getScope(req);

  if (
    req.query.status &&
    !ALLOWED_STATUSES.includes(
      req.query.status
    )
  ) {
    throw new AppError(
      `Status must be one of: ${ALLOWED_STATUSES.join(', ')}`,
      400
    );
  }

  const {
    filter,
    sort,
    page,
    limit,
    skip,
  } = new ApiFeatures(
    {
      companyId,
    },
    req.query
  )
    .search([
      'name',
      'phone',
      'email',
    ])
    .applyFilters(['status'])
    .build();

  const [
    suppliers,
    totalItems,
  ] = await Promise.all([
    Supplier.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit),

    Supplier.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,

    count: suppliers.length,

    currentPage: page,

    totalPages: Math.max(
      Math.ceil(
        totalItems / limit
      ),
      1
    ),

    totalItems,

    limit,

    data: suppliers,
  });
});

/* =========================================================
   GET SINGLE SUPPLIER
   GET /api/suppliers/:id
========================================================= */

export const getSupplierById = asyncHandler(async (req, res) => {
  assertValidObjectId(
    req.params.id
  );

  const { companyId } = getScope(req);

  const supplier =
    await Supplier.findOne({
      _id: req.params.id,
      companyId,
    });

  if (!supplier) {
    throw new AppError(
      'Supplier not found',
      404
    );
  }

  res.status(200).json({
    success: true,
    data: supplier,
  });
});

/* =========================================================
   UPDATE SUPPLIER
   PATCH /api/suppliers/:id
========================================================= */

export const updateSupplier = asyncHandler(async (req, res) => {
  assertValidObjectId(
    req.params.id
  );

  const { companyId } = getScope(req);

  const supplier =
    await Supplier.findOne({
      _id: req.params.id,
      companyId,
    });

  if (!supplier) {
    throw new AppError(
      'Supplier not found',
      404
    );
  }

  const {
    name,
    phone,
    email,
    address,
    openingDue,
    status,
  } = req.body;

  /* -------------------------
     NAME
  ------------------------- */

  if (
    name !== undefined &&
    !name.trim()
  ) {
    throw new AppError(
      'Supplier name cannot be empty',
      400
    );
  }

  /* -------------------------
     PHONE
  ------------------------- */

  if (
    phone !== undefined &&
    !phone.trim()
  ) {
    throw new AppError(
      'Phone number cannot be empty',
      400
    );
  }

  /* -------------------------
     STATUS
  ------------------------- */

  if (
    status !== undefined &&
    !ALLOWED_STATUSES.includes(
      status
    )
  ) {
    throw new AppError(
      `Status must be one of: ${ALLOWED_STATUSES.join(', ')}`,
      400
    );
  }

  /* -------------------------
     PHONE DUPLICATE CHECK
  ------------------------- */

  if (phone !== undefined) {
    const trimmedPhone =
      phone.trim();

    if (
      trimmedPhone !==
      supplier.phone
    ) {
      await assertPhoneAvailable(
        trimmedPhone,
        companyId,
        supplier._id
      );
    }

    supplier.phone =
      trimmedPhone;
  }

  /* -------------------------
     NAME
  ------------------------- */

  if (name !== undefined) {
    supplier.name =
      name.trim();
  }

  /* -------------------------
     EMAIL
  ------------------------- */

  if (email !== undefined) {
    supplier.email =
      email.trim();
  }

  /* -------------------------
     ADDRESS
  ------------------------- */

  if (address !== undefined) {
    supplier.address =
      address.trim();
  }

  /* -------------------------
     STATUS
  ------------------------- */

  if (status !== undefined) {
    supplier.status =
      status;
  }

  /* -------------------------
     OPENING DUE
  ------------------------- */

  if (
    openingDue !== undefined
  ) {
    if (
      openingDue !== '' &&
      (
        !Number.isFinite(
          Number(openingDue)
        ) ||
        Number(openingDue) < 0
      )
    ) {
      throw new AppError(
        'Opening due must be a valid non-negative number',
        400
      );
    }

    const purchaseExists =
      await Purchase.exists({
        companyId,
        supplierId:
          supplier._id,
      });

    if (purchaseExists) {
      throw new AppError(
        'Opening due cannot be changed after purchases have been recorded for this supplier',
        400
      );
    }

    supplier.openingDue =
      openingDue === ''
        ? 0
        : Number(openingDue);
  }

  await supplier.save();

  res.status(200).json({
    success: true,
    data: supplier,
  });
});

/* =========================================================
   DELETE / DEACTIVATE SUPPLIER
   DELETE /api/suppliers/:id
========================================================= */

export const deleteSupplier = asyncHandler(async (req, res) => {
  assertValidObjectId(
    req.params.id
  );

  const { companyId } = getScope(req);

  const supplier =
    await Supplier.findOne({
      _id: req.params.id,
      companyId,
    });

  if (!supplier) {
    throw new AppError(
      'Supplier not found',
      404
    );
  }

  const [
    purchaseExists,
    paymentExists,
  ] = await Promise.all([
    Purchase.exists({
      companyId,
      supplierId:
        supplier._id,
    }),

    SupplierPayment.exists({
      companyId,
      supplierId:
        supplier._id,
    }),
  ]);

  /*
    If supplier has transaction history,
    do not permanently delete.
    Deactivate instead.
  */

  if (
    purchaseExists ||
    paymentExists
  ) {
    supplier.status =
      'inactive';

    await supplier.save();

    return res.status(200).json({
      success: true,

      message:
        'Supplier has transaction history, so it was deactivated instead of deleted.',

      data: supplier,
    });
  }

  await supplier.deleteOne();

  return res.status(200).json({
    success: true,

    message:
      'Supplier deleted successfully.',
  });
});

/* =========================================================
   SUPPLIER SUMMARY
   GET /api/suppliers/summary
========================================================= */

export const getSupplierSummary = asyncHandler(async (req, res) => {
  const { companyId } = getScope(req);

  const supplierFilter = {
    companyId,
  };

  const purchaseFilter = {
    companyId,
  };

  const paymentFilter = {
    companyId,
  };

  const [
    totalSuppliers,
    activeSuppliers,
    inactiveSuppliers,
    purchaseSummary,
    paymentSummary,
    openingDueSummary,
  ] = await Promise.all([
    /* TOTAL SUPPLIERS */

    Supplier.countDocuments(
      supplierFilter
    ),

    /* ACTIVE */

    Supplier.countDocuments({
      ...supplierFilter,
      status: 'active',
    }),

    /* INACTIVE */

    Supplier.countDocuments({
      ...supplierFilter,
      status: 'inactive',
    }),

    /* PURCHASE SUMMARY */

    Purchase.aggregate([
      {
        $match:
          purchaseFilter,
      },

      {
        $group: {
          _id: null,

          totalPurchases: {
            $sum: 1,
          },

          totalPurchaseAmount: {
            $sum: {
              $ifNull: [
                '$grandTotal',
                0,
              ],
            },
          },

          totalPurchasePaid: {
            $sum: {
              $ifNull: [
                '$paidAmount',
                0,
              ],
            },
          },

          totalPurchaseDue: {
            $sum: {
              $ifNull: [
                '$dueAmount',
                0,
              ],
            },
          },
        },
      },
    ]),

    /* SUPPLIER PAYMENTS */

    SupplierPayment.aggregate([
      {
        $match:
          paymentFilter,
      },

      {
        $group: {
          _id: null,

          totalSupplierPayments: {
            $sum: {
              $ifNull: [
                '$amount',
                0,
              ],
            },
          },
        },
      },
    ]),

    /* OPENING DUE */

    Supplier.aggregate([
      {
        $match:
          supplierFilter,
      },

      {
        $group: {
          _id: null,

          totalOpeningDue: {
            $sum: {
              $ifNull: [
                '$openingDue',
                0,
              ],
            },
          },
        },
      },
    ]),
  ]);

  const purchases =
    purchaseSummary[0] || {};

  const payments =
    paymentSummary[0] || {};

  const opening =
    openingDueSummary[0] || {};

  const totalPurchaseAmount =
    purchases.totalPurchaseAmount ||
    0;

  const totalPurchasePaid =
    purchases.totalPurchasePaid ||
    0;

  const totalPurchaseDue =
    purchases.totalPurchaseDue ||
    0;

  const totalSupplierPayments =
    payments.totalSupplierPayments ||
    0;

  const totalOpeningDue =
    opening.totalOpeningDue ||
    0;

  /*
    Supplier current due:

    Opening Due
    +
    Purchase Due
    -
    Supplier Payments
  */

  const totalDue =
    totalOpeningDue +
    totalPurchaseDue -
    totalSupplierPayments;

  res.status(200).json({
    success: true,

    data: {
      totalSuppliers,

      activeSuppliers,

      inactiveSuppliers,

      totalPurchases:
        purchases.totalPurchases ||
        0,

      totalPurchaseAmount,

      totalPurchasePaid,

      totalPurchaseDue,

      totalOpeningDue,

      totalSupplierPayments,

      totalDue: Math.max(
        totalDue,
        0
      ),
    },
  });
});

/* =========================================================
   SUPPLIER PURCHASES
   GET /api/suppliers/:id/purchases
========================================================= */

export const getSupplierPurchases = asyncHandler(async (req, res) => {
  assertValidObjectId(
    req.params.id
  );

  const { companyId } = getScope(req);

  const supplier =
    await Supplier.findOne({
      _id: req.params.id,
      companyId,
    }).select(
      '_id name phone'
    );

  if (!supplier) {
    throw new AppError(
      'Supplier not found',
      404
    );
  }

  const {
    filter,
    sort,
    page,
    limit,
    skip,
  } = new ApiFeatures(
    {
      companyId,
      supplierId:
        supplier._id,
    },
    req.query
  ).build();

  const [
    purchases,
    totalItems,
  ] = await Promise.all([
    Purchase.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit),

    Purchase.countDocuments(
      filter
    ),
  ]);

  res.status(200).json({
    success: true,

    count:
      purchases.length,

    currentPage:
      page,

    totalPages: Math.max(
      Math.ceil(
        totalItems / limit
      ),
      1
    ),

    totalItems,

    limit,

    data: purchases,
  });
});

/* =========================================================
   SUPPLIER PAYMENTS
   GET /api/suppliers/:id/payments
========================================================= */

export const getSupplierPayments = asyncHandler(async (req, res) => {
  assertValidObjectId(
    req.params.id
  );

  const { companyId } = getScope(req);

  const supplier =
    await Supplier.findOne({
      _id: req.params.id,
      companyId,
    }).select(
      '_id name phone'
    );

  if (!supplier) {
    throw new AppError(
      'Supplier not found',
      404
    );
  }

  const {
    filter,
    sort,
    page,
    limit,
    skip,
  } = new ApiFeatures(
    {
      companyId,
      supplierId:
        supplier._id,
    },
    req.query
  ).build();

  const [
    payments,
    totalItems,
  ] = await Promise.all([
    SupplierPayment.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate(
        'supplierId',
        'name phone'
      ),

    SupplierPayment.countDocuments(
      filter
    ),
  ]);

  res.status(200).json({
    success: true,

    count:
      payments.length,

    currentPage:
      page,

    totalPages: Math.max(
      Math.ceil(
        totalItems / limit
      ),
      1
    ),

    totalItems,

    limit,

    data: payments,
  });
});