import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Simple prev/next pagination footer with an item-range summary.
 * Reusable for any future paginated list (Products, Customers, ...).
 */
const Pagination = ({ page, pages, total, limit, onPageChange }) => {
  if (!total) return null;

  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row">
      <p className="text-xs text-slate-500">
        Showing {start}-{end} of {total}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft size={14} />
          Prev
        </button>
        <span className="text-xs text-slate-500">
          Page {page} of {pages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pages}
          className="flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
