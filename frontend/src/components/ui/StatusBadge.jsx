const statusStyles = {
  active: 'bg-emerald-100 text-emerald-700',
  inactive: 'bg-slate-200 text-slate-600',
};

/**
 * Small colored pill for an active/inactive style status field.
 * Reusable wherever future modules (Products, Suppliers, ...) show status.
 */
const StatusBadge = ({ status }) => (
  <span
    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
      statusStyles[status] || 'bg-slate-100 text-slate-600'
    }`}
  >
    {status}
  </span>
);

export default StatusBadge;
