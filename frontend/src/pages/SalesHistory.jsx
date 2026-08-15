import { useMemo, useState } from 'react';
import { Search, Eye, Receipt } from 'lucide-react';

import { useSales } from '../hooks/useSales';
import Pagination from '../components/ui/Pagination';
import StatusBadge from '../components/ui/StatusBadge';
import SaleInvoiceModal from '../components/sales/SaleInvoiceModal';

const LIMIT = 10;

const formatCurrency = (value) => `৳${Number(value ?? 0).toFixed(2)}`;

const PAYMENT_METHOD_LABELS = {
  cash: 'Cash',
  bkash: 'bKash',
  card: 'Card',
  other: 'Other',
};

/**
 * Sales History — list, search, date range filter, pagination, and a
 * "view details" action that reuses the same SaleInvoiceModal the POS
 * screen shows right after checkout.
 */
const SalesHistory = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [selectedSale, setSelectedSale] = useState(null);

  const params = useMemo(
    () => ({
      page,
      limit: LIMIT,
      search: search || undefined,
      from: from || undefined,
      to: to || undefined,
    }),
    [page, search, from, to]
  );

  const { data, isLoading, isError } = useSales(params);
  const sales = data?.data || [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Sales History</h1>
          <p className="text-sm text-slate-500">All completed sales/invoices</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by invoice number or customer..."
            className="w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <span className="text-sm text-slate-400">to</span>
          <input
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        {isLoading ? (
          <p className="py-10 text-center text-sm text-slate-400">Loading sales...</p>
        ) : isError ? (
          <p className="py-10 text-center text-sm text-red-500">Couldn&apos;t load sales history.</p>
        ) : sales.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-slate-400">
            <Receipt size={28} />
            <p className="text-sm">No sales found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Invoice #</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Paid</th>
                  <th className="px-4 py-3 font-medium">Due</th>
                  <th className="px-4 py-3 font-medium">Payment</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sales.map((sale) => (
                  <tr key={sale._id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{sale.invoiceNumber}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {sale.customerId?.name || sale.customerName || 'Walk-in Customer'}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(sale.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {formatCurrency(sale.total)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatCurrency(sale.paidAmount)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatCurrency(sale.dueAmount)}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {PAYMENT_METHOD_LABELS[sale.paymentMethod] || sale.paymentMethod}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={sale.paymentStatus} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedSale(sale)}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                      >
                        <Eye size={13} />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          page={data?.currentPage || 1}
          pages={data?.totalPages || 1}
          total={data?.totalItems || 0}
          limit={LIMIT}
          onPageChange={setPage}
        />
      </div>

      <SaleInvoiceModal
        open={!!selectedSale}
        onClose={() => setSelectedSale(null)}
        sale={selectedSale}
      />
    </div>
  );
};

export default SalesHistory;
