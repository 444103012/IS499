import axiosInstance from '../api/axios';

const SESSION_KEY = 'sl_subscription_plan';
const TTL_MS = 5 * 60 * 1000; // 5 minutes

let memCache = null; // { plan, expiresAt }

function readSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || Date.now() > parsed.expiresAt) return null;
    return parsed.plan;
  } catch {
    return null;
  }
}

function writeSession(plan) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ plan, expiresAt: Date.now() + TTL_MS }));
  } catch {}
}

export function invalidateSubscriptionCache() {
  memCache = null;
  try { sessionStorage.removeItem(SESSION_KEY); } catch {}
}

let inflight = null;

export async function fetchSubscriptionPlan() {
  // 1. In-memory hit (fastest — same component tree within one render cycle)
  if (memCache && Date.now() < memCache.expiresAt) return memCache.plan;

  // 2. sessionStorage hit (fast — survives navigation)
  const cached = readSession();
  if (cached !== null) {
    memCache = { plan: cached, expiresAt: Date.now() + TTL_MS };
    return cached;
  }

  // 3. Deduplicate concurrent callers — only one network request at a time
  if (!inflight) {
    inflight = axiosInstance.get('/api/subscription')
      .then(({ data }) => {
        const plan = data?.plan || 'basic';
        memCache = { plan, expiresAt: Date.now() + TTL_MS };
        writeSession(plan);
        return plan;
      })
      .catch(() => {
        return 'basic';
      })
      .finally(() => { inflight = null; });
  }
  return inflight;
}
