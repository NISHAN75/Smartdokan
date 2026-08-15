import { Plus, Minus, Trash2, XCircle } from 'lucide-react';
import CustomerPicker from './CustomerPicker';

const formatCurrency = (value) => `৳${Number(value ?? 0).toFixed(2)}`;

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bkash', label: 'bKash' },
  { value: 'card', label: 'Card' },
  { value: 'other', label: 'Other' },
];

/**
 * Right-hand POS panel: cart contents, customer, discount, payment, and
 * checkout. Pure presentational + local totals math — SalesPOS owns the
 * actual cart/customer/payment state and the checkout mutation.
 */
const CartPanel = ({
  cart,
  onIncrease,
  onDecrease,
  onRemove,
  onClear,
  customer,
  onCustomerChange,
  discount,
  onDiscountChange,
  paymentMethod,
  onPaymentMethodChange,
  paidAmount,
  onPaidAmountChange,
  onCheckout,
  isCheckingOut,
  error,
}) => {
  const subtotal = cart.reduce((sum, item) => sum + item.sellingPrice * item.quantity, 0);
  const numericDiscount = Number(discount) || 0;
  const total = Math.max(subtotal - numericDiscount, 0);
  const numericPaid = Number(paidAmount) || 0;
  const due = Math.max(total - numericPaid, 0);

  return (
    <div className="flex h-full flex-col rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-800">Cart ({cart.length})</h2>
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
              <li key={item._id} className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">{item.name}</p>
                  <p className="text-xs text-slate-400">
                    {item.sku} · {formatCurrency(item.sellingPrice)} each
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onDecrease(item._id)}
                      className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-300 text-slate-500 hover:bg-slate-50"
                      aria-label="Decrease quantity"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="w-6 text-center text-sm font-medium text-slate-700">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => onIncrease(item._id)}
                      disabled={item.quantity >= item.stock}
                      className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-300 text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="Increase quantity"
                      title={item.quantity >= item.stock ? `Only ${item.stock} in stock` : undefined}
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-800">
                    {formatCurrency(item.sellingPrice * item.quantity)}
                  </p>
                  <button
                    type="button"
                    onClick={() => onRemove(item._id)}
                    className="mt-1 text-slate-400 hover:text-red-500"
                    aria-label="Remove item"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-3 border-t border-slate-200 px-4 py-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Customer</label>
          <CustomerPicker value={customer} onChange={onCustomerChange} />
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
            <span>Total</span>
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
          onClick={onCheckout}
          disabled={cart.length === 0 || isCheckingOut}
          className="w-full rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isCheckingOut ? 'Processing...' : `Checkout — ${formatCurrency(total)}`}
        </button>
      </div>
    </div>
  );
};

export default CartPanel;
