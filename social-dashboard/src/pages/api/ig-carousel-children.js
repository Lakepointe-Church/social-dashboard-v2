// Returns child media for an Instagram carousel post
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const token = process.env.META_PAGE_ACCESS_TOKEN;
  if (!token) return res.status(500).json({ error: 'META_PAGE_ACCESS_TOKEN not configured.' });
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'id is required' });

  try {
    const r    = await fetch(`https://graph.facebook.com/v21.0/${id}/children?fields=id,media_type,media_url,thumbnail_url&access_token=${token}`);
    const data = await r.json();
    if (data.error) return res.status(400).json({ error: data.error.message });

    const slides = (data.data || []).map(c => {
      const isVideo = c.media_type === 'VIDEO' || c.media_type === 'REELS';
      return {
        id:        c.id,
        mediaType: c.media_type,
        mediaUrl:  isVideo ? (c.thumbnail_url || null) : (c.media_url || null),
        videoUrl:  isVideo ? (c.media_url    || null) : null,
      };
    });

    return res.status(200).json({ slides });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
