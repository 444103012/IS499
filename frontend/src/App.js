import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import StoreOwnerLoginPage from './pages/StoreOwnerLoginPage';
import StoreOwnerRegisterPage from './pages/StoreOwnerRegisterPage';
import StoreOwnerDashboardLayout from './pages/StoreOwnerDashboardLayout';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<StoreOwnerLoginPage />} />
          <Route path="/register" element={<StoreOwnerRegisterPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <StoreOwnerDashboardLayout />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
