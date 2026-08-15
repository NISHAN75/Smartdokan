import { useMemo, useState } from 'react';
import { Search, PackageX } from 'lucide-react';

import { useInventory } from '../hooks/useInventory';
import { useCreateSale } from '../hooks/useSales';
import CartPanel from '../components/sales/CartPanel';
import SaleInvoiceModal from '../components/sales/SaleInvoiceModal';
import Toast from '../components/ui/Toast';

const formatCurrency = (value) => `৳${Number(value ?? 0).toFixed(2)}`;

/**
 * POS screen. Left: searchable product list (reuses the Inventory
 * aggregation via useInventory, since that's the existing source of
 * truth for current stock — no separate stock calculation here).
 * Right: cart + customer + payment + checkout (CartPanel).
 */
const SalesPOS = () => {
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]); // [{ _id, name, sku, sellingPrice, stock, quantity }]
  const [customer, setCustomer] = useState(null);
  const [discount, setDiscount] = useState('0');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paidAmount, setPaidAmount] = useState('0');
  const [checkoutError, setCheckoutError] = useState('');
  const [toast, setToast] = useState(null);
  const [invoiceSale, setInvoiceSale] = useState(null);

  const inventoryParams = useMemo(
    () => ({ search, status: 'active', stockStatus: undefined, limit: 24, sort: 'name' }),
    [search]
  );
  const { data, isLoading, isError } = useInventory(inventoryParams);
  const products = data?.data || [];

  const createSale = useCreateSale();

  const addToCart = (product) => {
    if (product.stock <= 0) return;
    setCart((prev) => {
      const existing = prev.find((item) => item._id === product._id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
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
          sellingPrice: product.sellingPrice,
          stock: product.stock,
          quantity: 1,
        },
      ];
    });
  };

  const increaseQty = (productId) => {
    setCart((prev) =>
      prev.map((item) =>
        item._id === productId && item.quantity < item.stock
          ? { ...item, quantity: item.quantity + 1 }
          : item
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

  const removeItem = (productId) => {
    setCart((prev) => prev.filter((item) => item._id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setCustomer(null);
    setDiscount('0');
    setPaidAmount('0');
    setPaymentMethod('cash');
    setCheckoutError('');
  };

  const handleCheckout = async () => {
    setCheckoutError('');

    if (cart.length === 0) {
      setCheckoutError('Cart is empty — add at least one product');
      return;
    }

    try {
      const sale = await createSale.mutateAsync({
        customerId: customer?._id || null,
        items: cart.map((item) => ({ productId: item._id, quantity: item.quantity })),
        discount: Number(discount) || 0,
        paidAmount: Number(paidAmount) || 0,
        paymentMethod,
      });

      setInvoiceSale(sale);
      setToast({ type: 'success', message: `Sale ${sale.invoiceNumber} completed` });
      clearCart();
    } catch (err) {
      setCheckoutError(err.response?.data?.message || 'Checkout failed. Please try again.');
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
                const outOfStock = product.stock <= 0;
                const inCart = cart.find((item) => item._id === product._id);
                const atMaxQty = inCart && inCart.quantity >= product.stock;
                return (
                  <button
                    key={product._id}
                    type="button"
                    onClick={() => addToCart(product)}
                    disabled={outOfStock || atMaxQty}
                    className="flex flex-col items-start rounded-lg border border-slate-200 p-3 text-left transition hover:border-indigo-300 hover:bg-indigo-50/50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <p className="line-clamp-2 text-sm font-medium text-slate-800">
                      {product.name}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">{product.sku}</p>
                    <div className="mt-2 flex w-full items-center justify-between">
                      <span className="text-sm font-semibold text-indigo-600">
                        {formatCurrency(product.sellingPrice)}
                      </span>
                      <span
                        className={`text-xs font-medium ${
                          outOfStock ? 'text-red-500' : 'text-slate-400'
                        }`}
                      >
                        {outOfStock ? 'Out of stock' : `${product.stock} ${product.unit || 'pcs'}`}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right: cart + customer + payment + checkout */}
      <div className="w-full lg:w-96">
        <CartPanel
          cart={cart}
          onIncrease={increaseQty}
          onDecrease={decreaseQty}
          onRemove={removeItem}
          onClear={clearCart}
          customer={customer}
          onCustomerChange={setCustomer}
          discount={discount}
          onDiscountChange={setDiscount}
          paymentMethod={paymentMethod}
          onPaymentMethodChange={setPaymentMethod}
          paidAmount={paidAmount}
          onPaidAmountChange={setPaidAmount}
          onCheckout={handleCheckout}
          isCheckingOut={createSale.isPending}
          error={checkoutError}
        />
      </div>

      <SaleInvoiceModal
        open={!!invoiceSale}
        onClose={() => setInvoiceSale(null)}
        sale={invoiceSale}
      />

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
};

export default SalesPOS;
