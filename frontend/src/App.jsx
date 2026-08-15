import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Categories from './pages/Categories';
import Products from './pages/Products';
import Inventory from './pages/Inventory';
import StockMovements from './pages/StockMovements';
import SalesPOS from './pages/SalesPOS';
import SalesHistory from './pages/SalesHistory';
import CreatePurchase from './pages/CreatePurchase';
import Purchases from './pages/Purchases';
import PurchaseDetails from './pages/PurchaseDetails';
import Customers from './pages/Customers';
import Suppliers from './pages/Suppliers';
import SupplierDetails from './pages/SupplierDetails';
import Expenses from './pages/Expenses';

// Minimal placeholder screens outside the dashboard shell.
const AdminOnly = () => <div className="p-8">Admin-only area</div>;

const Unauthorized = () => (
  <div className="p-8 text-red-600">
    You don&apos;t have access to this page.
  </div>
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
          <Route path="/products" element={<Products />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/stock-movements" element={<StockMovements />} />
          <Route path="/sales" element={<SalesPOS />} />
          <Route path="/sales/history" element={<SalesHistory />} />
          <Route path="/purchases" element={<Purchases />} />
          <Route path="/purchases/new" element={<CreatePurchase />} />
          <Route path="/purchases/:id" element={<PurchaseDetails />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/suppliers" element={<Suppliers />} />
          <Route path="/suppliers/:id" element={<SupplierDetails />} />
          <Route path="/expenses" element={<Expenses />} />
  

          {/* Reports, Settings routes are added here as each module
              is built. */}
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