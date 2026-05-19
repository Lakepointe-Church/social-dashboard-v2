// ─────────────────────────────────────────────────────────────────────────────
// /api/facebook — Meta Graph API proxy
// Fetches live Facebook Page stats, insights, posts, and demographics.
// ─────────────────────────────────────────────────────────────────────────────

const PAGE_ID = process.env.META_PAGE_ID;

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const token = process.env.META_PAGE_ACCESS_TOKEN;
  if (!token) return res.status(500).json({ error: 'META_PAGE_ACCESS_TOKEN not configured.' });
  if (!PAGE_ID) return res.status(500).json({ error: 'META_PAGE_ID not configured.' });

  const base = `https://graph.facebook.com/v21.0`;

  try {
    // ── 1. Page summary (followers, fan count) ────────────────────────────────
    const pageRes = await fetch(
      `${base}/${PAGE_ID}?fields=name,fan_count,followers_count,link&access_token=${token}`
    );
    const pageData = await pageRes.json();
    if (pageData.error) throw new Error(pageData.error.message);

    // ── 2. Page insights ──────────────────────────────────────────────────────
    // Metrics: page_impressions (reach), page_engaged_users, page_views_total
    const insightMetrics = [
      'page_impressions',
      'page_impressions_unique',
      'page_engaged_users',
      'page_views_total',
      'page_video_views',
    ].join(',');

    const insightRes = await fetch(
      `${base}/${PAGE_ID}/insights?metric=${insightMetrics}&period=day&since=${daysAgo(30)}&until=${today()}&access_token=${token}`
    );
    const insightData = await insightRes.json();
    if (insightData.error) throw new Error(insightData.error.message);

    // Parse insights into summary totals
    const insights = parseInsights(insightData.data || []);

    // ── 3. Recent posts ───────────────────────────────────────────────────────
    const postsRes = await fetch(
      `${base}/${PAGE_ID}/posts?fields=id,message,story,created_time,attachments,insights.metric(post_impressions,post_impressions_unique,post_engaged_users,post_reactions_by_type_total,post_clicks)&limit=20&access_token=${token}`
    );
    const postsData = await postsRes.json();
    if (postsData.error) throw new Error(postsData.error.message);

    const posts = (postsData.data || []).map(p => {
      const postInsights = {};
      (p.insights?.data || []).forEach(m => {
        postInsights[m.name] = m.values?.[0]?.value || 0;
      });
      const reactions = postInsights.post_reactions_by_type_total || {};
      const totalReactions = Object.values(reactions).reduce((s, v) => s + v, 0);
      const reach = postInsights.post_impressions_unique || 0;
      const engaged = postInsights.post_engaged_users || 0;
      const engRate = reach > 0 ? parseFloat((engaged / reach * 100).toFixed(2)) : 0;

      return {
        id: p.id,
        message: p.message || p.story || '',
        createdTime: p.created_time,
        thumbnail: p.attachments?.data?.[0]?.media?.image?.src || null,
        type: p.attachments?.data?.[0]?.type || 'status',
        reach,
        impressions: postInsights.post_impressions || 0,
        engaged,
        reactions: totalReactions,
        clicks: postInsights.post_clicks || 0,
        engagementRate: engRate,
      };
    });

    // ── 4. Demographic insights ───────────────────────────────────────────────
    const demoRes = await fetch(
      `${base}/${PAGE_ID}/insights?metric=page_fans_gender_age&period=lifetime&access_token=${token}`
    );
    const demoData = await demoRes.json();
    const demographics = parseDemographics(demoData.data || []);

    // ── 5. Geographic insights ────────────────────────────────────────────────
    const geoRes = await fetch(
      `${base}/${PAGE_ID}/insights?metric=page_fans_city,page_fans_country&period=lifetime&access_token=${token}`
    );
    const geoData = await geoRes.json();
    const geo = parseGeo(geoData.data || []);

    return res.status(200).json({
      page: {
        name: pageData.name,
        fanCount: pageData.fan_count || 0,
        followersCount: pageData.followers_count || 0,
        link: pageData.link || '',
      },
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

// ── Helpers ───────────────────────────────────────────────────────────────────
function today() {
  return Math.floor(Date.now() / 1000);
}

function daysAgo(n) {
  return Math.floor((Date.now() - n * 24 * 60 * 60 * 1000) / 1000);
}

function parseInsights(data) {
  const totals = {};
  data.forEach(metric => {
    const total = (metric.values || []).reduce((s, v) => {
      const val = typeof v.value === 'object' ? Object.values(v.value).reduce((a, b) => a + b, 0) : (v.value || 0);
      return s + val;
    }, 0);
    totals[metric.name] = total;
  });
  return {
    impressions:    totals.page_impressions || 0,
    reach:          totals.page_impressions_unique || 0,
    engagedUsers:   totals.page_engaged_users || 0,
    pageViews:      totals.page_views_total || 0,
    videoViews:     totals.page_video_views || 0,
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

  const totalCityFans    = Object.values(cityRaw).reduce((s, v) => s + v, 0);
  const totalCountryFans = Object.values(countryRaw).reduce((s, v) => s + v, 0);

  return {
    cities: Object.entries(cityRaw)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, value]) => ({ name, value, pct: totalCityFans > 0 ? parseFloat((value / totalCityFans * 100).toFixed(1)) : 0 })),
    countries: Object.entries(countryRaw)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([name, value]) => ({ name, value, pct: totalCountryFans > 0 ? parseFloat((value / totalCountryFans * 100).toFixed(1)) : 0 })),
  };
}
