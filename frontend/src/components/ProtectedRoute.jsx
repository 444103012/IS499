import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

const TOKEN_KEY = 'token';

const ProtectedRoute = ({ children }) => {
  const location = useLocation();
  const token = localStorage.getItem(TOKEN_KEY);

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
