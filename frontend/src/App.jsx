import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Categories from './pages/Categories';

// Minimal placeholder screens outside the dashboard shell.
const AdminOnly = () => <div className="p-8">Admin-only area</div>;
const Unauthorized = () => (
  <div className="p-8 text-red-600">You don&apos;t have access to this page.</div>
);

const App = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* Any authenticated user — shares the sidebar/navbar shell */}
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/categories" element={<Categories />} />
          {/* Products, Inventory, Sales, Purchases, Customers,
              Suppliers, Expenses, Reports, Settings routes are added here
              as each of those modules is built. The sidebar already links
              to their paths. */}
        </Route>
      </Route>

      {/* Role-restricted example */}
      <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
        <Route path="/admin" element={<AdminOnly />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default App;
