import { useMemo, useState } from 'react';
import { Plus, Search, Pencil, Trash2, Eye, Users, AlertCircle } from 'lucide-react';
import {
  useCustomers,
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
} from '../hooks/useCustomers';
import CustomerFormModal from '../components/customers/CustomerFormModal';
import CustomerDetailsModal from '../components/customers/CustomerDetailsModal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import StatusBadge from '../components/ui/StatusBadge';
import Pagination from '../components/ui/Pagination';
import Toast from '../components/ui/Toast';

const LIMIT = 10;

const formatMoney = (value) => `৳${Number(value ?? 0).toFixed(2)}`;

const Customers = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [viewingCustomerId, setViewingCustomerId] = useState(null);
  const [deactivatingCustomer, setDeactivatingCustomer] = useState(null);
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

  const { data, isLoading, isError, error } = useCustomers(params);

  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const deleteCustomer = useDeleteCustomer();

  const customers = data?.data || [];
  const total = data?.totalItems || 0;
  const pages = data?.totalPages || 1;
  const hasActiveFilters = Boolean(search || status);

  const showToast = (type, message) => setToast({ type, message });

  const handleAddClick = () => {
    setEditingCustomer(null);
    setFormOpen(true);
  };

  const handleEditClick = (customer) => {
    setEditingCustomer(customer);
    setFormOpen(true);
  };

  // Errors are intentionally re-thrown here so CustomerFormModal's own
  // try/catch can show the inline form error (e.g. duplicate phone) and
  // keep the modal open. This only fires on success.
  const handleFormSubmit = async (form) => {
    if (editingCustomer) {
      await updateCustomer.mutateAsync({ id: editingCustomer._id, ...form });
      showToast('success', 'Customer updated successfully');
    } else {
      await createCustomer.mutateAsync(form);
      showToast('success', 'Customer created successfully');
    }
    setFormOpen(false);
  };

  const handleDeactivateConfirm = async () => {
    try {
      await deleteCustomer.mutateAsync(deactivatingCustomer._id);
      showToast('success', 'Customer deactivated successfully');
      setDeactivatingCustomer(null);
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to deactivate customer');
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
          <h2 className="text-xl font-semibold text-slate-900">Customers</h2>
          <p className="text-sm text-slate-500">Manage your customers and track their due.</p>
        </div>
        <button
          type="button"
          onClick={handleAddClick}
          className="flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
        >
          <Plus size={16} />
          Add Customer
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
              placeholder="Search by name, phone, or email..."
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
            <p className="text-sm">Loading customers...</p>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <AlertCircle size={28} className="text-red-400" />
            <p className="text-sm font-medium text-slate-700">Couldn&apos;t load customers</p>
            <p className="text-xs text-slate-500">
              {error?.response?.data?.message || 'Something went wrong. Please try again.'}
            </p>
          </div>
        ) : customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <Users size={28} className="text-slate-300" />
            <p className="text-sm font-medium text-slate-700">
              {hasActiveFilters ? 'No customers match your filters' : 'No customers yet'}
            </p>
            <p className="text-xs text-slate-500">
              {hasActiveFilters
                ? 'Try a different search term or status.'
                : 'Get started by adding your first customer.'}
            </p>
            {!hasActiveFilters && (
              <button
                type="button"
                onClick={handleAddClick}
                className="mt-2 flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
              >
                <Plus size={16} />
                Add Customer
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Address</th>
                  <th className="px-4 py-3 font-medium">Opening Due</th>
                  <th className="px-4 py-3 font-medium">Current Due</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((customer) => (
                  <tr key={customer._id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{customer.name}</td>
                    <td className="px-4 py-3 text-slate-500">{customer.phone}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {customer.email || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {customer.address || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatMoney(customer.openingDue)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          Number(customer.currentDue ?? 0) > 0
                            ? 'font-medium text-red-600'
                            : 'text-slate-700'
                        }
                      >
                        {formatMoney(customer.currentDue)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={customer.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setViewingCustomerId(customer._id)}
                          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
                          aria-label={`View ${customer.name}`}
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEditClick(customer)}
                          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
                          aria-label={`Edit ${customer.name}`}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeactivatingCustomer(customer)}
                          disabled={customer.status === 'inactive'}
                          className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                          aria-label={`Deactivate ${customer.name}`}
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

        {!isLoading && !isError && customers.length > 0 && (
          <Pagination page={page} pages={pages} total={total} limit={LIMIT} onPageChange={setPage} />
        )}
      </div>

      <CustomerFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
        initialData={editingCustomer}
        isSubmitting={createCustomer.isPending || updateCustomer.isPending}
      />

      <CustomerDetailsModal
        open={Boolean(viewingCustomerId)}
        onClose={() => setViewingCustomerId(null)}
        customerId={viewingCustomerId}
      />

      <ConfirmDialog
        open={Boolean(deactivatingCustomer)}
        title="Deactivate Customer"
        message={`Are you sure you want to deactivate "${deactivatingCustomer?.name}"? They won't be selectable for new sales, but their history and due are kept.`}
        confirmLabel="Deactivate"
        loadingLabel="Deactivating..."
        onConfirm={handleDeactivateConfirm}
        onCancel={() => setDeactivatingCustomer(null)}
        loading={deleteCustomer.isPending}
      />

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
};

export default Customers;
