import { useMemo, useState } from 'react';
import { Search, PackageX } from 'lucide-react';

import { useInventory } from '../hooks/useInventory';
import { useCreatePurchase } from '../hooks/usePurchases';
import PurchaseCart from '../components/purchases/PurchaseCart';
import PurchaseInvoiceModal from '../components/purchases/PurchaseInvoiceModal';
import Toast from '../components/ui/Toast';

const formatCurrency = (value) => `৳${Number(value ?? 0).toFixed(2)}`;

/**
 * Create Purchase screen. Left: searchable product list (reuses the
 * Inventory aggregation via useInventory — same source of truth for
 * current stock and default purchase price that Sales/POS already
 * uses, no separate product-lookup endpoint). Right: cart + supplier +
 * discount + payment + confirm (PurchaseCart). Mirrors SalesPOS, with
 * the key differences that a purchase price is editable per line and
 * quantity has no stock ceiling (buying adds stock, it doesn't consume it).
 */
const CreatePurchase = () => {
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]); // [{ _id, name, sku, purchasePrice, quantity }]
  const [supplier, setSupplier] = useState(null);
  const [discount, setDiscount] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paidAmount, setPaidAmount] = useState('0');
  const [note, setNote] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [toast, setToast] = useState(null);
  const [invoicePurchase, setInvoicePurchase] = useState(null);

  const inventoryParams = useMemo(
    () => ({ search, limit: 24, sort: 'name' }),
    [search]
  );
  const { data, isLoading, isError } = useInventory(inventoryParams);
  const products = data?.data || [];

  const createPurchase = useCreatePurchase();

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item._id === product._id);
      if (existing) {
        return prev.map((item) =>
          item._id === product._id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [
        ...prev,
        {
          _id: product._id,
          name: product.name,
          sku: product.sku,
          // Kept as a string (not coerced to Number on every keystroke),
          // same reasoning as discount/paidAmount below — avoids fighting
          // the user mid-edit while typing decimals (e.g. "12.50").
          purchasePrice: String(product.purchasePrice ?? 0),
          stock: product.stock,
          quantity: 1,
        },
      ];
    });
  };

  const increaseQty = (productId) => {
    setCart((prev) =>
      prev.map((item) =>
        item._id === productId ? { ...item, quantity: item.quantity + 1 } : item
      )
    );
  };

  const decreaseQty = (productId) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item._id === productId ? { ...item, quantity: item.quantity - 1 } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const handleQuantityChange = (productId, rawValue) => {
    const quantity = Math.floor(Number(rawValue));
    setCart((prev) =>
      prev.map((item) =>
        item._id === productId
          ? { ...item, quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1 }
          : item
      )
    );
  };

  const handlePriceChange = (productId, rawValue) => {
    setCart((prev) =>
      prev.map((item) => (item._id === productId ? { ...item, purchasePrice: rawValue } : item))
    );
  };

  const removeItem = (productId) => {
    setCart((prev) => prev.filter((item) => item._id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setSupplier(null);
    setDiscount('0');
    setPaidAmount('0');
    setPaymentMethod('cash');
    setNote('');
    setConfirmError('');
  };

  const handleConfirm = async () => {
    setConfirmError('');

    if (cart.length === 0) {
      setConfirmError('Purchase cart is empty — add at least one product');
      return;
    }
    if (!supplier) {
      setConfirmError('Please select a supplier');
      return;
    }
    const invalidPriceItem = cart.find((item) => {
      const price = Number(item.purchasePrice);
      return !Number.isFinite(price) || price < 0;
    });
    if (invalidPriceItem) {
      setConfirmError(`Enter a valid purchase price for "${invalidPriceItem.name}"`);
      return;
    }

    try {
      const purchase = await createPurchase.mutateAsync({
        supplierId: supplier._id,
        items: cart.map((item) => ({
          productId: item._id,
          quantity: item.quantity,
          purchasePrice: Number(item.purchasePrice) || 0,
        })),
        discount: Number(discount) || 0,
        paidAmount: Number(paidAmount) || 0,
        paymentMethod,
        note,
      });

      setInvoicePurchase(purchase);
      setToast({ type: 'success', message: `Purchase ${purchase.purchaseNumber} recorded` });
      clearCart();
    } catch (err) {
      setConfirmError(err.response?.data?.message || 'Could not record purchase. Please try again.');
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4 lg:flex-row">
      {/* Left: product search */}
      <div className="flex flex-1 flex-col rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by product name, SKU, or scan barcode..."
              autoFocus
              className="w-full rounded-md border border-slate-300 py-2.5 pl-9 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <p className="py-10 text-center text-sm text-slate-400">Loading products...</p>
          ) : isError ? (
            <p className="py-10 text-center text-sm text-red-500">
              Couldn&apos;t load products. Please try again.
            </p>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-slate-400">
              <PackageX size={28} />
              <p className="text-sm">No products found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => {
                const inCart = cart.find((item) => item._id === product._id);
                return (
                  <button
                    key={product._id}
                    type="button"
                    onClick={() => addToCart(product)}
                    className="flex flex-col items-start rounded-lg border border-slate-200 p-3 text-left transition hover:border-indigo-300 hover:bg-indigo-50/50"
                  >
                    <p className="line-clamp-2 text-sm font-medium text-slate-800">
                      {product.name}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">{product.sku}</p>
                    <div className="mt-2 flex w-full items-center justify-between">
                      <span className="text-sm font-semibold text-indigo-600">
                        {formatCurrency(product.purchasePrice)}
                      </span>
                      <span className="text-xs font-medium text-slate-400">
                        Stock: {product.stock} {product.unit || 'pcs'}
                      </span>
                    </div>
                    {inCart && (
                      <span className="mt-1.5 rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-medium text-indigo-600">
                        In cart · {inCart.quantity}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right: cart + supplier + payment + confirm */}
      <div className="w-full lg:w-96">
        <PurchaseCart
          cart={cart}
          onIncrease={increaseQty}
          onDecrease={decreaseQty}
          onQuantityChange={handleQuantityChange}
          onPriceChange={handlePriceChange}
          onRemove={removeItem}
          onClear={clearCart}
          supplier={supplier}
          onSupplierChange={setSupplier}
          discount={discount}
          onDiscountChange={setDiscount}
          paymentMethod={paymentMethod}
          onPaymentMethodChange={setPaymentMethod}
          paidAmount={paidAmount}
          onPaidAmountChange={setPaidAmount}
          note={note}
          onNoteChange={setNote}
          onConfirm={handleConfirm}
          isConfirming={createPurchase.isPending}
          error={confirmError}
        />
      </div>

      <PurchaseInvoiceModal
        open={!!invoicePurchase}
        onClose={() => setInvoicePurchase(null)}
        purchase={invoicePurchase}
      />

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
};

export default CreatePurchase;
