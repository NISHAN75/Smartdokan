import { Navigate, Outlet, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

/**
 * Guards nested routes behind authentication, and optionally behind
 * specific roles.
 *
 * Usage:
 *   <Route element={<ProtectedRoute />}> ... any logged-in user </Route>
 *   <Route element={<ProtectedRoute allowedRoles={['admin']} />}> ... </Route>
 */
const ProtectedRoute = ({ allowedRoles }) => {
  const { isAuthenticated, isLoading, hasRole } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-500">
        Checking session...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRoles && !hasRole(...allowedRoles)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
