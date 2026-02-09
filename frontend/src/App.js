import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import AppLayout from './components/AppLayout';
import LandingPage from './pages/LandingPage';
import RegisterStoreOwner from './pages/RegisterStoreOwner';
import RegisterCustomer from './pages/RegisterCustomer';
import Login from './pages/Login';
import Welcome from './pages/Welcome';
import StoreView from './pages/StoreView';
import './App.css';

function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppLayout><LandingPage /></AppLayout>} />
          <Route path="/register/store-owner" element={<AppLayout><RegisterStoreOwner /></AppLayout>} />
          <Route path="/register/customer" element={<AppLayout><RegisterCustomer /></AppLayout>} />
          <Route path="/login" element={<AppLayout><Login /></AppLayout>} />
          <Route path="/welcome" element={<AppLayout><Welcome /></AppLayout>} />
          {/* Store routes - customers access stores via /Store1 format */}
          {/* This catch-all route should be last to avoid matching other routes */}
          <Route path="/:storeSlug" element={<StoreView />} />
        </Routes>
      </BrowserRouter>
    </LanguageProvider>
  );
}

export default App;
