// DB-backed Facebook endpoint — serves the same shape as /api/facebook
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

    const page = {
      name:            'Lakepointe Church',
      fanCount:        ins?.fb_followers || 0,
      followersCount:  ins?.fb_followers || 0,
    };

    const insights = {
      impressions:  null,                           // page_impressions deprecated June 2026
      reach:        null,                           // page_impressions_unique deprecated June 2026
      engagedUsers: ins?.fb_engaged_users ?? null,
      pageViews:    ins?.fb_page_views    ?? null,
      newFans:      ins?.fb_new_fans      ?? null,
    };

    // ── Posts ─────────────────────────────────────────────────────────────────
    const rows = await db`
      SELECT * FROM fb_posts ORDER BY created_time DESC LIMIT 50
    `;

    const posts = rows.map(p => ({
      id:           p.id,
      message:      p.message || '',
      story:        p.story   || '',
      createdTime:  p.created_time instanceof Date ? p.created_time.toISOString() : p.created_time,
      thumbnail:    p.thumbnail,
      type:         p.type,
      contentType:  p.content_type,
      permalink:    p.permalink,
      embedUrl:     p.embed_url,
      likeCount:    p.like_count    || 0,
      commentCount: p.comment_count || 0,
      shareCount:   p.share_count   || 0,
      engaged:      p.engaged       || 0,
      reach:        p.reach         || 0,
      engagement:   p.engaged       || 0,
    }));

    // ── Demographics ──────────────────────────────────────────────────────────
    const demoRows = await db`
      SELECT * FROM fb_demographics
      WHERE date = (SELECT MAX(date) FROM fb_demographics)
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
      SELECT * FROM fb_geo
      WHERE date = (SELECT MAX(date) FROM fb_geo)
      ORDER BY value DESC
    `;
    const geo = {
      cities:    geoRows.filter(r => r.geo_type === 'city').slice(0, 10).map(r => ({ name: r.name, value: r.pct, followers: r.value })),
      countries: geoRows.filter(r => r.geo_type === 'country').slice(0, 8).map(r => ({ name: r.name, value: r.pct, followers: r.value })),
    };

    return res.status(200).json({ page, insights, posts, demographics, geo, fetchedAt: new Date().toISOString() });
  } catch (err) {
    console.error('DB facebook error:', err);
    return res.status(500).json({ error: 'Failed to read Facebook data from database.', detail: err.message });
  }
}
