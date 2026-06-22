// ─────────────────────────────────────────────────────────────────────────────
// /api/facebook — Meta Graph API proxy
// ─────────────────────────────────────────────────────────────────────────────

import crypto from 'crypto';

const PAGE_ID = process.env.META_PAGE_ID;

// ── Content type classification ───────────────────────────────────────────────
const STREAM_MARKERS = ['thank you for joining us today', 'connect with us:', 'lp.social/connectcard'];

function classifyPost(message, type) {
  const msg = (message || '').toLowerCase();
  // Service stream — always first check
  if (STREAM_MARKERS.some(m => msg.includes(m))) return 'stream';
  // Photo / carousel
  if (type === 'photo' || type === 'album') return 'photo';
  // Video / reel
  if (type === 'video_inline' || type === 'video') return 'video';
  // Everything else
  return 'other';
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const token = process.env.META_PAGE_ACCESS_TOKEN;
  if (!token)   return res.status(500).json({ error: 'META_PAGE_ACCESS_TOKEN not configured.' });
  if (!PAGE_ID) return res.status(500).json({ error: 'META_PAGE_ID not configured.' });

  const base = `https://graph.facebook.com/v25.0`;
  const secret = process.env.META_APP_SECRET;
  if (!secret) return res.status(500).json({ error: 'META_APP_SECRET not configured.' });
  const proof = crypto.createHmac('sha256', secret).update(token).digest('hex');

  const rawMode = req.query && (req.query.raw === '1' || req.query.raw === 'true');

  try {
    // ── 1. Page summary ───────────────────────────────────────────────────────
    const pageRes  = await fetch(`${base}/${PAGE_ID}?fields=name,fan_count,followers_count,link&access_token=${token}&appsecret_proof=${proof}`);
    const pageData = await pageRes.json();
    if (pageData.error) throw new Error(pageData.error.message);

    // ── 2. Page insights ──────────────────────────────────────────────────────
    // page_impressions and page_impressions_unique deprecated June 2026 — no valid replacement found
    // page_post_engagements: proxy for deprecated page_engaged_users (counts actions, not unique people)
    // page_daily_follows_unique: replaces deprecated page_fan_adds
    const insightMetrics = ['page_post_engagements', 'page_views_total', 'page_daily_follows_unique', 'page_video_views'];
    const insightResults = await Promise.allSettled(
      insightMetrics.map(metric =>
        fetch(`${base}/${PAGE_ID}/insights?metric=${metric}&period=day&since=${daysAgo(28)}&until=${today()}&access_token=${token}&appsecret_proof=${proof}`)
          .then(r => r.json())
      )
    );
    const insightErrors = {};
    const allInsightData = [];
    insightResults.forEach((r, i) => {
      const metricName = insightMetrics[i];
      if (r.status === 'fulfilled' && r.value.error) {
        insightErrors[metricName] = r.value.error.message;
        console.error(`[FB insights] ${metricName}: ${r.value.error.message}`);
      } else if (r.status === 'fulfilled' && r.value.data) {
        allInsightData.push(...r.value.data);
      } else if (r.status === 'rejected') {
        insightErrors[metricName] = String(r.reason);
        console.error(`[FB insights] ${metricName} rejected: ${r.reason}`);
      }
    });
    const insights = parseInsights(allInsightData);

    // ── 3. Recent posts with per-post insights ────────────────────────────────
    const postsRes  = await fetch(
      `${base}/${PAGE_ID}/posts?fields=id,message,story,created_time,attachments,likes.summary(true),comments.summary(true),shares,permalink_url&limit=50&access_token=${token}&appsecret_proof=${proof}`
    );
    const postsData = await postsRes.json();
    if (postsData.error) throw new Error(postsData.error.message);

    // post_impressions_unique, post_engaged_users, and all post reach/impression variants
    // returned (#100) invalid metric as of June 2026 probe — no per-post reach API exists.
    // engagement is derived from likes+comments+shares (documented — no single API metric available).
    const posts = (postsData.data || []).map(p => {
      const likes    = p.likes?.summary?.total_count || 0;
      const comments = p.comments?.summary?.total_count || 0;
      const shares   = p.shares?.count || 0;
      const type     = p.attachments?.data?.[0]?.type || 'status';
      const message  = p.message || p.story || '';
      return {
        id:           p.id,
        message,
        createdTime:  p.created_time,
        thumbnail:    p.attachments?.data?.[0]?.media?.image?.src || null,
        type,
        contentType:  classifyPost(message, type),
        permalink:    p.permalink_url || null,
        engaged:      likes + comments + shares,
        likeCount:    likes,
        commentCount: comments,
        shareCount:   shares,
        reach:        null,
        engagement:   likes + comments + shares,
      };
    });

    // ── 4. Demographics ───────────────────────────────────────────────────────
    const demoRes  = await fetch(`${base}/${PAGE_ID}/insights?metric=page_fans_gender_age&period=lifetime&access_token=${token}&appsecret_proof=${proof}`);
    const demoData = await demoRes.json();
    const demographics = (!demoData.error) ? parseDemographics(demoData.data || []) : [];

    // ── 5. Geographic ─────────────────────────────────────────────────────────
    const geoResults = await Promise.allSettled([
      fetch(`${base}/${PAGE_ID}/insights?metric=page_fans_city&period=lifetime&access_token=${token}&appsecret_proof=${proof}`).then(r => r.json()),
      fetch(`${base}/${PAGE_ID}/insights?metric=page_fans_country&period=lifetime&access_token=${token}&appsecret_proof=${proof}`).then(r => r.json()),
    ]);
    const geoRawData = [];
    geoResults.forEach(r => {
      if (r.status === 'fulfilled' && !r.value.error && r.value.data) geoRawData.push(...r.value.data);
    });
    const geo = parseGeo(geoRawData);

    const payload = {
      page: { name: pageData.name, fanCount: pageData.fan_count || 0, followersCount: pageData.followers_count || 0 },
      insights,
      insightErrors,
      posts,
      demographics,
      geo,
      fetchedAt: new Date().toISOString(),
    };

    if (rawMode) {
      payload.raw = { pageInsightsRaw: allInsightData, insightErrors };
    }

    return res.status(200).json(payload);

  } catch (err) {
    console.error('Facebook API error:', err);
    return res.status(500).json({ error: 'Failed to fetch Facebook data.', detail: err.message });
  }
}

function today()    { return Math.floor(Date.now() / 1000); }
function daysAgo(n) { return Math.floor((Date.now() - n * 24 * 60 * 60 * 1000) / 1000); }

function parseInsights(data) {
  const found = new Set(data.map(m => m.name));
  const totals = {};
  data.forEach(metric => {
    totals[metric.name] = (metric.values || []).reduce((s, v) => {
      const val = typeof v.value === 'object' ? Object.values(v.value).reduce((a, b) => a + b, 0) : (v.value || 0);
      return s + val;
    }, 0);
  });
  // null = metric deprecated/unavailable; 0 = genuine zero
  // page_impressions + page_impressions_unique: deprecated June 2026, no valid replacement
  // page_post_engagements: proxy for deprecated page_engaged_users (actions not unique people)
  // page_daily_follows_unique: replaces deprecated page_fan_adds
  return {
    impressions:  null,
    reach:        null,
    engagedUsers: found.has('page_post_engagements')    ? totals.page_post_engagements    : null,
    pageViews:    found.has('page_views_total')          ? totals.page_views_total          : null,
    newFans:      found.has('page_daily_follows_unique') ? totals.page_daily_follows_unique : null,
    videoViews:   found.has('page_video_views')          ? totals.page_video_views          : null,
  };
}

function parseDemographics(data) {
  const metric = data.find(d => d.name === 'page_fans_gender_age');
  if (!metric) return [];
  const raw = metric.values?.[0]?.value || {};
  const ageGroups = {};
  Object.entries(raw).forEach(([key, value]) => {
    const [gender, age] = key.split('.');
    if (!ageGroups[age]) ageGroups[age] = { age, M: 0, F: 0, U: 0 };
    ageGroups[age][gender] = (ageGroups[age][gender] || 0) + value;
  });
  return Object.values(ageGroups).sort((a, b) => a.age.localeCompare(b.age));
}

function parseGeo(data) {
  const cities    = data.find(d => d.name === 'page_fans_city');
  const countries = data.find(d => d.name === 'page_fans_country');
  const cityRaw    = cities?.values?.[0]?.value || {};
  const countryRaw = countries?.values?.[0]?.value || {};
  const totalC = Object.values(cityRaw).reduce((s, v) => s + v, 0);
  const totalN = Object.values(countryRaw).reduce((s, v) => s + v, 0);
  return {
    cities:    Object.entries(cityRaw).sort(([,a],[,b])=>b-a).slice(0,10).map(([name,value])=>({ name, value, pct: totalC>0?parseFloat((value/totalC*100).toFixed(1)):0 })),
    countries: Object.entries(countryRaw).sort(([,a],[,b])=>b-a).slice(0,8).map(([name,value])=>({ name, value, pct: totalN>0?parseFloat((value/totalN*100).toFixed(1)):0 })),
  };
}
