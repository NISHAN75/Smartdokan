import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';

// Same payment method set the Purchases module already uses (see
// PurchaseCart.jsx) — reusing the same real-world channels rather than
// inventing a new list.
const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bkash', label: 'bKash' },
  { value: 'card', label: 'Card' },
  { value: 'other', label: 'Other' },
];

const todayInputValue = () => new Date().toISOString().slice(0, 10);

const emptyForm = {
  amount: '',
  paymentDate: todayInputValue(),
  paymentMethod: 'cash',
  reference: '',
  note: '',
};

/**
 * Records a payment against a supplier's current due (Part 6/21).
 * Shows the supplier's current due for context so the person can see
 * what they're paying down, but doesn't cap the amount — an overpayment
 * is a legitimate real-world event (results in a negative/credit due)
 * rather than something to silently reject.
 */
const SupplierPaymentFormModal = ({ open, onClose, onSubmit, supplierName, currentDue, isSubmitting }) => {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setForm(emptyForm);
    setError('');
  }, [open]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const amount = Number(form.amount);
    if (!form.amount || Number.isNaN(amount) || amount <= 0) {
      setError('Enter a valid payment amount greater than zero');
      return;
    }
    if (!form.paymentDate) {
      setError('Payment date is required');
      return;
    }

    try {
      await onSubmit({
        amount,
        paymentDate: form.paymentDate,
        paymentMethod: form.paymentMethod,
        reference: form.reference.trim(),
        note: form.note.trim(),
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Record Supplier Payment">
      {error && (
        <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
      )}

      <div className="mb-4 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
        <p className="text-slate-500">
          Paying <span className="font-medium text-slate-700">{supplierName}</span>
        </p>
        <p className="mt-0.5 text-slate-500">
          Current due:{' '}
          <span className="font-semibold text-amber-700">
            ৳{Number(currentDue ?? 0).toFixed(2)}
          </span>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
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
          <label className="mb-1 block text-sm font-medium text-slate-700">Payment Date</label>
          <input
            type="date"
            name="paymentDate"
            value={form.paymentDate}
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
            placeholder="e.g. transaction/cheque number"
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
            {isSubmitting ? 'Saving...' : 'Record Payment'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default SupplierPaymentFormModal;
