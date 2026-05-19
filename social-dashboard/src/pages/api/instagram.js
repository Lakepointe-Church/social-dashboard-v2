// ─────────────────────────────────────────────────────────────────────────────
// /api/instagram — Meta Graph API proxy for Instagram Business
// Fetches live Instagram stats, insights, recent media, and demographics.
// ─────────────────────────────────────────────────────────────────────────────

const IG_ID   = process.env.META_INSTAGRAM_ID;
const PAGE_ID = process.env.META_PAGE_ID;

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const token = process.env.META_PAGE_ACCESS_TOKEN;
  if (!token)   return res.status(500).json({ error: 'META_PAGE_ACCESS_TOKEN not configured.' });
  if (!IG_ID)   return res.status(500).json({ error: 'META_INSTAGRAM_ID not configured.' });

  const base = `https://graph.facebook.com/v21.0`;

  try {
    // ── 1. Account summary ────────────────────────────────────────────────────
    const accountRes = await fetch(
      `${base}/${IG_ID}?fields=name,username,biography,followers_count,follows_count,media_count,profile_picture_url,website&access_token=${token}`
    );
    const accountData = await accountRes.json();
    if (accountData.error) throw new Error(accountData.error.message);

    // ── 2. Account insights (reach, impressions, profile views) ──────────────
    const insightRes = await fetch(
      `${base}/${IG_ID}/insights?metric=reach,impressions,profile_views,accounts_engaged&period=day&since=${daysAgo(30)}&until=${today()}&access_token=${token}`
    );
    const insightData = await insightRes.json();
    const insights = parseInsights(insightData.data || []);

    // ── 3. Recent media (posts, reels, stories) ───────────────────────────────
    const mediaRes = await fetch(
      `${base}/${IG_ID}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count,insights.metric(reach,impressions,engagement,saved,plays)&limit=20&access_token=${token}`
    );
    const mediaData = await mediaRes.json();
    if (mediaData.error) throw new Error(mediaData.error.message);

    const media = (mediaData.data || []).map(m => {
      const mediaInsights = {};
      (m.insights?.data || []).forEach(i => {
        mediaInsights[i.name] = i.values?.[0]?.value || 0;
      });
      const reach    = mediaInsights.reach || 0;
      const engaged  = mediaInsights.engagement || 0;
      const engRate  = reach > 0 ? parseFloat((engaged / reach * 100).toFixed(2)) : 0;

      return {
        id:             m.id,
        caption:        m.caption || '',
        mediaType:      m.media_type,
        mediaUrl:       m.media_url || m.thumbnail_url || null,
        permalink:      m.permalink,
        timestamp:      m.timestamp,
        likeCount:      m.like_count || 0,
        commentsCount:  m.comments_count || 0,
        reach,
        impressions:    mediaInsights.impressions || 0,
        engagement:     engaged,
        saved:          mediaInsights.saved || 0,
        plays:          mediaInsights.plays || 0,
        engagementRate: engRate,
      };
    });

    // ── 4. Audience demographics ──────────────────────────────────────────────
    const demoRes = await fetch(
      `${base}/${IG_ID}/insights?metric=follower_demographics&period=lifetime&breakdown=age,gender&access_token=${token}`
    );
    const demoData = await demoRes.json();
    const demographics = parseDemographics(demoData.data || []);

    // ── 5. Geographic breakdown ───────────────────────────────────────────────
    const geoRes = await fetch(
      `${base}/${IG_ID}/insights?metric=follower_demographics&period=lifetime&breakdown=city,country&access_token=${token}`
    );
    const geoData = await geoRes.json();
    const geo = parseGeo(geoData.data || []);

    return res.status(200).json({
      account: {
        name:           accountData.name,
        username:       accountData.username,
        biography:      accountData.biography,
        followersCount: accountData.followers_count || 0,
        followsCount:   accountData.follows_count || 0,
        mediaCount:     accountData.media_count || 0,
        profilePicture: accountData.profile_picture_url || null,
        website:        accountData.website || null,
      },
      insights,
      media,
      demographics,
      geo,
      fetchedAt: new Date().toISOString(),
    });

  } catch (err) {
    console.error('Instagram API error:', err);
    return res.status(500).json({ error: 'Failed to fetch Instagram data.', detail: err.message });
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
    totals[metric.name] = (metric.values || []).reduce((s, v) => s + (v.value || 0), 0);
  });
  return {
    reach:        totals.reach || 0,
    impressions:  totals.impressions || 0,
    profileViews: totals.profile_views || 0,
    engaged:      totals.accounts_engaged || 0,
  };
}

function parseDemographics(data) {
  const metric = data.find(d => d.name === 'follower_demographics');
  if (!metric) return [];
  const raw = metric.total_value?.breakdowns?.[0]?.results || [];
  const ageGroups = {};
  raw.forEach(({ dimension_values, value }) => {
    const [gender, age] = dimension_values;
    if (!ageGroups[age]) ageGroups[age] = { age, M: 0, F: 0, U: 0 };
    const g = gender === 'M' ? 'M' : gender === 'F' ? 'F' : 'U';
    ageGroups[age][g] = (ageGroups[age][g] || 0) + value;
  });
  return Object.values(ageGroups).sort((a, b) => a.age.localeCompare(b.age));
}

function parseGeo(data) {
  const cities    = data.find(d => d.name === 'follower_demographics' && d.id?.includes('city'));
  const countries = data.find(d => d.name === 'follower_demographics' && d.id?.includes('country'));

  const parseBreakdown = (metric, limit) => {
    if (!metric) return [];
    const results = metric.total_value?.breakdowns?.[0]?.results || [];
    const total   = results.reduce((s, r) => s + r.value, 0);
    return results
      .sort((a, b) => b.value - a.value)
      .slice(0, limit)
      .map(r => ({
        name:  r.dimension_values?.[0] || 'Unknown',
        value: r.value,
        pct:   total > 0 ? parseFloat((r.value / total * 100).toFixed(1)) : 0,
      }));
  };

  return {
    cities:    parseBreakdown(cities, 10),
    countries: parseBreakdown(countries, 8),
  };
}
