import StatusBadge from '../ui/StatusBadge';

const formatCurrency = (value) => `৳${Number(value ?? 0).toFixed(2)}`;

const PAYMENT_METHOD_LABELS = {
  cash: 'Cash',
  bkash: 'bKash',
  card: 'Card',
  other: 'Other',
};

/**
 * Pure invoice/receipt markup — no modal chrome, no print button. Used
 * both inside PurchaseInvoiceModal (right after checkout / "View" from
 * Purchase History) and on the standalone PurchaseDetails page, so the
 * two entry points never drift out of sync.
 */
const PurchaseInvoice = ({ purchase }) => {
  if (!purchase) return null;

  return (
    <div id="purchase-invoice-printable" className="space-y-4">
      <div className="border-b border-dashed border-slate-300 pb-3 text-center">
        <p className="text-lg font-bold text-slate-900">SmartDokan</p>
        <p className="text-xs text-slate-500">Retail Shop Management</p>
        <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-400">
          Purchase Invoice
        </p>
      </div>

      <div className="flex items-center justify-between text-sm">
        <div>
          <p className="font-semibold text-slate-800">{purchase.purchaseNumber}</p>
          <p className="text-xs text-slate-500">
            {new Date(purchase.createdAt).toLocaleString()}
          </p>
        </div>
        <StatusBadge status={purchase.paymentStatus} />
      </div>

      <div className="text-sm text-slate-600">
        <span className="font-medium text-slate-700">Supplier: </span>
        {purchase.supplierId?.name || purchase.supplierName}
        {purchase.supplierId?.phone && (
          <span className="text-slate-400"> · {purchase.supplierId.phone}</span>
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
          {purchase.items.map((item) => (
            <tr key={item.productId?._id || item.productId || item.sku}>
              <td className="py-1.5">
                <p className="text-slate-800">{item.name}</p>
                <p className="text-xs text-slate-400">{item.sku}</p>
              </td>
              <td className="py-1.5 text-right text-slate-600">{item.quantity}</td>
              <td className="py-1.5 text-right text-slate-600">
                {formatCurrency(item.purchasePrice)}
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
          <span>{formatCurrency(purchase.subtotal)}</span>
        </div>
        <div className="flex justify-between text-slate-600">
          <span>Discount</span>
          <span>- {formatCurrency(purchase.discount)}</span>
        </div>
        <div className="flex justify-between text-base font-semibold text-slate-900">
          <span>Grand Total</span>
          <span>{formatCurrency(purchase.total)}</span>
        </div>
        <div className="flex justify-between text-slate-600">
          <span>
            Paid ({PAYMENT_METHOD_LABELS[purchase.paymentMethod] || purchase.paymentMethod})
          </span>
          <span>{formatCurrency(purchase.paidAmount)}</span>
        </div>
        <div className="flex justify-between font-medium text-slate-800">
          <span>Due</span>
          <span>{formatCurrency(purchase.dueAmount)}</span>
        </div>
      </div>

      {purchase.note && (
        <div className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <span className="font-medium text-slate-700">Note: </span>
          {purchase.note}
        </div>
      )}

      <p className="border-t border-dashed border-slate-300 pt-3 text-center text-xs text-slate-400">
        Recorded by {purchase.createdBy?.name || 'staff'}
      </p>
    </div>
  );
};

export default PurchaseInvoice;
