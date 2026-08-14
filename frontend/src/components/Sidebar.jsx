import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Tags,
  Boxes,
  ShoppingCart,
  Truck,
  Users,
  Building2,
  Receipt,
  BarChart3,
  Settings,
  X,
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Products', to: '/products', icon: Package },
  { label: 'Categories', to: '/categories', icon: Tags },
  { label: 'Inventory', to: '/inventory', icon: Boxes },
  { label: 'Sales / POS', to: '/sales', icon: ShoppingCart },
  { label: 'Purchases', to: '/purchases', icon: Truck },
  { label: 'Customers', to: '/customers', icon: Users },
  { label: 'Suppliers', to: '/suppliers', icon: Building2 },
  { label: 'Expenses', to: '/expenses', icon: Receipt },
  { label: 'Reports', to: '/reports', icon: BarChart3 },
  { label: 'Settings', to: '/settings', icon: Settings },
];

/**
 * Sidebar navigation. Links to modules that don't exist yet still render
 * (per the module list requirement) — React Router will simply show
 * nothing/404 until those routes are built, which is expected at this stage.
 */
const Sidebar = ({ open, onClose }) => {
  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform bg-slate-900 text-slate-200 transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-800 px-5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-500 text-sm font-bold text-slate-900">
              SD
            </div>
            <span className="text-lg font-semibold tracking-tight text-white">
              SmartDokan
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex flex-col gap-0.5 overflow-y-auto px-3 py-4">
          {navItems.map(({ label, to, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-amber-500/10 text-amber-400'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <Icon size={18} strokeWidth={2} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
