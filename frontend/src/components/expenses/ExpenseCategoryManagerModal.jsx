import { useState } from 'react';
import { Plus, Pencil, Power } from 'lucide-react';
import Modal from '../ui/Modal';
import StatusBadge from '../ui/StatusBadge';
import ConfirmDialog from '../ui/ConfirmDialog';
import ExpenseCategoryFormModal from './ExpenseCategoryFormModal';
import { useExpenseCategories, useCreateExpenseCategory, useUpdateExpenseCategory } from '../../hooks/useExpenses';

/**
 * Lightweight "manage categories" surface, opened from the Expenses
 * page. Lists all categories (active + inactive) with add/edit/
 * deactivate — deliberately not a full paginated page of its own, since
 * a shop typically has a handful of expense categories, not hundreds.
 */
const ExpenseCategoryManagerModal = ({ open, onClose, onToast }) => {
  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [togglingCategory, setTogglingCategory] = useState(null);

  const { data, isLoading, isError } = useExpenseCategories(
    open ? { limit: 100, sort: 'name' } : undefined
  );
  const categories = data?.data || [];

  const createCategory = useCreateExpenseCategory();
  const updateCategory = useUpdateExpenseCategory();

  const handleAddClick = () => {
    setEditingCategory(null);
    setFormOpen(true);
  };

  const handleEditClick = (category) => {
    setEditingCategory(category);
    setFormOpen(true);
  };

  const handleFormSubmit = async (form) => {
    if (editingCategory) {
      await updateCategory.mutateAsync({ id: editingCategory._id, ...form });
      onToast?.('success', 'Expense category updated successfully');
    } else {
      await createCategory.mutateAsync(form);
      onToast?.('success', 'Expense category created successfully');
    }
    setFormOpen(false);
  };

  const isDeactivating = togglingCategory?.status === 'active';

  // Always a status flip via PUT, never the DELETE route — the backend's
  // DELETE endpoint hard-deletes categories that have never been used
  // (see expenseCategoryController), which would make this toggle
  // unpredictable. Using update keeps "Deactivate" a purely reversible
  // action regardless of usage history.
  const handleToggleConfirm = async () => {
    try {
      await updateCategory.mutateAsync({
        id: togglingCategory._id,
        status: isDeactivating ? 'inactive' : 'active',
      });
      onToast?.(
        'success',
        isDeactivating ? 'Category deactivated successfully' : 'Category reactivated successfully'
      );
      setTogglingCategory(null);
    } catch (err) {
      onToast?.('error', err.response?.data?.message || 'Failed to update category');
      setTogglingCategory(null);
    }
  };

  return (
    <>
      <Modal open={open} onClose={onClose} title="Manage Expense Categories" maxWidth="max-w-lg">
        <div className="mb-4 flex justify-end">
          <button
            type="button"
            onClick={handleAddClick}
            className="flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-indigo-700"
          >
            <Plus size={14} />
            Add Category
          </button>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-slate-400">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" />
            <p className="text-sm">Loading categories...</p>
          </div>
        ) : isError ? (
          <p className="py-10 text-center text-sm text-red-500">Couldn&apos;t load categories.</p>
        ) : categories.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500">
            No expense categories yet. Add your first one above.
          </p>
        ) : (
          <div className="max-h-80 divide-y divide-slate-100 overflow-y-auto rounded-md border border-slate-200">
            {categories.map((category) => (
              <div key={category._id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800">{category.name}</p>
                  {category.description && (
                    <p className="truncate text-xs text-slate-500">{category.description}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusBadge status={category.status} />
                  <button
                    type="button"
                    onClick={() => handleEditClick(category)}
                    className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
                    aria-label={`Edit ${category.name}`}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setTogglingCategory(category)}
                    className={`rounded-md p-1.5 hover:bg-slate-100 ${
                      category.status === 'active'
                        ? 'text-slate-500 hover:text-red-600'
                        : 'text-slate-500 hover:text-emerald-600'
                    }`}
                    aria-label={
                      category.status === 'active'
                        ? `Deactivate ${category.name}`
                        : `Reactivate ${category.name}`
                    }
                  >
                    <Power size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </Modal>

      <ExpenseCategoryFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
        initialData={editingCategory}
        isSubmitting={createCategory.isPending || updateCategory.isPending}
      />

      <ConfirmDialog
        open={Boolean(togglingCategory)}
        title={isDeactivating ? 'Deactivate Category' : 'Reactivate Category'}
        message={
          isDeactivating
            ? `Are you sure you want to deactivate "${togglingCategory?.name}"? It won't be selectable for new expenses, but existing expenses keep their history.`
            : `Reactivate "${togglingCategory?.name}" so it can be selected for new expenses again?`
        }
        confirmLabel={isDeactivating ? 'Deactivate' : 'Reactivate'}
        loadingLabel="Saving..."
        onConfirm={handleToggleConfirm}
        onCancel={() => setTogglingCategory(null)}
        loading={updateCategory.isPending}
      />
    </>
  );
};

export default ExpenseCategoryManagerModal;
