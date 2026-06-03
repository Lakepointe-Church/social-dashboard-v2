// Shared 5-minute client-side cache for /api/instagram.
// Both InstagramAnalytics and InstagramAudience use this so switching between
// the two tabs only ever triggers one API call instead of two.

let cache = null;
let cacheTime = null;
const TTL = 5 * 60 * 1000; // 5 minutes

export async function fetchInstagramData() {
  if (cache && cacheTime && Date.now() - cacheTime < TTL) return cache;
  const res = await fetch('/api/db/instagram');
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error || `HTTP ${res.status}`);
  }
  cache = await res.json();
  cacheTime = Date.now();
  return cache;
}

export function invalidateInstagramCache() {
  cache = null;
  cacheTime = null;
}
