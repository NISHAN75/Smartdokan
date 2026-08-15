import { Printer } from 'lucide-react';
import Modal from '../ui/Modal';
import StatusBadge from '../ui/StatusBadge';

const formatCurrency = (value) => `৳${Number(value ?? 0).toFixed(2)}`;

const PAYMENT_METHOD_LABELS = {
  cash: 'Cash',
  bkash: 'bKash',
  card: 'Card',
  other: 'Other',
};

/**
 * Shared invoice/receipt view — reused as-is for the "just checked out"
 * receipt on the POS screen and for viewing a past sale's details from
 * Sales History, rather than building two separate views.
 */
const SaleInvoiceModal = ({ open, onClose, sale }) => {
  if (!sale) return null;

  const handlePrint = () => window.print();

  return (
    <Modal open={open} onClose={onClose} title="Invoice" maxWidth="max-w-lg">
      <div id="invoice-printable" className="space-y-4">
        <div className="border-b border-dashed border-slate-300 pb-3 text-center">
          <p className="text-lg font-bold text-slate-900">SmartDokan</p>
          <p className="text-xs text-slate-500">Retail Shop Management</p>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div>
            <p className="font-semibold text-slate-800">{sale.invoiceNumber}</p>
            <p className="text-xs text-slate-500">
              {new Date(sale.createdAt).toLocaleString()}
            </p>
          </div>
          <StatusBadge status={sale.paymentStatus} />
        </div>

        <div className="text-sm text-slate-600">
          <span className="font-medium text-slate-700">Customer: </span>
          {sale.customerId?.name || sale.customerName || 'Walk-in Customer'}
          {sale.customerId?.phone && (
            <span className="text-slate-400"> · {sale.customerId.phone}</span>
          )}
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
              <th className="py-1.5 font-medium">Item</th>
              <th className="py-1.5 text-right font-medium">Qty</th>
              <th className="py-1.5 text-right font-medium">Price</th>
              <th className="py-1.5 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sale.items.map((item) => (
              <tr key={item.productId?._id || item.productId || item.sku}>
                <td className="py-1.5">
                  <p className="text-slate-800">{item.name}</p>
                  <p className="text-xs text-slate-400">{item.sku}</p>
                </td>
                <td className="py-1.5 text-right text-slate-600">{item.quantity}</td>
                <td className="py-1.5 text-right text-slate-600">
                  {formatCurrency(item.sellingPrice)}
                </td>
                <td className="py-1.5 text-right font-medium text-slate-800">
                  {formatCurrency(item.lineTotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="space-y-1 border-t border-slate-200 pt-3 text-sm">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal</span>
            <span>{formatCurrency(sale.subtotal)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Discount</span>
            <span>- {formatCurrency(sale.discount)}</span>
          </div>
          <div className="flex justify-between text-base font-semibold text-slate-900">
            <span>Grand Total</span>
            <span>{formatCurrency(sale.total)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Paid ({PAYMENT_METHOD_LABELS[sale.paymentMethod] || sale.paymentMethod})</span>
            <span>{formatCurrency(sale.paidAmount)}</span>
          </div>
          <div className="flex justify-between font-medium text-slate-800">
            <span>Due</span>
            <span>{formatCurrency(sale.dueAmount)}</span>
          </div>
        </div>

        <p className="border-t border-dashed border-slate-300 pt-3 text-center text-xs text-slate-400">
          Thank you for shopping with us!
        </p>
      </div>

      <div className="mt-4 flex justify-end gap-3 print:hidden">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Close
        </button>
        <button
          type="button"
          onClick={handlePrint}
          className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Printer size={16} />
          Print
        </button>
      </div>
    </Modal>
  );
};

export default SaleInvoiceModal;
