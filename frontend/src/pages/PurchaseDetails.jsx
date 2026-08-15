import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';

import { usePurchase } from '../hooks/usePurchases';
import PurchaseInvoice from '../components/purchases/PurchaseInvoice';

/**
 * Standalone, linkable/bookmarkable purchase details page at
 * /purchases/:id — same invoice markup as PurchaseInvoiceModal (via the
 * shared PurchaseInvoice component) but as a full page with its own
 * back link and print button, for direct navigation rather than a modal.
 */
const PurchaseDetails = () => {
  const { id } = useParams();
  const { data: purchase, isLoading, isError } = usePurchase(id);

  const handlePrint = () => window.print();

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <Link
          to="/purchases"
          className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-800"
        >
          <ArrowLeft size={16} />
          Back to Purchase History
        </Link>
        {purchase && (
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <Printer size={16} />
            Print
          </button>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        {isLoading ? (
          <p className="py-10 text-center text-sm text-slate-400">Loading purchase...</p>
        ) : isError || !purchase ? (
          <p className="py-10 text-center text-sm text-red-500">
            Couldn&apos;t load this purchase. It may not exist or you may not have access.
          </p>
        ) : (
          <PurchaseInvoice purchase={purchase} />
        )}
      </div>
    </div>
  );
};

export default PurchaseDetails;
