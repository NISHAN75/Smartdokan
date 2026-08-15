import { useState } from 'react';
import { Search, UserPlus, X, User } from 'lucide-react';
import { useCustomers, useCreateCustomer } from '../../hooks/useCustomers';

/**
 * Existing-customer search + walk-in fallback for the POS. Selecting a
 * customer sets `value` (the customer object or null for walk-in).
 * Includes a minimal inline quick-add form since there's no separate
 * Customers page yet — this is the "minimum Customer structure the POS
 * needs", not a full customer-management UI.
 */
const CustomerPicker = ({ value, onChange }) => {
  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', phone: '' });
  const [addError, setAddError] = useState('');

  const { data, isLoading } = useCustomers({ search, limit: 8 });
  const customers = data?.data || [];
  const createCustomer = useCreateCustomer();

  const handleQuickAdd = async (e) => {
    e.preventDefault();
    setAddError('');
    if (!addForm.name.trim() || !addForm.phone.trim()) {
      setAddError('Name and phone are required');
      return;
    }
    try {
      const customer = await createCustomer.mutateAsync({
        name: addForm.name.trim(),
        phone: addForm.phone.trim(),
      });
      onChange(customer);
      setShowAddForm(false);
      setAddForm({ name: '', phone: '' });
      setSearch('');
    } catch (err) {
      setAddError(err.response?.data?.message || 'Could not add customer');
    }
  };

  if (value) {
    return (
      <div className="flex items-center justify-between rounded-md border border-slate-300 bg-slate-50 px-3 py-2">
        <div className="flex items-center gap-2 text-sm text-slate-700">
          <User size={14} className="text-slate-400" />
          <span className="font-medium">{value.name}</span>
          {value.phone && <span className="text-slate-400">· {value.phone}</span>}
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-slate-400 hover:text-slate-600"
          aria-label="Clear customer"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search customer by name or phone (leave empty for walk-in)"
          className="w-full rounded-md border border-slate-300 py-2 pl-8 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      {search.trim() && (
        <div className="max-h-32 overflow-y-auto rounded-md border border-slate-200">
          {isLoading ? (
            <p className="px-3 py-2 text-xs text-slate-400">Searching...</p>
          ) : customers.length === 0 ? (
            <p className="px-3 py-2 text-xs text-slate-400">No matching customers</p>
          ) : (
            customers.map((customer) => (
              <button
                key={customer._id}
                type="button"
                onClick={() => {
                  onChange(customer);
                  setSearch('');
                }}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50"
              >
                <span className="font-medium text-slate-700">{customer.name}</span>
                <span className="text-xs text-slate-400">{customer.phone}</span>
              </button>
            ))
          )}
        </div>
      )}

      {!showAddForm ? (
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700"
        >
          <UserPlus size={13} />
          Add new customer
        </button>
      ) : (
        <form onSubmit={handleQuickAdd} className="space-y-2 rounded-md border border-slate-200 p-3">
          {addError && <p className="text-xs text-red-600">{addError}</p>}
          <input
            type="text"
            value={addForm.name}
            onChange={(e) => setAddForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Customer name"
            className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <input
            type="text"
            value={addForm.phone}
            onChange={(e) => setAddForm((prev) => ({ ...prev, phone: e.target.value }))}
            placeholder="Phone number"
            className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createCustomer.isPending}
              className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {createCustomer.isPending ? 'Saving...' : 'Save & Select'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default CustomerPicker;
