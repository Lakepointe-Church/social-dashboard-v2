// One-time migration endpoint — creates all tables and adds any missing columns.
// Safe to run multiple times (IF NOT EXISTS / IF NOT EXISTS on columns).
// Hit GET /api/db-migrate once after any schema change.

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
        story           TEXT,
        created_time    TIMESTAMPTZ,
        content_type    TEXT,
        type            TEXT,
        thumbnail       TEXT,
        permalink       TEXT,
        embed_url       TEXT,
        like_count      INTEGER DEFAULT 0,
        comment_count   INTEGER DEFAULT 0,
        share_count     INTEGER DEFAULT 0,
        engaged         INTEGER DEFAULT 0,
        reach           INTEGER DEFAULT 0,
        snapshotted_at  TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    // Add any columns that may be missing from an earlier schema
    await db`ALTER TABLE fb_posts ADD COLUMN IF NOT EXISTS story TEXT`;
    await db`ALTER TABLE fb_posts ADD COLUMN IF NOT EXISTS embed_url TEXT`;
    await db`ALTER TABLE fb_posts ADD COLUMN IF NOT EXISTS reach INTEGER DEFAULT 0`;

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
        video_url           TEXT,
        permalink           TEXT,
        is_collab           BOOLEAN DEFAULT FALSE,
        like_count          INTEGER DEFAULT 0,
        comment_count       INTEGER DEFAULT 0,
        share_count         INTEGER DEFAULT 0,
        saved               INTEGER DEFAULT 0,
        reach               INTEGER DEFAULT 0,
        views               INTEGER DEFAULT 0,
        total_interactions  INTEGER DEFAULT 0,
        avg_watch_time      REAL DEFAULT 0,
        engagement_rate     REAL DEFAULT 0,
        like_rate           REAL DEFAULT 0,
        save_rate           REAL DEFAULT 0,
        share_rate          REAL DEFAULT 0,
        comment_rate        REAL DEFAULT 0,
        snapshotted_at      TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    await db`ALTER TABLE ig_posts ADD COLUMN IF NOT EXISTS video_url TEXT`;
    await db`ALTER TABLE ig_posts ADD COLUMN IF NOT EXISTS is_collab BOOLEAN DEFAULT FALSE`;
    await db`ALTER TABLE ig_posts ADD COLUMN IF NOT EXISTS engagement_rate REAL DEFAULT 0`;
    await db`ALTER TABLE ig_posts ADD COLUMN IF NOT EXISTS like_rate REAL DEFAULT 0`;
    await db`ALTER TABLE ig_posts ADD COLUMN IF NOT EXISTS save_rate REAL DEFAULT 0`;
    await db`ALTER TABLE ig_posts ADD COLUMN IF NOT EXISTS share_rate REAL DEFAULT 0`;
    await db`ALTER TABLE ig_posts ADD COLUMN IF NOT EXISTS comment_rate REAL DEFAULT 0`;

    // ── YouTube videos ────────────────────────────────────────────────────────
    await db`
      CREATE TABLE IF NOT EXISTS yt_videos (
        id              TEXT PRIMARY KEY,
        title           TEXT,
        description     TEXT,
        published_at    TIMESTAMPTZ,
        content_type    TEXT,
        duration_secs   INTEGER DEFAULT 0,
        duration        TEXT,
        thumbnail_url   TEXT,
        embed_url       TEXT,
        view_count      INTEGER DEFAULT 0,
        like_count      INTEGER DEFAULT 0,
        comment_count   INTEGER DEFAULT 0,
        engagement_rate REAL DEFAULT 0,
        snapshotted_at  TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    await db`ALTER TABLE yt_videos ADD COLUMN IF NOT EXISTS description TEXT`;
    await db`ALTER TABLE yt_videos ADD COLUMN IF NOT EXISTS duration TEXT`;
    await db`ALTER TABLE yt_videos ADD COLUMN IF NOT EXISTS thumbnail_url TEXT`;
    await db`ALTER TABLE yt_videos ADD COLUMN IF NOT EXISTS embed_url TEXT`;
    await db`ALTER TABLE yt_videos ADD COLUMN IF NOT EXISTS engagement_rate REAL DEFAULT 0`;

    // ── Daily platform insights ───────────────────────────────────────────────
    await db`
      CREATE TABLE IF NOT EXISTS daily_insights (
        date                DATE PRIMARY KEY,
        fb_followers        INTEGER,
        fb_reach            INTEGER,
        fb_impressions      INTEGER,
        fb_engaged_users    INTEGER,
        fb_page_views       INTEGER,
        fb_new_fans         INTEGER,
        ig_followers        INTEGER,
        ig_reach            INTEGER,
        ig_impressions      INTEGER,
        ig_profile_views    INTEGER,
        ig_accounts_engaged INTEGER,
        ig_new_followers    INTEGER,
        yt_subscribers      INTEGER,
        yt_total_views      INTEGER,
        yt_total_videos     INTEGER,
        yt_watch_mins       INTEGER,
        yt_avg_watch_secs   INTEGER,
        snapshotted_at      TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    await db`ALTER TABLE daily_insights ADD COLUMN IF NOT EXISTS ig_profile_views INTEGER`;
    await db`ALTER TABLE daily_insights ADD COLUMN IF NOT EXISTS ig_accounts_engaged INTEGER`;
    await db`ALTER TABLE daily_insights ADD COLUMN IF NOT EXISTS yt_watch_mins INTEGER`;
    await db`ALTER TABLE daily_insights ADD COLUMN IF NOT EXISTS yt_avg_watch_secs INTEGER`;

    // ── Facebook demographics (fans by age + gender) ──────────────────────────
    await db`
      CREATE TABLE IF NOT EXISTS fb_demographics (
        date          DATE,
        age_group     TEXT,
        male_count    INTEGER DEFAULT 0,
        female_count  INTEGER DEFAULT 0,
        unknown_count INTEGER DEFAULT 0,
        PRIMARY KEY (date, age_group)
      )
    `;

    // ── Facebook geo (fans by city + country) ─────────────────────────────────
    await db`
      CREATE TABLE IF NOT EXISTS fb_geo (
        date      DATE,
        geo_type  TEXT,
        name      TEXT,
        value     INTEGER DEFAULT 0,
        pct       REAL DEFAULT 0,
        PRIMARY KEY (date, geo_type, name)
      )
    `;

    // ── Instagram demographics (followers by age + gender) ────────────────────
    await db`
      CREATE TABLE IF NOT EXISTS ig_demographics (
        date          DATE,
        age_group     TEXT,
        male_count    INTEGER DEFAULT 0,
        female_count  INTEGER DEFAULT 0,
        unknown_count INTEGER DEFAULT 0,
        PRIMARY KEY (date, age_group)
      )
    `;

    // ── Instagram geo (followers by city + country) ───────────────────────────
    await db`
      CREATE TABLE IF NOT EXISTS ig_geo (
        date      DATE,
        geo_type  TEXT,
        name      TEXT,
        value     INTEGER DEFAULT 0,
        pct       REAL DEFAULT 0,
        PRIMARY KEY (date, geo_type, name)
      )
    `;

    // ── Post metrics history (daily snapshot per post for velocity tracking) ──
    await db`
      CREATE TABLE IF NOT EXISTS post_metrics_history (
        post_id              TEXT,
        platform             TEXT,
        snapshot_date        DATE,
        days_since_published INTEGER,
        like_count           INTEGER DEFAULT 0,
        comment_count        INTEGER DEFAULT 0,
        share_count          INTEGER DEFAULT 0,
        save_count           INTEGER DEFAULT 0,
        reach                INTEGER DEFAULT 0,
        views                INTEGER DEFAULT 0,
        total_interactions   INTEGER DEFAULT 0,
        avg_watch_time       REAL    DEFAULT 0,
        engagement_rate      REAL    DEFAULT 0,
        PRIMARY KEY (post_id, snapshot_date)
      )
    `;

    return res.status(200).json({ ok: true, message: 'Schema ready — all tables and columns created or already exist.' });
  } catch (err) {
    console.error('Migration error:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
}
