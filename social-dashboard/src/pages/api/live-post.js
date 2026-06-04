// Returns current live metrics for a single post without storing to DB.
// Used by the Live Check feature to see how a brand-new post is performing.
// GET /api/live-post?platform=instagram&id=xxx
// GET /api/live-post?platform=facebook&id=xxx
// GET /api/live-post?platform=youtube&id=xxx

import crypto from 'crypto';

const META_BASE = 'https://graph.facebook.com/v25.0';

function proof(token) {
  if (!process.env.META_APP_SECRET) return '';
  return crypto.createHmac('sha256', process.env.META_APP_SECRET).update(token).digest('hex');
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const { platform, id } = req.query;
  if (!platform || !id) return res.status(400).json({ error: 'platform and id are required' });

  try {
    if (platform === 'instagram') {
      const token = process.env.META_PAGE_ACCESS_TOKEN;
      const ap    = proof(token);

      const mediaRes = await fetch(
        `${META_BASE}/${id}?fields=id,caption,timestamp,media_type,media_url,thumbnail_url,permalink,like_count,comments_count&access_token=${token}&appsecret_proof=${ap}`
      );
      const media = await mediaRes.json();
      if (media.error) return res.status(400).json({ error: media.error.message });

      const isReel   = media.media_type === 'REELS' || media.media_type === 'VIDEO';
      const metrics  = isReel
        ? 'views,saved,total_interactions,shares,ig_reels_avg_watch_time'
        : 'reach,saved,total_interactions,shares';

      let stats = {};
      try {
        const insRes  = await fetch(`${META_BASE}/${id}/insights?metric=${metrics}&access_token=${token}&appsecret_proof=${ap}`);
        const insData = await insRes.json();
        (insData.data || []).forEach(d => { stats[d.name] = d.values?.[0]?.value ?? 0; });
      } catch (_) {}

      const reach   = isReel ? (stats.views || 0) : (stats.reach || 0);
      const engaged = stats.total_interactions || ((media.like_count || 0) + (media.comments_count || 0));
      const engRate = reach > 0 ? parseFloat((engaged / reach * 100).toFixed(2)) : 0;

      return res.status(200).json({
        id: media.id,
        platform: 'instagram',
        caption:       media.caption || '',
        timestamp:     media.timestamp,
        mediaType:     media.media_type,
        mediaUrl:      isReel ? (media.thumbnail_url || null) : (media.media_url || null),
        permalink:     media.permalink,
        likeCount:     media.like_count || 0,
        commentCount:  media.comments_count || 0,
        shareCount:    stats.shares || 0,
        saved:         stats.saved || 0,
        reach,
        views:         stats.views || 0,
        engaged,
        engagementRate: engRate,
        avgWatchTime:  stats.ig_reels_avg_watch_time || 0,
        fetchedAt:     new Date().toISOString(),
      });
    }

    if (platform === 'facebook') {
      const token = process.env.META_PAGE_ACCESS_TOKEN;
      const ap    = proof(token);

      const postRes  = await fetch(
        `${META_BASE}/${id}?fields=id,message,story,created_time,attachments,likes.summary(true),comments.summary(true),shares,permalink_url&access_token=${token}&appsecret_proof=${ap}`
      );
      const post = await postRes.json();
      if (post.error) return res.status(400).json({ error: post.error.message });

      const likes    = post.likes?.summary?.total_count || 0;
      const comments = post.comments?.summary?.total_count || 0;
      const shares   = post.shares?.count || 0;

      return res.status(200).json({
        id:           post.id,
        platform:     'facebook',
        message:      post.message || post.story || '',
        createdTime:  post.created_time,
        thumbnail:    post.attachments?.data?.[0]?.media?.image?.src || null,
        type:         post.attachments?.data?.[0]?.type || 'status',
        permalink:    post.permalink_url || null,
        likeCount:    likes,
        commentCount: comments,
        shareCount:   shares,
        engaged:      likes + comments + shares,
        fetchedAt:    new Date().toISOString(),
      });
    }

    if (platform === 'youtube') {
      const apiKey = process.env.YOUTUBE_API_KEY;
      const r      = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${id}&key=${apiKey}`
      );
      const data = await r.json();
      if (data.error) return res.status(400).json({ error: data.error.message });
      const v = data.items?.[0];
      if (!v) return res.status(404).json({ error: 'Video not found' });

      const views    = parseInt(v.statistics?.viewCount    || 0);
      const likes    = parseInt(v.statistics?.likeCount    || 0);
      const comments = parseInt(v.statistics?.commentCount || 0);

      return res.status(200).json({
        id:             v.id,
        platform:       'youtube',
        title:          v.snippet?.title || '',
        description:    v.snippet?.description || '',
        publishedAt:    v.snippet?.publishedAt,
        thumbnail:      v.snippet?.thumbnails?.high?.url || `https://img.youtube.com/vi/${v.id}/hqdefault.jpg`,
        permalink:      `https://www.youtube.com/watch?v=${v.id}`,
        viewCount:      views,
        likeCount:      likes,
        commentCount:   comments,
        engagementRate: views > 0 ? parseFloat(((likes + comments) / views * 100).toFixed(2)) : 0,
        fetchedAt:      new Date().toISOString(),
      });
    }

    return res.status(400).json({ error: `Unknown platform: ${platform}` });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
