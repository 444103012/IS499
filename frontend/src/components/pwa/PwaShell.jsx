import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  applyWaitingUpdate,
  listenForControllerChange,
} from '../../serviceWorkerRegistration';

export default function PwaShell({ children }) {
  const { t, i18n } = useTranslation();
  const [offline, setOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );
  const [updateRegistration, setUpdateRegistration] = useState(null);
  const [dismissedUpdate, setDismissedUpdate] = useState(false);

  useEffect(() => {
    const onOnline = () => setOffline(false);
    const onOffline = () => setOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    const onSwUpdate = (event) => {
      setUpdateRegistration(event.detail);
      setDismissedUpdate(false);
    };
    window.addEventListener('sw-update', onSwUpdate);
    return () => window.removeEventListener('sw-update', onSwUpdate);
  }, []);

  useEffect(() => listenForControllerChange(), []);

  const handleRefresh = useCallback(() => {
    if (updateRegistration) {
      applyWaitingUpdate(updateRegistration);
    } else {
      window.location.reload();
    }
  }, [updateRegistration]);

  const showUpdate = updateRegistration && !dismissedUpdate;
  const isRTL = i18n.language === 'ar';

  return (
    <>
      {children}
      {offline && (
        <div
          role="status"
          className={`fixed bottom-0 inset-x-0 z-[9998] px-4 py-3 bg-storelaunch-dark text-white text-sm shadow-lg ${
            isRTL ? 'text-right' : 'text-left'
          }`}
        >
          <p className="max-w-3xl mx-auto">{t('pwa.offlineMessage')}</p>
        </div>
      )}
      {showUpdate && (
        <div
          role="dialog"
          aria-live="polite"
          className={`fixed top-0 inset-x-0 z-[9999] px-4 py-3 bg-storelaunch-green text-white shadow-md ${
            isRTL ? 'text-right' : 'text-left'
          }`}
        >
          <div className={`max-w-3xl mx-auto flex flex-wrap items-center justify-between gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <p className="text-sm font-medium">{t('pwa.updateAvailable')}</p>
            <div className={`flex gap-2 shrink-0 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button
                type="button"
                onClick={handleRefresh}
                className="px-3 py-1.5 text-sm font-semibold rounded-md bg-white text-storelaunch-deep-green hover:bg-gray-100"
              >
                {t('pwa.updateRefresh')}
              </button>
              <button
                type="button"
                onClick={() => setDismissedUpdate(true)}
                className="px-3 py-1.5 text-sm rounded-md border border-white/60 hover:bg-white/10"
              >
                {t('pwa.updateDismiss')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}