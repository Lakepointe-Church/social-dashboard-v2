// Temporary debug route — visit /api/instagram-debug to see raw Instagram insight responses for reels
export default async function handler(req, res) {
  const token = process.env.META_PAGE_ACCESS_TOKEN;
  const IG_ID = process.env.META_INSTAGRAM_ID;
  if (!token || !IG_ID) return res.status(500).json({ error: 'Missing env vars' });

  const base = `https://graph.facebook.com/v21.0`;

  // Grab recent media and find the first reel
  const mediaRes  = await fetch(`${base}/${IG_ID}/media?fields=id,media_type,caption&limit=20&access_token=${token}`);
  const mediaData = await mediaRes.json();
  if (mediaData.error) return res.status(500).json({ mediaError: mediaData.error });

  const reel = (mediaData.data || []).find(m => m.media_type === 'REELS' || m.media_type === 'VIDEO');
  if (!reel) return res.json({ message: 'No reels found in recent 20 posts', media: mediaData.data });

  // Test each candidate metric individually so we can see which ones work and how they're shaped
  const candidates = [
    'views', 'reach', 'plays', 'saved', 'shares',
    'total_interactions', 'ig_reels_avg_watch_time', 'clips_replays_count',
    'impressions', 'video_views',
  ];

  const results = {};
  for (const metric of candidates) {
    try {
      const r    = await fetch(`${base}/${reel.id}/insights?metric=${metric}&access_token=${token}`);
      results[metric] = await r.json();
    } catch (e) {
      results[metric] = { fetchError: e.message };
    }
  }

  // Also test the batch request we actually send
  const batchMetrics = 'views,saved,total_interactions,shares,plays,ig_reels_avg_watch_time,clips_replays_count';
  const batchRes  = await fetch(`${base}/${reel.id}/insights?metric=${batchMetrics}&access_token=${token}`);
  const batchData = await batchRes.json();

  return res.json({ reel, individualResults: results, batchResult: batchData });
}
