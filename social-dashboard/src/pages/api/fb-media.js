// Returns the direct video source URL for a native Facebook video post.
// For YouTube-link posts shared to Facebook, videoUrl will be null.
// GET /api/fb-media?id={compound_post_id}  (format: pageId_videoId)

import crypto from 'crypto';

const META_BASE = 'https://graph.facebook.com/v25.0';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'id required' });

  const token  = process.env.META_PAGE_ACCESS_TOKEN;
  const secret = process.env.META_APP_SECRET;
  if (!token || !secret) return res.status(500).json({ error: 'credentials not configured' });

  const ap = crypto.createHmac('sha256', secret).update(token).digest('hex');

  // The compound post ID is pageId_videoId. The video ID is the last segment.
  const parts   = id.split('_');
  const videoId = parts.length >= 2 ? parts[parts.length - 1] : id;

  try {
    const r    = await fetch(`${META_BASE}/${videoId}?fields=source&access_token=${token}&appsecret_proof=${ap}`);
    const data = await r.json();

    const source    = data.source || null;
    const isNativeFb = source && !source.includes('youtube.com') && !source.includes('youtu.be');

    return res.status(200).json({ videoUrl: isNativeFb ? source : null });
  } catch {
    return res.status(200).json({ videoUrl: null });
  }
}
