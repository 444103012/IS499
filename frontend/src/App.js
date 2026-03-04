/**
 * App.js - Root Component & Routing
 * ----------------------------------
 * EN: Main entry component. Defines all routes (IS498: Landing, Store Owner Login/Register,
 *     Dashboard). BrowserRouter enables client-side routing; ProtectedRoute guards /dashboard
 *     so only logged-in store owners (with token in localStorage) can see it.
 * AR: المكوّن الجذري. يعرّف كل المسارات: الصفحة الرئيسية، تسجيل الدخول والتسجيل لأصحاب المتاجر،
 *     لوحة التحكم. BrowserRouter يمكّن التوجيه من جانب العميل؛ ProtectedRoute يحمي /dashboard
 *     بحيث يراها فقط التاجر المسجل (الذي لديه رمز في localStorage).
 */

import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import StoreOwnerLoginPage from './pages/StoreOwnerLoginPage';
import StoreOwnerRegisterPage from './pages/StoreOwnerRegisterPage';
import StoreOwnerDashboardLayout from './pages/StoreOwnerDashboardLayout';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    // EN: BrowserRouter keeps UI in sync with URL (e.g. /login, /dashboard) without full page reload.
    // AR: BrowserRouter يبقي الواجهة متزامنة مع الرابط (مثل /login، /dashboard) دون إعادة تحميل كاملة.
    <BrowserRouter>
      {/* EN: If a route uses React.lazy(), show "Loading..." until the component loads. AR: إذا استخدم مسار React.lazy() نعرض "جاري التحميل..." */}
      <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>}>
        <Routes>
          {/* EN: Public: anyone can visit. AR: عام: أي شخص يمكنه الزيارة. */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<StoreOwnerLoginPage />} />
          <Route path="/register" element={<StoreOwnerRegisterPage />} />
          {/* EN: Protected: ProtectedRoute checks localStorage for token; no token → redirect to /login. AR: محمي: يتحقق من الرمز في localStorage؛ لا رمز → تحويل لـ /login. */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <StoreOwnerDashboardLayout />
              </ProtectedRoute>
            }
          />
          {/* EN: Catch-all: any unknown path (e.g. /xyz) redirects to home. AR: أي مسار غير معروف يُحوّل للصفحة الرئيسية. */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
