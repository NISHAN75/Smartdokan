import { useState } from 'react';
import { Search, UserPlus, X, Truck } from 'lucide-react';
import { useSuppliers, useCreateSupplier } from '../../hooks/useSuppliers';

/**
 * Existing-supplier search + quick-add for Purchases. Unlike
 * CustomerPicker, there's no walk-in fallback — a purchase must always
 * have a supplier — so `value` is either the selected supplier object
 * or null (not yet chosen).
 */
const SupplierPicker = ({ value, onChange }) => {
  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', phone: '' });
  const [addError, setAddError] = useState('');

  const { data, isLoading } = useSuppliers({ search, status: 'active', limit: 8 });
  const suppliers = data?.data || [];
  const createSupplier = useCreateSupplier();

  const handleQuickAdd = async (e) => {
    e.preventDefault();
    setAddError('');
    if (!addForm.name.trim() || !addForm.phone.trim()) {
      setAddError('Name and phone are required');
      return;
    }
    try {
      const supplier = await createSupplier.mutateAsync({
        name: addForm.name.trim(),
        phone: addForm.phone.trim(),
      });
      onChange(supplier);
      setShowAddForm(false);
      setAddForm({ name: '', phone: '' });
      setSearch('');
    } catch (err) {
      setAddError(err.response?.data?.message || 'Could not add supplier');
    }
  };

  if (value) {
    return (
      <div className="flex items-center justify-between rounded-md border border-slate-300 bg-slate-50 px-3 py-2">
        <div className="flex items-center gap-2 text-sm text-slate-700">
          <Truck size={14} className="text-slate-400" />
          <span className="font-medium">{value.name}</span>
          {value.phone && <span className="text-slate-400">· {value.phone}</span>}
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-slate-400 hover:text-slate-600"
          aria-label="Change supplier"
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
          placeholder="Search supplier by name or phone..."
          className="w-full rounded-md border border-slate-300 py-2 pl-8 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <div className="max-h-32 overflow-y-auto rounded-md border border-slate-200">
        {isLoading ? (
          <p className="px-3 py-2 text-xs text-slate-400">Searching...</p>
        ) : suppliers.length === 0 ? (
          <p className="px-3 py-2 text-xs text-slate-400">No matching suppliers</p>
        ) : (
          suppliers.map((supplier) => (
            <button
              key={supplier._id}
              type="button"
              onClick={() => {
                onChange(supplier);
                setSearch('');
              }}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50"
            >
              <span className="font-medium text-slate-700">{supplier.name}</span>
              <span className="text-xs text-slate-400">{supplier.phone}</span>
            </button>
          ))
        )}
      </div>

      {!showAddForm ? (
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700"
        >
          <UserPlus size={13} />
          Add new supplier
        </button>
      ) : (
        <form onSubmit={handleQuickAdd} className="space-y-2 rounded-md border border-slate-200 p-3">
          {addError && <p className="text-xs text-red-600">{addError}</p>}
          <input
            type="text"
            value={addForm.name}
            onChange={(e) => setAddForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Supplier name"
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
              disabled={createSupplier.isPending}
              className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {createSupplier.isPending ? 'Saving...' : 'Save & Select'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default SupplierPicker;
