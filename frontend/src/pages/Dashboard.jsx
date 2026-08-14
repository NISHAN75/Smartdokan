import { TrendingUp, TrendingDown, Minus, LineChart } from 'lucide-react';
import useAuth from '../hooks/useAuth';
import { mockSummaryStats } from '../data/mockDashboardStats';

const trendIcon = {
  up: TrendingUp,
  down: TrendingDown,
  neutral: Minus,
};

const trendColor = {
  up: 'text-emerald-600',
  down: 'text-red-500',
  neutral: 'text-slate-400',
};

const SummaryCard = ({ label, value, trend, trendDirection }) => {
  const TrendIcon = trendIcon[trendDirection];
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
      <div
        className={`mt-2 flex items-center gap-1 text-xs font-medium ${trendColor[trendDirection]}`}
      >
        <TrendIcon size={14} />
        <span>{trend}</span>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">
          Welcome back{user?.name ? `, ${user.name}` : ''}
        </h2>
        <p className="text-sm text-slate-500">
          Here's what's happening in your shop today.
        </p>
      </div>

      {/* Placeholder banner — remove once real stats are wired up */}
      <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-700">
        These numbers are placeholders. They'll update automatically once the
        Sales, Inventory, and Purchases modules are connected.
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {mockSummaryStats.map((stat) => (
          <SummaryCard key={stat.id} {...stat} />
        ))}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800">
            Sales Overview
          </h3>
          <span className="text-xs text-slate-400">Last 7 days</span>
        </div>
        <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-md border border-dashed border-slate-200 text-slate-400 sm:h-64">
          <LineChart size={28} />
          <p className="text-sm">Chart will appear here once Sales data is connected</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
