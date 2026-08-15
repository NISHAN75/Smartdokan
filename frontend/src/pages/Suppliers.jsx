import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Pencil,
  Eye,
  Power,
  Building2,
  AlertCircle,
  Users,
  CheckCircle2,
  Wallet,
  TrendingUp,
} from 'lucide-react';
import {
  useSuppliers,
  useSupplierSummary,
  useCreateSupplier,
  useUpdateSupplier,
  useDeleteSupplier,
} from '../hooks/useSuppliers';
import SupplierFormModal from '../components/suppliers/SupplierFormModal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import StatusBadge from '../components/ui/StatusBadge';
import Pagination from '../components/ui/Pagination';
import Toast from '../components/ui/Toast';

const LIMIT = 10;

const formatMoney = (value) => `৳${Number(value ?? 0).toFixed(2)}`;

// Small summary card — same visual language across Suppliers/Dashboard
// style cards, kept local since only this page uses this exact shape.
const SummaryCard = ({ icon: Icon, label, value, tone = 'slate' }) => {
  const toneStyles = {
    slate: 'bg-slate-100 text-slate-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    indigo: 'bg-indigo-100 text-indigo-600',
    amber: 'bg-amber-100 text-amber-600',
  };
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${toneStyles[tone]}`}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs text-slate-500">{label}</p>
        <p className="text-lg font-semibold text-slate-900">{value}</p>
      </div>
    </div>
  );
};

const Suppliers = () => {
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [togglingSupplier, setTogglingSupplier] = useState(null);
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

  const { data, isLoading, isError, error } = useSuppliers(params);
  const { data: summary } = useSupplierSummary();

  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();
  const deleteSupplier = useDeleteSupplier();

  const suppliers = data?.data || [];
  const total = data?.totalItems || 0;
  const pages = data?.totalPages || 1;
  const hasActiveFilters = Boolean(search || status);

  const showToast = (type, message) => setToast({ type, message });

  const handleAddClick = () => {
    setEditingSupplier(null);
    setFormOpen(true);
  };

  const handleEditClick = (supplier) => {
    setEditingSupplier(supplier);
    setFormOpen(true);
  };

  // Errors are intentionally re-thrown here so SupplierFormModal's own
  // try/catch can show the inline form error (e.g. duplicate phone, or
  // a locked opening-due edit) and keep the modal open. This only fires
  // on success.
  const handleFormSubmit = async (form) => {
    if (editingSupplier) {
      await updateSupplier.mutateAsync({ id: editingSupplier._id, ...form });
      showToast('success', 'Supplier updated successfully');
    } else {
      await createSupplier.mutateAsync(form);
      showToast('success', 'Supplier created successfully');
    }
    setFormOpen(false);
  };

  const handleToggleConfirm = async () => {
    try {
      const result = await deleteSupplier.mutateAsync(togglingSupplier._id);
      showToast('success', result.message || 'Supplier status updated');
      setTogglingSupplier(null);
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to update supplier status');
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

  const isDeactivating = togglingSupplier?.status === 'active';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Suppliers</h2>
          <p className="text-sm text-slate-500">Manage your suppliers and supplier balances.</p>
        </div>
        <button
          type="button"
          onClick={handleAddClick}
          className="flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
        >
          <Plus size={16} />
          Add Supplier
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard icon={Users} label="Total Suppliers" value={summary?.totalSuppliers ?? '—'} tone="slate" />
        <SummaryCard
          icon={CheckCircle2}
          label="Active Suppliers"
          value={summary?.activeSuppliers ?? '—'}
          tone="emerald"
        />
        <SummaryCard
          icon={TrendingUp}
          label="Total Purchase Value"
          value={summary ? formatMoney(summary.totalPurchaseValue) : '—'}
          tone="indigo"
        />
        <SummaryCard
          icon={Wallet}
          label="Total Supplier Due"
          value={summary ? formatMoney(summary.totalSupplierDue) : '—'}
          tone="amber"
        />
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
              placeholder="Search by supplier name, phone, or email..."
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
            <p className="text-sm">Loading suppliers...</p>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <AlertCircle size={28} className="text-red-400" />
            <p className="text-sm font-medium text-slate-700">Couldn&apos;t load suppliers</p>
            <p className="text-xs text-slate-500">
              {error?.response?.data?.message || 'Something went wrong. Please try again.'}
            </p>
          </div>
        ) : suppliers.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <Building2 size={28} className="text-slate-300" />
            <p className="text-sm font-medium text-slate-700">
              {hasActiveFilters ? 'No suppliers match your filters' : 'No suppliers found'}
            </p>
            <p className="text-xs text-slate-500">
              {hasActiveFilters
                ? 'Try a different search term or status.'
                : 'Add your first supplier to start managing supplier purchases.'}
            </p>
            {!hasActiveFilters && (
              <button
                type="button"
                onClick={handleAddClick}
                className="mt-2 flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
              >
                <Plus size={16} />
                Add Supplier
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Supplier</th>
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
                {suppliers.map((supplier) => (
                  <tr key={supplier._id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{supplier.name}</td>
                    <td className="px-4 py-3 text-slate-500">{supplier.phone}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {supplier.email || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {supplier.address || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatMoney(supplier.openingDue)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          Number(supplier.currentDue ?? 0) > 0
                            ? 'font-medium text-red-600'
                            : 'text-slate-700'
                        }
                      >
                        {formatMoney(supplier.currentDue)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={supplier.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => navigate(`/suppliers/${supplier._id}`)}
                          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
                          aria-label={`View ${supplier.name}`}
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEditClick(supplier)}
                          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
                          aria-label={`Edit ${supplier.name}`}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setTogglingSupplier(supplier)}
                          className="rounded-md p-1.5 text-slate-500 hover:bg-amber-50 hover:text-amber-600"
                          aria-label={
                            supplier.status === 'active'
                              ? `Deactivate ${supplier.name}`
                              : `Activate ${supplier.name}`
                          }
                        >
                          <Power size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && !isError && suppliers.length > 0 && (
          <Pagination page={page} pages={pages} total={total} limit={LIMIT} onPageChange={setPage} />
        )}
      </div>

      <SupplierFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
        initialData={editingSupplier}
        isSubmitting={createSupplier.isPending || updateSupplier.isPending}
      />

      <ConfirmDialog
        open={Boolean(togglingSupplier)}
        title={isDeactivating ? 'Deactivate Supplier' : 'Activate Supplier'}
        message={
          isDeactivating
            ? `Are you sure you want to deactivate "${togglingSupplier?.name}"? They won't be selectable for new purchases, but their history and due are kept.`
            : `Reactivate "${togglingSupplier?.name}"? They'll become selectable for new purchases again.`
        }
        confirmLabel={isDeactivating ? 'Deactivate' : 'Activate'}
        loadingLabel={isDeactivating ? 'Deactivating...' : 'Activating...'}
        onConfirm={handleToggleConfirm}
        onCancel={() => setTogglingSupplier(null)}
        loading={deleteSupplier.isPending}
      />

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
};

export default Suppliers;
