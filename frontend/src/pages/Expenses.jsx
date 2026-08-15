import { useMemo, useState } from 'react';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Eye,
  Receipt,
  AlertCircle,
  Wallet,
  CalendarDays,
  Hash,
  Tags,
  Settings,
} from 'lucide-react';
import {
  useExpenses,
  useExpenseSummary,
  useCreateExpense,
  useUpdateExpense,
  useDeleteExpense,
  useExpenseCategories,
} from '../hooks/useExpenses';
import ExpenseFormModal from '../components/expenses/ExpenseFormModal';
import ExpenseCategoryManagerModal from '../components/expenses/ExpenseCategoryManagerModal';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import StatusBadge from '../components/ui/StatusBadge';
import Pagination from '../components/ui/Pagination';
import Toast from '../components/ui/Toast';

const LIMIT = 10;

const formatMoney = (value) => `৳${Number(value ?? 0).toFixed(2)}`;

const PAYMENT_METHOD_LABELS = {
  cash: 'Cash',
  bkash: 'bKash',
  card: 'Card',
  other: 'Other',
};

// Small summary card — same visual language as Suppliers.jsx's
// SummaryCard, kept local since only this page uses this exact shape.
const SummaryCard = ({ icon: Icon, label, value, tone = 'slate' }) => {
  const toneStyles = {
    slate: 'bg-slate-100 text-slate-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    indigo: 'bg-indigo-100 text-indigo-600',
    amber: 'bg-amber-100 text-amber-600',
  };
  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${toneStyles[tone]}`}
      >
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs text-slate-500">{label}</p>
        <p className="truncate text-lg font-semibold text-slate-900">{value}</p>
      </div>
    </div>
  );
};

const Expenses = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [status, setStatus] = useState('active');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [viewingExpense, setViewingExpense] = useState(null);
  const [deactivatingExpense, setDeactivatingExpense] = useState(null);
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const params = useMemo(
    () => ({
      page,
      limit: LIMIT,
      ...(search ? { search } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(paymentMethod ? { paymentMethod } : {}),
      ...(status ? { status } : {}),
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
    }),
    [page, search, categoryId, paymentMethod, status, from, to]
  );

  const { data, isLoading, isError, error } = useExpenses(params);
  const { data: summary } = useExpenseSummary();
  // For the filter dropdown — include inactive too, so a filter can
  // still be applied against a category that was later deactivated.
  const { data: categoryData } = useExpenseCategories({ limit: 100, sort: 'name' });
  const filterCategories = categoryData?.data || [];

  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();

  const expenses = data?.data || [];
  const total = data?.totalItems || 0;
  const pages = data?.totalPages || 1;
  const hasActiveFilters = Boolean(search || categoryId || paymentMethod || from || to || status !== 'active');

  const showToast = (type, message) => setToast({ type, message });

  const resetToFirstPage = () => setPage(1);

  const handleAddClick = () => {
    setEditingExpense(null);
    setFormOpen(true);
  };

  const handleEditClick = (expense) => {
    setEditingExpense(expense);
    setFormOpen(true);
  };

  // Errors are intentionally re-thrown here so ExpenseFormModal's own
  // try/catch can show the inline form error (e.g. inactive category)
  // and keep the modal open. This only fires on success.
  const handleFormSubmit = async (form) => {
    if (editingExpense) {
      await updateExpense.mutateAsync({ id: editingExpense._id, ...form });
      showToast('success', 'Expense updated successfully');
    } else {
      await createExpense.mutateAsync(form);
      showToast('success', 'Expense created successfully');
    }
    setFormOpen(false);
  };

  const handleDeactivateConfirm = async () => {
    try {
      await deleteExpense.mutateAsync(deactivatingExpense._id);
      showToast('success', 'Expense deactivated successfully');
      setDeactivatingExpense(null);
    } catch (err) {
      showToast('error', err.response?.data?.message || 'Failed to deactivate expense');
      setDeactivatingExpense(null);
    }
  };

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    resetToFirstPage();
  };

  const handleCategoryChange = (e) => {
    setCategoryId(e.target.value);
    resetToFirstPage();
  };

  const handlePaymentMethodChange = (e) => {
    setPaymentMethod(e.target.value);
    resetToFirstPage();
  };

  const handleStatusChange = (e) => {
    setStatus(e.target.value);
    resetToFirstPage();
  };

  const handleFromChange = (e) => {
    setFrom(e.target.value);
    resetToFirstPage();
  };

  const handleToChange = (e) => {
    setTo(e.target.value);
    resetToFirstPage();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Expenses</h2>
          <p className="text-sm text-slate-500">Track and manage your business expenses.</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setCategoryManagerOpen(true)}
            className="flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <Settings size={16} />
            Manage Categories
          </button>
          <button
            type="button"
            onClick={handleAddClick}
            className="flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
          >
            <Plus size={16} />
            Add Expense
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          icon={Wallet}
          label="Total Expenses"
          value={summary ? formatMoney(summary.totalAmount) : '—'}
          tone="indigo"
        />
        <SummaryCard
          icon={CalendarDays}
          label="This Month"
          value={summary ? formatMoney(summary.thisMonthAmount) : '—'}
          tone="amber"
        />
        <SummaryCard
          icon={Hash}
          label="Expense Count"
          value={summary ? summary.totalCount : '—'}
          tone="slate"
        />
        <SummaryCard
          icon={Tags}
          label="Top Category"
          value={
            summary?.topCategory
              ? `${summary.topCategory.categoryName} · ${formatMoney(summary.topCategory.totalAmount)}`
              : '—'
          }
          tone="emerald"
        />
      </div>

      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:flex-wrap">
          <div className="relative flex-1 lg:min-w-[200px]">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={search}
              onChange={handleSearchChange}
              placeholder="Search by reference or note..."
              className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <select
            value={categoryId}
            onChange={handleCategoryChange}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 lg:w-44"
          >
            <option value="">All categories</option>
            {filterCategories.map((category) => (
              <option key={category._id} value={category._id}>
                {category.name}
              </option>
            ))}
          </select>
          <select
            value={paymentMethod}
            onChange={handlePaymentMethodChange}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 lg:w-40"
          >
            <option value="">All payment methods</option>
            {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={handleStatusChange}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 lg:w-36"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="">All statuses</option>
          </select>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={from}
              onChange={handleFromChange}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <span className="text-sm text-slate-400">to</span>
            <input
              type="date"
              value={to}
              onChange={handleToChange}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-400">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" />
            <p className="text-sm">Loading expenses...</p>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <AlertCircle size={28} className="text-red-400" />
            <p className="text-sm font-medium text-slate-700">Couldn&apos;t load expenses</p>
            <p className="text-xs text-slate-500">
              {error?.response?.data?.message || 'Something went wrong. Please try again.'}
            </p>
          </div>
        ) : expenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <Receipt size={28} className="text-slate-300" />
            <p className="text-sm font-medium text-slate-700">
              {hasActiveFilters ? 'No expenses match your filters' : 'No expenses yet'}
            </p>
            <p className="text-xs text-slate-500">
              {hasActiveFilters
                ? 'Try a different search term or filter.'
                : 'Get started by recording your first expense.'}
            </p>
            {!hasActiveFilters && (
              <button
                type="button"
                onClick={handleAddClick}
                className="mt-2 flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
              >
                <Plus size={16} />
                Add Expense
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Payment Method</th>
                  <th className="px-4 py-3 font-medium">Reference</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 font-medium">Created By</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expenses.map((expense) => (
                  <tr key={expense._id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(expense.expenseDate).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {expense.categoryId?.name || expense.categoryName}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {formatMoney(expense.amount)}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {PAYMENT_METHOD_LABELS[expense.paymentMethod] || expense.paymentMethod}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {expense.reference || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-slate-500">
                      {expense.note || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {expense.createdBy?.name || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={expense.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setViewingExpense(expense)}
                          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
                          aria-label="View expense"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEditClick(expense)}
                          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
                          aria-label="Edit expense"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeactivatingExpense(expense)}
                          disabled={expense.status === 'inactive'}
                          className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                          aria-label="Deactivate expense"
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

        {!isLoading && !isError && expenses.length > 0 && (
          <Pagination page={page} pages={pages} total={total} limit={LIMIT} onPageChange={setPage} />
        )}
      </div>

      <ExpenseFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
        initialData={editingExpense}
        isSubmitting={createExpense.isPending || updateExpense.isPending}
        onManageCategories={() => {
          setFormOpen(false);
          setCategoryManagerOpen(true);
        }}
      />

      <ExpenseCategoryManagerModal
        open={categoryManagerOpen}
        onClose={() => setCategoryManagerOpen(false)}
        onToast={showToast}
      />

      <Modal
        open={Boolean(viewingExpense)}
        onClose={() => setViewingExpense(null)}
        title="Expense Details"
        maxWidth="max-w-md"
      >
        {viewingExpense && (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Category</span>
              <span className="font-medium text-slate-800">
                {viewingExpense.categoryId?.name || viewingExpense.categoryName}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Amount</span>
              <span className="font-medium text-slate-800">{formatMoney(viewingExpense.amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Date</span>
              <span className="font-medium text-slate-800">
                {new Date(viewingExpense.expenseDate).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Payment Method</span>
              <span className="font-medium text-slate-800">
                {PAYMENT_METHOD_LABELS[viewingExpense.paymentMethod] || viewingExpense.paymentMethod}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Reference</span>
              <span className="font-medium text-slate-800">{viewingExpense.reference || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Status</span>
              <StatusBadge status={viewingExpense.status} />
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Created By</span>
              <span className="font-medium text-slate-800">
                {viewingExpense.createdBy?.name || '—'}
              </span>
            </div>
            {viewingExpense.note && (
              <div>
                <span className="text-slate-500">Description</span>
                <p className="mt-1 rounded-md bg-slate-50 p-2 text-slate-700">{viewingExpense.note}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(deactivatingExpense)}
        title="Deactivate Expense"
        message="Are you sure you want to deactivate this expense? It will be excluded from active totals, but its history is kept."
        confirmLabel="Deactivate"
        loadingLabel="Deactivating..."
        onConfirm={handleDeactivateConfirm}
        onCancel={() => setDeactivatingExpense(null)}
        loading={deleteExpense.isPending}
      />

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
};

export default Expenses;
