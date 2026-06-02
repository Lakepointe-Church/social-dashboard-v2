import { redis } from '../../../lib/redis';

export default async function handler(req, res) {
  const d = parseInt(req.query.days, 10);
  const days = isNaN(d) ? 90 : d;

  // Timestamps for the desired range (unix seconds)
  const now    = Math.floor(Date.now() / 1000);
  const cutoff = days === 0 ? '-inf' : now - days * 86400;

  // Get date strings whose scores fall in range, oldest → newest
  const dateKeys = await redis.zrange('followers:dates', cutoff, '+inf', { byScore: true });

  if (!dateKeys || dateKeys.length === 0) {
    return res.status(200).json({ snapshots: [], days });
  }

  // Bulk-fetch all snapshot blobs
  const raw = await redis.mget(...dateKeys.map(d => `followers:${d}`));

  const snapshots = raw
    .map((v, i) => {
      if (!v) return null;
      try {
        const p = typeof v === 'string' ? JSON.parse(v) : v;
        return {
          date:      p.date || dateKeys[i],
          Facebook:  p.facebook  ?? null,
          Instagram: p.instagram ?? null,
          YouTube:   p.youtube   ?? null,
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => a.date.localeCompare(b.date));

  return res.status(200).json({ snapshots, days });
}
