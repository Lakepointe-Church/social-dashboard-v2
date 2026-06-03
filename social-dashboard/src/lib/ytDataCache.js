let cache = null;
let cacheTime = null;
const TTL = 5 * 60 * 1000;

export async function fetchYouTubeData() {
  if (cache && cacheTime && Date.now() - cacheTime < TTL) return cache;
  const res = await fetch('/api/db/youtube');
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error || `HTTP ${res.status}`);
  }
  cache = await res.json();
  cacheTime = Date.now();
  return cache;
}

export function invalidateYouTubeCache() {
  cache = null;
  cacheTime = null;
}
