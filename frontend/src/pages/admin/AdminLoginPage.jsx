

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../../context/AdminAuthContext';

const getErrorMessage = (message) => {
  const map = {
    'Invalid email or password': 'Invalid email or password.',
    'Missing required fields': 'Please enter email and password.',
    'Login failed': 'Login failed. Please try again later.',
    'NetworkError': 'Cannot reach the server. Make sure the backend is running.',
  };
  return map[message] || message || 'Something went wrong. Please try again.';
};

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated, loading: authLoading } = useAdminAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    navigate('/admin/dashboard', { replace: true });
    return null;
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <span>Loading...</span>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const trimmedEmail = email?.trim();
    if (!trimmedEmail || !password) {
      setError('Please enter email and password.');
      return;
    }

    setLoading(true);
    try {
      await login(trimmedEmail, password);
      navigate('/admin/dashboard', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.error || err.message;
      const detail = err.response?.data?.detail;
      setError(detail ? `${getErrorMessage(msg)} ${detail}` : getErrorMessage(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-md p-6 border border-gray-100">
        <h1 className="text-storelaunch-dark text-xl font-bold mb-6 text-left">
          StoreLaunch Admin
        </h1>
        <p className="text-gray-600 text-sm mb-6 text-left">
          Sign in to the admin dashboard.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-left">
            <label htmlFor="admin-email" className="block text-storelaunch-dark text-sm font-medium mb-1">
              Email
            </label>
            <input
              id="admin-email"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              placeholder="admin@storelaunch.com"
              required
              autoComplete="email"
              className="w-full p-2 border border-gray-300 rounded-md text-left"
            />
          </div>
          <div className="text-left">
            <label htmlFor="admin-password" className="block text-storelaunch-dark text-sm font-medium mb-1">
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              placeholder="Password"
              required
              autoComplete="current-password"
              className="w-full p-2 border border-gray-300 rounded-md text-left"
            />
          </div>
          {error && (
            <p className="text-sm text-red-600 text-left">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full p-2 bg-storelaunch-green text-white rounded-md font-medium disabled:opacity-70"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
