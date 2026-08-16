import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';

const emptyForm = {
  name: '',
  email: '',
  password: '',
  role: 'staff',
};

/**
 * Add/Edit User form, same plain useState + manual validation pattern
 * as SupplierFormModal/CustomerFormModal — no form library introduced.
 *
 * Password is only collected when creating a new user; editing a user
 * never touches their password here (that stays a self-service action
 * on the Settings page, same as today).
 */
const UserFormModal = ({ open, onClose, onSubmit, initialData, isSubmitting, currentUserId }) => {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');

  const isEditing = Boolean(initialData);
  const isEditingSelf = isEditing && initialData.id === currentUserId;

  useEffect(() => {
    if (!open) return;

    setForm(
      initialData
        ? {
            name: initialData.name || '',
            email: initialData.email || '',
            password: '',
            role: initialData.role || 'staff',
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
    if (!trimmedName || trimmedName.length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }

    const trimmedEmail = form.email.trim();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Please provide a valid email address');
      return;
    }

    if (!isEditing) {
      if (!form.password || form.password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }
    }

    try {
      const payload = isEditing
        ? { name: trimmedName, email: trimmedEmail, role: form.role }
        : { name: trimmedName, email: trimmedEmail, password: form.password, role: form.role };

      await onSubmit(payload);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? 'Edit User' : 'Add User'}>
      {error && <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Full Name</label>
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
          <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            required
            placeholder="e.g. rahim@smartdokan.com"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {!isEditing && (
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
              minLength={6}
              placeholder="At least 6 characters"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Role</label>
          <select
            name="role"
            value={form.role}
            onChange={handleChange}
            disabled={isEditingSelf}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-400"
          >
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="staff">Staff</option>
          </select>
          {isEditingSelf && (
            <p className="mt-1 text-xs text-slate-400">You can&apos;t change your own role here.</p>
          )}
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
            {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Add User'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default UserFormModal;
