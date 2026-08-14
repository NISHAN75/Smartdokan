import { useMemo, useState } from 'react';
import { Plus, Search, Pencil, Trash2, Package, AlertCircle } from 'lucide-react';
import {
  useProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
} from '../hooks/useProducts';
import { useCategories } from '../hooks/useCategories';
import ProductFormModal from '../components/products/ProductFormModal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import StatusBadge from '../components/ui/StatusBadge';
import Pagination from '../components/ui/Pagination';
import Toast from '../components/ui/Toast';

const LIMIT = 10;
// All categories (not just active) so filtering still works for products
// whose category was later deactivated. Reuses the existing Category API.
const CATEGORY_FILTER_PARAMS = { limit: 100, sort: 'name' };

const Products = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deletingProduct, setDeletingProduct] = useState(null);
  const [toast, setToast] = useState(null);

  const params = useMemo(
    () => ({
      page,
      limit: LIMIT,
      ...(search ? { search } : {}),
      ...(category ? { category } : {}),
      ...(status ? { status } : {}),
    }),
    [page, search, category, status]
  );

  const { data, isLoading, isError, error } = useProducts(params);
  const { data: categoryData } = useCategories(CATEGORY_FILTER_PARAMS);
  const categories = categoryData?.data || [];

  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const products = data?.data || [];
  const total = data?.totalItems || 0;
  const pages = data?.totalPages || 1;
  const hasActiveFilters = Boolean(search || category || status);

  const showToast = (type, message) => setToast({ type, message });

  const handleAddClick = () => {
    setEditingProduct(null);
    setFormOpen(true);
  };

  const handleEditClick = (product) => {
    setEditingProduct(product);
    setFormOpen(true);
  };

  // Errors are intentionally re-thrown here so ProductFormModal's own
  // try/catch can show the inline form error (e.g. duplicate name,
  // invalid category) and keep the modal open. This only fires on success.
  const handleFormSubmit = async (form) => {
    if (editingProduct) {
      await updateProduct.mutateAsync({ id: editingProduct._id, ...form });
      showToast('success', 'Product updated successfully');
    } else {
      await createProduct.mutateAsync(form);
      showToast('success', 'Product created successfully');
    }
    setFormOpen(false);
  };

  const handleDeleteConfirm = async () => {
    try {
      await deleteProduct.mutateAsync(deletingProduct._id);
      showToast('success', 'Product deleted successfully');
      setDeletingProduct(null);
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to delete product');
    }
  };

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleCategoryChange = (e) => {
    setCategory(e.target.value);
    setPage(1);
  };

  const handleStatusChange = (e) => {
    setStatus(e.target.value);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Products</h2>
          <p className="text-sm text-slate-500">Manage the products your shop sells.</p>
        </div>
        <button
          type="button"
          onClick={handleAddClick}
          className="flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
        >
          <Plus size={16} />
          Add Product
        </button>
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
            value={status}
            onChange={handleStatusChange}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:w-44"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-400">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" />
            <p className="text-sm">Loading products...</p>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <AlertCircle size={28} className="text-red-400" />
            <p className="text-sm font-medium text-slate-700">Couldn&apos;t load products</p>
            <p className="text-xs text-slate-500">
              {error?.response?.data?.message || 'Something went wrong. Please try again.'}
            </p>
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <Package size={28} className="text-slate-300" />
            <p className="text-sm font-medium text-slate-700">
              {hasActiveFilters ? 'No products match your filters' : 'No products yet'}
            </p>
            <p className="text-xs text-slate-500">
              {hasActiveFilters
                ? 'Try a different search term, category, or status.'
                : 'Get started by adding your first product.'}
            </p>
            {!hasActiveFilters && (
              <button
                type="button"
                onClick={handleAddClick}
                className="mt-2 flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
              >
                <Plus size={16} />
                Add Product
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Product Name</th>
                  <th className="px-4 py-3 font-medium">SKU</th>
                  <th className="px-4 py-3 font-medium">Barcode</th>
                  <th className="px-4 py-3 font-medium">Purchase Price</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((product) => (
                  <tr key={product._id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{product.name}</td>
                    <td className="px-4 py-3 text-slate-500">{product.sku}</td>
                    <td className="px-4 py-3 text-slate-500">
                    {product.barcode || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      ৳{Number(product.purchasePrice ?? 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {product.categoryId?.name || (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    
                    <td className="max-w-xs truncate px-4 py-3 text-slate-500">
                      {product.description || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={product.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(product.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditClick(product)}
                          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
                          aria-label={`Edit ${product.name}`}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingProduct(product)}
                          className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"
                          aria-label={`Delete ${product.name}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && !isError && products.length > 0 && (
          <Pagination page={page} pages={pages} total={total} limit={LIMIT} onPageChange={setPage} />
        )}
      </div>

      <ProductFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
        initialData={editingProduct}
        isSubmitting={createProduct.isPending || updateProduct.isPending}
      />

      <ConfirmDialog
        open={Boolean(deletingProduct)}
        title="Delete Product"
        message={`Are you sure you want to delete "${deletingProduct?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingProduct(null)}
        loading={deleteProduct.isPending}
      />

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
};

export default Products;