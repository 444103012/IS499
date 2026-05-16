import { useEffect, useRef } from 'react';
import { useLocation } from '../../router';
import { savePwaLaunchPath, shouldSavePwaLaunchPath } from '../../utils/pwaLaunch';

const DEBOUNCE_MS = 300;

export default function PwaLaunchTracker() {
  const location = useLocation();
  const debounceRef = useRef(null);

  useEffect(() => {
    const path = `${location.pathname}${location.search}${location.hash}`;
    if (!shouldSavePwaLaunchPath(location.pathname)) return undefined;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      savePwaLaunchPath(path);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [location.pathname, location.search, location.hash]);

  useEffect(() => {
    const persistNow = () => {
      const path = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (shouldSavePwaLaunchPath(window.location.pathname)) {
        savePwaLaunchPath(path);
      }
    };

    const onBeforeInstallPrompt = () => {
      persistNow();
    };

    const onPageHide = () => {
      persistNow();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        persistNow();
      }
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('pagehide', onPageHide);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('pagehide', onPageHide);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  return null;
}
