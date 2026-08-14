import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { useCategories } from '../../hooks/useCategories';

const emptyForm = { name: '', sku: '', barcode: '', purchasePrice: '', categoryId: '', description: '', status: 'active' };

// A generous limit so the dropdown effectively shows "all" categories for
// a single-shop MVP, without building a separate category-fetching path.
// Reuses the existing Category API/hook — no parallel category system.
const CATEGORY_DROPDOWN_PARAMS = { limit: 100, status: 'active', sort: 'name' };

/**
 * Add/Edit Product form. Pass `initialData` (a product object) to edit,
 * or omit it to create. Same plain useState + manual validation pattern
 * as CategoryFormModal/Login/Register — no form library introduced.
 */
const ProductFormModal = ({ open, onClose, onSubmit, initialData, isSubmitting }) => {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  const { data: categoryData, isLoading: categoriesLoading } = useCategories(
    CATEGORY_DROPDOWN_PARAMS
  );
  const categories = categoryData?.data || [];

  // Reset the form whenever the modal opens, and prefill it when editing.
useEffect(() => {
  if (!open) return;

  setForm(
    initialData
      ? {
          name: initialData.name || '',
          sku: initialData.sku || '',
          barcode: initialData.barcode || '',
          purchasePrice:
            initialData.purchasePrice !== undefined && initialData.purchasePrice !== null
              ? String(initialData.purchasePrice)
              : '',
          categoryId:
            initialData.categoryId?._id ||
            initialData.categoryId ||
            '',
          description: initialData.description || '',
          status: initialData.status || 'active',
        }
      : emptyForm
  );

  setError('');
}, [open, initialData]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const trimmedName = form.name.trim();
    if (!trimmedName) {
      setError('Product name is required');
      return;
    }
    if (trimmedName.length < 2) {
      setError('Product name must be at least 2 characters');
      return;
    }
    const trimmedSku = form.sku.trim();
    if (!trimmedSku) {
        setError('SKU is required');
        return;
    }
    if (!form.categoryId) {
      setError('Please select a category');
      return;
    }
    if (form.purchasePrice === '' || form.purchasePrice === null) {
      setError('Purchase price is required');
      return;
    }
    const numericPurchasePrice = Number(form.purchasePrice);
    if (Number.isNaN(numericPurchasePrice)) {
      setError('Purchase price must be a valid number');
      return;
    }
    if (numericPurchasePrice < 0) {
      setError('Purchase price cannot be negative');
      return;
    }

    try {
        await onSubmit({
        ...form,
        name: trimmedName,
        sku: trimmedSku,
        barcode: form.barcode.trim(), 
        description: form.description.trim(),
        purchasePrice: numericPurchasePrice,
    });
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={initialData ? 'Edit Product' : 'Add Product'}>
      {error && (
        <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            autoFocus
            placeholder="e.g. Coca-Cola 500ml"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">SKU</label>
            <input
                type="text"
                name="sku"
                value={form.sku}
                onChange={handleChange}
                required
                placeholder="e.g. GR-RICE-001"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
        </div>
        <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
                Barcode <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
                type="text"
                name="barcode"
                value={form.barcode}
                onChange={handleChange}
                placeholder="e.g. 8941101234567"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Purchase Price</label>
          <input
            type="number"
            name="purchasePrice"
            value={form.purchasePrice}
            onChange={handleChange}
            required
            min="0"
            step="0.01"
            placeholder="e.g. 100.00"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Category</label>
          <select
            name="categoryId"
            value={form.categoryId}
            onChange={handleChange}
            required
            disabled={categoriesLoading}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-400"
          >
            <option value="">
              {categoriesLoading ? 'Loading categories...' : 'Select a category'}
            </option>
            {categories.map((category) => (
              <option key={category._id} value={category._id}>
                {category.name}
              </option>
            ))}
          </select>
          {!categoriesLoading && categories.length === 0 && (
            <p className="mt-1 text-xs text-amber-600">
              No active categories yet — create one in Categories first.
            </p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Description
          </label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={3}
            placeholder="Optional description"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
          <select
            name="status"
            value={form.status}
            onChange={handleChange}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-60"
          >
            {isSubmitting ? 'Saving...' : initialData ? 'Save Changes' : 'Add Product'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ProductFormModal;