import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import axiosInstance from '../api/axios';
import {
  readAccessCache,
  writeAccessCache,
  clearAccessCache,
  isAccessCacheFresh,
} from '../utils/storeAccessCache';

const TOKEN_KEY = 'token';
const ACCESS_TIMEOUT_MS = 8000;
/** After this TTL we show the slim verifying bar again while re-validating (not full-screen). */
const ACCESS_CACHE_TTL_MS = 5 * 60 * 1000;

const AccessVerifyBar = () => (
  <div
    className="fixed top-0 left-0 right-0 z-[100] h-1 bg-gray-200 overflow-hidden"
    role="progressbar"
    aria-label="Verifying access"
  >
    <div className="h-full w-1/3 bg-storelaunch-green animate-[access-bar_1.1s_ease-in-out_infinite] origin-left" />
    <style>{`
      @keyframes access-bar {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(400%); }
      }
    `}</style>
  </div>
);

const ProtectedRoute = ({ children }) => {
  const location = useLocation();
  const token = localStorage.getItem(TOKEN_KEY);
  const needsDashboardGuard = location.pathname.startsWith('/dashboard');
  const [verifying, setVerifying] = useState(false);
  const [isSuspended, setIsSuspended] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!token || !needsDashboardGuard) {
      setVerifying(false);
      setIsSuspended(false);
      setAccessDenied(false);
      return undefined;
    }

    const runAccessCheck = (opts) => {
      const { useBlockingUi } = opts;
      return Promise.race([
        axiosInstance.get('/api/store/access-status'),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Access status timeout')), ACCESS_TIMEOUT_MS),
        ),
      ])
        .then((res) => {
          if (cancelled) return;
          const suspended = !!res?.data?.suspended;
          setIsSuspended(suspended);
          setAccessDenied(false);
          writeAccessCache(token, suspended);
        })
        .catch(async () => {
          if (cancelled) return;
          try {
            const storeRes = await Promise.race([
              axiosInstance.get('/api/store'),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Store status timeout')), ACCESS_TIMEOUT_MS),
              ),
            ]);
            if (cancelled) return;
            const status = String(storeRes?.data?.store?.status || '').toLowerCase();
            const suspended = status === 'suspended';
            setIsSuspended(suspended);
            setAccessDenied(false);
            writeAccessCache(token, suspended);
          } catch {
            if (cancelled) return;
            setIsSuspended(false);
            setAccessDenied(true);
            clearAccessCache();
          }
        })
        .finally(() => {
          if (cancelled) return;
          if (useBlockingUi) setVerifying(false);
        });
    };

    const cached = readAccessCache(token);
    const cacheFresh = isAccessCacheFresh(cached, ACCESS_CACHE_TTL_MS);

    if (cached && cacheFresh) {
      setIsSuspended(cached.suspended);
      setAccessDenied(false);
      setVerifying(false);
      runAccessCheck({ useBlockingUi: false });
    } else {
      setVerifying(true);
      runAccessCheck({ useBlockingUi: true });
    }

    return () => {
      cancelled = true;
    };
  }, [token, needsDashboardGuard]);

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (needsDashboardGuard && accessDenied) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('store_owner_id');
    clearAccessCache();
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (needsDashboardGuard && isSuspended) {
    return <Navigate to="/store-suspended" replace />;
  }

  return (
    <>
      {needsDashboardGuard && verifying ? <AccessVerifyBar /> : null}
      {children}
    </>
  );
};

export default ProtectedRoute;
