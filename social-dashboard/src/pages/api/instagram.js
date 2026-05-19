// ─────────────────────────────────────────────────────────────────────────────
// /api/instagram — Meta Graph API proxy for Instagram Business (@lpconnect)
// ─────────────────────────────────────────────────────────────────────────────

const IG_ID = process.env.META_INSTAGRAM_ID;

// ── Content type classification ───────────────────────────────────────────────
// Collab posts on Instagram have collaborator info in the coauthors field
// We also detect by caption patterns for known collab accounts
const COLLAB_MARKERS = ['josh howerton', 'live free', '@joshhowerton', '@livefreewjh'];

function classifyMedia(mediaType, caption, coauthors) {
  const cap = (caption || '').toLowerCase();
  // Collab — check coauthors field first, then caption markers
  if (coauthors?.length > 0) return 'collab';
  if (COLLAB_MARKERS.some(m => cap.includes(m))) return 'collab';
  // Type-based classification
  if (mediaType === 'REELS')          return 'reel';
  if (mediaType === 'IMAGE')          return 'photo';
  if (mediaType === 'CAROUSEL_ALBUM') return 'carousel';
  if (mediaType === 'VIDEO')          return 'video';
  return 'other';
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const token = process.env.META_PAGE_ACCESS_TOKEN;
  if (!token) return res.status(500).json({ error: 'META_PAGE_ACCESS_TOKEN not configured.' });
  if (!IG_ID) return res.status(500).json({ error: 'META_INSTAGRAM_ID not configured.' });

  const base = `https://graph.facebook.com/v21.0`;

  try {
    // ── 1. Account summary ────────────────────────────────────────────────────
    const accountRes  = await fetch(
      `${base}/${IG_ID}?fields=name,username,biography,followers_count,follows_count,media_count,profile_picture_url,website&access_token=${token}`
    );
    const accountData = await accountRes.json();
    if (accountData.error) throw new Error(accountData.error.message);

    // ── 2. Account insights (valid metrics only per API v21) ──────────────────
    const validMetrics = ['reach', 'impressions', 'profile_visits', 'total_interactions'];
    const insightResults = await Promise.allSettled(
      validMetrics.map(metric =>
        fetch(`${base}/${IG_ID}/insights?metric=${metric}&period=day&since=${daysAgo(30)}&until=${today()}&access_token=${token}`)
          .then(r => r.json())
      )
    );
    const allInsightData = [];
    insightResults.forEach(r => {
      if (r.status === 'fulfilled' && !r.value.error && r.value.data) {
        allInsightData.push(...r.value.data);
      }
    });
    const insights = parseInsights(allInsightData);

    // ── 3. Recent media ───────────────────────────────────────────────────────
    const mediaRes  = await fetch(
      `${base}/${IG_ID}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count,is_shared_to_feed&limit=50&access_token=${token}`
    );
    const mediaData = await mediaRes.json();
    if (mediaData.error) throw new Error(mediaData.error.message);

    // ── 4. Per-media insights (reach, saved, plays) ───────────────────────────
    const mediaItems = mediaData.data || [];
    const mediaWithInsights = await Promise.all(
      mediaItems.map(async m => {
        // Pick valid metrics based on media type
        const metricList = m.media_type === 'REELS'
          ? 'reach,saved,plays,total_interactions'
          : 'reach,saved,total_interactions';

        let mediaInsights = {};
        try {
          const miRes  = await fetch(`${base}/${m.id}/insights?metric=${metricList}&access_token=${token}`);
          const miData = await miRes.json();
          if (!miData.error && miData.data) {
            miData.data.forEach(i => { mediaInsights[i.name] = i.values?.[0]?.value || 0; });
          }
        } catch {}

        const reach    = mediaInsights.reach || 0;
        const engaged  = mediaInsights.total_interactions || (m.like_count || 0) + (m.comments_count || 0);
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
          saved:          mediaInsights.saved || 0,
          plays:          mediaInsights.plays || 0,
          engagement:     engaged,
          engagementRate: engRate,
          contentType:    classifyMedia(m.media_type, m.caption, null),
        };
      })
    );

    // ── 5. Demographics (lifetime) ────────────────────────────────────────────
    const demoRes  = await fetch(
      `${base}/${IG_ID}/insights?metric=follower_demographics&period=lifetime&breakdown=age,gender&access_token=${token}`
    );
    const demoData = await demoRes.json();
    const demographics = (!demoData.error) ? parseDemographics(demoData.data || []) : [];

    // ── 6. Geographic (lifetime) ──────────────────────────────────────────────
    const geoResults = await Promise.allSettled([
      fetch(`${base}/${IG_ID}/insights?metric=follower_demographics&period=lifetime&breakdown=city&access_token=${token}`).then(r => r.json()),
      fetch(`${base}/${IG_ID}/insights?metric=follower_demographics&period=lifetime&breakdown=country&access_token=${token}`).then(r => r.json()),
    ]);
    const geo = parseGeo(geoResults);

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
      media: mediaWithInsights,
      demographics,
      geo,
      fetchedAt: new Date().toISOString(),
    });

  } catch (err) {
    console.error('Instagram API error:', err);
    return res.status(500).json({ error: 'Failed to fetch Instagram data.', detail: err.message });
  }
}

function today()    { return Math.floor(Date.now() / 1000); }
function daysAgo(n) { return Math.floor((Date.now() - n * 24 * 60 * 60 * 1000) / 1000); }

function parseInsights(data) {
  const totals = {};
  data.forEach(metric => {
    totals[metric.name] = (metric.values || []).reduce((s, v) => s + (v.value || 0), 0);
  });
  return {
    reach:        totals.reach || 0,
    impressions:  totals.impressions || 0,
    profileViews: totals.profile_visits || 0,
    interactions: totals.total_interactions || 0,
  };
}

function parseDemographics(data) {
  const metric = data.find(d => d.name === 'follower_demographics');
  if (!metric) return [];
  const results = metric.total_value?.breakdowns?.[0]?.results || [];
  const ageGroups = {};
  results.forEach(({ dimension_values, value }) => {
    const [age, gender] = dimension_values;
    if (!ageGroups[age]) ageGroups[age] = { age, M: 0, F: 0, U: 0 };
    const g = gender === 'M' ? 'M' : gender === 'F' ? 'F' : 'U';
    ageGroups[age][g] = (ageGroups[age][g] || 0) + value;
  });
  return Object.values(ageGroups).sort((a, b) => a.age.localeCompare(b.age));
}

function parseGeo(geoResults) {
  const parseBreakdown = (result, limit) => {
    if (result.status !== 'fulfilled' || result.value.error) return [];
    const data    = result.value.data || [];
    const metric  = data.find(d => d.name === 'follower_demographics');
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
    cities:    parseBreakdown(geoResults[0], 10),
    countries: parseBreakdown(geoResults[1], 8),
  };
}
