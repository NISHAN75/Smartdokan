import Modal from '../ui/Modal';
import StatusBadge from '../ui/StatusBadge';
import { useCustomer } from '../../hooks/useCustomers';

const formatMoney = (value) => `৳${Number(value ?? 0).toFixed(2)}`;

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '—';

/**
 * Read-only Customer Details view — customer info, full balance
 * breakdown (opening due, current due, sales count, total sales, total
 * paid, due amount) and recent sales/payment history. Fetches its own
 * data via useCustomer(id) so the caller only needs to pass an id.
 */
const CustomerDetailsModal = ({ open, onClose, customerId }) => {
  const { data: customer, isLoading, isError, error } = useCustomer(open ? customerId : null);

  return (
    <Modal open={open} onClose={onClose} title="Customer Details" maxWidth="max-w-lg">
      {isLoading ? (
        <div className="flex flex-col items-center justify-center gap-2 py-10 text-slate-400">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" />
          <p className="text-sm">Loading customer...</p>
        </div>
      ) : isError || !customer ? (
        <p className="py-10 text-center text-sm text-red-500">
          {error?.response?.data?.message || "Couldn't load this customer."}
        </p>
      ) : (
        <div className="space-y-5">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="text-base font-semibold text-slate-900">{customer.name}</h4>
              <p className="text-sm text-slate-500">{customer.phone}</p>
              {customer.email && <p className="text-sm text-slate-500">{customer.email}</p>}
              {customer.address && (
                <p className="mt-1 text-sm text-slate-500">{customer.address}</p>
              )}
            </div>
            <StatusBadge status={customer.status} />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-md border border-slate-200 p-3">
              <p className="text-xs text-slate-500">Opening Due</p>
              <p className="mt-1 text-sm font-semibold text-slate-800">
                {formatMoney(customer.openingDue)}
              </p>
            </div>
            <div className="rounded-md border border-slate-200 p-3">
              <p className="text-xs text-slate-500">Due from Sales</p>
              <p className="mt-1 text-sm font-semibold text-slate-800">
                {formatMoney(customer.dueAmount)}
              </p>
            </div>
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs text-amber-700">Current Due</p>
              <p className="mt-1 text-sm font-semibold text-amber-800">
                {formatMoney(customer.currentDue)}
              </p>
            </div>
            <div className="rounded-md border border-slate-200 p-3">
              <p className="text-xs text-slate-500">Sales Count</p>
              <p className="mt-1 text-sm font-semibold text-slate-800">
                {customer.salesCount ?? 0}
              </p>
            </div>
            <div className="rounded-md border border-slate-200 p-3">
              <p className="text-xs text-slate-500">Total Sales</p>
              <p className="mt-1 text-sm font-semibold text-slate-800">
                {formatMoney(customer.totalSales)}
              </p>
            </div>
            <div className="rounded-md border border-slate-200 p-3">
              <p className="text-xs text-slate-500">Total Paid</p>
              <p className="mt-1 text-sm font-semibold text-slate-800">
                {formatMoney(customer.totalPaid)}
              </p>
            </div>
          </div>

          <div>
            <h5 className="mb-2 text-sm font-medium text-slate-700">Recent Sales</h5>
            {!customer.recentSales || customer.recentSales.length === 0 ? (
              <p className="rounded-md border border-dashed border-slate-200 py-6 text-center text-xs text-slate-400">
                No sales yet for this customer.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-md border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-3 py-2 font-medium">Invoice</th>
                      <th className="px-3 py-2 font-medium">Date</th>
                      <th className="px-3 py-2 font-medium">Total</th>
                      <th className="px-3 py-2 font-medium">Paid</th>
                      <th className="px-3 py-2 font-medium">Due</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {customer.recentSales.map((sale) => (
                      <tr key={sale._id}>
                        <td className="px-3 py-2 font-medium text-slate-700">
                          {sale.invoiceNumber}
                        </td>
                        <td className="px-3 py-2 text-slate-500">{formatDate(sale.createdAt)}</td>
                        <td className="px-3 py-2 text-slate-700">{formatMoney(sale.total)}</td>
                        <td className="px-3 py-2 text-slate-700">
                          {formatMoney(sale.paidAmount)}
                        </td>
                        <td className="px-3 py-2 text-slate-700">{formatMoney(sale.dueAmount)}</td>
                        <td className="px-3 py-2 capitalize text-slate-500">
                          {sale.paymentStatus}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default CustomerDetailsModal;
