import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AdminRoute from './components/AdminRoute.jsx';
import Navbar from './components/Navbar.jsx';
import Backdrop from './components/Backdrop.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { setUnauthorizedHandler } from './api/client.js';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import MyBookings from './pages/MyBookings.jsx';
import Admin from './pages/Admin.jsx';
import ResourceDetail from './pages/ResourceDetail.jsx';
import NotFound from './pages/NotFound.jsx';

export function SessionExpiryHandler() {
  const navigate = useNavigate();
  const { setUser, logout } = useAuth();

  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (typeof setUser === 'function') {
        setUser(null);
      } else {
        logout();
      }
      navigate('/login?expired=true', {
        replace: true,
        state: { notice: 'Your session expired. Please sign in again.', expired: true },
      });
    });

    return () => {
      setUnauthorizedHandler(null);
    };
  }, [navigate, setUser, logout]);

  return null;
}

export function AppLayout() {
  return (
    <div className="min-h-screen text-ink flex flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-brand focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-brand-text"
      >
        Skip to main content
      </a>
      <Navbar />
      <main id="main-content" tabIndex={-1} className="flex-1 outline-none">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  );
}

export function AppRoutes() {
  const location = useLocation();
  const backdropVariant = location.pathname === '/login' ? 'hero' : 'app';

  return (
    <ErrorBoundary>
      <Backdrop variant={backdropVariant} />
      <SessionExpiryHandler />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/resources/:id" element={<ResourceDetail />} />
            <Route path="/my-bookings" element={<MyBookings />} />
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <Admin />
                </AdminRoute>
              }
            />
          </Route>
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
