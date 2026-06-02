// ─────────────────────────────────────────────────────────────────────────────
// /api/ig-comment-search — count comments containing a phrase across IG posts
// Requires: instagram_manage_comments permission on the access token
// ─────────────────────────────────────────────────────────────────────────────

import crypto from 'crypto';

export const config = { maxDuration: 300 };

const IG_ID = process.env.META_INSTAGRAM_ID;

// Meta's paging.next URLs don't include appsecret_proof — add it before following them
function withProof(url, proof) {
  const u = new URL(url);
  u.searchParams.set('appsecret_proof', proof);
  return u.toString();
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const token  = process.env.META_PAGE_ACCESS_TOKEN;
  const secret = process.env.META_APP_SECRET;

  if (!token)  return res.status(500).json({ error: 'META_PAGE_ACCESS_TOKEN not configured.' });
  if (!secret) return res.status(500).json({ error: 'META_APP_SECRET not configured.' });
  if (!IG_ID)  return res.status(500).json({ error: 'META_INSTAGRAM_ID not configured.' });

  const proof  = crypto.createHmac('sha256', secret).update(token).digest('hex');
  const phrase = (req.query.phrase || 'sermon').toLowerCase().trim();

  if (!phrase) return res.status(400).json({ error: 'phrase is required.' });

  const todayStr = new Date().toISOString().split('T')[0];
  const yearStr  = new Date().getFullYear();
  const since    = req.query.since || `${yearStr}-01-01`;
  const until    = req.query.until || todayStr;

  const rangeStart = new Date(since);
  const rangeEnd   = new Date(until + 'T23:59:59.999Z');
  const base       = 'https://graph.facebook.com/v25.0';

  try {
    // ── Step 1: paginate through all posts within the date range ─────────────
    const posts = [];
    let mediaUrl = `${base}/${IG_ID}/media?fields=id,caption,timestamp,media_url,thumbnail_url,permalink&limit=50&access_token=${token}&appsecret_proof=${proof}`;

    while (mediaUrl) {
      const r    = await fetch(mediaUrl);
      const data = await r.json();
      if (data.error) throw new Error(data.error.message);

      let pastRange = false;
      for (const post of data.data || []) {
        const t = new Date(post.timestamp);
        if (t >= rangeStart && t <= rangeEnd) {
          posts.push(post);
        } else if (t < rangeStart) {
          pastRange = true;
          break;
        }
      }

      mediaUrl = (pastRange || !data.paging?.next) ? null : withProof(data.paging.next, proof);
    }

    // ── Step 2: fetch comments per post and count phrase matches ──────────────
    const breakdown = [];
    let totalMatches = 0;

    for (const post of posts) {
      let matchCount = 0;
      let commUrl = `${base}/${post.id}/comments?fields=text,timestamp,username&limit=50&access_token=${token}&appsecret_proof=${proof}`;

      while (commUrl) {
        const r    = await fetch(commUrl);
        const data = await r.json();

        if (data.error) {
          // Detect missing permission and surface a clear message
          if (
            data.error.code === 10 ||
            data.error.code === 200 ||
            data.error.type === 'OAuthException' ||
            (data.error.message || '').toLowerCase().includes('permission')
          ) {
            return res.status(403).json({
              error: 'The instagram_manage_comments permission is missing. Add it to your Meta app and regenerate your access token, then try again.',
              code: 'MISSING_PERMISSION',
            });
          }
          commUrl = null;
          break;
        }

        for (const comment of data.data || []) {
          if ((comment.text || '').toLowerCase().includes(phrase)) matchCount++;
        }

        commUrl = data.paging?.next ? withProof(data.paging.next, proof) : null;
      }

      if (matchCount > 0) {
        breakdown.push({
          mediaId:    post.id,
          caption:    post.caption  || '',
          timestamp:  post.timestamp,
          mediaUrl:   post.media_url || post.thumbnail_url || null,
          permalink:  post.permalink,
          matchCount,
        });
        totalMatches += matchCount;
      }
    }

    breakdown.sort((a, b) => b.matchCount - a.matchCount);

    return res.status(200).json({
      phrase,
      since,
      until,
      totalMatches,
      postsScanned:     posts.length,
      postsWithMatches: breakdown.length,
      breakdown,
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
