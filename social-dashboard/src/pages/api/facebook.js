// ─────────────────────────────────────────────────────────────────────────────
// /api/facebook — Meta Graph API proxy
// ─────────────────────────────────────────────────────────────────────────────

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

  const base = `https://graph.facebook.com/v21.0`;

  try {
    // ── 1. Page summary ───────────────────────────────────────────────────────
    const pageRes  = await fetch(`${base}/${PAGE_ID}?fields=name,fan_count,followers_count,link&access_token=${token}`);
    const pageData = await pageRes.json();
    if (pageData.error) throw new Error(pageData.error.message);

    // ── 2. Page insights ──────────────────────────────────────────────────────
    const insightMetrics = ['page_impressions', 'page_impressions_unique', 'page_engaged_users', 'page_views_total'];
    const insightResults = await Promise.allSettled(
      insightMetrics.map(metric =>
        fetch(`${base}/${PAGE_ID}/insights?metric=${metric}&period=week&since=${daysAgo(28)}&until=${today()}&access_token=${token}`)
          .then(r => r.json())
      )
    );
    const allInsightData = [];
    insightResults.forEach(r => {
      if (r.status === 'fulfilled' && !r.value.error && r.value.data) allInsightData.push(...r.value.data);
    });
    const insights = parseInsights(allInsightData);

    // ── 3. Recent posts with likes + comments + shares ────────────────────────
    const postsRes  = await fetch(
      `${base}/${PAGE_ID}/posts?fields=id,message,story,created_time,attachments,likes.summary(true),comments.summary(true),shares&limit=50&access_token=${token}`
    );
    const postsData = await postsRes.json();
    if (postsData.error) throw new Error(postsData.error.message);

    const posts = (postsData.data || []).map(p => {
      const likes    = p.likes?.summary?.total_count || 0;
      const comments = p.comments?.summary?.total_count || 0;
      const shares   = p.shares?.count || 0;
      const engaged  = likes + comments + shares;
      const reach      = 0;
      const engagement = engaged;
      const type       = p.attachments?.data?.[0]?.type || 'status';
      const message    = p.message || p.story || '';

      return {
        id:           p.id,
        message,
        createdTime:  p.created_time,
        thumbnail:    p.attachments?.data?.[0]?.media?.image?.src || null,
        type,
        contentType:  classifyPost(message, type), // 'stream' | 'photo' | 'video' | 'other'
        engaged,
        likeCount:    likes,
        commentCount: comments,
        shareCount:   shares,
        reach,
        engagement,
      };
    });

    // ── 4. Demographics ───────────────────────────────────────────────────────
    const demoRes  = await fetch(`${base}/${PAGE_ID}/insights?metric=page_fans_gender_age&period=lifetime&access_token=${token}`);
    const demoData = await demoRes.json();
    const demographics = (!demoData.error) ? parseDemographics(demoData.data || []) : [];

    // ── 5. Geographic ─────────────────────────────────────────────────────────
    const geoResults = await Promise.allSettled([
      fetch(`${base}/${PAGE_ID}/insights?metric=page_fans_city&period=lifetime&access_token=${token}`).then(r => r.json()),
      fetch(`${base}/${PAGE_ID}/insights?metric=page_fans_country&period=lifetime&access_token=${token}`).then(r => r.json()),
    ]);
    const geoRawData = [];
    geoResults.forEach(r => {
      if (r.status === 'fulfilled' && !r.value.error && r.value.data) geoRawData.push(...r.value.data);
    });
    const geo = parseGeo(geoRawData);

    return res.status(200).json({
      page: { name: pageData.name, fanCount: pageData.fan_count || 0, followersCount: pageData.followers_count || 0 },
      insights,
      posts,
      demographics,
      geo,
      fetchedAt: new Date().toISOString(),
    });

  } catch (err) {
    console.error('Facebook API error:', err);
    return res.status(500).json({ error: 'Failed to fetch Facebook data.', detail: err.message });
  }
}

function today()    { return Math.floor(Date.now() / 1000); }
function daysAgo(n) { return Math.floor((Date.now() - n * 24 * 60 * 60 * 1000) / 1000); }

function parseInsights(data) {
  const totals = {};
  data.forEach(metric => {
    totals[metric.name] = (metric.values || []).reduce((s, v) => {
      const val = typeof v.value === 'object' ? Object.values(v.value).reduce((a, b) => a + b, 0) : (v.value || 0);
      return s + val;
    }, 0);
  });
  return { impressions: totals.page_impressions || 0, reach: totals.page_impressions_unique || 0, engagedUsers: totals.page_engaged_users || 0, pageViews: totals.page_views_total || 0 };
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
