// Daily sync job — fetches all platform data and upserts into Neon Postgres.
// Triggered by the cron in vercel.json at 06:30 UTC (30 min after snapshots/save).
// Also callable manually: GET /api/db-sync

import crypto from 'crypto';
import { sql } from '../../lib/db';

export const config = { maxDuration: 300 };

const META_BASE = 'https://graph.facebook.com/v25.0';

function proof(token) {
  if (!process.env.META_APP_SECRET) return '';
  return crypto.createHmac('sha256', process.env.META_APP_SECRET).update(token).digest('hex');
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers['authorization'] !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = process.env.META_PAGE_ACCESS_TOKEN;
  const ap    = proof(token);
  const db    = sql();
  const today = new Date().toISOString().split('T')[0];

  const results = { facebook: null, instagram: null, youtube: null, insights: null };

  // ── 1. Facebook posts ───────────────────────────────────────────────────────
  try {
    const fbRes  = await fetch(
      `${META_BASE}/${process.env.META_PAGE_ID}/posts` +
      `?fields=id,message,story,created_time,attachments,likes.summary(true),comments.summary(true),shares,permalink_url` +
      `&limit=50&access_token=${token}&appsecret_proof=${ap}`
    );
    const fbData = await fbRes.json();
    if (fbData.error) throw new Error(fbData.error.message);

    const STREAM_MARKERS = ['thank you for joining us today', 'connect with us:', 'lp.social/connectcard'];
    function classifyFb(message, type) {
      const msg = (message || '').toLowerCase();
      if (STREAM_MARKERS.some(m => msg.includes(m))) return 'stream';
      if (type === 'photo' || type === 'album') return 'photo';
      if (type === 'video_inline' || type === 'video') return 'video';
      return 'other';
    }

    for (const p of (fbData.data || [])) {
      const likes    = p.likes?.summary?.total_count || 0;
      const comments = p.comments?.summary?.total_count || 0;
      const shares   = p.shares?.count || 0;
      const type     = p.attachments?.data?.[0]?.type || 'status';
      const message  = p.message || p.story || '';
      await db`
        INSERT INTO fb_posts (id, message, created_time, content_type, type, thumbnail, permalink, like_count, comment_count, share_count, engaged, snapshotted_at)
        VALUES (
          ${p.id}, ${message}, ${p.created_time}, ${classifyFb(message, type)}, ${type},
          ${p.attachments?.data?.[0]?.media?.image?.src || null},
          ${p.permalink_url || null},
          ${likes}, ${comments}, ${shares}, ${likes + comments + shares}, NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          like_count     = EXCLUDED.like_count,
          comment_count  = EXCLUDED.comment_count,
          share_count    = EXCLUDED.share_count,
          engaged        = EXCLUDED.engaged,
          snapshotted_at = NOW()
      `;
    }
    results.facebook = (fbData.data || []).length;
  } catch (e) {
    results.facebook = { error: e.message };
  }

  // ── 2. Facebook page-level insights ────────────────────────────────────────
  let fbInsights = {};
  try {
    const pageRes  = await fetch(
      `${META_BASE}/${process.env.META_PAGE_ID}?fields=fan_count,followers_count&access_token=${token}&appsecret_proof=${ap}`
    );
    const pageData = await pageRes.json();

    const metrics = ['page_impressions', 'page_impressions_unique', 'page_engaged_users', 'page_views_total', 'page_fan_adds'];
    const since   = Math.floor((Date.now() - 28 * 86400 * 1000) / 1000);
    const until   = Math.floor(Date.now() / 1000);
    const iResults = await Promise.allSettled(
      metrics.map(m =>
        fetch(`${META_BASE}/${process.env.META_PAGE_ID}/insights?metric=${m}&period=week&since=${since}&until=${until}&access_token=${token}&appsecret_proof=${ap}`)
          .then(r => r.json())
      )
    );
    const totals = {};
    iResults.forEach(r => {
      if (r.status === 'fulfilled' && !r.value.error && r.value.data) {
        r.value.data.forEach(metric => {
          totals[metric.name] = (metric.values || []).reduce((s, v) => {
            const val = typeof v.value === 'object' ? Object.values(v.value).reduce((a, b) => a + b, 0) : (v.value || 0);
            return s + val;
          }, 0);
        });
      }
    });
    fbInsights = {
      fb_followers:     pageData.followers_count || 0,
      fb_reach:         totals.page_impressions_unique || 0,
      fb_impressions:   totals.page_impressions || 0,
      fb_engaged_users: totals.page_engaged_users || 0,
      fb_page_views:    totals.page_views_total || 0,
      fb_new_fans:      totals.page_fan_adds || 0,
    };
  } catch (e) {
    results.facebook_insights = { error: e.message };
  }

  // ── 3. Instagram posts ──────────────────────────────────────────────────────
  let igInsights = {};
  try {
    const igRes  = await fetch(
      `${META_BASE}/${process.env.META_INSTAGRAM_ID}` +
      `?fields=followers_count,media_count&access_token=${token}&appsecret_proof=${ap}`
    );
    const igData = await igRes.json();

    const mediaRes  = await fetch(
      `${META_BASE}/${process.env.META_INSTAGRAM_ID}/media` +
      `?fields=id,caption,timestamp,media_type,media_url,thumbnail_url,permalink` +
      `&limit=50&access_token=${token}&appsecret_proof=${ap}`
    );
    const mediaData = await mediaRes.json();
    if (mediaData.error) throw new Error(mediaData.error.message);

    for (const m of (mediaData.data || [])) {
      const isReel = m.media_type === 'VIDEO';
      const metricFields = isReel
        ? 'views,saved,total_interactions,shares,ig_reels_avg_watch_time'
        : 'reach,saved,total_interactions,shares';

      let stats = {};
      try {
        const sRes  = await fetch(
          `${META_BASE}/${m.id}/insights?metric=${metricFields}&access_token=${token}&appsecret_proof=${ap}`
        );
        const sData = await sRes.json();
        (sData.data || []).forEach(d => { stats[d.name] = d.values?.[0]?.value ?? 0; });
      } catch (_) { /* per-post insight failure — store zeros */ }

      const contentType = m.media_type === 'CAROUSEL_ALBUM' ? 'carousel'
        : m.media_type === 'VIDEO' ? 'reel'
        : 'photo';

      await db`
        INSERT INTO ig_posts (id, caption, timestamp, media_type, content_type, media_url, thumbnail_url, permalink,
          like_count, comment_count, share_count, saved, reach, views, total_interactions, avg_watch_time, snapshotted_at)
        VALUES (
          ${m.id}, ${m.caption || null}, ${m.timestamp}, ${m.media_type}, ${contentType},
          ${m.media_url || null}, ${m.thumbnail_url || null}, ${m.permalink || null},
          0, 0,
          ${stats.shares || 0}, ${stats.saved || 0},
          ${stats.reach || 0}, ${stats.views || 0},
          ${stats.total_interactions || 0},
          ${stats.ig_reels_avg_watch_time || 0},
          NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          share_count        = EXCLUDED.share_count,
          saved              = EXCLUDED.saved,
          reach              = EXCLUDED.reach,
          views              = EXCLUDED.views,
          total_interactions = EXCLUDED.total_interactions,
          avg_watch_time     = EXCLUDED.avg_watch_time,
          snapshotted_at     = NOW()
      `;
    }
    results.instagram = (mediaData.data || []).length;

    const igInsightMetrics = ['reach', 'impressions', 'follower_count'];
    const igIResults = await Promise.allSettled(
      igInsightMetrics.map(m =>
        fetch(`${META_BASE}/${process.env.META_INSTAGRAM_ID}/insights?metric=${m}&period=day&since=${Math.floor((Date.now() - 28*86400*1000)/1000)}&until=${Math.floor(Date.now()/1000)}&access_token=${token}&appsecret_proof=${ap}`)
          .then(r => r.json())
      )
    );
    const igTotals = {};
    igIResults.forEach(r => {
      if (r.status === 'fulfilled' && !r.value.error && r.value.data) {
        r.value.data.forEach(metric => {
          igTotals[metric.name] = (metric.values || []).reduce((s, v) => s + (v.value || 0), 0);
        });
      }
    });
    igInsights = {
      ig_followers:     igData.followers_count || 0,
      ig_reach:         igTotals.reach || 0,
      ig_impressions:   igTotals.impressions || 0,
      ig_new_followers: igTotals.follower_count || 0,
    };
  } catch (e) {
    results.instagram = { error: e.message };
  }

  // ── 4. YouTube videos ───────────────────────────────────────────────────────
  let ytInsights = {};
  try {
    const YT_CHANNEL = 'UC5f7yO3WU_Ns0WDCQuP5bAw';
    const chRes  = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${YT_CHANNEL}&key=${process.env.YOUTUBE_API_KEY}`
    );
    const chData = await chRes.json();
    const stats  = chData.items?.[0]?.statistics || {};

    const vidRes  = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${YT_CHANNEL}&type=video&order=date&maxResults=50&key=${process.env.YOUTUBE_API_KEY}`
    );
    const vidData = await vidRes.json();
    const videoIds = (vidData.items || []).map(v => v.id.videoId).join(',');

    if (videoIds) {
      const detailRes  = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoIds}&key=${process.env.YOUTUBE_API_KEY}`
      );
      const detailData = await detailRes.json();

      function parseDuration(iso) {
        const m = iso?.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if (!m) return 0;
        return (parseInt(m[1] || 0) * 3600) + (parseInt(m[2] || 0) * 60) + parseInt(m[3] || 0);
      }
      function classifyYt(title, secs) {
        if (secs <= 180) return 'short';
        if (/live free/i.test(title)) return 'podcast';
        return 'sermon';
      }

      for (const v of (detailData.items || [])) {
        const secs = parseDuration(v.contentDetails?.duration);
        await db`
          INSERT INTO yt_videos (id, title, published_at, content_type, duration_secs, view_count, like_count, comment_count, snapshotted_at)
          VALUES (
            ${v.id}, ${v.snippet?.title || ''}, ${v.snippet?.publishedAt},
            ${classifyYt(v.snippet?.title || '', secs)}, ${secs},
            ${parseInt(v.statistics?.viewCount || 0)},
            ${parseInt(v.statistics?.likeCount || 0)},
            ${parseInt(v.statistics?.commentCount || 0)},
            NOW()
          )
          ON CONFLICT (id) DO UPDATE SET
            view_count     = EXCLUDED.view_count,
            like_count     = EXCLUDED.like_count,
            comment_count  = EXCLUDED.comment_count,
            snapshotted_at = NOW()
        `;
      }
      results.youtube = (detailData.items || []).length;
    }

    ytInsights = {
      yt_subscribers:  parseInt(stats.subscriberCount || 0),
      yt_total_views:  parseInt(stats.viewCount || 0),
      yt_total_videos: parseInt(stats.videoCount || 0),
    };
  } catch (e) {
    results.youtube = { error: e.message };
  }

  // ── 5. Upsert daily insights row ────────────────────────────────────────────
  try {
    const ins = { ...fbInsights, ...igInsights, ...ytInsights };
    await db`
      INSERT INTO daily_insights (
        date, fb_followers, fb_reach, fb_impressions, fb_engaged_users, fb_page_views, fb_new_fans,
        ig_followers, ig_reach, ig_impressions, ig_new_followers,
        yt_subscribers, yt_total_views, yt_total_videos, snapshotted_at
      ) VALUES (
        ${today},
        ${ins.fb_followers ?? null}, ${ins.fb_reach ?? null}, ${ins.fb_impressions ?? null},
        ${ins.fb_engaged_users ?? null}, ${ins.fb_page_views ?? null}, ${ins.fb_new_fans ?? null},
        ${ins.ig_followers ?? null}, ${ins.ig_reach ?? null}, ${ins.ig_impressions ?? null},
        ${ins.ig_new_followers ?? null},
        ${ins.yt_subscribers ?? null}, ${ins.yt_total_views ?? null}, ${ins.yt_total_videos ?? null},
        NOW()
      )
      ON CONFLICT (date) DO UPDATE SET
        fb_followers     = EXCLUDED.fb_followers,
        fb_reach         = EXCLUDED.fb_reach,
        fb_impressions   = EXCLUDED.fb_impressions,
        fb_engaged_users = EXCLUDED.fb_engaged_users,
        fb_page_views    = EXCLUDED.fb_page_views,
        fb_new_fans      = EXCLUDED.fb_new_fans,
        ig_followers     = EXCLUDED.ig_followers,
        ig_reach         = EXCLUDED.ig_reach,
        ig_impressions   = EXCLUDED.ig_impressions,
        ig_new_followers = EXCLUDED.ig_new_followers,
        yt_subscribers   = EXCLUDED.yt_subscribers,
        yt_total_views   = EXCLUDED.yt_total_views,
        yt_total_videos  = EXCLUDED.yt_total_videos,
        snapshotted_at   = NOW()
    `;
    results.insights = ins;
  } catch (e) {
    results.insights = { error: e.message };
  }

  return res.status(200).json({ ok: true, date: today, results });
}
