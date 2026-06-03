// DB-backed Instagram endpoint — serves the same shape as /api/instagram
// but reads from Neon Postgres instead of calling Meta's Graph API live.

import { sql } from '../../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const db = sql();

  try {
    // ── Latest daily insights row ─────────────────────────────────────────────
    const [ins] = await db`
      SELECT * FROM daily_insights ORDER BY date DESC LIMIT 1
    `;

    const account = {
      name:           'Lakepointe',
      username:       'lpconnect',
      followersCount: ins?.ig_followers || 0,
      followsCount:   0,
      mediaCount:     0,
      profilePicture: null,
    };

    const insights = {
      reach:           ins?.ig_reach            || 0,
      impressions:     ins?.ig_impressions       || 0,
      profileVisits:   ins?.ig_profile_views     || 0,
      accountsEngaged: ins?.ig_accounts_engaged  || 0,
      totalInteractions: 0,
      shares:          0,
      newFollowers:    ins?.ig_new_followers     || 0,
    };

    // ── Posts ─────────────────────────────────────────────────────────────────
    const rows = await db`
      SELECT * FROM ig_posts ORDER BY timestamp DESC LIMIT 50
    `;

    const media = rows.map(p => ({
      id:             p.id,
      caption:        p.caption        || '',
      mediaType:      p.media_type,
      mediaUrl:       p.media_url,
      videoUrl:       p.video_url,
      thumbnail_url:  p.thumbnail_url,
      permalink:      p.permalink,
      timestamp:      p.timestamp instanceof Date ? p.timestamp.toISOString() : p.timestamp,
      contentType:    p.content_type,
      likeCount:      p.like_count          || 0,
      commentsCount:  p.comment_count       || 0,
      reach:          p.reach               || 0,
      saved:          p.saved               || 0,
      shares:         p.share_count         || 0,
      avgWatchTime:   p.avg_watch_time       || 0,
      engagement:     p.total_interactions   || 0,
      engagementRate: p.engagement_rate      || 0,
      likeRate:       p.like_rate            || 0,
      saveRate:       p.save_rate            || 0,
      shareRate:      p.share_rate           || 0,
      commentRate:    p.comment_rate         || 0,
      isCollab:       p.is_collab            || false,
    }));

    // ── Demographics ──────────────────────────────────────────────────────────
    const demoRows = await db`
      SELECT * FROM ig_demographics
      WHERE date = (SELECT MAX(date) FROM ig_demographics)
      ORDER BY age_group
    `;
    const demographics = demoRows.map(d => ({
      age: d.age_group,
      M:   d.male_count    || 0,
      F:   d.female_count  || 0,
      U:   d.unknown_count || 0,
    }));

    // ── Geo ───────────────────────────────────────────────────────────────────
    const geoRows = await db`
      SELECT * FROM ig_geo
      WHERE date = (SELECT MAX(date) FROM ig_geo)
      ORDER BY value DESC
    `;
    const geo = {
      cities:    geoRows.filter(r => r.geo_type === 'city').slice(0, 10).map(r => ({ name: r.name, value: r.value, pct: r.pct })),
      countries: geoRows.filter(r => r.geo_type === 'country').slice(0, 8).map(r => ({ name: r.name, value: r.value, pct: r.pct })),
    };

    return res.status(200).json({
      account, insights, media,
      demographics, geo,
      reachedDemographics: [],
      reachedGeo: { cities: [], countries: [] },
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('DB instagram error:', err);
    return res.status(500).json({ error: 'Failed to read Instagram data from database.', detail: err.message });
  }
}
