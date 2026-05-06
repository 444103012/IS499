





import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

jest.mock('./router', () => {
  const ReactLocal = require('react');

  const normalize = (value) => String(value || '').replace(/\/+$/, '') || '/';

  const matchPath = (routePath, pathname) => {
    const route = normalize(routePath);
    const current = normalize(pathname);
    if (route === '*') return { matched: true, params: {} };

    const routeParts = route.split('/').filter(Boolean);
    const pathParts = current.split('/').filter(Boolean);
    const params = {};

    let hasWildcard = false;
    for (let i = 0, j = 0; i < routeParts.length; i += 1, j += 1) {
      const part = routeParts[i];
      if (part === '*') {
        hasWildcard = true;
        break;
      }
      if (j >= pathParts.length) return { matched: false };
      if (part.startsWith(':')) {
        params[part.slice(1)] = pathParts[j];
        continue;
      }
      if (part !== pathParts[j]) return { matched: false };
    }

    if (!hasWildcard && routeParts.length !== pathParts.length) return { matched: false };
    return { matched: true, params };
  };

  const RouterContext = ReactLocal.createContext({ params: {} });

  const BrowserRouter = ({ children }) => <>{children}</>;
  const Route = (props) => props;
  const Routes = ({ children }) => {
    const pathname = globalThis.location.pathname;
    const childArray = ReactLocal.Children.toArray(children).filter(Boolean);
    for (const child of childArray) {
      if (!child?.props?.path) continue;
      const result = matchPath(child.props.path, pathname);
      if (result.matched) {
        return (
          <RouterContext.Provider value={{ params: result.params }}>
            {child.props.element || null}
          </RouterContext.Provider>
        );
      }
    }
    return null;
  };

  const Navigate = ({ to }) => {
    globalThis.history.replaceState({}, '', to);
    return null;
  };

  const useParams = () => ReactLocal.useContext(RouterContext).params || {};
  const useLocation = () => ({ pathname: globalThis.location.pathname, search: globalThis.location.search });

  return { BrowserRouter, Routes, Route, Navigate, useLocation, useParams };
});

import App from './App';

jest.mock('./pages/LandingPage', () => () => <div>landing-page</div>);
jest.mock('./pages/StorefrontPage', () => () => <div>storefront-page</div>);
jest.mock('./pages/ProductDetailsPage', () => () => <div>product-details-page</div>);
jest.mock('./pages/CustomerLoginPage', () => () => <div>customer-login-page</div>);
jest.mock('./pages/CustomerRegisterPage', () => () => <div>customer-register-page</div>);
jest.mock('./pages/ProfileSettings', () => () => <div>profile-settings-page</div>);
jest.mock('./pages/CustomerOrderHistoryPage', () => () => <div>customer-order-history-page</div>);
jest.mock('./pages/CustomerOrderDetailsPage', () => () => <div>customer-order-details-page</div>);
jest.mock('./pages/CheckoutPage', () => () => <div>checkout-page</div>);
jest.mock('./pages/PaymentResultPage', () => () => <div>payment-result-page</div>);

jest.mock('./pages/StoreOwnerLoginPage', () => () => <div>owner-login-page</div>);
jest.mock('./pages/StoreOwnerRegisterPage', () => () => <div>owner-register-page</div>);
jest.mock('./components/ProtectedRoute', () => ({ children }) => <>{children}</>);

const lazyStub = (name) => ({ __esModule: true, default: () => <div>{name}</div> });
jest.mock('./components/admin/AdminProtectedRoute', () => lazyStub('admin-protected'));
jest.mock('./components/admin/AdminLayout', () => lazyStub('admin-layout'));
jest.mock('./pages/admin/AdminLoginPage', () => lazyStub('admin-login'));
jest.mock('./pages/admin/AdminDashboard', () => lazyStub('admin-dashboard'));
jest.mock('./pages/admin/ManageUsers', () => lazyStub('manage-users'));
jest.mock('./pages/admin/ManageStoreOwners', () => lazyStub('manage-store-owners'));
jest.mock('./pages/admin/StoresList', () => lazyStub('stores-list'));
jest.mock('./pages/admin/StoreDetails', () => lazyStub('store-details'));
jest.mock('./pages/admin/PlatformSettings', () => lazyStub('platform-settings'));
jest.mock('./pages/StoreOwnerDashboardLayout', () => lazyStub('owner-dashboard-layout'));
jest.mock('./pages/StoreSetupPage', () => lazyStub('store-setup-page'));
jest.mock('./pages/dashboard/DashboardHome', () => lazyStub('dashboard-home'));
jest.mock('./pages/dashboard/ProductsList', () => lazyStub('products-list'));
jest.mock('./pages/dashboard/AddProductPage', () => lazyStub('add-product'));
jest.mock('./pages/dashboard/EditProductPage', () => lazyStub('edit-product'));
jest.mock('./pages/dashboard/OrdersList', () => lazyStub('orders-list'));
jest.mock('./pages/dashboard/OrderDetailPage', () => lazyStub('order-detail'));
jest.mock('./pages/dashboard/ReportsPage', () => lazyStub('reports-page'));
jest.mock('./pages/dashboard/StoreManagementPage', () => lazyStub('store-management'));
jest.mock('./pages/dashboard/StoreInfoPage', () => lazyStub('store-info'));
jest.mock('./pages/dashboard/BrandingAppearancePage', () => lazyStub('branding-appearance'));
jest.mock('./pages/dashboard/DomainSettingsPage', () => lazyStub('domain-settings'));
jest.mock('./pages/dashboard/PaymentProvidersPage', () => lazyStub('payment-providers'));
jest.mock('./pages/dashboard/ShippingProvidersPage', () => lazyStub('shipping-providers'));
jest.mock('./pages/dashboard/StoreFooterPage', () => lazyStub('store-footer'));
jest.mock('./pages/dashboard/CustomersManagementPage', () => lazyStub('customers-management'));
jest.mock('./pages/dashboard/CustomerDetailPage', () => lazyStub('customer-detail'));
jest.mock('./pages/dashboard/SubscriptionPage', () => lazyStub('subscription-page'));
jest.mock('./pages/dashboard/SettingsPage', () => lazyStub('settings-page'));
jest.mock('./pages/dashboard/GoLivePage', () => lazyStub('go-live'));
jest.mock('./pages/StorePreviewPage', () => lazyStub('store-preview'));

test('loads store homepage at /{storeName}', async () => {
  window.history.pushState({}, '', '/my-store');
  render(<App />);
  expect(await screen.findByText('storefront-page')).toBeInTheDocument();
});

test('loads product page at /{storeName}/product/{id}', async () => {
  window.history.pushState({}, '', '/my-store/product/123');
  render(<App />);
  expect(await screen.findByText('product-details-page')).toBeInTheDocument();
});

test('redirects old /shop route and preserves query string', async () => {
  window.history.pushState({}, '', '/shop/my-store?search=bag&page=2');
  render(<App />);
  await waitFor(() => {
    expect(window.location.pathname).toBe('/my-store');
    expect(window.location.search).toBe('?search=bag&page=2');
  });
});

test('redirects old /shop product route and preserves query string', async () => {
  window.history.pushState({}, '', '/shop/my-store/product/55?ref=ad');
  render(<App />);
  await waitFor(() => {
    expect(window.location.pathname).toBe('/my-store/product/55');
    expect(window.location.search).toBe('?ref=ad');
  });
});

test('loads customer order history route at /{storeName}/orders', async () => {
  window.history.pushState({}, '', '/my-store/orders');
  render(<App />);
  expect(await screen.findByText('customer-order-history-page')).toBeInTheDocument();
});
