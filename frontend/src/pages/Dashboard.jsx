import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CircleDollarSign,
  CreditCard,
  Package,
  ShoppingCart,
  TrendingUp,
  Users,
  Truck,
  Receipt,
  RefreshCw,
} from 'lucide-react';
import useAuth from '../hooks/useAuth';
import { useDashboard } from '../hooks/useDashboard';

const money = (value) =>
  `৳ ${Number(value || 0).toLocaleString('en-BD', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const number = (value) =>
  Number(value || 0).toLocaleString('en-BD');

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleString('en-BD', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

const SummaryCard = ({
  label,
  value,
  trend,
  icon: Icon,
  iconClass = 'text-slate-600 bg-slate-100',
  helper,
}) => {
  const positive = trend > 0;
  const negative = trend < 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {value}
          </p>
        </div>

        <div className={`rounded-lg p-2 ${iconClass}`}>
          <Icon size={20} />
        </div>
      </div>

      <div className="mt-3 flex min-h-5 items-center gap-2 text-xs">
        {trend !== undefined && (
          <span
            className={`inline-flex items-center gap-1 font-semibold ${
              positive
                ? 'text-emerald-600'
                : negative
                  ? 'text-red-500'
                  : 'text-slate-400'
            }`}
          >
            {positive ? (
              <ArrowUpRight size={14} />
            ) : negative ? (
              <ArrowDownRight size={14} />
            ) : null}
            {trend > 0 ? '+' : ''}
            {trend.toFixed(1)}%
          </span>
        )}

        {helper && (
          <span className="text-slate-400">
            {helper}
          </span>
        )}
      </div>
    </div>
  );
};

const SalesChart = ({ data }) => {
  const max = Math.max(
    ...data.map((item) => Number(item.total || 0)),
    1
  );

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">
            Sales Overview
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            Last 7 days
          </p>
        </div>
        <TrendingUp size={18} className="text-emerald-500" />
      </div>

      <div className="flex h-56 items-end gap-2 sm:gap-4">
        {data.map((item) => {
          const height = Math.max(
            (Number(item.total || 0) / max) * 100,
            item.total > 0 ? 5 : 0
          );

          return (
            <div
              key={item.date}
              className="flex h-full flex-1 flex-col items-center justify-end gap-2"
            >
              <div className="relative flex h-full w-full items-end">
                <div
                  className="group relative w-full rounded-t-md bg-slate-800 transition-all hover:bg-slate-700"
                  style={{ height: `${height}%` }}
                  title={money(item.total)}
                >
                  <span className="absolute -top-7 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-[10px] text-white group-hover:block">
                    {money(item.total)}
                  </span>
                </div>
              </div>

              <span className="text-[11px] text-slate-400">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const TransactionTable = ({
  title,
  icon: Icon,
  rows,
  type,
}) => (
  <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
      <div className="flex items-center gap-2">
        <Icon size={17} className="text-slate-500" />
        <h3 className="text-sm font-semibold text-slate-800">
          {title}
        </h3>
      </div>
    </div>

    <div className="overflow-x-auto">
      {rows.length === 0 ? (
        <div className="px-4 py-10 text-center text-sm text-slate-400">
          No recent {type.toLowerCase()} found.
        </div>
      ) : (
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">
                Number
              </th>
              <th className="px-4 py-3 font-medium">
                {type === 'Sales'
                  ? 'Customer'
                  : 'Supplier'}
              </th>
              <th className="px-4 py-3 text-right font-medium">
                Total
              </th>
              <th className="px-4 py-3 font-medium">
                Status
              </th>
              <th className="px-4 py-3 font-medium">
                Date
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr
                key={row._id}
                className="hover:bg-slate-50"
              >
                <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-800">
                  {type === 'Sales'
                    ? row.invoiceNumber
                    : row.purchaseNumber}
                </td>

                <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                  {type === 'Sales'
                    ? row.customerName
                    : row.supplierName}
                </td>

                <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-slate-800">
                  {money(row.total)}
                </td>

                <td className="whitespace-nowrap px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-1 text-[11px] font-medium ${
                      row.paymentStatus === 'paid'
                        ? 'bg-emerald-50 text-emerald-700'
                        : row.paymentStatus ===
                            'partial'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-red-50 text-red-700'
                    }`}
                  >
                    {row.paymentStatus}
                  </span>
                </td>

                <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-400">
                  {formatDate(row.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  </div>
);

const Dashboard = () => {
  const { user } = useAuth();
  const { data, isLoading, isError, error, refetch } =
    useDashboard();

  const dashboard = data?.data;
  const summary = dashboard?.summary;
  const trends = dashboard?.trends;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-6 w-64 animate-pulse rounded bg-slate-200" />
          <div className="mt-2 h-4 w-80 animate-pulse rounded bg-slate-100" />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="h-32 animate-pulse rounded-xl bg-slate-100"
            />
          ))}
        </div>

        <div className="h-72 animate-pulse rounded-xl bg-slate-100" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <h2 className="font-semibold text-red-800">
          Unable to load dashboard
        </h2>
        <p className="mt-1 text-sm text-red-600">
          {error?.response?.data?.message ||
            'Something went wrong while loading dashboard data.'}
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          <RefreshCw size={15} />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">
          Welcome back{user?.name ? `, ${user.name}` : ''}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Here&apos;s what&apos;s happening in your shop today.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Today's Sales"
          value={money(summary.todaySales)}
          trend={trends.sales}
          icon={CircleDollarSign}
          iconClass="bg-emerald-50 text-emerald-600"
          helper="vs yesterday"
        />

        <SummaryCard
          label="Today's Purchase"
          value={money(summary.todayPurchases)}
          trend={trends.purchases}
          icon={ShoppingCart}
          iconClass="bg-blue-50 text-blue-600"
          helper="vs yesterday"
        />

        <SummaryCard
          label="Today's Profit"
          value={money(summary.todayProfit)}
          trend={trends.profit}
          icon={TrendingUp}
          iconClass="bg-violet-50 text-violet-600"
          helper="sales - purchase - expense"
        />

        <SummaryCard
          label="Today's Expenses"
          value={money(summary.todayExpenses)}
          trend={trends.expenses}
          icon={Receipt}
          iconClass="bg-amber-50 text-amber-600"
          helper="vs yesterday"
        />

        <SummaryCard
          label="Total Products"
          value={number(summary.totalProducts)}
          icon={Package}
          iconClass="bg-slate-100 text-slate-700"
          helper={`${number(summary.lowStockProducts)} low stock`}
        />

        <SummaryCard
          label="Customer Due"
          value={money(summary.customerDue)}
          icon={CreditCard}
          iconClass="bg-red-50 text-red-600"
          helper={`${number(summary.totalCustomers)} customers`}
        />

        <SummaryCard
          label="Supplier Due"
          value={money(summary.supplierDue)}
          icon={Truck}
          iconClass="bg-orange-50 text-orange-600"
          helper={`${number(summary.totalSuppliers)} suppliers`}
        />

        <SummaryCard
          label="Low Stock"
          value={number(summary.lowStockProducts)}
          icon={AlertTriangle}
          iconClass="bg-red-50 text-red-600"
          helper="Needs attention"
        />
      </div>

      <SalesChart data={dashboard.salesChart || []} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <TransactionTable
          title="Recent Sales"
          icon={CircleDollarSign}
          rows={dashboard.recentSales || []}
          type="Sales"
        />

        <TransactionTable
          title="Recent Purchases"
          icon={ShoppingCart}
          rows={dashboard.recentPurchases || []}
          type="Purchases"
        />
      </div>
    </div>
  );
};

export default Dashboard;
