import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Wallet, AlertCircle, Plus } from 'lucide-react';

import {
  useSupplier,
  useSupplierPurchases,
  useSupplierPayments,
  useCreateSupplierPayment,
} from '../hooks/useSuppliers';
import SupplierPaymentFormModal from '../components/suppliers/SupplierPaymentFormModal';
import StatusBadge from '../components/ui/StatusBadge';
import Pagination from '../components/ui/Pagination';
import Toast from '../components/ui/Toast';

const HISTORY_LIMIT = 5;

const formatMoney = (value) => `৳${Number(value ?? 0).toFixed(2)}`;

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '—';

const paymentStatusStyles = {
  paid: 'bg-emerald-100 text-emerald-700',
  partial: 'bg-amber-100 text-amber-700',
  due: 'bg-red-100 text-red-700',
};

/**
 * Standalone, linkable/bookmarkable supplier details page at
 * /suppliers/:id — mirrors PurchaseDetails.jsx's page shape (back link
 * + card), but with financial summary cards, a purchase-history table,
 * and a payment-history table, each independently paginated.
 */
const SupplierDetails = () => {
  const { id } = useParams();

  const [purchasesPage, setPurchasesPage] = useState(1);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [paymentFormOpen, setPaymentFormOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const { data, isLoading, isError } = useSupplier(id);
  const supplier = data?.supplier;
  const summary = data?.summary;

  const { data: purchasesData, isLoading: purchasesLoading } = useSupplierPurchases(id, {
    page: purchasesPage,
    limit: HISTORY_LIMIT,
  });
  const { data: paymentsData, isLoading: paymentsLoading } = useSupplierPayments(id, {
    page: paymentsPage,
    limit: HISTORY_LIMIT,
  });

  const createPayment = useCreateSupplierPayment();

  const showToast = (type, message) => setToast({ type, message });

  const handleRecordPayment = async (form) => {
    await createPayment.mutateAsync({ supplierId: id, ...form });
    showToast('success', 'Payment recorded successfully');
    setPaymentFormOpen(false);
  };

  if (isLoading) {
    return <p className="py-10 text-center text-sm text-slate-400">Loading supplier...</p>;
  }

  if (isError || !supplier) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <AlertCircle size={28} className="text-red-400" />
        <p className="text-sm text-red-500">
          Couldn&apos;t load this supplier. It may not exist or you may not have access.
        </p>
        <Link to="/suppliers" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
          Back to Suppliers
        </Link>
      </div>
    );
  }

  const purchases = purchasesData?.data || [];
  const payments = paymentsData?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          to="/suppliers"
          className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-800"
        >
          <ArrowLeft size={16} />
          Back to Suppliers
        </Link>
        <button
          type="button"
          onClick={() => setPaymentFormOpen(true)}
          className="flex items-center justify-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
        >
          <Wallet size={16} />
          Record Payment
        </button>
      </div>

      {/* Supplier information */}
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{supplier.name}</h2>
            <p className="text-sm text-slate-500">{supplier.phone}</p>
            {supplier.email && <p className="text-sm text-slate-500">{supplier.email}</p>}
            {supplier.address && <p className="mt-1 text-sm text-slate-500">{supplier.address}</p>}
          </div>
          <StatusBadge status={supplier.status} />
        </div>
      </div>

      {/* Financial summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Opening Due</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {formatMoney(summary?.openingDue)}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Total Purchases</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {formatMoney(summary?.totalPurchases)}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Total Paid</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {formatMoney(summary?.totalPaid)}
          </p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <p className="text-xs text-amber-700">Current Due</p>
          <p className="mt-1 text-lg font-semibold text-amber-800">
            {formatMoney(summary?.currentDue)}
          </p>
        </div>
      </div>

      {/* Purchase statistics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Purchase Count</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">{summary?.purchaseCount ?? 0}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Total Purchase Value</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {formatMoney(summary?.totalPurchases)}
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Last Purchase Date</p>
          <p className="mt-1 text-lg font-semibold text-slate-900">
            {summary?.lastPurchaseDate ? formatDate(summary.lastPurchaseDate) : '—'}
          </p>
        </div>
      </div>

      {/* Recent purchases */}
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-800">Recent Purchases</h3>
        </div>
        {purchasesLoading ? (
          <p className="py-8 text-center text-sm text-slate-400">Loading purchases...</p>
        ) : purchases.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">
            No purchases yet for this supplier.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-2 font-medium">Purchase #</th>
                    <th className="px-4 py-2 font-medium">Date</th>
                    <th className="px-4 py-2 font-medium">Total</th>
                    <th className="px-4 py-2 font-medium">Paid</th>
                    <th className="px-4 py-2 font-medium">Due</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {purchases.map((purchase) => (
                    <tr key={purchase._id}>
                      <td className="px-4 py-2 font-medium text-slate-700">
                        {purchase.purchaseNumber}
                      </td>
                      <td className="px-4 py-2 text-slate-500">{formatDate(purchase.createdAt)}</td>
                      <td className="px-4 py-2 text-slate-700">{formatMoney(purchase.total)}</td>
                      <td className="px-4 py-2 text-slate-700">
                        {formatMoney(purchase.paidAmount)}
                      </td>
                      <td className="px-4 py-2 text-slate-700">{formatMoney(purchase.dueAmount)}</td>
                      <td className="px-4 py-2">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                            paymentStatusStyles[purchase.paymentStatus] || 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {purchase.paymentStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={purchasesPage}
              pages={purchasesData?.totalPages || 1}
              total={purchasesData?.totalItems || 0}
              limit={HISTORY_LIMIT}
              onPageChange={setPurchasesPage}
            />
          </>
        )}
      </div>

      {/* Payment history */}
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-800">Payment History</h3>
          <button
            type="button"
            onClick={() => setPaymentFormOpen(true)}
            className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700"
          >
            <Plus size={13} />
            Record Payment
          </button>
        </div>
        {paymentsLoading ? (
          <p className="py-8 text-center text-sm text-slate-400">Loading payments...</p>
        ) : payments.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">
            No payments recorded yet for this supplier.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-2 font-medium">Date</th>
                    <th className="px-4 py-2 font-medium">Amount</th>
                    <th className="px-4 py-2 font-medium">Method</th>
                    <th className="px-4 py-2 font-medium">Reference</th>
                    <th className="px-4 py-2 font-medium">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.map((payment) => (
                    <tr key={payment._id}>
                      <td className="px-4 py-2 text-slate-500">{formatDate(payment.paymentDate)}</td>
                      <td className="px-4 py-2 font-medium text-slate-700">
                        {formatMoney(payment.amount)}
                      </td>
                      <td className="px-4 py-2 capitalize text-slate-500">
                        {payment.paymentMethod}
                      </td>
                      <td className="px-4 py-2 text-slate-500">
                        {payment.reference || <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-2 text-slate-500">
                        {payment.note || <span className="text-slate-300">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={paymentsPage}
              pages={paymentsData?.totalPages || 1}
              total={paymentsData?.totalItems || 0}
              limit={HISTORY_LIMIT}
              onPageChange={setPaymentsPage}
            />
          </>
        )}
      </div>

      <SupplierPaymentFormModal
        open={paymentFormOpen}
        onClose={() => setPaymentFormOpen(false)}
        onSubmit={handleRecordPayment}
        supplierName={supplier.name}
        currentDue={summary?.currentDue}
        isSubmitting={createPayment.isPending}
      />

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
};

export default SupplierDetails;
