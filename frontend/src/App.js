










import React, { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from './router';
import './App.css';
import CartProvider from './context/cart/CartProvider';
import { AdminAuthProvider } from './context/AdminAuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { buildStorefrontPath, normalizeStoreName } from './utils/storefrontRoutes';
import axiosInstance from './api/axios';


import DashboardRouteLoading from './components/dashboard/DashboardRouteLoading';

const LandingPage                = lazy(() => import('./pages/LandingPage'));
const StoreOwnerLoginPage        = lazy(() => import('./pages/StoreOwnerLoginPage'));
const StoreOwnerRegisterPage     = lazy(() => import('./pages/StoreOwnerRegisterPage'));
const CustomerLoginPage          = lazy(() => import('./pages/CustomerLoginPage'));
const CustomerRegisterPage       = lazy(() => import('./pages/CustomerRegisterPage'));
const StoreOwnerDashboardLayout  = lazy(() => import('./pages/StoreOwnerDashboardLayout'));



const AdminLoginPage            = lazy(() => import('./pages/admin/AdminLoginPage'));
const AdminProtectedRoute       = lazy(() => import('./components/admin/AdminProtectedRoute'));
const AdminLayout               = lazy(() => import('./components/admin/AdminLayout'));
const AdminDashboard            = lazy(() => import('./pages/admin/AdminDashboard'));
const ManageUsers               = lazy(() => import('./pages/admin/ManageUsers'));
const StoreOwnersAndStores      = lazy(() => import('./pages/admin/StoreOwnersAndStores'));
const StoreDetails              = lazy(() => import('./pages/admin/StoreDetails'));
const PlatformSettings          = lazy(() => import('./pages/admin/PlatformSettings'));
const AdminOperationsPage       = lazy(() => import('./pages/admin/AdminOperationsPage'));
const AdminErrorHandlingLayout = lazy(() => import('./pages/admin/AdminErrorHandlingLayout'));
const AdminErrorHandlingHubPage = lazy(() => import('./pages/admin/AdminErrorHandlingHubPage'));
const AdminErrorHandlingFailedPaymentsPage = lazy(() => import('./pages/admin/AdminErrorHandlingFailedPaymentsPage'));
const AdminErrorHandlingStoreBillingPage = lazy(() => import('./pages/admin/AdminErrorHandlingStoreBillingPage'));
const AdminErrorHandlingDeliveryPage = lazy(() => import('./pages/admin/AdminErrorHandlingDeliveryPage'));
const AdminErrorHandlingCustomerRequestsPage = lazy(() => import('./pages/admin/AdminErrorHandlingCustomerRequestsPage'));


const StoreSuspendedPage         = lazy(() => import('./pages/StoreSuspendedPage'));
const StoreSetupPage            = lazy(() => import('./pages/StoreSetupPage'));


const StorefrontPage            = lazy(() => import('./pages/StorefrontPage'));
const ProductDetailsPage        = lazy(() => import('./pages/ProductDetailsPage'));
const CartPage                  = lazy(() => import('./pages/CartPage'));
const CheckoutPage              = lazy(() => import('./pages/CheckoutPage'));
const PaymentResultPage         = lazy(() => import('./pages/PaymentResultPage'));
const ProfileSettings           = lazy(() => import('./pages/ProfileSettings'));
const CustomerOrderHistoryPage  = lazy(() => import('./pages/CustomerOrderHistoryPage'));
const CustomerOrderDetailsPage  = lazy(() => import('./pages/CustomerOrderDetailsPage'));


const DashboardHome             = lazy(() => import('./pages/dashboard/DashboardHome'));
const ProductsList              = lazy(() => import('./pages/dashboard/ProductsList'));
const AddProductPage            = lazy(() => import('./pages/dashboard/AddProductPage'));
const EditProductPage           = lazy(() => import('./pages/dashboard/EditProductPage'));
const OrdersList                = lazy(() => import('./pages/dashboard/OrdersList'));
const OrderDetailPage           = lazy(() => import('./pages/dashboard/OrderDetailPage'));
const ReportsPage               = lazy(() => import('./pages/dashboard/ReportsPage'));
const StoreManagementPage       = lazy(() => import('./pages/dashboard/StoreManagementPage'));
const StoreInfoPage             = lazy(() => import('./pages/dashboard/StoreInfoPage'));
const BrandingAppearancePage    = lazy(() => import('./pages/dashboard/BrandingAppearancePage'));
const DomainSettingsPage        = lazy(() => import('./pages/dashboard/DomainSettingsPage'));
const PaymentProvidersPage      = lazy(() => import('./pages/dashboard/PaymentProvidersPage'));
const ShippingProvidersPage     = lazy(() => import('./pages/dashboard/ShippingProvidersPage'));
const StoreFooterPage           = lazy(() => import('./pages/dashboard/StoreFooterPage'));
const CustomersManagementPage   = lazy(() => import('./pages/dashboard/CustomersManagementPage'));
const CustomerDetailPage        = lazy(() => import('./pages/dashboard/CustomerDetailPage'));
const SubscriptionPage          = lazy(() => import('./pages/dashboard/SubscriptionPage'));
const SettingsPage              = lazy(() => import('./pages/dashboard/SettingsPage'));
const GoLivePage                = lazy(() => import('./pages/dashboard/GoLivePage'));
const StorePreviewPage          = lazy(() => import('./pages/StorePreviewPage'));


const PageLoader = () => (
  <div
    style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f9fafb',
      gap: '16px',
    }}
  >
    <img
      src="/Name_only.png"
      alt="StoreLaunch"
      style={{ height: '40px', objectFit: 'contain', opacity: 0.85 }}
    />
    <div
      style={{
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        border: '3px solid #e5e7eb',
        borderTopColor: '#1FAE77',
        animation: 'spin 0.8s linear infinite',
      }}
    />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

const LegacyShopRedirect = () => {
  const location = useLocation();
  const remainder = location.pathname.replace(/^\/shop\/?/, '');
  const path = remainder ? `/${remainder}` : '/';
  return <Navigate to={`${path}${location.search}`} replace />;
};

const LegacyCustomerRouteRedirect = () => {
  const { storeSlug = '*' } = useParams();
  const location = useLocation();
  const normalizedStore = normalizeStoreName(storeSlug);
  const remainder = location.pathname.replace(new RegExp(`^/${storeSlug}/customer/?`), '');
  const destination = buildStorefrontPath(normalizedStore, remainder);
  return <Navigate to={`${destination}${location.search}`} replace />;
};

const useCanonicalStoreRedirect = () => {
  const location = useLocation();
  const { storeSlug = '' } = useParams();
  const normalizedStore = normalizeStoreName(storeSlug);
  if (storeSlug !== normalizedStore) {
    const canonicalPath = location.pathname.replace(`/${storeSlug}`, `/${normalizedStore}`);
    return `${canonicalPath}${location.search}`;
  }
  return null;
};

const StoreRouteGate = ({ element }) => {
  const redirectTo = useCanonicalStoreRedirect();
  return redirectTo ? <Navigate to={redirectTo} replace /> : element;
};

const AdvancedPlanRoute = ({ element, redirectTo = '/dashboard/subscription' }) => {
  const [status, setStatus] = useState(() => {
    // Attempt to resolve synchronously from the cache module
    // fetchSubscriptionPlan is async, but memCache/sessionStorage reads are sync-accessible
    // via a separate sync helper exported below
    try {
      const raw = sessionStorage.getItem('sl_subscription_plan');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Date.now() < parsed.expiresAt) {
          return { checking: false, allowed: parsed.plan === 'advanced' };
        }
      }
    } catch {}
    return { checking: true, allowed: false };
  });

  useEffect(() => {
    if (!status.checking) return;
    let cancelled = false;
    import('./utils/subscriptionCache').then(({ fetchSubscriptionPlan }) => {
      fetchSubscriptionPlan().then((plan) => {
        if (!cancelled) setStatus({ checking: false, allowed: plan === 'advanced' });
      });
    });
    return () => { cancelled = true; };
  }, []);

  if (status.checking) return <DashboardRouteLoading />;
  if (!status.allowed) return <Navigate to={redirectTo} replace />;
  return element;
};

function App() {
  return (
    
    
    <BrowserRouter>
      <CartProvider>
      <AdminAuthProvider>
      {}
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {}
          <Route path="/" element={<LandingPage />} />

          {}
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route
            path="/admin/dashboard"
            element={
              <AdminProtectedRoute>
                <AdminLayout />
              </AdminProtectedRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<ManageUsers />} />
            <Route path="ModerateStores" element={<StoreOwnersAndStores />} />
            <Route path="stores" element={<Navigate to="/admin/dashboard/ModerateStores" replace />} />
            <Route path="stores/:id" element={<StoreDetails />} />
            <Route path="operations" element={<AdminOperationsPage />} />
            <Route path="error-handling" element={<AdminErrorHandlingLayout />}>
              <Route index element={<AdminErrorHandlingHubPage />} />
              <Route path="failed-payments" element={<AdminErrorHandlingFailedPaymentsPage />} />
              <Route path="store-billing" element={<AdminErrorHandlingStoreBillingPage />} />
              <Route path="delivery" element={<AdminErrorHandlingDeliveryPage />} />
              <Route path="customer-requests" element={<AdminErrorHandlingCustomerRequestsPage />} />
            </Route>
            <Route path="monitoring" element={<Navigate to="/admin/dashboard/error-handling" replace />} />
            <Route
              path="monitoring/failed-payments"
              element={<Navigate to="/admin/dashboard/error-handling/failed-payments" replace />}
            />
            <Route
              path="monitoring/store-billing"
              element={<Navigate to="/admin/dashboard/error-handling/store-billing" replace />}
            />
            <Route path="monitoring/delivery" element={<Navigate to="/admin/dashboard/error-handling/delivery" replace />} />
            <Route
              path="monitoring/messages"
              element={<Navigate to="/admin/dashboard/error-handling/customer-requests" replace />}
            />
            <Route path="platform" element={<PlatformSettings />} />
          </Route>

          {}
          <Route path="/login" element={<StoreOwnerLoginPage />} />
          <Route path="/register" element={<StoreOwnerRegisterPage />} />

          {}
          <Route path="/customer/login" element={<CustomerLoginPage />} />
          <Route path="/customer/register" element={<CustomerRegisterPage />} />
          <Route path="/customer/settings" element={<ProfileSettings />} />
          <Route path="/customer/orders" element={<CustomerOrderHistoryPage />} />
          <Route path="/customer/orders/:orderId" element={<CustomerOrderDetailsPage />} />

          {}
          <Route path="/shop/*" element={<LegacyShopRedirect />} />

          {}
          <Route path="/:storeSlug/customer/*" element={<LegacyCustomerRouteRedirect />} />

          <Route
            path="/:storeSlug"
            element={<StoreRouteGate element={<StorefrontPage />} />}
          />
          <Route
            path="/:storeSlug/product/:id"
            element={<StoreRouteGate element={<ProductDetailsPage />} />}
          />
          <Route
            path="/:storeSlug/cart"
            element={<StoreRouteGate element={<CartPage />} />}
          />
          <Route
            path="/:storeSlug/checkout"
            element={<StoreRouteGate element={<CheckoutPage />} />}
          />
          <Route
            path="/:storeSlug/payment/result"
            element={<StoreRouteGate element={<PaymentResultPage />} />}
          />
          <Route
            path="/:storeSlug/login"
            element={<StoreRouteGate element={<CustomerLoginPage />} />}
          />
          <Route
            path="/:storeSlug/register"
            element={<StoreRouteGate element={<CustomerRegisterPage />} />}
          />
          <Route
            path="/:storeSlug/settings"
            element={<StoreRouteGate element={<ProfileSettings />} />}
          />
          <Route
            path="/:storeSlug/orders"
            element={<StoreRouteGate element={<CustomerOrderHistoryPage />} />}
          />
          <Route
            path="/:storeSlug/orders/:orderId"
            element={<StoreRouteGate element={<CustomerOrderDetailsPage />} />}
          />

          {}
          <Route
            path="/store-setup/:step?"
            element={
              <ProtectedRoute>
                <StoreSetupPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/store-suspended"
            element={
              <ProtectedRoute>
                <StoreSuspendedPage />
              </ProtectedRoute>
            }
          />
          {}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <StoreOwnerDashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardHome />} />
            <Route path="products" element={<ProductsList />} />
            <Route path="products/new" element={<AddProductPage />} />
            <Route path="products/:id/edit" element={<EditProductPage />} />
            <Route path="orders" element={<OrdersList />} />
            <Route path="orders/:id" element={<OrderDetailPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="store" element={<StoreManagementPage />} />
            <Route path="store/info" element={<StoreInfoPage />} />
            <Route path="store/branding" element={<BrandingAppearancePage />} />
            <Route path="store/domain" element={<AdvancedPlanRoute element={<DomainSettingsPage />} />} />
            <Route path="store/payments" element={<PaymentProvidersPage />} />
            <Route path="store/shipping" element={<ShippingProvidersPage />} />
            <Route path="store/footer" element={<StoreFooterPage />} />
            <Route path="store/customers" element={<CustomersManagementPage />} />
            <Route path="store/customers/:customerId" element={<CustomerDetailPage />} />
            <Route path="subscription" element={<SubscriptionPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="go-live" element={<GoLivePage />} />
          </Route>
          <Route
            path="/store-preview/:storeId"
            element={
              <ProtectedRoute>
                <StorePreviewPage />
              </ProtectedRoute>
            }
          />
          {}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      </AdminAuthProvider>
      </CartProvider>
    </BrowserRouter>
  );
}

export default App;
