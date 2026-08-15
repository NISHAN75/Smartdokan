import { Printer } from 'lucide-react';
import Modal from '../ui/Modal';
import PurchaseInvoice from './PurchaseInvoice';

/**
 * Shared invoice/receipt modal — reused as-is for the "just confirmed"
 * receipt on the Create Purchase screen and for viewing a past
 * purchase's details from Purchase History, rather than building two
 * separate views. Mirrors SaleInvoiceModal.
 */
const PurchaseInvoiceModal = ({ open, onClose, purchase }) => {
  if (!purchase) return null;

  const handlePrint = () => window.print();

  return (
    <Modal open={open} onClose={onClose} title="Purchase Invoice" maxWidth="max-w-lg">
      <PurchaseInvoice purchase={purchase} />

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

export default PurchaseInvoiceModal;
