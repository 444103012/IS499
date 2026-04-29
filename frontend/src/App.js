import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import StoreOwnerLoginPage from './pages/StoreOwnerLoginPage';
import StoreOwnerRegisterPage from './pages/StoreOwnerRegisterPage';
import StoreOwnerDashboardLayout from './pages/StoreOwnerDashboardLayout';
import StoreSetupPage from './pages/StoreSetupPage';
import CustomerLoginPage from './pages/CustomerLoginPage';
import CustomerRegisterPage from './pages/CustomerRegisterPage';
import StorefrontPage from './pages/StorefrontPage';
import ProductDetailsPage from './pages/ProductDetailsPage';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardHome from './pages/dashboard/DashboardHome';
import ProductsList from './pages/dashboard/ProductsList';
import AddProductPage from './pages/dashboard/AddProductPage';
import EditProductPage from './pages/dashboard/EditProductPage';
import ReportsPage from './pages/dashboard/ReportsPage';
import StoreManagementPage from './pages/dashboard/StoreManagementPage';
import SubscriptionPage from './pages/dashboard/SubscriptionPage';
import SettingsPage from './pages/dashboard/SettingsPage';
import OrdersPage from './pages/dashboard/OrdersPage';
import OrdersList from './pages/dashboard/OrdersList';
import OrderDetailPage from './pages/dashboard/OrderDetailPage';
import StoreInfoPage from './pages/dashboard/StoreInfoPage';
import BrandingAppearancePage from './pages/dashboard/BrandingAppearancePage';
import DomainSettingsPage from './pages/dashboard/DomainSettingsPage';
import PaymentProvidersPage from './pages/dashboard/PaymentProvidersPage';
import ShippingProvidersPage from './pages/dashboard/ShippingProvidersPage';
import StorePoliciesPage from './pages/dashboard/StorePoliciesPage';
import StoreFooterPage from './pages/dashboard/StoreFooterPage';
import StoreDeleteAccountPage from './pages/dashboard/StoreDeleteAccountPage';
import CustomersManagementPage from './pages/dashboard/CustomersManagementPage';



function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>}>
        <Routes>
          <Route path="/" element={<LandingPage />} />

          <Route path="/login" element={<StoreOwnerLoginPage />} />
          <Route path="/register" element={<StoreOwnerRegisterPage />} />

          <Route path="/customer/login" element={<CustomerLoginPage />} />
          <Route path="/customer/register" element={<CustomerRegisterPage />} />

          <Route path="/shop" element={<StorefrontPage />} />
          <Route path="/shop/product/:id" element={<ProductDetailsPage />} />
 <Route path="/:storeSlug/customer" element={<StorefrontPage />} />
          <Route path="/:storeSlug/customer/product/:id" element={<ProductDetailsPage />} />
          <Route path="/:storeSlug/customer/login" element={<CustomerLoginPage />} />
          <Route path="/:storeSlug/customer/register" element={<CustomerRegisterPage />} />
          <Route
            path="/store-setup/:step?"
            element={
              <ProtectedRoute>
                <StoreSetupPage />
              </ProtectedRoute>
            }
          />
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
            <Route path="store/domain" element={<DomainSettingsPage />} />
            <Route path="store/payments" element={<PaymentProvidersPage />} />
            <Route path="store/shipping" element={<ShippingProvidersPage />} />
            <Route path="store/policies" element={<StorePoliciesPage />} />
            <Route path="store/footer" element={<StoreFooterPage />} />
            <Route path="store/delete-account" element={<StoreDeleteAccountPage />} />
            <Route path="store/customers" element={<CustomersManagementPage />} />
            <Route path="subscription" element={<SubscriptionPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
