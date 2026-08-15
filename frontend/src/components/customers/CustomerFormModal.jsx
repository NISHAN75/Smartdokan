import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';

const emptyForm = {
  name: '',
  phone: '',
  email: '',
  address: '',
  openingDue: '0',
  status: 'active',
};

/**
 * Add/Edit Customer form. Pass `initialData` (a customer object) to edit,
 * or omit it to create. Same plain useState + manual validation pattern
 * as ProductFormModal/CategoryFormModal — no form library introduced.
 */
const CustomerFormModal = ({ open, onClose, onSubmit, initialData, isSubmitting }) => {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  // Reset the form whenever the modal opens, and prefill it when editing.
  useEffect(() => {
    if (!open) return;

    setForm(
      initialData
        ? {
            name: initialData.name || '',
            phone: initialData.phone || '',
            email: initialData.email || '',
            address: initialData.address || '',
            openingDue:
              initialData.openingDue !== undefined && initialData.openingDue !== null
                ? String(initialData.openingDue)
                : '0',
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
      setError('Customer name is required');
      return;
    }
    if (trimmedName.length < 2) {
      setError('Customer name must be at least 2 characters');
      return;
    }
    const trimmedPhone = form.phone.trim();
    if (!trimmedPhone) {
      setError('Phone number is required');
      return;
    }

    let numericOpeningDue = 0;
    if (form.openingDue !== '' && form.openingDue !== null) {
      numericOpeningDue = Number(form.openingDue);
      if (Number.isNaN(numericOpeningDue)) {
        setError('Opening due must be a valid number');
        return;
      }
      if (numericOpeningDue < 0) {
        setError('Opening due cannot be negative');
        return;
      }
    }

    try {
      await onSubmit({
        ...form,
        name: trimmedName,
        phone: trimmedPhone,
        email: form.email.trim(),
        address: form.address.trim(),
        openingDue: numericOpeningDue,
        status: form.status,
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={initialData ? 'Edit Customer' : 'Add Customer'}>
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
            placeholder="e.g. Rahim Uddin"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Phone</label>
          <input
            type="text"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            required
            placeholder="e.g. 01712345678"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Email <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="e.g. rahim@example.com"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Address <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <textarea
            name="address"
            value={form.address}
            onChange={handleChange}
            rows={2}
            placeholder="Optional address"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Opening Due <span className="font-normal text-slate-400">(pre-existing balance)</span>
          </label>
          <input
            type="number"
            name="openingDue"
            value={form.openingDue}
            onChange={handleChange}
            min="0"
            step="0.01"
            placeholder="0.00"
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
            {isSubmitting ? 'Saving...' : initialData ? 'Save Changes' : 'Add Customer'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CustomerFormModal;
