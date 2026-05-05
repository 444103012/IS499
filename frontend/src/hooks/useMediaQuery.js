import { useEffect, useState } from 'react';

const useMediaQuery = (query) => {
  const getMatch = () => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia(query).matches;
  };
  const [matches, setMatches] = useState(getMatch);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (typeof window.matchMedia !== 'function') return undefined;
    const mql = window.matchMedia(query);
    const handler = (event) => setMatches(event.matches);
    setMatches(mql.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return matches;
};

export default useMediaQuery;
