// One-time migration endpoint — creates all tables if they don't exist.
// Hit GET /api/db-migrate once after deploy to initialize the schema.
// Safe to run multiple times (all statements use IF NOT EXISTS).

import { sql } from '../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const db = sql();

  try {
    // ── Facebook posts ────────────────────────────────────────────────────────
    await db`
      CREATE TABLE IF NOT EXISTS fb_posts (
        id              TEXT PRIMARY KEY,
        message         TEXT,
        created_time    TIMESTAMPTZ,
        content_type    TEXT,
        type            TEXT,
        thumbnail       TEXT,
        permalink       TEXT,
        like_count      INTEGER DEFAULT 0,
        comment_count   INTEGER DEFAULT 0,
        share_count     INTEGER DEFAULT 0,
        engaged         INTEGER DEFAULT 0,
        snapshotted_at  TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // ── Instagram posts ───────────────────────────────────────────────────────
    await db`
      CREATE TABLE IF NOT EXISTS ig_posts (
        id                  TEXT PRIMARY KEY,
        caption             TEXT,
        timestamp           TIMESTAMPTZ,
        media_type          TEXT,
        content_type        TEXT,
        media_url           TEXT,
        thumbnail_url       TEXT,
        permalink           TEXT,
        like_count          INTEGER DEFAULT 0,
        comment_count       INTEGER DEFAULT 0,
        share_count         INTEGER DEFAULT 0,
        saved               INTEGER DEFAULT 0,
        reach               INTEGER DEFAULT 0,
        views               INTEGER DEFAULT 0,
        total_interactions  INTEGER DEFAULT 0,
        avg_watch_time      REAL DEFAULT 0,
        snapshotted_at      TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // ── YouTube videos ────────────────────────────────────────────────────────
    await db`
      CREATE TABLE IF NOT EXISTS yt_videos (
        id              TEXT PRIMARY KEY,
        title           TEXT,
        published_at    TIMESTAMPTZ,
        content_type    TEXT,
        duration_secs   INTEGER DEFAULT 0,
        view_count      INTEGER DEFAULT 0,
        like_count      INTEGER DEFAULT 0,
        comment_count   INTEGER DEFAULT 0,
        snapshotted_at  TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // ── Daily platform insights (followers + account-level metrics) ───────────
    await db`
      CREATE TABLE IF NOT EXISTS daily_insights (
        date              DATE PRIMARY KEY,
        fb_followers      INTEGER,
        fb_reach          INTEGER,
        fb_impressions    INTEGER,
        fb_engaged_users  INTEGER,
        fb_page_views     INTEGER,
        fb_new_fans       INTEGER,
        ig_followers      INTEGER,
        ig_reach          INTEGER,
        ig_impressions    INTEGER,
        ig_new_followers  INTEGER,
        yt_subscribers    INTEGER,
        yt_total_views    INTEGER,
        yt_total_videos   INTEGER,
        snapshotted_at    TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    return res.status(200).json({ ok: true, message: 'Schema ready — all tables created or already exist.' });
  } catch (err) {
    console.error('Migration error:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
