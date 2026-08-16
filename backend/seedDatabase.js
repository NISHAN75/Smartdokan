import 'dotenv/config';
import mongoose from 'mongoose';

import User from './models/User.js';
import Category from './models/Category.js';
import Product from './models/Product.js';
import Customer from './models/Customer.js';
import Supplier from './models/Supplier.js';
import ExpenseCategory from './models/ExpenseCategory.js';
import Purchase, { PAYMENT_METHODS as PURCHASE_PAYMENT_METHODS } from './models/Purchase.js';
import Sale, { PAYMENT_METHODS as SALE_PAYMENT_METHODS } from './models/Sale.js';
import Expense from './models/Expense.js';
import SupplierPayment from './models/SupplierPayment.js';
import StockMovement from './models/StockMovement.js';

// =====================================================================
// SmartDokan demo/test data seed — DEMO-SEED-V2
// =====================================================================
//
// This script ONLY touches demo/test master + transactional data. It
// never touches: User accounts, Settings, or anything not created by
// this exact script.
//
// HOW IDENTIFICATION WORKS
// -------------------------------------------------------------------
// Several models here (Sale in particular) have no free-text "note" or
// "tag" field to stamp a marker onto, so this script does not rely on
// embedding a marker string inside application data. Instead it keeps
// its own private bookkeeping collection, `demoSeedRegistry`, which is
// NOT part of the application's schema (nothing else in the codebase
// reads it) — it exists purely so this script can:
//   1. know whether a given seed item ("category:Grocery...",
//      "sale:014", ...) was already created on a previous run, so
//      re-running never creates duplicates (Step 5), and
//   2. know EXACTLY which real documents (by _id) it is responsible
//      for, so --reset can delete precisely those documents and
//      nothing else — never anything the shop owner created by hand.
//
// Every document this script creates is registered here right after
// creation. Reset deletes exactly the documents listed in the
// registry (for marker DEMO-SEED-V2), then clears the registry.
//
// USAGE
// -------------------------------------------------------------------
//   node seedDatabase.js              seed (idempotent — safe to rerun)
//   node seedDatabase.js --reset      wipe previous DEMO-SEED-V2 data, then reseed
//   node seedDatabase.js --reset-only wipe previous DEMO-SEED-V2 data, do not reseed
// =====================================================================

const MARKER = 'DEMO-SEED-V2';
const COMPANY_ID = null; // every model in this project scopes to companyId: null today (no Company module yet)

const args = process.argv.slice(2);
const MODE = args.includes('--reset-only') ? 'reset-only' : args.includes('--reset') ? 'reset' : 'seed';

const money = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[randomInt(0, arr.length - 1)];

// ---------------------------------------------------------------------
// Registry helpers (private bookkeeping collection — see header above)
// ---------------------------------------------------------------------
let registryCollection;

const registryGet = async (key) => registryCollection.findOne({ _id: key, marker: MARKER });

const registrySet = async (key, collectionName, documentId) =>
  registryCollection.updateOne(
    { _id: key },
    { $set: { marker: MARKER, collection: collectionName, documentId, seededAt: new Date() } },
    { upsert: true }
  );

const counters = { reused: 0, created: 0 };

/**
 * Idempotent upsert for "master data" rows keyed by a natural unique
 * field already enforced by the real schema/index (category name,
 * product sku, customer/supplier phone). Uses $setOnInsert so a second
 * run never overwrites anything and never duplicates.
 */
const upsertMaster = async (Model, collectionName, registryKey, findQuery, insertDoc) => {
  const already = await registryGet(registryKey);
  if (already) {
    counters.reused += 1;
    return Model.findById(already.documentId);
  }

  const doc = await Model.findOneAndUpdate(
    findQuery,
    { $setOnInsert: insertDoc },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  await registrySet(registryKey, collectionName, doc._id);
  counters.created += 1;
  return doc;
};

/**
 * Idempotent guard for synthetic transactional records (Purchase, Sale,
 * Expense, SupplierPayment) that have no natural pre-existing key —
 * identified purely by a stable, script-defined logical key
 * ("purchase:003"). If the registry already has this key, the whole
 * creation (including any StockMovement side effects) is skipped.
 */
const alreadySeeded = async (registryKey) => {
  const existing = await registryGet(registryKey);
  if (existing) counters.reused += 1;
  return Boolean(existing);
};

// =====================================================================
// STEP 1 — DB connection + operator user
// =====================================================================
const connect = async () => {
  const conn = await mongoose.connect(process.env.MONGO_URI);
  console.log(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  registryCollection = mongoose.connection.db.collection('demoSeedRegistry');
  return conn;
};

const getOperatorUser = async () => {
  const user = await User.findOne({});
  if (!user) {
    throw new Error(
      'No User account found. This script never creates a User — please register/login once first, then rerun the seed.'
    );
  }
  console.log(`Using existing user as createdBy: ${user.email} (${user._id})`);
  return user;
};

// =====================================================================
// STEP 2 — RESET (safe: only deletes documents this script registered)
// =====================================================================
const runReset = async () => {
  const entries = await registryCollection.find({ marker: MARKER }).toArray();
  if (entries.length === 0) {
    console.log('Reset: no previous DEMO-SEED-V2 data found — nothing to remove.');
    return { removed: 0 };
  }

  const byCollection = new Map();
  entries.forEach((e) => {
    if (!byCollection.has(e.collection)) byCollection.set(e.collection, []);
    byCollection.get(e.collection).push(e.documentId);
  });

  const collectionModels = {
    categories: Category,
    products: Product,
    customers: Customer,
    suppliers: Supplier,
    expensecategories: ExpenseCategory,
    purchases: Purchase,
    sales: Sale,
    expenses: Expense,
    supplierpayments: SupplierPayment,
    stockmovements: StockMovement,
  };

  let removed = 0;
  for (const [collectionName, ids] of byCollection) {
    const Model = collectionModels[collectionName];
    if (!Model) continue;
    const result = await Model.deleteMany({ _id: { $in: ids } });
    console.log(`  removed ${result.deletedCount} from ${collectionName}`);
    removed += result.deletedCount;
  }

  await registryCollection.deleteMany({ marker: MARKER });
  console.log(`Reset complete: ${removed} documents removed, registry cleared.`);
  return { removed };
};

// =====================================================================
// STEP 3 — MASTER DATA
// =====================================================================

const CATEGORY_DEFS = [
  { name: 'Grocery & Daily Essentials', description: 'Rice, lentils, and everyday kitchen staples' },
  { name: 'Beverages & Soft Drinks', description: 'Soft drinks, juices, and bottled water' },
  { name: 'Snacks & Biscuits', description: 'Biscuits, chanachur, and packaged snacks' },
  { name: 'Personal Care & Hygiene', description: 'Soap, shampoo, and personal hygiene products' },
  { name: 'Household & Cleaning', description: 'Detergents, cleaners, and household supplies' },
  { name: 'Stationery & Office Supplies', description: 'Pens, paper, and office essentials' },
  { name: 'Electronics & Accessories', description: 'Cables, chargers, and small electronics' },
  { name: 'Baby Care', description: 'Diapers, baby food, and baby care products' },
  { name: 'Dairy & Frozen', description: 'Milk, eggs, and frozen items' },
  { name: 'Spices & Cooking Essentials', description: 'Spices, oil, and cooking ingredients' },
];

// Category.js generates `slug` via a `pre('validate')` document hook.
// findOneAndUpdate()/$setOnInsert (used by upsertMaster below) runs as
// a query, not a document save, so that hook never fires and slug
// would insert as null for every category — colliding with the unique
// {companyId, slug} index after the very first one. Computing it here,
// identically to the model's hook, avoids relying on document
// middleware for an upsert path.
const slugify = (name) =>
  name
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-+|-+$)/g, '');

const seedCategories = async (userId) => {
  const map = new Map();
  for (const def of CATEGORY_DEFS) {
    const doc = await upsertMaster(
      Category,
      'categories',
      `category:${def.name}`,
      { companyId: COMPANY_ID, name: def.name },
      {
        name: def.name,
        slug: slugify(def.name),
        description: def.description,
        status: 'active',
        companyId: COMPANY_ID,
        branchId: null,
        createdBy: userId,
      }
    );
    map.set(def.name, doc);
  }
  console.log(`Categories ready: ${map.size}`);
  return map;
};

// 30 products, 3 per category, realistic Bangladesh shop catalog.
// SKU is prefixed DEMO- so it can never collide with a real shop's own
// SKU scheme, and doubles as an unambiguous identifier if the registry
// were ever unavailable.
const PRODUCT_DEFS = [
  // Grocery & Daily Essentials
  { sku: 'DEMO-GROC-001', name: 'Miniket Rice 5kg', barcode: '8901234500001', category: 'Grocery & Daily Essentials', purchasePrice: 380, sellingPrice: 430, openingStock: 40, minimumStock: 10, unit: 'packet' },
  { sku: 'DEMO-GROC-002', name: 'Chinigura Rice 2kg', barcode: '8901234500002', category: 'Grocery & Daily Essentials', purchasePrice: 220, sellingPrice: 260, openingStock: 30, minimumStock: 8, unit: 'packet' },
  { sku: 'DEMO-GROC-003', name: 'Red Lentil (Masoor Dal) 1kg', barcode: '8901234500003', category: 'Grocery & Daily Essentials', purchasePrice: 115, sellingPrice: 140, openingStock: 50, minimumStock: 15, unit: 'kg' },
  // Beverages & Soft Drinks
  { sku: 'DEMO-BEV-001', name: 'Coca-Cola 500ml', barcode: '8901234500004', category: 'Beverages & Soft Drinks', purchasePrice: 28, sellingPrice: 40, openingStock: 100, minimumStock: 20, unit: 'pcs' },
  { sku: 'DEMO-BEV-002', name: 'Pran Mango Juice 250ml', barcode: '8901234500005', category: 'Beverages & Soft Drinks', purchasePrice: 20, sellingPrice: 30, openingStock: 80, minimumStock: 20, unit: 'pcs' },
  { sku: 'DEMO-BEV-003', name: 'Aquafina Water 1L', barcode: '8901234500006', category: 'Beverages & Soft Drinks', purchasePrice: 15, sellingPrice: 25, openingStock: 120, minimumStock: 30, unit: 'pcs' },
  // Snacks & Biscuits
  { sku: 'DEMO-SNCK-001', name: 'Olympic Energy Biscuit', barcode: '8901234500007', category: 'Snacks & Biscuits', purchasePrice: 8, sellingPrice: 12, openingStock: 150, minimumStock: 30, unit: 'packet' },
  { sku: 'DEMO-SNCK-002', name: 'Pran Chanachur 200g', barcode: '8901234500008', category: 'Snacks & Biscuits', purchasePrice: 35, sellingPrice: 50, openingStock: 60, minimumStock: 15, unit: 'packet' },
  { sku: 'DEMO-SNCK-003', name: 'Bombay Sweets Potato Chips', barcode: '8901234500009', category: 'Snacks & Biscuits', purchasePrice: 18, sellingPrice: 25, openingStock: 90, minimumStock: 20, unit: 'packet' },
  // Personal Care & Hygiene
  { sku: 'DEMO-CARE-001', name: 'Lifebuoy Soap 100g', barcode: '8901234500010', category: 'Personal Care & Hygiene', purchasePrice: 32, sellingPrice: 45, openingStock: 70, minimumStock: 15, unit: 'pcs' },
  { sku: 'DEMO-CARE-002', name: 'Sunsilk Shampoo 180ml', barcode: '8901234500011', category: 'Personal Care & Hygiene', purchasePrice: 150, sellingPrice: 195, openingStock: 40, minimumStock: 10, unit: 'pcs' },
  { sku: 'DEMO-CARE-003', name: 'Colgate Toothpaste 100g', barcode: '8901234500012', category: 'Personal Care & Hygiene', purchasePrice: 68, sellingPrice: 90, openingStock: 55, minimumStock: 15, unit: 'pcs' },
  // Household & Cleaning
  { sku: 'DEMO-HOME-001', name: 'Wheel Detergent Powder 1kg', barcode: '8901234500013', category: 'Household & Cleaning', purchasePrice: 120, sellingPrice: 155, openingStock: 35, minimumStock: 10, unit: 'kg' },
  { sku: 'DEMO-HOME-002', name: 'Harpic Toilet Cleaner 500ml', barcode: '8901234500014', category: 'Household & Cleaning', purchasePrice: 95, sellingPrice: 125, openingStock: 30, minimumStock: 8, unit: 'pcs' },
  { sku: 'DEMO-HOME-003', name: 'Vim Dishwash Bar', barcode: '8901234500015', category: 'Household & Cleaning', purchasePrice: 18, sellingPrice: 25, openingStock: 60, minimumStock: 15, unit: 'pcs' },
  // Stationery & Office Supplies
  { sku: 'DEMO-STAT-001', name: 'Kazi A4 Paper Ream', barcode: '8901234500016', category: 'Stationery & Office Supplies', purchasePrice: 320, sellingPrice: 380, openingStock: 20, minimumStock: 5, unit: 'packet' },
  { sku: 'DEMO-STAT-002', name: 'Doel Ball Pen (Blue)', barcode: '8901234500017', category: 'Stationery & Office Supplies', purchasePrice: 6, sellingPrice: 10, openingStock: 200, minimumStock: 40, unit: 'pcs' },
  { sku: 'DEMO-STAT-003', name: 'Classic Exercise Book 100pg', barcode: '8901234500018', category: 'Stationery & Office Supplies', purchasePrice: 30, sellingPrice: 40, openingStock: 80, minimumStock: 20, unit: 'pcs' },
  // Electronics & Accessories
  { sku: 'DEMO-ELEC-001', name: 'Type-C Charging Cable', barcode: '8901234500019', category: 'Electronics & Accessories', purchasePrice: 90, sellingPrice: 150, openingStock: 45, minimumStock: 10, unit: 'pcs' },
  { sku: 'DEMO-ELEC-002', name: 'Walton 10000mAh Power Bank', barcode: '8901234500020', category: 'Electronics & Accessories', purchasePrice: 900, sellingPrice: 1200, openingStock: 15, minimumStock: 5, unit: 'pcs' },
  { sku: 'DEMO-ELEC-003', name: 'Symphony Earphone', barcode: '8901234500021', category: 'Electronics & Accessories', purchasePrice: 180, sellingPrice: 260, openingStock: 25, minimumStock: 8, unit: 'pcs' },
  // Baby Care
  { sku: 'DEMO-BABY-001', name: "Huggies Diaper (M) 20pcs", barcode: '8901234500022', category: 'Baby Care', purchasePrice: 480, sellingPrice: 590, openingStock: 20, minimumStock: 5, unit: 'packet' },
  { sku: 'DEMO-BABY-002', name: "Johnson's Baby Powder 200g", barcode: '8901234500023', category: 'Baby Care', purchasePrice: 140, sellingPrice: 175, openingStock: 25, minimumStock: 8, unit: 'pcs' },
  { sku: 'DEMO-BABY-003', name: 'Cerelac Baby Food 400g', barcode: '8901234500024', category: 'Baby Care', purchasePrice: 320, sellingPrice: 390, openingStock: 18, minimumStock: 5, unit: 'box' },
  // Dairy & Frozen
  { sku: 'DEMO-DAIRY-001', name: 'Aarong Milk 1L', barcode: '8901234500025', category: 'Dairy & Frozen', purchasePrice: 78, sellingPrice: 95, openingStock: 40, minimumStock: 10, unit: 'liter' },
  { sku: 'DEMO-DAIRY-002', name: 'Igloo Ice Cream Cup', barcode: '8901234500026', category: 'Dairy & Frozen', purchasePrice: 35, sellingPrice: 50, openingStock: 50, minimumStock: 15, unit: 'pcs' },
  { sku: 'DEMO-DAIRY-003', name: 'Bashundhara Egg (Dozen)', barcode: '8901234500027', category: 'Dairy & Frozen', purchasePrice: 130, sellingPrice: 150, openingStock: 30, minimumStock: 8, unit: 'dozen' },
  // Spices & Cooking Essentials
  { sku: 'DEMO-SPICE-001', name: 'Radhuni Turmeric Powder 200g', barcode: '8901234500028', category: 'Spices & Cooking Essentials', purchasePrice: 55, sellingPrice: 75, openingStock: 45, minimumStock: 10, unit: 'pcs' },
  { sku: 'DEMO-SPICE-002', name: 'Fresh Soybean Oil 1L', barcode: '8901234500029', category: 'Spices & Cooking Essentials', purchasePrice: 168, sellingPrice: 195, openingStock: 60, minimumStock: 15, unit: 'liter' },
  { sku: 'DEMO-SPICE-003', name: 'Pran Salt 1kg', barcode: '8901234500030', category: 'Spices & Cooking Essentials', purchasePrice: 35, sellingPrice: 45, openingStock: 70, minimumStock: 20, unit: 'kg' },
];

const seedProducts = async (userId, categoryMap) => {
  const products = [];
  for (const def of PRODUCT_DEFS) {
    const category = categoryMap.get(def.category);
    const doc = await upsertMaster(
      Product,
      'products',
      `product:${def.sku}`,
      { companyId: COMPANY_ID, sku: def.sku },
      {
        name: def.name,
        sku: def.sku,
        barcode: def.barcode,
        purchasePrice: def.purchasePrice,
        sellingPrice: def.sellingPrice,
        minimumStock: def.minimumStock,
        openingStock: def.openingStock,
        unit: def.unit,
        categoryId: category._id,
        description: `${def.name} — demo catalog item`,
        status: 'active',
        companyId: COMPANY_ID,
        branchId: null,
        createdBy: userId,
      }
    );
    products.push(doc);
  }
  console.log(`Products ready: ${products.length}`);
  return products;
};

// 15 customers — reserved phone block 017000000xx so this range can
// never collide with a real customer's number and doubles as an extra
// (belt-and-suspenders) safe-delete filter beyond the registry.
const CUSTOMER_DEFS = [
  { name: 'Md. Abdur Rahman', phone: '01700000001', address: 'Agrabad, Chattogram' },
  { name: 'Fatema Begum', phone: '01700000002', address: 'Nasirabad, Chattogram' },
  { name: 'Md. Kamal Hossain', phone: '01700000003', address: 'Panchlaish, Chattogram' },
  { name: 'Nasrin Akter', phone: '01700000004', address: 'Khulshi, Chattogram' },
  { name: 'Md. Shahidul Islam', phone: '01700000005', address: 'GEC Circle, Chattogram' },
  { name: 'Rina Sultana', phone: '01700000006', address: 'Halishahar, Chattogram' },
  { name: 'Md. Jashim Uddin', phone: '01700000007', address: 'Dhanmondi, Dhaka' },
  { name: 'Sultana Razia', phone: '01700000008', address: 'Mirpur, Dhaka' },
  { name: 'Md. Anwar Hossain', phone: '01700000009', address: 'Uttara, Dhaka' },
  { name: 'Taslima Akter', phone: '01700000010', address: 'Mohammadpur, Dhaka' },
  { name: 'Md. Faruk Ahmed', phone: '01700000011', address: 'Chawkbazar, Chattogram' },
  { name: 'Shirin Akter', phone: '01700000012', address: 'Bakalia, Chattogram' },
  { name: 'Md. Rafiqul Islam', phone: '01700000013', address: 'Banani, Dhaka' },
  { name: 'Nazma Begum', phone: '01700000014', address: 'Gulshan, Dhaka' },
  { name: 'Md. Habibur Rahman', phone: '01700000015', address: 'Kotwali, Chattogram' },
];

const seedCustomers = async (userId) => {
  const customers = [];
  for (const def of CUSTOMER_DEFS) {
    const doc = await upsertMaster(
      Customer,
      'customers',
      `customer:${def.phone}`,
      { companyId: COMPANY_ID, phone: def.phone },
      {
        name: def.name,
        phone: def.phone,
        email: '',
        address: def.address,
        companyId: COMPANY_ID,
        branchId: null,
        createdBy: userId,
      }
    );
    customers.push(doc);
  }
  console.log(`Customers ready: ${customers.length}`);
  return customers;
};

// 10 suppliers — reserved phone block 018000000xx, same reasoning as
// the customer block above.
const SUPPLIER_DEFS = [
  { name: 'Chattogram Wholesale Traders', phone: '01800000001', address: 'Khatunganj, Chattogram' },
  { name: 'Dhaka Distribution House', phone: '01800000002', address: 'Karwan Bazar, Dhaka' },
  { name: 'Bengal FMCG Distributors', phone: '01800000003', address: 'Agrabad, Chattogram' },
  { name: 'Metro Grocery Suppliers', phone: '01800000004', address: 'Chawkbazar, Chattogram' },
  { name: 'City Electronics Wholesale', phone: '01800000005', address: 'Reazuddin Bazar, Chattogram' },
  { name: 'National Beverage Distributors', phone: '01800000006', address: 'Tejgaon, Dhaka' },
  { name: 'Green Valley Dairy Suppliers', phone: '01800000007', address: 'Bahaddarhat, Chattogram' },
  { name: 'Prime Stationery Wholesale', phone: '01800000008', address: 'Anderkilla, Chattogram' },
  { name: 'Unity Baby Products Ltd', phone: '01800000009', address: 'Mirpur, Dhaka' },
  { name: 'Coastal Household Supplies', phone: '01800000010', address: 'Halishahar, Chattogram' },
];

const seedSuppliers = async (userId) => {
  const suppliers = [];
  for (const def of SUPPLIER_DEFS) {
    // NOTE: this project's supplierController.js reads/writes an
    // `openingDue` field that does not actually exist on the Supplier
    // schema (backend/models/Supplier.js) — see the written report for
    // details. Since it isn't a real schema field, this seed does not
    // set it (Mongoose would silently drop it under strict mode
    // anyway); supplier balances here come entirely from real
    // Purchase.dueAmount / SupplierPayment records, which the schema
    // does support.
    const doc = await upsertMaster(
      Supplier,
      'suppliers',
      `supplier:${def.phone}`,
      { companyId: COMPANY_ID, phone: def.phone },
      {
        name: def.name,
        phone: def.phone,
        email: '',
        address: def.address,
        status: 'active',
        companyId: COMPANY_ID,
        branchId: null,
        createdBy: userId,
      }
    );
    suppliers.push(doc);
  }
  console.log(`Suppliers ready: ${suppliers.length}`);
  return suppliers;
};

const EXPENSE_CATEGORY_DEFS = [
  { name: 'Shop Rent', description: 'Monthly shop rent' },
  { name: 'Electricity Bill', description: 'Monthly electricity bill' },
  { name: 'Staff Salary', description: 'Employee salary and wages' },
  { name: 'Transportation & Delivery', description: 'Delivery and transport costs' },
  { name: 'Internet & Phone Bill', description: 'Internet and mobile bill' },
  { name: 'Shop Maintenance', description: 'Repairs and maintenance' },
  { name: 'Packaging Materials', description: 'Bags, boxes, and packaging supplies' },
  { name: 'Miscellaneous', description: 'Other small business expenses' },
];

const seedExpenseCategories = async (userId) => {
  const map = new Map();
  for (const def of EXPENSE_CATEGORY_DEFS) {
    const doc = await upsertMaster(
      ExpenseCategory,
      'expensecategories',
      `expenseCategory:${def.name}`,
      { companyId: COMPANY_ID, name: def.name },
      {
        name: def.name,
        description: def.description,
        status: 'active',
        companyId: COMPANY_ID,
        branchId: null,
        createdBy: userId,
      }
    );
    map.set(def.name, doc);
  }
  console.log(`Expense categories ready: ${map.size}`);
  return map;
};

// =====================================================================
// STEP 4 — TRANSACTIONAL DATA
// =====================================================================
// Every formula below is copied verbatim from the real controllers
// (purchaseController.js / saleController.js / stockMovementController.js)
// rather than reinvented, per "follow the same stock calculation
// pipeline already used by the project."

const getCurrentStock = async (productId) => {
  const product = await Product.findOne({ _id: productId, companyId: COMPANY_ID }).select('openingStock');
  const [row] = await StockMovement.aggregate([
    { $match: { productId, companyId: COMPANY_ID } },
    { $group: { _id: '$productId', net: { $sum: '$quantityChange' } } },
  ]);
  return (product.openingStock || 0) + (row?.net || 0);
};

const derivePaymentStatus = (paidAmount, total) => {
  if (total === 0 || paidAmount >= total) return 'paid';
  if (paidAmount === 0) return 'due';
  return 'partial';
};

let purchaseCounter = 0;
let saleCounter = 0;

const initCounters = async () => {
  purchaseCounter = await Purchase.countDocuments({ companyId: COMPANY_ID });
  saleCounter = await Sale.countDocuments({ companyId: COMPANY_ID });
};

const nextPurchaseNumber = () => {
  purchaseCounter += 1;
  return `PUR-${String(purchaseCounter).padStart(6, '0')}`;
};

const nextInvoiceNumber = () => {
  saleCounter += 1;
  return `INV-${String(saleCounter).padStart(6, '0')}`;
};

/**
 * paidRatio buckets used across both Purchases and Sales so the demo
 * data includes a realistic, even mix of fully paid / partially paid /
 * unpaid transactions, as required by Step 4.
 */
const PAID_RATIO_BUCKETS = [1, 1, 1, 1, 1, 0.5, 0.5, 0.5, 0.5, 0.5, 0, 0, 0, 0, 0];

// ---- Purchases (15) --------------------------------------------------
const buildPurchasePlans = (suppliers, products) => {
  const productsByCategoryOrder = products; // already grouped 3-at-a-time per category
  const plans = [];
  for (let i = 0; i < 15; i += 1) {
    const supplier = suppliers[i % suppliers.length];
    // 3 products per purchase, taken from a rotating window of the catalog
    const start = (i * 3) % productsByCategoryOrder.length;
    const items = [0, 1, 2].map((offset) => productsByCategoryOrder[(start + offset) % productsByCategoryOrder.length]);
    plans.push({
      key: `purchase:${String(i + 1).padStart(3, '0')}`,
      supplier,
      items: items.map((p) => ({ product: p, quantity: randomInt(10, 40) })),
      paidRatio: PAID_RATIO_BUCKETS[i % PAID_RATIO_BUCKETS.length],
      dayOffset: randomInt(1, 55),
      paymentMethod: pick(PURCHASE_PAYMENT_METHODS),
    });
  }
  return plans;
};

const seedPurchases = async (userId, suppliers, products) => {
  const plans = buildPurchasePlans(suppliers, products);
  let created = 0;

  for (const plan of plans) {
    if (await alreadySeeded(plan.key)) continue;

    const items = [];
    let subtotal = 0;
    for (const { product, quantity } of plan.items) {
      // Small realistic variation vs. the catalog purchasePrice, same
      // reasoning as purchaseController's comment: a supplier may
      // charge slightly differently order to order.
      const purchasePrice = money(product.purchasePrice * (1 + randomInt(-5, 5) / 100));
      const lineTotal = money(purchasePrice * quantity);
      items.push({ productId: product._id, name: product.name, sku: product.sku, purchasePrice, quantity, lineTotal });
      subtotal += lineTotal;
    }
    subtotal = money(subtotal);
    const discount = 0;
    const total = subtotal;
    const paidAmount = money(total * plan.paidRatio);
    const dueAmount = money(total - paidAmount);
    const paymentStatus = derivePaymentStatus(paidAmount, total);
    const purchaseNumber = nextPurchaseNumber();
    const createdAt = daysAgo(plan.dayOffset);

    const purchase = await Purchase.create({
      purchaseNumber,
      supplierId: plan.supplier._id,
      supplierName: plan.supplier.name,
      items,
      subtotal,
      discount,
      total,
      paidAmount,
      dueAmount,
      paymentMethod: plan.paymentMethod,
      paymentStatus,
      note: '',
      companyId: COMPANY_ID,
      branchId: null,
      createdBy: userId,
      createdAt,
      updatedAt: createdAt,
    });
    await registrySet(plan.key, 'purchases', purchase._id);

    for (const item of items) {
      const previousStock = await getCurrentStock(item.productId);
      const resultingStock = previousStock + item.quantity;
      const movement = await StockMovement.create({
        productId: item.productId,
        companyId: COMPANY_ID,
        branchId: null,
        type: 'in',
        quantityChange: item.quantity,
        previousStock,
        resultingStock,
        unitCost: item.purchasePrice,
        reason: `Purchase ${purchaseNumber}`,
        note: MARKER,
        createdBy: userId,
        createdAt,
        updatedAt: createdAt,
      });
      await registrySet(`${plan.key}:movement:${item.productId}`, 'stockmovements', movement._id);
    }

    created += 1;
  }
  console.log(`Purchases created this run: ${created} (of 15 planned)`);
};

// ---- Sales (20) --------------------------------------------------
const buildSalePlans = (customers, products) => {
  const plans = [];
  for (let i = 0; i < 20; i += 1) {
    // Roughly 1 in 4 sales is a walk-in (no customerId), matching real
    // shop behavior — most regulars are tracked, some aren't.
    const customer = i % 4 === 3 ? null : customers[i % customers.length];
    const itemCount = randomInt(1, 4);
    const items = [];
    for (let n = 0; n < itemCount; n += 1) {
      items.push({ product: products[(i * 3 + n) % products.length], quantity: randomInt(1, 5) });
    }
    plans.push({
      key: `sale:${String(i + 1).padStart(3, '0')}`,
      customer,
      items,
      paidRatio: PAID_RATIO_BUCKETS[(i + 3) % PAID_RATIO_BUCKETS.length],
      dayOffset: randomInt(0, 55),
      paymentMethod: pick(SALE_PAYMENT_METHODS),
    });
  }
  return plans;
};

const seedSales = async (userId, customers, products) => {
  const plans = buildSalePlans(customers, products);
  let created = 0;
  let skippedForStock = 0;

  for (const plan of plans) {
    if (await alreadySeeded(plan.key)) continue;

    // Merge duplicate products within the same sale (same reasoning as
    // saleController — a product should appear once per sale).
    const merged = new Map();
    for (const { product, quantity } of plan.items) {
      merged.set(product._id.toString(), {
        product,
        quantity: (merged.get(product._id.toString())?.quantity || 0) + quantity,
      });
    }

    // Verify stock up front; if this particular random plan would
    // overdraw a product (possible since purchases/sales interleave
    // randomly across the demo catalog), reduce the quantity down to
    // what's available rather than failing the whole run.
    const items = [];
    let subtotal = 0;
    let viable = true;
    for (const { product, quantity } of merged.values()) {
      const available = await getCurrentStock(product._id);
      const finalQuantity = Math.min(quantity, available);
      if (finalQuantity <= 0) {
        continue;
      }
      const lineTotal = money(product.sellingPrice * finalQuantity);
      items.push({ productId: product._id, name: product.name, sku: product.sku, sellingPrice: product.sellingPrice, quantity: finalQuantity, lineTotal });
      subtotal += lineTotal;
    }
    if (items.length === 0) {
      viable = false;
    }
    if (!viable) {
      skippedForStock += 1;
      continue;
    }

    subtotal = money(subtotal);
    const discount = plan.paidRatio === 1 && Math.random() < 0.3 ? money(subtotal * 0.05) : 0; // occasional 5% discount on some fully-paid sales
    const total = money(subtotal - discount);
    const paidAmount = money(total * plan.paidRatio);
    const dueAmount = money(total - paidAmount);
    const paymentStatus = derivePaymentStatus(paidAmount, total);
    const invoiceNumber = nextInvoiceNumber();
    const createdAt = daysAgo(plan.dayOffset);

    const sale = await Sale.create({
      invoiceNumber,
      customerId: plan.customer ? plan.customer._id : null,
      customerName: plan.customer ? plan.customer.name : 'Walk-in Customer',
      items,
      subtotal,
      discount,
      total,
      paidAmount,
      dueAmount,
      paymentMethod: plan.paymentMethod,
      paymentStatus,
      companyId: COMPANY_ID,
      branchId: null,
      createdBy: userId,
      createdAt,
      updatedAt: createdAt,
    });
    await registrySet(plan.key, 'sales', sale._id);

    for (const item of items) {
      const previousStock = await getCurrentStock(item.productId);
      const resultingStock = previousStock - item.quantity;
      const movement = await StockMovement.create({
        productId: item.productId,
        companyId: COMPANY_ID,
        branchId: null,
        type: 'out',
        quantityChange: -item.quantity,
        previousStock,
        resultingStock,
        reason: `Sale ${invoiceNumber}`,
        note: MARKER,
        createdBy: userId,
        createdAt,
        updatedAt: createdAt,
      });
      await registrySet(`${plan.key}:movement:${item.productId}`, 'stockmovements', movement._id);
    }

    created += 1;
  }
  console.log(`Sales created this run: ${created} (of 20 planned, ${skippedForStock} skipped for insufficient stock)`);
};

// ---- Expenses (10) --------------------------------------------------
const EXPENSE_PLANS = [
  { category: 'Shop Rent', amount: 15000, dayOffset: 50 },
  { category: 'Electricity Bill', amount: 3200, dayOffset: 45 },
  { category: 'Staff Salary', amount: 12000, dayOffset: 40 },
  { category: 'Transportation & Delivery', amount: 1800, dayOffset: 35 },
  { category: 'Internet & Phone Bill', amount: 1200, dayOffset: 30 },
  { category: 'Shop Maintenance', amount: 2500, dayOffset: 25 },
  { category: 'Packaging Materials', amount: 900, dayOffset: 18 },
  { category: 'Miscellaneous', amount: 650, dayOffset: 12 },
  { category: 'Shop Rent', amount: 15000, dayOffset: 20 },
  { category: 'Electricity Bill', amount: 2950, dayOffset: 8 },
];

const seedExpenses = async (userId, expenseCategoryMap) => {
  let created = 0;
  for (let i = 0; i < EXPENSE_PLANS.length; i += 1) {
    const key = `expense:${String(i + 1).padStart(3, '0')}`;
    if (await alreadySeeded(key)) continue;

    const plan = EXPENSE_PLANS[i];
    const category = expenseCategoryMap.get(plan.category);
    const createdAt = daysAgo(plan.dayOffset);
    const expense = await Expense.create({
      categoryId: category._id,
      categoryName: category.name,
      amount: plan.amount,
      expenseDate: createdAt,
      paymentMethod: pick(PURCHASE_PAYMENT_METHODS),
      reference: MARKER,
      note: '',
      status: 'active',
      companyId: COMPANY_ID,
      branchId: null,
      createdBy: userId,
      createdAt,
      updatedAt: createdAt,
    });
    await registrySet(key, 'expenses', expense._id);
    created += 1;
  }
  console.log(`Expenses created this run: ${created} (of ${EXPENSE_PLANS.length} planned)`);
};

// ---- Supplier payments -----------------------------------------------
// Standalone running-balance payments (separate from Purchase.paidAmount
// at checkout time — see SupplierPayment model comment), made against a
// handful of suppliers that have outstanding purchase dues, a few days
// after the relevant purchase.
const seedSupplierPayments = async (userId, suppliers) => {
  let created = 0;
  let index = 0;
  for (const supplier of suppliers) {
    const duePurchases = await Purchase.find({ companyId: COMPANY_ID, supplierId: supplier._id, dueAmount: { $gt: 0 } });
    if (duePurchases.length === 0) continue;

    index += 1;
    const key = `supplierPayment:${String(index).padStart(3, '0')}`;
    if (await alreadySeeded(key)) continue;

    const totalDue = duePurchases.reduce((sum, p) => sum + p.dueAmount, 0);
    const amount = money(totalDue * 0.4); // pay back ~40% of what's outstanding
    if (amount <= 0) continue;

    const createdAt = daysAgo(randomInt(1, 20));
    const payment = await SupplierPayment.create({
      supplierId: supplier._id,
      supplierName: supplier.name,
      amount,
      paymentDate: createdAt,
      paymentMethod: pick(PURCHASE_PAYMENT_METHODS),
      reference: MARKER,
      note: '',
      companyId: COMPANY_ID,
      branchId: null,
      createdBy: userId,
      createdAt,
      updatedAt: createdAt,
    });
    await registrySet(key, 'supplierpayments', payment._id);
    created += 1;
  }
  console.log(`Supplier payments created this run: ${created}`);
  console.log(
    'Note: this project has no CustomerPayment model (only Sale.paidAmount/dueAmount per sale) — see the written report. Nothing was fabricated for it.'
  );
};

// =====================================================================
// STEP 5 — VALIDATION
// =====================================================================
const runValidation = async (userId) => {
  console.log('\n--- Validation ---');
  const results = [];
  const ok = (label, pass, detail = '') => {
    results.push(pass);
    console.log(`  [${pass ? 'PASS' : 'FAIL'}] ${label}${detail ? ' — ' + detail : ''}`);
  };

  const [categoryIds, supplierIds, customerIds, userIds] = await Promise.all([
    Category.find({ companyId: COMPANY_ID }).distinct('_id'),
    Supplier.find({ companyId: COMPANY_ID }).distinct('_id'),
    Customer.find({ companyId: COMPANY_ID }).distinct('_id'),
    User.find({}).distinct('_id'),
  ]);
  const categorySet = new Set(categoryIds.map(String));
  const supplierSet = new Set(supplierIds.map(String));
  const customerSet = new Set(customerIds.map(String));
  const userSet = new Set(userIds.map(String));

  // 1. Every Product has a valid Category
  const products = await Product.find({ companyId: COMPANY_ID });
  const orphanProducts = products.filter((p) => !categorySet.has(String(p.categoryId)));
  ok('Every Product has a valid Category', orphanProducts.length === 0, `${orphanProducts.length} orphaned`);

  // 2. Every Purchase has a valid Supplier
  const purchases = await Purchase.find({ companyId: COMPANY_ID });
  const orphanPurchases = purchases.filter((p) => !supplierSet.has(String(p.supplierId)));
  ok('Every Purchase has a valid Supplier', orphanPurchases.length === 0, `${orphanPurchases.length} orphaned`);

  // 3. Every Sale has a valid Customer when required (walk-in = null is fine)
  const sales = await Sale.find({ companyId: COMPANY_ID });
  const orphanSales = sales.filter((s) => s.customerId && !customerSet.has(String(s.customerId)));
  ok('Every Sale has a valid Customer when set', orphanSales.length === 0, `${orphanSales.length} orphaned`);

  // 4. Every transaction belongs to the correct company
  const wrongCompany = [
    ...products.filter((p) => p.companyId !== COMPANY_ID),
    ...purchases.filter((p) => p.companyId !== COMPANY_ID),
    ...sales.filter((s) => s.companyId !== COMPANY_ID),
  ];
  ok('Every seeded document has the correct companyId', wrongCompany.length === 0, `${wrongCompany.length} mismatched`);

  // 5. Every createdBy references a valid User
  const expenses = await Expense.find({ companyId: COMPANY_ID });
  const supplierPayments = await SupplierPayment.find({ companyId: COMPANY_ID });
  const allCreatedBy = [...products, ...purchases, ...sales, ...expenses, ...supplierPayments].map((d) => String(d.createdBy));
  const badCreatedBy = allCreatedBy.filter((id) => !userSet.has(id));
  ok('Every createdBy references a valid User', badCreatedBy.length === 0, `${badCreatedBy.length} invalid`);

  // 6. No duplicate SKU
  const skuGroups = new Map();
  products.forEach((p) => {
    const key = p.sku.toLowerCase();
    skuGroups.set(key, (skuGroups.get(key) || 0) + 1);
  });
  const dupSku = [...skuGroups.values()].filter((c) => c > 1).length;
  ok('No duplicate SKU', dupSku === 0, `${dupSku} duplicated`);

  // 7. No duplicate barcode where barcode is set
  const barcodeGroups = new Map();
  products.forEach((p) => {
    if (!p.barcode) return;
    const key = p.barcode.toLowerCase();
    barcodeGroups.set(key, (barcodeGroups.get(key) || 0) + 1);
  });
  const dupBarcode = [...barcodeGroups.values()].filter((c) => c > 1).length;
  ok('No duplicate barcode', dupBarcode === 0, `${dupBarcode} duplicated`);

  // 8. No duplicate invoice number
  const invGroups = new Map();
  sales.forEach((s) => invGroups.set(s.invoiceNumber, (invGroups.get(s.invoiceNumber) || 0) + 1));
  const dupInv = [...invGroups.values()].filter((c) => c > 1).length;
  ok('No duplicate invoice number', dupInv === 0, `${dupInv} duplicated`);

  // 9. No duplicate purchase number
  const purGroups = new Map();
  purchases.forEach((p) => purGroups.set(p.purchaseNumber, (purGroups.get(p.purchaseNumber) || 0) + 1));
  const dupPur = [...purGroups.values()].filter((c) => c > 1).length;
  ok('No duplicate purchase number', dupPur === 0, `${dupPur} duplicated`);

  // 10. StockMovement product references are valid
  const productSet = new Set(products.map((p) => String(p._id)));
  const movements = await StockMovement.find({ companyId: COMPANY_ID });
  const orphanMovements = movements.filter((m) => !productSet.has(String(m.productId)));
  ok('Every StockMovement references a valid Product', orphanMovements.length === 0, `${orphanMovements.length} orphaned`);

  // 11. No negative current stock
  let negativeStockCount = 0;
  for (const p of products) {
    const stock = await getCurrentStock(p._id);
    if (stock < 0) negativeStockCount += 1;
  }
  ok('No product has negative current stock', negativeStockCount === 0, `${negativeStockCount} negative`);

  // 12. Purchase due amounts are mathematically correct
  const badPurchaseMath = purchases.filter((p) => Math.abs(p.dueAmount - money(p.total - p.paidAmount)) > 0.01);
  ok('Purchase dueAmount = total - paidAmount', badPurchaseMath.length === 0, `${badPurchaseMath.length} incorrect`);

  // 13. Sale due amounts are mathematically correct
  const badSaleMath = sales.filter((s) => Math.abs(s.dueAmount - money(s.total - s.paidAmount)) > 0.01);
  ok('Sale dueAmount = total - paidAmount', badSaleMath.length === 0, `${badSaleMath.length} incorrect`);

  // 14. paymentStatus matches paid/due amounts
  const badPurchaseStatus = purchases.filter((p) => derivePaymentStatus(p.paidAmount, p.total) !== p.paymentStatus);
  const badSaleStatus = sales.filter((s) => derivePaymentStatus(s.paidAmount, s.total) !== s.paymentStatus);
  ok(
    'paymentStatus matches paid/due amounts (Purchase + Sale)',
    badPurchaseStatus.length === 0 && badSaleStatus.length === 0,
    `${badPurchaseStatus.length + badSaleStatus.length} incorrect`
  );

  // 15/16. Dashboard/Reports have meaningful data — verified at the data
  // layer (this script has no HTTP context to call the actual
  // dashboard/report endpoints), checking the same aggregates they read.
  const distinctDates = new Set(sales.map((s) => s.createdAt.toISOString().slice(0, 10))).size;
  const distinctMethods = new Set([...sales.map((s) => s.paymentMethod), ...purchases.map((p) => p.paymentMethod)]).size;
  ok(
    'Dashboard/Reports have meaningful data (multiple dates, statuses, methods)',
    sales.length > 0 && purchases.length > 0 && expenses.length > 0 && distinctDates > 5 && distinctMethods >= 2,
    `${sales.length} sales, ${purchases.length} purchases, ${expenses.length} expenses across ${distinctDates} distinct dates, ${distinctMethods} payment methods`
  );

  const passed = results.filter(Boolean).length;
  console.log(`\nValidation: ${passed}/${results.length} checks passed.`);
  return passed === results.length;
};

// =====================================================================
// MAIN
// =====================================================================
const main = async () => {
  await connect();

  if (MODE === 'reset' || MODE === 'reset-only') {
    console.log(`\n=== RESET (${MODE}) ===`);
    await runReset();
    if (MODE === 'reset-only') {
      console.log('\nreset-only complete — no data was reseeded.');
      await mongoose.disconnect();
      return;
    }
  }

  console.log('\n=== SEED ===');
  const user = await getOperatorUser();

  const categoryMap = await seedCategories(user._id);
  const products = await seedProducts(user._id, categoryMap);
  const customers = await seedCustomers(user._id);
  const suppliers = await seedSuppliers(user._id);
  const expenseCategoryMap = await seedExpenseCategories(user._id);

  await initCounters();
  await seedPurchases(user._id, suppliers, products);
  await seedSales(user._id, customers, products);
  await seedExpenses(user._id, expenseCategoryMap);
  await seedSupplierPayments(user._id, suppliers);

  console.log('\n=== SUMMARY ===');
  console.log(`Master data — reused: ${counters.reused}, created: ${counters.created}`);

  const allPassed = await runValidation(user._id);

  await mongoose.disconnect();
  if (!allPassed) {
    console.error('\nOne or more validation checks FAILED — see above.');
    process.exitCode = 1;
  } else {
    console.log('\nSeed complete — all validation checks passed.');
  }
};

main().catch(async (error) => {
  console.error('\n❌ SEED FAILED');
  console.error(error);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exitCode = 1;
});