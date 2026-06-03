// DB-backed YouTube endpoint — serves the same shape as /api/youtube
// but reads from Neon Postgres instead of calling YouTube's API live.

import { sql } from '../../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const db = sql();

  try {
    // ── Latest daily insights row ─────────────────────────────────────────────
    const [ins] = await db`
      SELECT * FROM daily_insights ORDER BY date DESC LIMIT 1
    `;

    const subscriberCount = ins?.yt_subscribers  || 0;
    const viewCount       = ins?.yt_total_views  || 0;
    const videoCount      = ins?.yt_total_videos || 0;

    const channelInfo = {
      name:             'Lakepointe Church',
      subscriberCount,
      viewCount,
      videoCount,
      avgViewsPerVideo: videoCount > 0 ? Math.round(viewCount / videoCount) : 0,
    };

    // ── Videos ────────────────────────────────────────────────────────────────
    const rows = await db`
      SELECT * FROM yt_videos ORDER BY published_at DESC LIMIT 50
    `;

    const videos = rows.map(v => ({
      id:             v.id,
      title:          v.title          || '',
      description:    v.description    || '',
      publishedAt:    v.published_at instanceof Date ? v.published_at.toISOString() : v.published_at,
      thumbnail:      v.thumbnail_url  || `https://img.youtube.com/vi/${v.id}/mqdefault.jpg`,
      thumbnailUrl:   v.thumbnail_url  || `https://img.youtube.com/vi/${v.id}/mqdefault.jpg`,
      embedUrl:       v.embed_url      || `https://www.youtube.com/embed/${v.id}`,
      durationSecs:   v.duration_secs  || 0,
      duration:       v.duration       || '0:00',
      contentType:    v.content_type,
      viewCount:      v.view_count     || 0,
      likeCount:      v.like_count     || 0,
      commentCount:   v.comment_count  || 0,
      engagementRate: v.engagement_rate || 0,
    }));

    return res.status(200).json({
      channelInfo,
      videos,
      nextPageToken: null,
      analytics:     null,
      fetchedAt:     new Date().toISOString(),
    });
  } catch (err) {
    console.error('DB youtube error:', err);
    return res.status(500).json({ error: 'Failed to read YouTube data from database.', detail: err.message });
  }
}
