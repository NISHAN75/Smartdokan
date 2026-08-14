import Modal from './Modal';

/**
 * Generic "are you sure?" confirmation dialog, built on top of Modal.
 * Reusable for any future destructive action (deleting a Product,
 * Supplier, etc.), not just Category delete.
 */
const ConfirmDialog = ({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  onConfirm,
  onCancel,
  loading = false,
}) => (
  <Modal open={open} onClose={onCancel} title={title} maxWidth="max-w-sm">
    <p className="text-sm text-slate-600">{message}</p>
    <div className="mt-6 flex justify-end gap-3">
      <button
        type="button"
        onClick={onCancel}
        className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onConfirm}
        disabled={loading}
        className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-60"
      >
        {loading ? 'Deleting...' : confirmLabel}
      </button>
    </div>
  </Modal>
);

export default ConfirmDialog;
