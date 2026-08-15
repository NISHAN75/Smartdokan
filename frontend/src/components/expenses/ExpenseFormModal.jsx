import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import { useExpenseCategories } from '../../hooks/useExpenses';

// Same payment method set already used across Purchases/SupplierPayment
// (see SupplierPaymentFormModal) — reusing the same real-world channels
// rather than inventing a new list.
const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bkash', label: 'bKash' },
  { value: 'card', label: 'Card' },
  { value: 'other', label: 'Other' },
];

const todayInputValue = () => new Date().toISOString().slice(0, 10);

const emptyForm = {
  categoryId: '',
  amount: '',
  expenseDate: todayInputValue(),
  paymentMethod: 'cash',
  reference: '',
  note: '',
};

/**
 * Add/Edit Expense form. Pass `initialData` (an expense object) to edit,
 * or omit it to create. Mirrors SupplierPaymentFormModal/CategoryFormModal
 * conventions — plain useState + manual validation, no form library.
 *
 * Fetches active expense categories itself (limit=100, status=active)
 * so the dropdown always reflects categories that are actually
 * selectable server-side (expenseController rejects inactive ones).
 */
const ExpenseFormModal = ({
  open,
  onClose,
  onSubmit,
  initialData,
  isSubmitting,
  onManageCategories,
}) => {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  const { data: categoryData, isLoading: categoriesLoading } = useExpenseCategories(
    open ? { status: 'active', limit: 100, sort: 'name' } : undefined
  );
  const categories = categoryData?.data || [];

  useEffect(() => {
    if (!open) return;
    setForm(
      initialData
        ? {
            categoryId: initialData.categoryId?._id || initialData.categoryId || '',
            amount: initialData.amount ?? '',
            expenseDate: initialData.expenseDate
              ? new Date(initialData.expenseDate).toISOString().slice(0, 10)
              : todayInputValue(),
            paymentMethod: initialData.paymentMethod || 'cash',
            reference: initialData.reference || '',
            note: initialData.note || '',
          }
        : emptyForm
    );
    setError('');
  }, [open, initialData]);

  // If we're editing an expense whose category was deactivated after
  // the fact, it won't be in the active-categories list — keep it
  // selectable in the dropdown anyway so editing doesn't silently blank
  // out the category.
  const selectableCategories =
    initialData?.categoryId &&
    typeof initialData.categoryId === 'object' &&
    !categories.some((c) => c._id === initialData.categoryId._id)
      ? [...categories, initialData.categoryId]
      : categories;

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.categoryId) {
      setError('Please select an expense category');
      return;
    }
    const amount = Number(form.amount);
    if (!form.amount || Number.isNaN(amount) || amount <= 0) {
      setError('Enter a valid amount greater than zero');
      return;
    }
    if (!form.expenseDate) {
      setError('Expense date is required');
      return;
    }
    if (!form.paymentMethod) {
      setError('Please select a payment method');
      return;
    }

    try {
      await onSubmit({
        categoryId: form.categoryId,
        amount,
        expenseDate: form.expenseDate,
        paymentMethod: form.paymentMethod,
        reference: form.reference.trim(),
        note: form.note.trim(),
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={initialData ? 'Edit Expense' : 'Add Expense'}>
      {error && (
        <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="block text-sm font-medium text-slate-700">Category</label>
            {onManageCategories && (
              <button
                type="button"
                onClick={onManageCategories}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
              >
                Manage categories
              </button>
            )}
          </div>
          <select
            name="categoryId"
            value={form.categoryId}
            onChange={handleChange}
            required
            disabled={categoriesLoading}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">
              {categoriesLoading ? 'Loading categories...' : 'Select a category'}
            </option>
            {selectableCategories.map((category) => (
              <option key={category._id} value={category._id}>
                {category.name}
              </option>
            ))}
          </select>
          {!categoriesLoading && categories.length === 0 && (
            <p className="mt-1 text-xs text-amber-600">
              No active categories yet — add one first.
            </p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Amount</label>
          <input
            type="number"
            name="amount"
            value={form.amount}
            onChange={handleChange}
            min="0.01"
            step="0.01"
            required
            autoFocus
            placeholder="0.00"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Expense Date</label>
          <input
            type="date"
            name="expenseDate"
            value={form.expenseDate}
            onChange={handleChange}
            required
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Payment Method</label>
          <select
            name="paymentMethod"
            value={form.paymentMethod}
            onChange={handleChange}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Reference <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input
            type="text"
            name="reference"
            value={form.reference}
            onChange={handleChange}
            placeholder="e.g. receipt/invoice number"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Note <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <textarea
            name="note"
            value={form.note}
            onChange={handleChange}
            rows={2}
            placeholder="Optional note"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
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
            {isSubmitting ? 'Saving...' : initialData ? 'Save Changes' : 'Add Expense'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ExpenseFormModal;
