import { Routes, Route, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import StoreProducts from './pages/StoreProducts';
import StoreOrders from './pages/StoreOrders';
import StoreSettings from './pages/StoreSettings';
import StoreSubscription from './pages/StoreSubscription';
import AddEditProduct from './pages/AddEditProduct';
import Storefront from './pages/Storefront';
import ProductPage from './pages/ProductPage';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import MyOrders from './pages/MyOrders';
import OrderDetail from './pages/OrderDetail';
import Profile from './pages/Profile';
import AdminDashboard from './pages/AdminDashboard';
import AdminUsers from './pages/AdminUsers';
import AdminStores from './pages/AdminStores';

function LangDir() {
  const { i18n } = useTranslation();
  useEffect(() => {
    document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);
  return null;
}

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  return (
    <>
      <LangDir />
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="store/:slug" element={<Storefront />} />
          <Route path="store/:slug/product/:productId" element={<ProductPage />} />
          <Route path="store/:slug/cart" element={<Cart />} />
          <Route path="store/:storeId/checkout" element={<Checkout />} />
          <Route
            path="dashboard"
            element={
              <ProtectedRoute roles={['store_owner']}>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="dashboard/products/:storeId"
            element={
              <ProtectedRoute roles={['store_owner']}>
                <StoreProducts />
              </ProtectedRoute>
            }
          />
          <Route
            path="dashboard/products/:storeId/new"
            element={
              <ProtectedRoute roles={['store_owner']}>
                <AddEditProduct />
              </ProtectedRoute>
            }
          />
          <Route
            path="dashboard/products/:storeId/edit/:productId"
            element={
              <ProtectedRoute roles={['store_owner']}>
                <AddEditProduct />
              </ProtectedRoute>
            }
          />
          <Route
            path="dashboard/orders/:storeId"
            element={
              <ProtectedRoute roles={['store_owner']}>
                <StoreOrders />
              </ProtectedRoute>
            }
          />
          <Route
            path="dashboard/settings/:storeId"
            element={
              <ProtectedRoute roles={['store_owner']}>
                <StoreSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="dashboard/subscription/:storeId"
            element={
              <ProtectedRoute roles={['store_owner']}>
                <StoreSubscription />
              </ProtectedRoute>
            }
          />
          <Route
            path="orders"
            element={
              <ProtectedRoute>
                <MyOrders />
              </ProtectedRoute>
            }
          />
          <Route
            path="orders/:orderId"
            element={
              <ProtectedRoute>
                <OrderDetail />
              </ProtectedRoute>
            }
          />
          <Route
            path="profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="admin"
            element={
              <ProtectedRoute roles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="admin/users"
            element={
              <ProtectedRoute roles={['admin']}>
                <AdminUsers />
              </ProtectedRoute>
            }
          />
          <Route
            path="admin/stores"
            element={
              <ProtectedRoute roles={['admin']}>
                <AdminStores />
              </ProtectedRoute>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
