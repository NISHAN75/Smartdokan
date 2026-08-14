import { useMemo, useState } from 'react';
import { Plus, Search, Pencil, Trash2, FolderOpen, AlertCircle } from 'lucide-react';
import {
  useCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
} from '../hooks/useCategories';
import CategoryFormModal from '../components/categories/CategoryFormModal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import StatusBadge from '../components/ui/StatusBadge';
import Pagination from '../components/ui/Pagination';
import Toast from '../components/ui/Toast';

const LIMIT = 10;

const Categories = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [deletingCategory, setDeletingCategory] = useState(null);
  const [toast, setToast] = useState(null);

  const params = useMemo(
    () => ({
      page,
      limit: LIMIT,
      ...(search ? { search } : {}),
      ...(status ? { status } : {}),
    }),
    [page, search, status]
  );

  const { data, isLoading, isError, error } = useCategories(params);
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const categories = data?.data || [];
  const total = data?.total || 0;
  const pages = data?.pages || 1;
  const hasActiveFilters = Boolean(search || status);

  const showToast = (type, message) => setToast({ type, message });

  const handleAddClick = () => {
    setEditingCategory(null);
    setFormOpen(true);
  };

  const handleEditClick = (category) => {
    setEditingCategory(category);
    setFormOpen(true);
  };

  // Errors are intentionally re-thrown here so CategoryFormModal's own
  // try/catch can show the inline form error (e.g. duplicate name) and
  // keep the modal open. This function only fires on success.
  const handleFormSubmit = async (form) => {
    if (editingCategory) {
      await updateCategory.mutateAsync({ id: editingCategory._id, ...form });
      showToast('success', 'Category updated successfully');
    } else {
      await createCategory.mutateAsync(form);
      showToast('success', 'Category created successfully');
    }
    setFormOpen(false);
  };

  const handleDeleteConfirm = async () => {
    try {
      await deleteCategory.mutateAsync(deletingCategory._id);
      showToast('success', 'Category deleted successfully');
      setDeletingCategory(null);
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to delete category');
    }
  };

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
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
          <h2 className="text-xl font-semibold text-slate-900">Categories</h2>
          <p className="text-sm text-slate-500">Organize your products into categories.</p>
        </div>
        <button
          type="button"
          onClick={handleAddClick}
          className="flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
        >
          <Plus size={16} />
          Add Category
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
              placeholder="Search categories..."
              className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
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
            <p className="text-sm">Loading categories...</p>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <AlertCircle size={28} className="text-red-400" />
            <p className="text-sm font-medium text-slate-700">Couldn&apos;t load categories</p>
            <p className="text-xs text-slate-500">
              {error?.response?.data?.message || 'Something went wrong. Please try again.'}
            </p>
          </div>
        ) : categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <FolderOpen size={28} className="text-slate-300" />
            <p className="text-sm font-medium text-slate-700">
              {hasActiveFilters ? 'No categories match your filters' : 'No categories yet'}
            </p>
            <p className="text-xs text-slate-500">
              {hasActiveFilters
                ? 'Try a different search term or status.'
                : 'Get started by adding your first category.'}
            </p>
            {!hasActiveFilters && (
              <button
                type="button"
                onClick={handleAddClick}
                className="mt-2 flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
              >
                <Plus size={16} />
                Add Category
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Product Count</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categories.map((category) => (
                  <tr key={category._id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{category.name}</td>
                    <td className="max-w-xs truncate px-4 py-3 text-slate-500">
                      {category.description || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={category.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-500">{category.productCount ?? 0}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(category.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditClick(category)}
                          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
                          aria-label={`Edit ${category.name}`}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingCategory(category)}
                          className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"
                          aria-label={`Delete ${category.name}`}
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

        {!isLoading && !isError && categories.length > 0 && (
          <Pagination page={page} pages={pages} total={total} limit={LIMIT} onPageChange={setPage} />
        )}
      </div>

      <CategoryFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
        initialData={editingCategory}
        isSubmitting={createCategory.isPending || updateCategory.isPending}
      />

      <ConfirmDialog
        open={Boolean(deletingCategory)}
        title="Delete Category"
        message={`Are you sure you want to delete "${deletingCategory?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingCategory(null)}
        loading={deleteCategory.isPending}
      />

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
};

export default Categories;
