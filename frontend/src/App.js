import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import AppLayout from './components/AppLayout';
import LandingPage from './pages/LandingPage';
import RegisterStoreOwner from './pages/RegisterStoreOwner';
import RegisterCustomer from './pages/RegisterCustomer';
import Login from './pages/Login';
import Welcome from './pages/Welcome';
import './App.css';

function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/register/store-owner" element={<RegisterStoreOwner />} />
            <Route path="/register/customer" element={<RegisterCustomer />} />
            <Route path="/login" element={<Login />} />
            <Route path="/welcome" element={<Welcome />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </LanguageProvider>
  );
}

export default App;
