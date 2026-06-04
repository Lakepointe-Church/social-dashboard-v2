// Daily sync — fetches all platform data and upserts into Neon Postgres.
// Cron: 06:30 UTC daily (vercel.json). Also callable manually via GET /api/db-sync.

import crypto from 'crypto';
import { sql } from '../../lib/db';

export const config = { maxDuration: 300 };

const META_BASE  = 'https://graph.facebook.com/v25.0';
const YT_CHANNEL = 'UC5f7yO3WU_Ns0WDCQuP5bAw';

const STREAM_MARKERS  = ['thank you for joining us today', 'connect with us:', 'lp.social/connectcard'];
const COLLAB_MARKERS  = ['josh howerton', 'live free', '@joshhowerton', '@livefreewjh'];
const PODCAST_MARKERS = ['Live Free with Josh Howerton', 'Live Free'];

function proof(token) {
  if (!process.env.META_APP_SECRET) return '';
  return crypto.createHmac('sha256', process.env.META_APP_SECRET).update(token).digest('hex');
}

function classifyFb(message, type) {
  const msg = (message || '').toLowerCase();
  if (STREAM_MARKERS.some(m => msg.includes(m))) return 'stream';
  if (type === 'photo' || type === 'album') return 'photo';
  if (type === 'video_inline' || type === 'video') return 'video';
  return 'other';
}

function classifyIg(mediaType, caption, collaborators = []) {
  const cap = (caption || '').toLowerCase();
  if (COLLAB_MARKERS.some(m => cap.includes(m))) return 'collab';
  if (collaborators.length > 0) return 'collab';
  if (mediaType === 'REELS' || mediaType === 'VIDEO') return 'reel';
  if (mediaType === 'IMAGE')          return 'photo';
  if (mediaType === 'CAROUSEL_ALBUM') return 'carousel';
  return 'other';
}

function parseDurationSecs(iso) {
  const m = iso?.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return (parseInt(m[1] || 0) * 3600) + (parseInt(m[2] || 0) * 60) + parseInt(m[3] || 0);
}

function formatDuration(secs) {
  if (!secs) return '0:00';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return `${m}:${String(s).padStart(2,'0')}`;
}

function classifyYt(title, secs) {
  if (secs > 0 && secs <= 180) return 'short';
  if (PODCAST_MARKERS.some(m => title?.includes(m))) return 'podcast';
  return 'sermon';
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  // Auth: Vercel injects Authorization: Bearer <CRON_SECRET> for scheduled cron calls.
  // Manual browser calls (Sync Now button) are also allowed — this is an internal dashboard.
  // If the header IS present, it must match (prevents external abuse of the cron secret).
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers['authorization'];
  if (authHeader && cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = process.env.META_PAGE_ACCESS_TOKEN;
  const ap    = proof(token);
  const db    = sql();
  const today = new Date().toISOString().split('T')[0];

  const results = {};

  // ── 1. Facebook posts ───────────────────────────────────────────────────────
  try {
    const fbRes  = await fetch(
      `${META_BASE}/${process.env.META_PAGE_ID}/posts` +
      `?fields=id,message,story,created_time,attachments,likes.summary(true),comments.summary(true),shares,permalink_url` +
      `&limit=25&access_token=${token}&appsecret_proof=${ap}`
    );
    const fbData = await fbRes.json();
    if (fbData.error) throw new Error(fbData.error.message);

    for (const p of (fbData.data || [])) {
      const likes    = p.likes?.summary?.total_count || 0;
      const comments = p.comments?.summary?.total_count || 0;
      const shares   = p.shares?.count || 0;
      const type     = p.attachments?.data?.[0]?.type || 'status';
      const message  = p.message || p.story || '';
      const parts    = p.id?.split('_');
      const embedUrl = (type === 'video_inline' || type === 'video') && parts?.length === 2
        ? `https://www.facebook.com/${parts[0]}/videos/${parts[1]}`
        : null;

      await db`
        INSERT INTO fb_posts
          (id, message, story, created_time, content_type, type, thumbnail, permalink, embed_url,
           like_count, comment_count, share_count, engaged, reach, snapshotted_at)
        VALUES (
          ${p.id}, ${message}, ${p.story || null}, ${p.created_time},
          ${classifyFb(message, type)}, ${type},
          ${p.attachments?.data?.[0]?.media?.image?.src || null},
          ${p.permalink_url || null}, ${embedUrl},
          ${likes}, ${comments}, ${shares}, ${likes + comments + shares},
          0, NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          like_count     = EXCLUDED.like_count,
          comment_count  = EXCLUDED.comment_count,
          share_count    = EXCLUDED.share_count,
          engaged        = EXCLUDED.engaged,
          snapshotted_at = NOW()
      `;

      const fbDays = Math.floor((Date.now() - new Date(p.created_time).getTime()) / 86400000);
      await db`
        INSERT INTO post_metrics_history
          (post_id, platform, snapshot_date, days_since_published,
           like_count, comment_count, share_count, total_interactions)
        VALUES
          (${p.id}, 'facebook', ${today}, ${fbDays},
           ${likes}, ${comments}, ${shares}, ${likes + comments + shares})
        ON CONFLICT (post_id, snapshot_date) DO UPDATE SET
          like_count         = EXCLUDED.like_count,
          comment_count      = EXCLUDED.comment_count,
          share_count        = EXCLUDED.share_count,
          total_interactions = EXCLUDED.total_interactions
      `;
    }
    results.facebook_posts = (fbData.data || []).length;
  } catch (e) {
    results.facebook_posts = { error: e.message };
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
    const iRes = await Promise.allSettled(
      metrics.map(m =>
        fetch(`${META_BASE}/${process.env.META_PAGE_ID}/insights?metric=${m}&period=week&since=${since}&until=${until}&access_token=${token}&appsecret_proof=${ap}`)
          .then(r => r.json())
      )
    );
    const totals = {};
    iRes.forEach(r => {
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
    results.facebook_insights = 'ok';
  } catch (e) {
    results.facebook_insights = { error: e.message };
  }

  // ── 3. Facebook demographics ────────────────────────────────────────────────
  try {
    const demoRes  = await fetch(
      `${META_BASE}/${process.env.META_PAGE_ID}/insights?metric=page_fans_gender_age&period=lifetime&access_token=${token}&appsecret_proof=${ap}`
    );
    const demoData = await demoRes.json();
    if (!demoData.error && demoData.data) {
      const metric = demoData.data.find(d => d.name === 'page_fans_gender_age');
      const raw    = metric?.values?.[0]?.value || {};
      const groups = {};
      Object.entries(raw).forEach(([key, value]) => {
        const [gender, age] = key.split('.');
        if (!groups[age]) groups[age] = { M: 0, F: 0, U: 0 };
        groups[age][gender] = (groups[age][gender] || 0) + value;
      });
      for (const [age, counts] of Object.entries(groups)) {
        await db`
          INSERT INTO fb_demographics (date, age_group, male_count, female_count, unknown_count)
          VALUES (${today}, ${age}, ${counts.M}, ${counts.F}, ${counts.U})
          ON CONFLICT (date, age_group) DO UPDATE SET
            male_count    = EXCLUDED.male_count,
            female_count  = EXCLUDED.female_count,
            unknown_count = EXCLUDED.unknown_count
        `;
      }
      results.facebook_demographics = Object.keys(groups).length;
    }
  } catch (e) {
    results.facebook_demographics = { error: e.message };
  }

  // ── 4. Facebook geo ─────────────────────────────────────────────────────────
  try {
    const [cityRes, countryRes] = await Promise.allSettled([
      fetch(`${META_BASE}/${process.env.META_PAGE_ID}/insights?metric=page_fans_city&period=lifetime&access_token=${token}&appsecret_proof=${ap}`).then(r => r.json()),
      fetch(`${META_BASE}/${process.env.META_PAGE_ID}/insights?metric=page_fans_country&period=lifetime&access_token=${token}&appsecret_proof=${ap}`).then(r => r.json()),
    ]);

    for (const [result, geoType] of [[cityRes, 'city'], [countryRes, 'country']]) {
      if (result.status !== 'fulfilled' || result.value.error) continue;
      const metricName = geoType === 'city' ? 'page_fans_city' : 'page_fans_country';
      const raw  = result.value.data?.find(d => d.name === metricName)?.values?.[0]?.value || {};
      const total = Object.values(raw).reduce((s, v) => s + v, 0);
      for (const [name, value] of Object.entries(raw)) {
        const pct = total > 0 ? parseFloat((value / total * 100).toFixed(1)) : 0;
        await db`
          INSERT INTO fb_geo (date, geo_type, name, value, pct)
          VALUES (${today}, ${geoType}, ${name}, ${value}, ${pct})
          ON CONFLICT (date, geo_type, name) DO UPDATE SET value = EXCLUDED.value, pct = EXCLUDED.pct
        `;
      }
    }
    results.facebook_geo = 'ok';
  } catch (e) {
    results.facebook_geo = { error: e.message };
  }

  // ── 5. Instagram posts + per-post insights ──────────────────────────────────
  let igInsights = {};
  try {
    const acctRes  = await fetch(
      `${META_BASE}/${process.env.META_INSTAGRAM_ID}?fields=followers_count,media_count&access_token=${token}&appsecret_proof=${ap}`
    );
    const acctData = await acctRes.json();

    const mediaRes  = await fetch(
      `${META_BASE}/${process.env.META_INSTAGRAM_ID}/media` +
      `?fields=id,caption,timestamp,media_type,media_url,thumbnail_url,permalink,like_count,comments_count,video_url,collaborators` +
      `&limit=50&access_token=${token}&appsecret_proof=${ap}`
    );
    const mediaData = await mediaRes.json();
    if (mediaData.error) throw new Error(mediaData.error.message);

    for (const m of (mediaData.data || [])) {
      const isReel   = m.media_type === 'REELS' || m.media_type === 'VIDEO';
      const metrics  = isReel
        ? 'views,saved,total_interactions,shares,ig_reels_avg_watch_time'
        : 'reach,saved,total_interactions,shares';

      let stats = {};
      try {
        const sRes  = await fetch(`${META_BASE}/${m.id}/insights?metric=${metrics}&access_token=${token}&appsecret_proof=${ap}`);
        const sData = await sRes.json();
        (sData.data || []).forEach(d => { stats[d.name] = d.values?.[0]?.value ?? 0; });
      } catch (_) {}

      const reach    = isReel ? (stats.views || 0) : (stats.reach || 0);
      const likes    = m.like_count || 0;
      const comments = m.comments_count || 0;
      const saves    = stats.saved || 0;
      const shares   = stats.shares || 0;
      const engaged  = stats.total_interactions || (likes + comments);
      const engRate  = reach > 0 ? parseFloat((engaged / reach * 100).toFixed(2)) : 0;
      const collabs  = m.collaborators?.data || [];
      const isCollab = COLLAB_MARKERS.some(mk => (m.caption || '').toLowerCase().includes(mk)) || collabs.length > 0;
      const videoUrl = isReel ? (m.media_url || null) : null;
      const mediaUrl = isReel ? (m.thumbnail_url || null) : (m.media_url || m.thumbnail_url || null);

      await db`
        INSERT INTO ig_posts (
          id, caption, timestamp, media_type, content_type, media_url, thumbnail_url, video_url, permalink,
          is_collab, like_count, comment_count, share_count, saved, reach, views, total_interactions,
          avg_watch_time, engagement_rate, like_rate, save_rate, share_rate, comment_rate, snapshotted_at
        ) VALUES (
          ${m.id}, ${m.caption || null}, ${m.timestamp}, ${m.media_type},
          ${classifyIg(m.media_type, m.caption, collabs)},
          ${mediaUrl}, ${m.thumbnail_url || null}, ${videoUrl}, ${m.permalink || null},
          ${isCollab}, ${likes}, ${comments}, ${shares}, ${saves},
          ${reach}, ${stats.views || 0}, ${engaged},
          ${stats.ig_reels_avg_watch_time || 0}, ${engRate},
          ${reach > 0 ? parseFloat((likes    / reach * 100).toFixed(2)) : 0},
          ${reach > 0 ? parseFloat((saves    / reach * 100).toFixed(2)) : 0},
          ${reach > 0 ? parseFloat((shares   / reach * 100).toFixed(2)) : 0},
          ${reach > 0 ? parseFloat((comments / reach * 100).toFixed(2)) : 0},
          NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          like_count         = EXCLUDED.like_count,
          comment_count      = EXCLUDED.comment_count,
          share_count        = EXCLUDED.share_count,
          saved              = EXCLUDED.saved,
          reach              = EXCLUDED.reach,
          views              = EXCLUDED.views,
          total_interactions = EXCLUDED.total_interactions,
          avg_watch_time     = EXCLUDED.avg_watch_time,
          engagement_rate    = EXCLUDED.engagement_rate,
          like_rate          = EXCLUDED.like_rate,
          save_rate          = EXCLUDED.save_rate,
          share_rate         = EXCLUDED.share_rate,
          comment_rate       = EXCLUDED.comment_rate,
          snapshotted_at     = NOW()
      `;

      const igDays = Math.floor((Date.now() - new Date(m.timestamp).getTime()) / 86400000);
      await db`
        INSERT INTO post_metrics_history
          (post_id, platform, snapshot_date, days_since_published,
           like_count, comment_count, share_count, save_count,
           reach, views, total_interactions, avg_watch_time, engagement_rate)
        VALUES
          (${m.id}, 'instagram', ${today}, ${igDays},
           ${likes}, ${comments}, ${shares}, ${saves},
           ${reach}, ${stats.views || 0}, ${engaged},
           ${stats.ig_reels_avg_watch_time || 0}, ${engRate})
        ON CONFLICT (post_id, snapshot_date) DO UPDATE SET
          like_count         = EXCLUDED.like_count,
          comment_count      = EXCLUDED.comment_count,
          share_count        = EXCLUDED.share_count,
          save_count         = EXCLUDED.save_count,
          reach              = EXCLUDED.reach,
          views              = EXCLUDED.views,
          total_interactions = EXCLUDED.total_interactions,
          avg_watch_time     = EXCLUDED.avg_watch_time,
          engagement_rate    = EXCLUDED.engagement_rate
      `;
    }
    results.instagram_posts = (mediaData.data || []).length;

    // Account-level insights
    const acctMetrics = ['reach', 'impressions', 'profile_visits', 'accounts_engaged'];
    const since = Math.floor((Date.now() - 28 * 86400 * 1000) / 1000);
    const until = Math.floor(Date.now() / 1000);
    const aRes  = await Promise.allSettled(
      acctMetrics.map(m =>
        fetch(`${META_BASE}/${process.env.META_INSTAGRAM_ID}/insights?metric=${m}&period=day&since=${since}&until=${until}&access_token=${token}&appsecret_proof=${ap}`)
          .then(r => r.json())
      )
    );
    const aTotals = {};
    aRes.forEach(r => {
      if (r.status === 'fulfilled' && !r.value.error && r.value.data) {
        r.value.data.forEach(metric => {
          aTotals[metric.name] = (metric.values || []).reduce((s, v) => s + (v.value || 0), 0);
        });
      }
    });

    // New followers
    let newFollowers = 0;
    try {
      const fRes  = await fetch(`${META_BASE}/${process.env.META_INSTAGRAM_ID}/insights?metric=follower_count&period=day&since=${since}&until=${until}&access_token=${token}&appsecret_proof=${ap}`);
      const fData = await fRes.json();
      if (!fData.error && fData.data?.[0]?.values) {
        newFollowers = fData.data[0].values.reduce((s, v) => s + (v.value || 0), 0);
      }
    } catch (_) {}

    igInsights = {
      ig_followers:        acctData.followers_count || 0,
      ig_reach:            aTotals.reach || 0,
      ig_impressions:      aTotals.impressions || 0,
      ig_profile_views:    aTotals.profile_visits || 0,
      ig_accounts_engaged: aTotals.accounts_engaged || 0,
      ig_new_followers:    newFollowers,
    };
    results.instagram_insights = 'ok';
  } catch (e) {
    results.instagram_posts    = results.instagram_posts    ?? { error: e.message };
    results.instagram_insights = { error: e.message };
  }

  // ── 6. Instagram demographics ───────────────────────────────────────────────
  try {
    const demoRes  = await fetch(
      `${META_BASE}/${process.env.META_INSTAGRAM_ID}/insights?metric=follower_demographics&period=lifetime&breakdown=age,gender&metric_type=total_value&access_token=${token}&appsecret_proof=${ap}`
    );
    const demoData = await demoRes.json();
    if (!demoData.error && demoData.data) {
      const metric = demoData.data.find(d => d.name === 'follower_demographics');
      const breakdown = metric?.total_value?.breakdowns?.[0]?.results || [];
      const groups = {};
      breakdown.forEach(({ dimension_values, value }) => {
        const [age, gender] = dimension_values; // API returns [age, gender] for breakdown=age,gender
        if (!groups[age]) groups[age] = { M: 0, F: 0, U: 0 };
        if (gender === 'M') groups[age].M += value;
        else if (gender === 'F') groups[age].F += value;
        else groups[age].U += value;
      });
      await db`DELETE FROM ig_demographics WHERE date = ${today}`;
      for (const [age, counts] of Object.entries(groups)) {
        await db`
          INSERT INTO ig_demographics (date, age_group, male_count, female_count, unknown_count)
          VALUES (${today}, ${age}, ${counts.M}, ${counts.F}, ${counts.U})
          ON CONFLICT (date, age_group) DO UPDATE SET
            male_count    = EXCLUDED.male_count,
            female_count  = EXCLUDED.female_count,
            unknown_count = EXCLUDED.unknown_count
        `;
      }
      results.instagram_demographics = Object.keys(groups).length;
    }
  } catch (e) {
    results.instagram_demographics = { error: e.message };
  }

  // ── 7. Instagram geo ────────────────────────────────────────────────────────
  try {
    const [cityRes, countryRes] = await Promise.allSettled([
      fetch(`${META_BASE}/${process.env.META_INSTAGRAM_ID}/insights?metric=follower_demographics&period=lifetime&breakdown=city&metric_type=total_value&access_token=${token}&appsecret_proof=${ap}`).then(r => r.json()),
      fetch(`${META_BASE}/${process.env.META_INSTAGRAM_ID}/insights?metric=follower_demographics&period=lifetime&breakdown=country&metric_type=total_value&access_token=${token}&appsecret_proof=${ap}`).then(r => r.json()),
    ]);

    for (const [result, geoType] of [[cityRes, 'city'], [countryRes, 'country']]) {
      if (result.status !== 'fulfilled' || result.value.error) continue;
      const metric    = result.value.data?.find(d => d.name === 'follower_demographics');
      const breakdown = metric?.total_value?.breakdowns?.[0]?.results || [];
      const total     = breakdown.reduce((s, r) => s + r.value, 0);
      for (const { dimension_values, value } of breakdown) {
        const name = dimension_values[0];
        const pct  = total > 0 ? parseFloat((value / total * 100).toFixed(1)) : 0;
        await db`
          INSERT INTO ig_geo (date, geo_type, name, value, pct)
          VALUES (${today}, ${geoType}, ${name}, ${value}, ${pct})
          ON CONFLICT (date, geo_type, name) DO UPDATE SET value = EXCLUDED.value, pct = EXCLUDED.pct
        `;
      }
    }
    results.instagram_geo = 'ok';
  } catch (e) {
    results.instagram_geo = { error: e.message };
  }

  // ── 8. YouTube videos ───────────────────────────────────────────────────────
  let ytInsights = {};
  try {
    const chRes  = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${YT_CHANNEL}&key=${process.env.YOUTUBE_API_KEY}`
    );
    const chData = await chRes.json();
    const stats  = chData.items?.[0]?.statistics || {};

    ytInsights = {
      yt_subscribers:  parseInt(stats.subscriberCount || 0),
      yt_total_views:  parseInt(stats.viewCount || 0),
      yt_total_videos: parseInt(stats.videoCount || 0),
    };

    const searchRes  = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${YT_CHANNEL}&type=video&order=date&maxResults=50&key=${process.env.YOUTUBE_API_KEY}`
    );
    const searchData = await searchRes.json();
    const videoIds   = (searchData.items || []).map(v => v.id.videoId).filter(Boolean).join(',');

    if (videoIds) {
      const detailRes  = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoIds}&key=${process.env.YOUTUBE_API_KEY}`
      );
      const detailData = await detailRes.json();

      for (const v of (detailData.items || [])) {
        const secs       = parseDurationSecs(v.contentDetails?.duration);
        const views      = parseInt(v.statistics?.viewCount    || 0);
        const likes      = parseInt(v.statistics?.likeCount    || 0);
        const comments   = parseInt(v.statistics?.commentCount || 0);
        const engRate    = views > 0 ? parseFloat(((likes + comments) / views * 100).toFixed(2)) : 0;
        const thumbUrl   = v.snippet?.thumbnails?.high?.url || `https://img.youtube.com/vi/${v.id}/hqdefault.jpg`;

        await db`
          INSERT INTO yt_videos (
            id, title, description, published_at, content_type, duration_secs, duration,
            thumbnail_url, embed_url, view_count, like_count, comment_count, engagement_rate, snapshotted_at
          ) VALUES (
            ${v.id},
            ${v.snippet?.title || ''},
            ${v.snippet?.description || null},
            ${v.snippet?.publishedAt},
            ${classifyYt(v.snippet?.title || '', secs)},
            ${secs},
            ${formatDuration(secs)},
            ${thumbUrl},
            ${`https://www.youtube.com/embed/${v.id}`},
            ${views}, ${likes}, ${comments}, ${engRate},
            NOW()
          )
          ON CONFLICT (id) DO UPDATE SET
            view_count      = EXCLUDED.view_count,
            like_count      = EXCLUDED.like_count,
            comment_count   = EXCLUDED.comment_count,
            engagement_rate = EXCLUDED.engagement_rate,
            snapshotted_at  = NOW()
        `;

        const ytDays = Math.floor((Date.now() - new Date(v.snippet?.publishedAt).getTime()) / 86400000);
        await db`
          INSERT INTO post_metrics_history
            (post_id, platform, snapshot_date, days_since_published,
             like_count, comment_count, views, engagement_rate)
          VALUES
            (${v.id}, 'youtube', ${today}, ${ytDays},
             ${likes}, ${comments}, ${views}, ${engRate})
          ON CONFLICT (post_id, snapshot_date) DO UPDATE SET
            like_count      = EXCLUDED.like_count,
            comment_count   = EXCLUDED.comment_count,
            views           = EXCLUDED.views,
            engagement_rate = EXCLUDED.engagement_rate
        `;
      }
      results.youtube_videos = (detailData.items || []).length;
    }
  } catch (e) {
    results.youtube_videos = { error: e.message };
  }

  // ── 9. Upsert daily_insights row ───────────────────────────────────────────
  try {
    const ins = { ...fbInsights, ...igInsights, ...ytInsights };
    await db`
      INSERT INTO daily_insights (
        date,
        fb_followers, fb_reach, fb_impressions, fb_engaged_users, fb_page_views, fb_new_fans,
        ig_followers, ig_reach, ig_impressions, ig_profile_views, ig_accounts_engaged, ig_new_followers,
        yt_subscribers, yt_total_views, yt_total_videos,
        snapshotted_at
      ) VALUES (
        ${today},
        ${ins.fb_followers ?? null}, ${ins.fb_reach ?? null}, ${ins.fb_impressions ?? null},
        ${ins.fb_engaged_users ?? null}, ${ins.fb_page_views ?? null}, ${ins.fb_new_fans ?? null},
        ${ins.ig_followers ?? null}, ${ins.ig_reach ?? null}, ${ins.ig_impressions ?? null},
        ${ins.ig_profile_views ?? null}, ${ins.ig_accounts_engaged ?? null}, ${ins.ig_new_followers ?? null},
        ${ins.yt_subscribers ?? null}, ${ins.yt_total_views ?? null}, ${ins.yt_total_videos ?? null},
        NOW()
      )
      ON CONFLICT (date) DO UPDATE SET
        fb_followers        = EXCLUDED.fb_followers,
        fb_reach            = EXCLUDED.fb_reach,
        fb_impressions      = EXCLUDED.fb_impressions,
        fb_engaged_users    = EXCLUDED.fb_engaged_users,
        fb_page_views       = EXCLUDED.fb_page_views,
        fb_new_fans         = EXCLUDED.fb_new_fans,
        ig_followers        = EXCLUDED.ig_followers,
        ig_reach            = EXCLUDED.ig_reach,
        ig_impressions      = EXCLUDED.ig_impressions,
        ig_profile_views    = EXCLUDED.ig_profile_views,
        ig_accounts_engaged = EXCLUDED.ig_accounts_engaged,
        ig_new_followers    = EXCLUDED.ig_new_followers,
        yt_subscribers      = EXCLUDED.yt_subscribers,
        yt_total_views      = EXCLUDED.yt_total_views,
        yt_total_videos     = EXCLUDED.yt_total_videos,
        snapshotted_at      = NOW()
    `;
    results.daily_insights = ins;
  } catch (e) {
    results.daily_insights = { error: e.message };
  }

  return res.status(200).json({ ok: true, date: today, results });
}
