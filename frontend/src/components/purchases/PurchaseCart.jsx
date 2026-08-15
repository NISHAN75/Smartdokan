import { Plus, Minus, Trash2, XCircle } from 'lucide-react';
import SupplierPicker from './SupplierPicker';

const formatCurrency = (value) => `৳${Number(value ?? 0).toFixed(2)}`;

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bkash', label: 'bKash' },
  { value: 'card', label: 'Card' },
  { value: 'other', label: 'Other' },
];

/**
 * Right-hand purchase panel: cart contents (with per-line editable
 * purchase price + manual quantity), supplier, discount, payment, note,
 * and confirm. Pure presentational + local totals math — CreatePurchase
 * owns the actual cart/supplier/payment state and the confirm mutation.
 * Mirrors Sales' CartPanel, with purchase price editable per line
 * (unlike Sales' fixed sellingPrice) and no stock ceiling on quantity
 * (a purchase is what *adds* stock).
 */
const PurchaseCart = ({
  cart,
  onIncrease,
  onDecrease,
  onQuantityChange,
  onPriceChange,
  onRemove,
  onClear,
  supplier,
  onSupplierChange,
  discount,
  onDiscountChange,
  paymentMethod,
  onPaymentMethodChange,
  paidAmount,
  onPaidAmountChange,
  note,
  onNoteChange,
  onConfirm,
  isConfirming,
  error,
}) => {
  const subtotal = cart.reduce(
    (sum, item) => sum + (Number(item.purchasePrice) || 0) * item.quantity,
    0
  );
  const numericDiscount = Number(discount) || 0;
  const total = Math.max(subtotal - numericDiscount, 0);
  const numericPaid = Number(paidAmount) || 0;
  const due = Math.max(total - numericPaid, 0);

  return (
    <div className="flex h-full flex-col rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-800">Purchase Cart ({cart.length})</h2>
        {cart.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-600"
          >
            <XCircle size={13} />
            Clear
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {cart.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">
            Cart is empty — search and add products on the left.
          </p>
        ) : (
          <ul className="space-y-3">
            {cart.map((item) => (
              <li key={item._id} className="rounded-md border border-slate-100 p-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{item.name}</p>
                    <p className="text-xs text-slate-400">{item.sku}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(item._id)}
                    className="shrink-0 text-slate-400 hover:text-red-500"
                    aria-label="Remove item"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-0.5 block text-[11px] font-medium text-slate-500">
                      Quantity
                    </label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onDecrease(item._id)}
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-slate-300 text-slate-500 hover:bg-slate-50"
                        aria-label="Decrease quantity"
                      >
                        <Minus size={12} />
                      </button>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={item.quantity}
                        onChange={(e) => onQuantityChange(item._id, e.target.value)}
                        className="w-full rounded-md border border-slate-300 px-1.5 py-1 text-center text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => onIncrease(item._id)}
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-slate-300 text-slate-500 hover:bg-slate-50"
                        aria-label="Increase quantity"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="mb-0.5 block text-[11px] font-medium text-slate-500">
                      Purchase Price
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.purchasePrice}
                      onChange={(e) => onPriceChange(item._id, e.target.value)}
                      className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <p className="mt-1.5 text-right text-sm font-semibold text-slate-800">
                  {formatCurrency((Number(item.purchasePrice) || 0) * item.quantity)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-3 border-t border-slate-200 px-4 py-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Supplier</label>
          <SupplierPicker value={supplier} onChange={onSupplierChange} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Discount</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={discount}
              onChange={(e) => onDiscountChange(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => onPaymentMethodChange(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Paid Amount</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={paidAmount}
            onChange={(e) => onPaidAmountChange(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Note (optional)</label>
          <input
            type="text"
            value={note}
            onChange={(e) => onNoteChange(e.target.value)}
            placeholder="e.g. delivery reference, remarks..."
            maxLength={300}
            className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="space-y-1 rounded-md bg-slate-50 px-3 py-2 text-sm">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Discount</span>
            <span>- {formatCurrency(numericDiscount)}</span>
          </div>
          <div className="flex justify-between text-base font-semibold text-slate-900">
            <span>Grand Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
          <div className="flex justify-between text-slate-600">
            <span>Due</span>
            <span>{formatCurrency(due)}</span>
          </div>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">{error}</div>
        )}

        <button
          type="button"
          onClick={onConfirm}
          disabled={cart.length === 0 || !supplier || isConfirming}
          className="w-full rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isConfirming ? 'Processing...' : `Confirm Purchase — ${formatCurrency(total)}`}
        </button>
      </div>
    </div>
  );
};

export default PurchaseCart;
