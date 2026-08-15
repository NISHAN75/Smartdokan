import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';

const emptyForm = { name: '', description: '', status: 'active' };

/**
 * Add/Edit Expense Category form. Pass `initialData` (a category object)
 * to edit, or omit it to create. Mirrors CategoryFormModal exactly —
 * same plain useState + manual validation pattern, no form library.
 */
const ExpenseCategoryFormModal = ({ open, onClose, onSubmit, initialData, isSubmitting }) => {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setForm(
      initialData
        ? {
            name: initialData.name || '',
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
      setError('Category name is required');
      return;
    }
    if (trimmedName.length < 2) {
      setError('Category name must be at least 2 characters');
      return;
    }

    try {
      await onSubmit({ ...form, name: trimmedName, description: form.description.trim() });
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initialData ? 'Edit Expense Category' : 'Add Expense Category'}
    >
      {error && (
        <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
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
            placeholder="e.g. Rent, Utilities"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
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
            {isSubmitting ? 'Saving...' : initialData ? 'Save Changes' : 'Add Category'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ExpenseCategoryFormModal;
