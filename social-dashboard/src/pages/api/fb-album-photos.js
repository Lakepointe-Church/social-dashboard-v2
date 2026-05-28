import crypto from 'crypto';

// Returns individual photo slides for a Facebook album post via the attachments edge
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const token = process.env.META_PAGE_ACCESS_TOKEN;
  if (!token) return res.status(500).json({ error: 'META_PAGE_ACCESS_TOKEN not configured.' });
  const secret = process.env.META_APP_SECRET;
  if (!secret) return res.status(500).json({ error: 'META_APP_SECRET not configured.' });
  const proof = crypto.createHmac('sha256', secret).update(token).digest('hex');
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'id is required' });

  try {
    const r    = await fetch(`https://graph.facebook.com/v25.0/${id}?fields=attachments{subattachments{media,type}}&access_token=${token}&appsecret_proof=${proof}`);
    const data = await r.json();
    if (data.error) return res.status(400).json({ error: data.error.message });

    const subattachments = data.attachments?.data?.[0]?.subattachments?.data || [];
    const slides = subattachments
      .filter(s => s.type === 'photo' && s.media?.image?.src)
      .map(s => ({
        mediaType: 'IMAGE',
        mediaUrl:  s.media.image.src,
        videoUrl:  null,
      }));

    return res.status(200).json({ slides });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
