// Returns fresh media_url and thumbnail_url for a single IG post.
// Called by PostSpotlight when opening an Instagram reel so the video
// URL is always current (Instagram signed CDN URLs expire in ~1-2 hours).

import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'id is required' });

  const token  = process.env.META_PAGE_ACCESS_TOKEN;
  const secret = process.env.META_APP_SECRET;
  if (!token || !secret) return res.status(500).json({ error: 'Meta credentials not configured' });

  const proof = crypto.createHmac('sha256', secret).update(token).digest('hex');

  try {
    const r    = await fetch(
      `https://graph.facebook.com/v25.0/${id}?fields=media_url,thumbnail_url,media_type&access_token=${token}&appsecret_proof=${proof}`
    );
    const data = await r.json();
    if (data.error) return res.status(400).json({ error: data.error.message });

    const isReel  = data.media_type === 'REELS' || data.media_type === 'VIDEO';
    const videoUrl = isReel ? (data.media_url || null) : null;
    const mediaUrl = isReel
      ? (data.thumbnail_url || null)
      : (data.media_url || data.thumbnail_url || null);

    return res.status(200).json({ mediaUrl, videoUrl, mediaType: data.media_type });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
