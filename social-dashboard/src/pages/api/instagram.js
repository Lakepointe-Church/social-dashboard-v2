// ─────────────────────────────────────────────────────────────────────────────
// /api/instagram — Meta Graph API proxy for Instagram Business (@lpconnect)
// ─────────────────────────────────────────────────────────────────────────────

const IG_ID = process.env.META_INSTAGRAM_ID;

const COLLAB_MARKERS = ['josh howerton', 'live free', '@joshhowerton', '@livefreewjh'];

function classifyMedia(mediaType, caption) {
  const cap = (caption || '').toLowerCase();
  if (COLLAB_MARKERS.some(m => cap.includes(m))) return 'collab';
  // VIDEO and REELS both become 'reel'
  if (mediaType === 'REELS' || mediaType === 'VIDEO') return 'reel';
  if (mediaType === 'IMAGE')          return 'photo';
  if (mediaType === 'CAROUSEL_ALBUM') return 'carousel';
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
    const accountRes = await fetch(
      `${base}/${IG_ID}?fields=name,username,biography,followers_count,follows_count,media_count,profile_picture_url,website&access_token=${token}`
    );
    const accountData = await accountRes.json();
    if (accountData.error) throw new Error(accountData.error.message);

    // ── 2. Account-level insights ─────────────────────────────────────────────
    const accountMetrics = ['reach', 'impressions', 'profile_visits', 'total_interactions', 'accounts_engaged', 'shares'];
    const insightResults = await Promise.allSettled(
      accountMetrics.map(metric =>
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

    // ── 3. New followers ──────────────────────────────────────────────────────
    let newFollowers = 0;
    try {
      const followRes = await fetch(
        `${base}/${IG_ID}/insights?metric=follower_count&period=day&since=${daysAgo(30)}&until=${today()}&access_token=${token}`
      );
      const followData = await followRes.json();
      if (!followData.error && followData.data?.[0]?.values) {
        newFollowers = followData.data[0].values.reduce((s, v) => s + (v.value || 0), 0);
      }
    } catch {}

    // ── 4. Recent media with per-post insights ────────────────────────────────
    const mediaRes = await fetch(
      `${base}/${IG_ID}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count&limit=50&access_token=${token}`
    );
    const mediaData = await mediaRes.json();
    if (mediaData.error) throw new Error(mediaData.error.message);

    const mediaItems = mediaData.data || [];

    const mediaWithInsights = await Promise.all(
      mediaItems.map(async m => {
        const isReel = m.media_type === 'REELS' || m.media_type === 'VIDEO';
        const photoMetrics = ['reach', 'saved', 'total_interactions', 'shares'];
        // plays and clips_replays_count deprecated in Graph API v22.0+
        const reelMetrics  = ['views', 'saved', 'total_interactions', 'shares', 'ig_reels_avg_watch_time'];
        const metricList   = isReel ? reelMetrics.join(',') : photoMetrics.join(',');

        let mi = {};
        try {
          const miRes  = await fetch(`${base}/${m.id}/insights?metric=${metricList}&access_token=${token}`);
          const miData = await miRes.json();
          if (miData.error) {
            console.error(`[IG insights] ${m.media_type} ${m.id}: ${miData.error.message}`);
          } else if (miData.data) {
            miData.data.forEach(i => { mi[i.name] = i.values?.[0]?.value ?? i.value ?? 0; });
          }
        } catch (e) {
          console.error(`[IG insights] fetch failed for ${m.id}:`, e.message);
        }

        const reach    = isReel ? (mi.views || 0) : (mi.reach || 0);
        const likes    = m.like_count || 0;
        const comments = m.comments_count || 0;
        const saves    = mi.saved || 0;
        const shares   = mi.shares || 0;
        const engaged  = mi.total_interactions || (likes + comments);
        const engRate  = reach > 0 ? parseFloat((engaged / reach * 100).toFixed(2)) : 0;

        const likeRate    = reach > 0 ? parseFloat((likes   / reach * 100).toFixed(2)) : 0;
        const saveRate    = reach > 0 ? parseFloat((saves   / reach * 100).toFixed(2)) : 0;
        const shareRate   = reach > 0 ? parseFloat((shares  / reach * 100).toFixed(2)) : 0;
        const commentRate = reach > 0 ? parseFloat((comments / reach * 100).toFixed(2)) : 0;

        return {
          id:             m.id,
          caption:        m.caption || '',
          mediaType:      m.media_type,
          mediaUrl:       isReel ? (m.thumbnail_url || null) : (m.media_url || m.thumbnail_url || null),
          permalink:      m.permalink,
          timestamp:      m.timestamp,
          likeCount:      likes,
          commentsCount:  comments,
          reach,
          saved:          saves,
          shares,
          avgWatchTime:   mi.ig_reels_avg_watch_time || 0,
          engagement:     engaged,
          engagementRate: engRate,
          likeRate,
          saveRate,
          shareRate,
          commentRate,
          contentType:    classifyMedia(m.media_type, m.caption),
        };
      })
    );

    // ── 4b. Incoming collabs — Josh posts, Lakepointe invited as collaborator ──
    const incomingCollabMedia = [];
    try {
      // Find Josh's IG account via Business Discovery
      const discRes  = await fetch(
        `${base}/${IG_ID}?fields=business_discovery.fields(id,username)&username=joshhowerton&access_token=${token}`
      );
      const discData = await discRes.json();
      const joshId   = discData.business_discovery?.id;

      if (joshId) {
        const joshMediaRes = await fetch(
          `${base}/${joshId}/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count,collaborators&limit=50&access_token=${token}`
        );
        const joshMediaData = await joshMediaRes.json();

        if (!joshMediaData.error) {
          const collabPosts = (joshMediaData.data || []).filter(m =>
            (m.collaborators?.data || []).some(c => c.id === IG_ID)
          );

          const processed = await Promise.all(
            collabPosts.map(async m => {
              const isReel = m.media_type === 'REELS' || m.media_type === 'VIDEO';
              const metricList = isReel
                ? 'views,saved,total_interactions,shares,ig_reels_avg_watch_time'
                : 'reach,saved,total_interactions,shares';

              let mi = {};
              try {
                const miRes  = await fetch(`${base}/${m.id}/insights?metric=${metricList}&access_token=${token}`);
                const miData = await miRes.json();
                if (miData.error) {
                  console.error(`[IG collab insights] ${m.id}: ${miData.error.message}`);
                } else if (miData.data) {
                  miData.data.forEach(i => { mi[i.name] = i.values?.[0]?.value ?? i.value ?? 0; });
                }
              } catch (e) {
                console.error(`[IG collab insights] fetch failed for ${m.id}:`, e.message);
              }

              const reach    = isReel ? (mi.views || 0) : (mi.reach || 0);
              const likes    = m.like_count || 0;
              const comments = m.comments_count || 0;
              const saves    = mi.saved || 0;
              const shares   = mi.shares || 0;
              const engaged  = mi.total_interactions || (likes + comments);
              const engRate  = reach > 0 ? parseFloat((engaged / reach * 100).toFixed(2)) : 0;

              return {
                id:             m.id,
                caption:        m.caption || '',
                mediaType:      m.media_type,
                mediaUrl:       isReel ? (m.thumbnail_url || null) : (m.media_url || m.thumbnail_url || null),
                permalink:      m.permalink,
                timestamp:      m.timestamp,
                likeCount:      likes,
                commentsCount:  comments,
                reach,
                saved:          saves,
                shares,
                avgWatchTime:   mi.ig_reels_avg_watch_time || 0,
                engagement:     engaged,
                engagementRate: engRate,
                likeRate:    reach > 0 ? parseFloat((likes    / reach * 100).toFixed(2)) : 0,
                saveRate:    reach > 0 ? parseFloat((saves    / reach * 100).toFixed(2)) : 0,
                shareRate:   reach > 0 ? parseFloat((shares   / reach * 100).toFixed(2)) : 0,
                commentRate: reach > 0 ? parseFloat((comments / reach * 100).toFixed(2)) : 0,
                contentType: 'collab',
              };
            })
          );
          incomingCollabMedia.push(...processed);
        } else {
          console.error('[IG incoming collabs] Josh media error:', joshMediaData.error?.message);
        }
      } else {
        console.error('[IG incoming collabs] Business Discovery returned no id:', JSON.stringify(discData));
      }
    } catch (e) {
      console.error('[IG incoming collabs] unexpected error:', e.message);
    }

    // Merge Lakepointe's own media + incoming collabs, deduplicating by post ID
    const existingIds = new Set(mediaWithInsights.map(m => m.id));
    const allMedia    = [
      ...mediaWithInsights,
      ...incomingCollabMedia.filter(m => !existingIds.has(m.id)),
    ];

    // ── 5. Demographics ───────────────────────────────────────────────────────
    const demoRes  = await fetch(`${base}/${IG_ID}/insights?metric=follower_demographics&period=lifetime&breakdown=age,gender&metric_type=total_value&access_token=${token}`);
    const demoData = await demoRes.json();
    const demographics = (!demoData.error) ? parseDemographics(demoData.data || []) : [];

    // ── 6. Geographic ─────────────────────────────────────────────────────────
    const geoResults = await Promise.allSettled([
      fetch(`${base}/${IG_ID}/insights?metric=follower_demographics&period=lifetime&breakdown=city&metric_type=total_value&access_token=${token}`).then(r => r.json()),
      fetch(`${base}/${IG_ID}/insights?metric=follower_demographics&period=lifetime&breakdown=country&metric_type=total_value&access_token=${token}`).then(r => r.json()),
    ]);
    const geo = parseGeo(geoResults);

    // If debug flag is present, include raw responses so we can inspect what Meta returned
    const rawMode = req.query && (req.query.raw === '1' || req.query.raw === 'true');

    const payload = {
      account: {
        name:           accountData.name,
        username:       accountData.username,
        followersCount: accountData.followers_count || 0,
        followsCount:   accountData.follows_count   || 0,
        mediaCount:     accountData.media_count      || 0,
        profilePicture: accountData.profile_picture_url || null,
      },
      insights: { ...insights, newFollowers },
      media:    allMedia,
      demographics,
      geo,
      fetchedAt: new Date().toISOString(),
    };

    if (rawMode) {
      payload.raw = {
        demographicsRaw: demoData,
        geoRaw: geoResults,
      };
    }

    return res.status(200).json(payload);

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
    engaged:      totals.accounts_engaged || 0,
    shares:       totals.shares || 0,
  };
}

function parseDemographics(data) {
  const metric = data.find(d => d.name === 'follower_demographics');
  if (!metric) return [];
  const results = metric.total_value?.breakdowns?.[0]?.results || [];
  const ageGroups = {};
  results.forEach(({ dimension_values, value }) => {
    const [age, gender] = dimension_values;
    if (!ageGroups[age]) ageGroups[age] = { age, male: 0, female: 0, unknown: 0 };
    const g = gender === 'M' ? 'male' : gender === 'F' ? 'female' : 'unknown';
    ageGroups[age][g] = (ageGroups[age][g] || 0) + value;
  });
  const total = Object.values(ageGroups).reduce((sum, group) => sum + group.male + group.female + group.unknown, 0);
  return Object.values(ageGroups)
    .sort((a, b) => a.age.localeCompare(b.age))
    .map(group => ({
      age: group.age,
      male: total > 0 ? parseFloat(((group.male / total) * 100).toFixed(1)) : 0,
      female: total > 0 ? parseFloat(((group.female / total) * 100).toFixed(1)) : 0,
      unknown: total > 0 ? parseFloat(((group.unknown / total) * 100).toFixed(1)) : 0,
    }));
}

function parseGeo(geoResults) {
  const parseBreakdown = (result, limit) => {
    if (result.status !== 'fulfilled' || result.value.error) return [];
    const metric  = (result.value.data || []).find(d => d.name === 'follower_demographics');
    if (!metric) return [];
    const results = metric.total_value?.breakdowns?.[0]?.results || [];
    const total   = results.reduce((s, r) => s + r.value, 0);
    return results.sort((a, b) => b.value - a.value).slice(0, limit).map(r => ({
      name:      r.dimension_values?.[0] || 'Unknown',
      followers: r.value,
      value:     total > 0 ? parseFloat((r.value / total * 100).toFixed(1)) : 0,
      pct:       total > 0 ? parseFloat((r.value / total * 100).toFixed(1)) : 0,
    }));
  };
  return {
    cities:    parseBreakdown(geoResults[0], 10),
    countries: parseBreakdown(geoResults[1], 8),
  };
}
