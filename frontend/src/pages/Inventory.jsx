import { useMemo, useState } from 'react';
import {
  Search,
  Boxes,
  Layers,
  Wallet,
  AlertTriangle,
  PackageX,
  AlertCircle,
} from 'lucide-react';
import { useInventory } from '../hooks/useInventory';
import { useCategories } from '../hooks/useCategories';
import Pagination from '../components/ui/Pagination';

const LIMIT = 10;
// All categories (not just active) so filtering still works for products
// whose category was later deactivated. Reuses the existing Category API
// — same pattern as Products.jsx.
const CATEGORY_FILTER_PARAMS = { limit: 100, sort: 'name' };

const STOCK_STATUS_STYLES = {
  'in-stock': 'bg-emerald-100 text-emerald-700',
  low: 'bg-amber-100 text-amber-700',
  'out-of-stock': 'bg-red-100 text-red-700',
};

const STOCK_STATUS_LABELS = {
  'in-stock': 'In Stock',
  low: 'Low Stock',
  'out-of-stock': 'Out of Stock',
};

const StockStatusBadge = ({ status }) => (
  <span
    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
      STOCK_STATUS_STYLES[status] || 'bg-slate-100 text-slate-600'
    }`}
  >
    {STOCK_STATUS_LABELS[status] || status}
  </span>
);

const formatCurrency = (value) => `৳${Number(value ?? 0).toFixed(2)}`;

const SummaryCard = ({ icon: Icon, label, value, accent }) => (
  <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
    <div className="flex items-center justify-between">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <Icon size={16} className={accent || 'text-slate-400'} />
    </div>
    <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
  </div>
);

const Inventory = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [stockStatus, setStockStatus] = useState('');

  const params = useMemo(
    () => ({
      page,
      limit: LIMIT,
      ...(search ? { search } : {}),
      ...(category ? { category } : {}),
      ...(stockStatus ? { stockStatus } : {}),
    }),
    [page, search, category, stockStatus]
  );

  const { data, isLoading, isError, error } = useInventory(params);
  const { data: categoryData } = useCategories(CATEGORY_FILTER_PARAMS);
  const categories = categoryData?.data || [];

  const items = data?.data || [];
  const total = data?.totalItems || 0;
  const pages = data?.totalPages || 1;
  const hasActiveFilters = Boolean(search || category || stockStatus);

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleCategoryChange = (e) => {
    setCategory(e.target.value);
    setPage(1);
  };

  const handleStockStatusChange = (e) => {
    setStockStatus(e.target.value);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Inventory</h2>
        <p className="text-sm text-slate-500">
          Stock overview based on each product&apos;s opening stock.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryCard
          icon={Boxes}
          label="Total Products"
          value={data ? data.totalProducts : '—'}
          accent="text-indigo-500"
        />
        <SummaryCard
          icon={Layers}
          label="Total Stock Quantity"
          value={data ? data.totalStock : '—'}
          accent="text-slate-500"
        />
        <SummaryCard
          icon={Wallet}
          label="Total Stock Value"
          value={data ? formatCurrency(data.totalStockValue) : '—'}
          accent="text-emerald-600"
        />
        <SummaryCard
          icon={AlertTriangle}
          label="Low Stock Products"
          value={data ? data.lowStockProducts : '—'}
          accent="text-amber-500"
        />
        <SummaryCard
          icon={PackageX}
          label="Out of Stock Products"
          value={data ? data.outOfStockProducts : '—'}
          accent="text-red-500"
        />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={search}
              onChange={handleSearchChange}
              placeholder="Search by name, SKU, or barcode..."
              className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <select
            value={category}
            onChange={handleCategoryChange}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:w-48"
          >
            <option value="">All categories</option>
            {categories.map((cat) => (
              <option key={cat._id} value={cat._id}>
                {cat.name}
              </option>
            ))}
          </select>
          <select
            value={stockStatus}
            onChange={handleStockStatusChange}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:w-44"
          >
            <option value="">All stock statuses</option>
            <option value="in-stock">In Stock</option>
            <option value="low">Low Stock</option>
            <option value="out-of-stock">Out of Stock</option>
          </select>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-400">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" />
            <p className="text-sm">Loading inventory...</p>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <AlertCircle size={28} className="text-red-400" />
            <p className="text-sm font-medium text-slate-700">Couldn&apos;t load inventory</p>
            <p className="text-xs text-slate-500">
              {error?.response?.data?.message || 'Something went wrong. Please try again.'}
            </p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <Boxes size={28} className="text-slate-300" />
            <p className="text-sm font-medium text-slate-700">
              {hasActiveFilters ? 'No products match your filters' : 'No products yet'}
            </p>
            <p className="text-xs text-slate-500">
              {hasActiveFilters
                ? 'Try a different search term, category, or stock status.'
                : 'Add products first — inventory is calculated from their opening stock.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium">SKU</th>
                  <th className="px-4 py-3 font-medium">Barcode</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Purchase Price</th>
                  <th className="px-4 py-3 font-medium">Selling Price</th>
                  <th className="px-4 py-3 font-medium">Current Stock</th>
                  <th className="px-4 py-3 font-medium">Minimum Stock</th>
                  <th className="px-4 py-3 font-medium">Stock Value</th>
                  <th className="px-4 py-3 font-medium">Stock Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{item.name}</td>
                    <td className="px-4 py-3 text-slate-500">{item.sku}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {item.barcode || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {item.categoryId?.name || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{formatCurrency(item.purchasePrice)}</td>
                    <td className="px-4 py-3 text-slate-700">{formatCurrency(item.sellingPrice)}</td>
                    <td className="px-4 py-3 text-slate-700">{item.stock}</td>
                    <td className="px-4 py-3 text-slate-500">{item.minimumStock}</td>
                    <td className="px-4 py-3 text-slate-700">{formatCurrency(item.stockValue)}</td>
                    <td className="px-4 py-3">
                      <StockStatusBadge status={item.stockStatus} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && !isError && items.length > 0 && (
          <Pagination page={page} pages={pages} total={total} limit={LIMIT} onPageChange={setPage} />
        )}
      </div>
    </div>
  );
};

export default Inventory;
