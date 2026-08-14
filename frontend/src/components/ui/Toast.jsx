import { useEffect } from 'react';
import { CheckCircle2, XCircle, X } from 'lucide-react';

/**
 * Lightweight, self-dismissing success/error toast. Controlled by the
 * parent (pass `toast` = { type, message } or null, plus onDismiss).
 * No global provider/context — fine at this scale and keeps the
 * pattern easy to reuse for any future page without wiring anything up.
 */
const Toast = ({ toast, onDismiss }) => {
  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(onDismiss, 3500);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast) return null;

  const isError = toast.type === 'error';

  return (
    <div className="fixed bottom-4 right-4 z-50 flex max-w-sm items-start gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-lg">
      {isError ? (
        <XCircle size={18} className="mt-0.5 shrink-0 text-red-500" />
      ) : (
        <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-500" />
      )}
      <p className="text-sm text-slate-700">{toast.message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="ml-auto shrink-0 text-slate-400 hover:text-slate-600"
        aria-label="Dismiss notification"
      >
        <X size={14} />
      </button>
    </div>
  );
};

export default Toast;
