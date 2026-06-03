# Lakepointe Social Dashboard — CLAUDE.md

This file gives Claude context about the project so it can help effectively without needing to re-explain everything each session.

---

## Project Overview

A live social media analytics dashboard for **Lakepointe Church** (@lpconnect). Built with **Next.js 14 + Tailwind CSS**, deployed on **Vercel**. The dashboard has two layers:

- **Live tabs** (Overview, Facebook, Instagram, Instagram Audience, YouTube) — pull real data from Meta Graph API and YouTube Data API v3 via serverless functions. The demo All tab has been removed.
- **Demo data** (`src/data/demoData.js`) — still present but only used by the AI Analyst `getDataContext()`. Will be fully removed once remaining demo tabs are gone.

**GitHub repo:** `github.com/Lakepointe-Church/social-dashboard-v2`
**Live URL:** `social-dashboard-v2.vercel.app`
**Stack:** Next.js 14, React 18, Tailwind CSS, Recharts, Lucide React, Upstash Redis (`@upstash/redis`)

---

## File Structure

```
social-dashboard/
├── pages/
│   ├── index.js                  ← Main dashboard — all tabs wired here (AI panel removed)
│   └── api/
│       ├── facebook.js               ← Meta Graph API proxy (Facebook Page)
│       ├── instagram.js              ← Meta Graph API proxy (Instagram @lpconnect)
│       ├── youtube.js                ← YouTube Data API v3 proxy
│       ├── chat.js                   ← AI Analyst endpoint (Anthropic claude-sonnet-4-6)
│       ├── ig-carousel-children.js   ← Fetches IG carousel slide media URLs
│       ├── ig-comment-search.js      ← Comment phrase search: scans all posts in a date range, counts phrase matches per post
│       └── fb-album-photos.js        ← Fetches FB album photo attachments
├── src/
│   ├── components/
│   │   ├── AllOverview.js        ← Cross-platform Overview tab (live)
│   │   ├── FacebookAnalytics.js  ← Facebook LIVE tab component
│   │   ├── InstagramAnalytics.js ← Instagram LIVE tab component
│   │   ├── InstagramAudience.js  ← Instagram Audience tab component
│   │   ├── YouTubeAnalytics.js   ← YouTube LIVE tab component (fully built out)
│   │   ├── PostSpotlight.js      ← Multi-platform post detail modal (FB/IG/YT)
│   │   ├── Header.js             ← Top nav bar (simplified — no props, no Demo Mode badge)
│   │   ├── MetricCard.js         ← KPI card component
│   │   ├── PlatformCard.js       ← Platform summary card
│   │   ├── FollowerGrowthChart.js ← Recharts line chart; FB/IG/YT only; MM-DD X-axis
│   │   ├── GrowthChartSection.js  ← Shared chart card used by all 4 tabs (30d/90d/All toggle, empty/loading states)
│   │   ├── EngagementChart.js
│   │   ├── TopContent.js         ← Cross-platform top posts, ranked by engagement
│   │   ├── GeoBreakdown.js
│   │   ├── ContentTypeChart.js   ← Bar chart by content type (accepts barKey/barLabel props)
│   │   ├── AgeBreakdown.js
│   │   ├── MilestoneTracker.js   ← Follower milestone progress bars
│   │   ├── BestTimeToPost.js
│   │   ├── AIChatPanel.js        ← AI Analyst slide-up chat panel (built but removed from UI — June 2026)
│   │   ├── DynamicViz.js         ← Renders AI Analyst chart/table responses (unused — see AIChatPanel note)
│   │   └── CustomViewBuilder.js  ← Widget toggle UI
│   ├── lib/
│   │   ├── igDataCache.js        ← 5-min client-side cache for /api/instagram
│   │   ├── fbDataCache.js        ← 5-min client-side cache for /api/facebook
│   │   ├── ytDataCache.js        ← 5-min client-side cache for /api/youtube
│   │   └── redis.js              ← Upstash Redis client singleton (supports KV_REST_API_* and UPSTASH_REDIS_REST_*)
│   └── data/
│       └── demoData.js           ← Hardcoded demo data + getDataContext() for AI Analyst fallback
├── vercel.json               ← Cron job: /api/snapshots/save at 06:00 UTC daily
├── package.json
├── next.config.js
├── tailwind.config.js
├── CLAUDE.md                     ← This file
└── .claude/
    └── commands/
        ├── ship.md   ← /ship: stage, commit, push to current branch
        ├── branch.md ← /branch: create new feature branch off latest main
        ├── pr.md     ← /pr: open GitHub PR from feature branch into main
        └── doc.md    ← /doc: update and commit CLAUDE.md
```

---

## Environment Variables (Vercel)

| Key                      | Description                                                                   |
| ------------------------ | ----------------------------------------------------------------------------- |
| `META_PAGE_ACCESS_TOKEN` | Long-lived Facebook Page token (expires ~60 days, must be refreshed manually) |
| `META_PAGE_ID`           | `142188242493004` — Lakepointe Church Facebook Page                           |
| `META_INSTAGRAM_ID`      | `17841400949863101` — @lpconnect Instagram Business account                   |
| `META_APP_SECRET`        | Lakepointe Social Dashboard app secret                                        |
| `YOUTUBE_API_KEY`        | YouTube Data API v3 key — "YouTube Dashboard Key" in Google Cloud Console     |
| `YOUTUBE_CLIENT_ID`      | OAuth 2.0 Client ID for YouTube Analytics API (Google Cloud Console)          |
| `YOUTUBE_CLIENT_SECRET`  | OAuth 2.0 Client Secret for YouTube Analytics API                             |
| `YOUTUBE_REFRESH_TOKEN`  | OAuth refresh token — must be obtained from the channel **owner** account     |
| `ANTHROPIC_API_KEY`      | Powers the AI Analyst chat panel                                              |
| `KV_REST_API_URL`        | Upstash Redis REST URL — auto-set by Vercel when Upstash integration is connected |
| `KV_REST_API_TOKEN`      | Upstash Redis REST token — auto-set by Vercel when Upstash integration is connected |
| `CRON_SECRET`            | Auto-set by Vercel for cron job auth; injected as `Authorization: Bearer` header on cron calls |

---

## API Routes

### `/api/facebook`

- **Auth:** `META_PAGE_ACCESS_TOKEN` (Page token) + `META_APP_SECRET` (required — "Require app secret" is ON in the Meta Developer Console)
- **Security:** All Graph API calls include `appsecret_proof=HMAC-SHA256(app_secret, access_token)` — computed once per request using Node's `crypto` module
- **API version:** v25.0
- **Data:** Page followers, 30-day insights (reach, impressions, engaged users, page views, new fans), recent posts with likes/comments/shares, fan demographics, fan cities/countries
- **Content classification:** `stream` (service streams), `photo`, `video`, `other`
- **`page_fan_adds`** included in insight metrics — returns new followers in the 28-day window. Exposed as `insights.newFans` in the API response. Shown in the Overview tab FB card as "New Followers (30d)".
- **Date range:** Accepts `?since=UNIX&until=UNIX`

### `/api/instagram`

- **Auth:** `META_PAGE_ACCESS_TOKEN` + `META_APP_SECRET` (required — see facebook route note on appsecret_proof)
- **Security:** All Graph API calls include `appsecret_proof` — same pattern as `/api/facebook`
- **API version:** v25.0
- **Instagram ID:** `META_INSTAGRAM_ID`
- **Data:** Account summary, 30-day insights, new followers, 50 recent media with per-post insights, demographics, geo
- **Content classification:** `photo`, `carousel`, `reel` (VIDEO + REELS merged), `collab`, `other`
- **Collab detection:** (1) Caption contains "josh howerton", "live free", "@joshhowerton", "@livefreewjh" — OR — (2) Post has a non-empty `collaborators` field (formal Instagram collab invite accepted by both parties). The collaborators field automatically covers guest pastors, @lpespanol, school of ministry, college accounts, and any future collab partner without code changes. **Note:** The `collaborators` field is silently dropped by the API in dev mode (confirmed 2026-05-26) — gated behind Meta App Review. Code is already wired up and will auto-activate once App Review is approved.
- **Rate metrics per post:** likeRate, saveRate, shareRate, commentRate (reels), avgWatchTime (reels)
- **Metric split by type (Graph API v22.0+):**
  - Photos/carousels fetch: `reach, saved, total_interactions, shares`
  - Reels fetch: `views, saved, total_interactions, shares, ig_reels_avg_watch_time`
  - `reach` is the correct metric for photos; `views` is the correct metric for reels — they are NOT interchangeable. Mixing them in a batch request causes the entire batch to fail silently (all values return 0).
  - `plays` and `clips_replays_count` are **deprecated in v22.0+** — do not add them back. Including either in a batch request breaks the whole request.
- **Reel thumbnails:** Use `thumbnail_url` (cover image). `media_url` for reels is a `.mp4` video file and cannot be rendered in an `<img>` tag.
- **Debug route:** `src/pages/api/instagram-debug.js` — temporary endpoint at `/api/instagram-debug` that tests each metric individually against the most recent reel. Useful for diagnosing future API changes. Can be removed once stable.
- **Collab debug route:** `src/pages/api/instagram-collab-debug.js` — temporary endpoint at `/api/instagram-collab-debug` that diagnoses incoming collab fetching. Can be removed once resolved.

### Incoming Collab Posts (Josh posts, invites LP as collaborator)

- **Status:** Not yet working. Three approaches were investigated and all blocked.
- **Root cause of Approach 1 failure:** Business Discovery requires the target to be a Business or Creator IG account. Josh's @joshhowerton account is almost certainly a **personal account**, which is why Discovery fails with `(#100) The parameter username is required` regardless of syntax — that error is misleading; the real gate is account type.
- **Approach 1 — Business Discovery by username:** `GET /{LP_ID}?fields=business_discovery.fields(id)&username=joshhowerton` → fails. Unblocked by asking Josh to switch his account to Creator (free, instant in IG settings) — no App Review needed.
- **Approach 2 — LP's own `/media` with `collaborators` field:** Collab posts where LP accepted Josh's invite do NOT appear in `/{LP_ID}/media`. The Graph API `/media` endpoint only returns posts where the account is the primary (owner) author, not co-author collabs.
- **Approach 3 — Josh's Facebook Page ID lookup:** `GET /379215606172427?fields=instagram_business_account` → fails with permission error requiring `Page Public Content Access` feature (gated behind Meta App Review).
- **If Josh's IG account ID becomes available** (from his team directly): hardcode it and skip Business Discovery entirely — try `GET /{josh-ig-id}/media?fields=...,collaborators` filtered for posts where LP's IG ID appears in `collaborators.data`. The code in `instagram.js` already handles this at line ~141; it just needs `joshId` to be populated.
- **Fastest path to a fix:** Ask Josh to (a) switch to a Creator account, OR (b) have his team share his numeric IG account ID. Either removes the Business Discovery blocker without waiting on App Review.
- **Workaround (already live):** Caption-based detection picks up LP's own posts that mention Josh. Ask Josh's team to consistently include `@lpconnect`, `@joshhowerton`, or `live free` in collab captions on Josh's side too.
- **Real fix:** Meta App Review (unlocks Business Discovery + Page Public Content Access).

### `/api/ig-comment-search`

- **Auth:** `META_PAGE_ACCESS_TOKEN` + `META_APP_SECRET` (appsecret_proof pattern — same as all other IG routes)
- **Permission required:** `instagram_manage_comments` — added to the Meta app June 2, 2026. No App Review needed for internal tools; works in dev mode for app admins.
- **Query params:** `?phrase=sermon` (required), `?since=YYYY-MM-DD` (default: Jan 1 of current year), `?until=YYYY-MM-DD` (default: today)
- **Behavior:** Paginates through ALL IG posts in the date range (not just the 50 most recent), fetches all comments per post, counts case-insensitive matches for the phrase. Paginates comments too.
- **Response:** `{ phrase, since, until, totalMatches, postsScanned, postsWithMatches, breakdown: [{ mediaId, caption, timestamp, mediaUrl, permalink, matchCount }] }` — breakdown sorted by matchCount descending.
- **Timeout:** `export const config = { maxDuration: 300 }` — scanning a full year of posts + comments can take 30–60 seconds.
- **Critical bug fixed:** Meta's `paging.next` cursor URLs omit `appsecret_proof`. The `withProof(url, proof)` helper re-attaches it before following any pagination link (both media list and per-post comments). Without this, any account with >50 total posts fails on the second page.
- **Permission error detection:** If the token lacks `instagram_manage_comments`, the API returns `{ error: '...', code: 'MISSING_PERMISSION' }` with HTTP 403 so the UI can surface a clear message.

### `/api/snapshots/save`

- **Auth:** Vercel injects `Authorization: Bearer <CRON_SECRET>` on cron calls; check is skipped if `CRON_SECRET` is not set (local dev). `META_APP_SECRET` guard added — if missing, `appSecretProof` returns empty string (graceful local fallback).
- **Trigger:** `vercel.json` cron at `0 6 * * *` (6 AM UTC daily). Can also be hit manually in the browser for testing.
- **Data:** Fetches `followers_count` from FB Page and IG account (Meta Graph API v25.0 with appsecret_proof), and `subscriberCount` from YouTube Data API v3. Saves snapshot to Redis.
- **Redis writes:** `SET followers:YYYY-MM-DD '{"date","facebook","instagram","youtube"}'` (idempotent — safe to run twice in a day) + `ZADD followers:dates <unix_score> YYYY-MM-DD` (sorted set for date-range queries).
- **Response:** `{ ok: true, snapshot: { date, facebook, instagram, youtube } }`

### `/api/snapshots`

- **Auth:** Public (read-only).
- **Query params:** `?days=30` (default), `?days=90`, `?days=0` (all time).
- **Data:** Reads date keys from `followers:dates` sorted set using `ZRANGE … BYSCORE`, bulk-fetches snapshot blobs via `MGET`, returns sorted array: `[{ date, Facebook, Instagram, YouTube }]` — keys capitalized to match `FollowerGrowthChart` prop names.

### `/api/youtube`

- **Auth:** `YOUTUBE_API_KEY` (public API key) for all Data API calls; `YOUTUBE_REFRESH_TOKEN` + `YOUTUBE_CLIENT_ID` + `YOUTUBE_CLIENT_SECRET` for Analytics API (optional — graceful fallback if missing)
- **Channel:** `UC5f7yO3WU_Ns0WDCQuP5bAw` (Lakepointe Church)
- **Data:** Channel stats, paginated video list (50 per page) with per-video stats; optionally: watch time + avg watch time via YouTube Analytics API
- **Pagination:** Accepts `?pageToken=TOKEN` for subsequent pages
- **Content classification:** `short` (≤180s), `podcast` (title contains "Live Free with Josh Howerton" or "Live Free"), `sermon` (everything else)
- **Analytics OAuth flow:** On first page load, if all 3 OAuth env vars are present, calls `getAccessToken()` (exchanges refresh token for short-lived access token) then `fetchYTAnalytics()`. Returns `analytics: { totalWatchMins, avgWatchSecs, impressions, impressionCtr }` or `null` on failure. `analyticsError` field included for debugging — remove once stable.
- **Analytics metrics split:** `estimatedMinutesWatched` + `averageViewDuration` fetched together (always available). `impressions` + `impressionsClickThroughRate` fetched separately as best-effort (not available in basic channel reports — stays `null`).
- **YouTube Analytics API blocker:** `channel==MINE` returns the personal channel of the authenticated user (not the Lakepointe brand account). `channel==CHANNEL_ID` returns "Forbidden" for manager-level accounts — the Analytics API requires the refresh token to come from the channel **owner** account, not a manager. Need to identify which Google account originally created the Lakepointe YouTube brand account and redo the OAuth Playground flow with that account.

---

## YouTubeAnalytics.js — Current Features (as of June 2026)

- **Sticky control bar** (`sticky top-16 z-20`) — content type filter chips (Podcast, Sermon, Short with emoji + color), date range presets (7d/30d/90d + custom), Refresh button. Multi-select: deselecting all shows empty state with reset.
- **Channel Overview KPIs** — Subscribers, Total Views, Total Videos, Avg Views/Video. Labeled "Channel-wide · not affected by filters" since these are lifetime channel stats.
- **Advanced Metrics** — Total Watch Time, Avg Watch Time/Video, Impression CTR. Renders as real `StatCard` values when `analytics` state is populated; falls back to `PendingCard` (`0 🔒`) if `analytics` is null. Currently showing pending — blocked on YouTube Analytics API owner-level OAuth (see API route note above).
- **Content Breakdown** — `grid-cols-3` inside each content type card: Total Views, Avg Views, Avg Engagement Rate all in one row.
- **Top 10 sections** — Two side-by-side horizontal scroll rows: "Top 10 by Views" and "Top 10 by Engagement". Cards are `w-56 flex-shrink-0` in a `flex gap-3 overflow-x-auto pb-2` row. Each card shows thumbnail (16:9 via `aspect-video`, using `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` — public, no API key needed), title, rank badge, and primary metric.
- **All Videos table** — sortable by all columns including Type. Self-contained `sort` state `{ key, dir }`. Uses `durationSecs` (numeric) for duration sorting instead of the display string. Colored pill for Type column (green=short, blue=podcast, violet=sermon). Paginated with "Load More" button.
- **OutsideDateRangeNote** — collapsible notice at the bottom of the video list that lists videos which were fetched but fall outside the selected date window (with title + content type). This explains count discrepancies like "50 loaded but 45 in view."
- **Content type classification** (in `/api/youtube.js`): `short` (≤180s), `podcast` (title contains "Live Free with Josh Howerton" or "Live Free"), `sermon` (everything else). All videos get exactly one of these three labels — no unclassified bucket.

---

## PostSpotlight.js — Multi-Platform Post Detail Modal (as of May 2026)

A full-screen overlay that opens when any post/video card is clicked across the dashboard (Facebook, Instagram, YouTube, Overview tabs). Platform-aware: accent colors, gradient, icon, and metric labels all adapt based on `platform` prop.

**Props:** `post` (normalized post object or null), `onClose`, `accountName`, `platform` (`'instagram' | 'facebook' | 'youtube'`)

**Normalized post shape** (all platforms map to this):
- `caption`, `mediaUrl`, `permalink`, `timestamp`, `mediaType`
- `reach`, `likeCount`, `commentCount`, `commentsCount`, `shares`
- `engagementRate`, `saved`, `saveRate`, `shareRate`, `avgWatchTime`
- `videoUrl` (IG reels), `id` (used for FB video embed and carousel fetch)

**Layout:** Fixed overlay with enter animation (`requestAnimationFrame` RAF for CSS transition), body scroll lock, Escape + backdrop-click to close.
- **Left column:** media (image, video, embed, or gradient placeholder)
- **Right column:** platform badge, caption, 3×2 metric grid, rate pills (Save %, Share %, Avg Watch), timestamp, CTA link

**Media rendering priority (left column):**
1. Facebook video → `<iframe>` using `facebook.com/{pageId}/videos/{videoId}` — `post.id` is `{pageId}_{videoId}`, split on `_` to build the URL. **Important:** `plugins/video.php` does NOT accept `permalink.php` URLs.
2. YouTube video → `<iframe>` using `youtube.com/embed/{videoId}` — works for all videos and Shorts without OAuth.
3. IG reel → `<video>` using `videoUrl` (mp4)
4. Image → `<img>` using `mediaUrl`
5. Fallback gradient div

**Carousel / album slides:**
- When spotlight opens and `post.mediaType === 'CAROUSEL_ALBUM'`, fetches slides lazily on demand
- IG carousels: `GET /api/ig-carousel-children?id={mediaId}` → `{ slides: [{id, mediaType, mediaUrl, videoUrl}] }`
- FB albums: `GET /api/fb-album-photos?id={postId}` → `{ slides: [{mediaType, mediaUrl, videoUrl}] }`
- If fetch returns < 2 slides, navigation UI is hidden
- Left/right arrow buttons, keyboard ArrowLeft/ArrowRight, dot indicator row (clickable; active dot = larger + white)
- Slide counter badge: `🖼️ {n} / {total}` — hidden while a video player is active

**Normalizer functions** (in consuming components, not in PostSpotlight itself):
- `toFbSpotlight(post)` in `FacebookAnalytics.js` — maps `contentType === 'video'|'stream'` → `mediaType: 'VIDEO'`, `type === 'album'` → `mediaType: 'CAROUSEL_ALBUM'`
- `toYtSpotlight(video)` in `YouTubeAnalytics.js` — uses `img.youtube.com/vi/{id}/mqdefault.jpg` for thumbnail, `youtube.com/watch?v={id}` for permalink
- IG posts already match the expected shape and pass through with `{ ...m }`
- `normalizePosts()` in `AllOverview.js` attaches `spotlightPost` and `spotlightPlatform` to each entry so Overview's `handlePostClick` can dispatch to the right platform

---

## AIChatPanel.js — AI Analyst (Removed from UI, June 2026)

The AI Analyst was a slide-up chat panel powered by `claude-sonnet-4-6` via the Anthropic API. The floating button and all wiring were removed from `index.js` in session 6 (June 2, 2026). The component files (`AIChatPanel.js`, `DynamicViz.js`, `/api/chat.js`) still exist in the repo but are not rendered anywhere.

If re-enabling: add back the `AIChatPanel` import, `showAI`/`liveContext` state, `buildLiveContext()` function, the `useEffect` that calls all 3 caches on mount, the floating button JSX, and the `<AIChatPanel>` render at the bottom of the page. The `fbDataCache`, `igDataCache`, `ytDataCache` imports will also need to be restored in `index.js`.

---

## InstagramAnalytics.js — Current Features (as of June 2026)

- **Sticky control bar** (`sticky top-16 z-20`) — content type filter chips, date range presets (7d/30d/90d + custom), and Refresh button stay pinned below the main app header while scrolling. `top-16` accounts for the main `Header.js` which is `h-16 sticky top-0`.
- **Profile Overview KPI cards** — labeled "Account-wide · not affected by filters" because these pull from account-level insights (not per-post), so content type and date filters don't change them.
- **Date range filter** — client-side, defaults to last 30 days. Filters all content sections (top posts, insights tables, all posts table). Does NOT re-fetch from API — always works on the 50 most recently fetched posts.
- **Top posts grid** — 2×2 layout: Views, Engagement, Shares, Saves. Each section is half the screen width with 4 posts in a horizontal row. Images use 3:4 portrait aspect ratio.
- **Reel & Photo insights tables** — top N per type (dynamic count, max 10), sorted by views. Columns: Post, Type, Date, Views, rate metrics. Reels also show Avg Watch Time. Skip Rate and Repost Rate were removed when Instagram deprecated the `plays` and `clips_replays_count` metrics in v22.0.
- **All Posts table** — numbered rows, sortable columns including Type (click header to toggle asc/desc, active column highlighted pink), paginated 20 at a time with "Load More" button showing remaining count.
- **Demographics & geo removed** — Age & Gender chart, Top Cities, and Top Countries were removed from the Instagram tab (May 2026) to revisit later.
- **Comment Phrase Search card** — `CommentSearch` component rendered below Follower Growth chart. Text input (defaults to "sermon") + preset date range buttons (This year / Last year / Last 90d / Last 30d) + custom start/end date pickers. On submit, calls `/api/ig-comment-search` and displays: total match count, posts scanned, posts with matches, and a per-post breakdown table sorted by match count. Each row links to the post's Instagram permalink.

---

## Key Design Decisions

### Token Management

- Facebook/Instagram uses a **long-lived Page Access Token** stored in Vercel env vars. Expires every ~60 days. Manually refresh via: Meta Graph API Explorer → generate token → `142188242493004?fields=name,fan_count,access_token` → Access Token Debugger → Extend Access Token → update `META_PAGE_ACCESS_TOKEN` in Vercel → Redeploy.
- YouTube uses an **API key** for Data API v3 (channel stats, video list). OAuth infrastructure is built and env vars are in Vercel (`YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REFRESH_TOKEN`) but Analytics API returns "Forbidden" because the refresh token must come from the channel **owner** account, not a manager. See `/api/youtube` notes for details.

### Content Filters (Instagram & Facebook)

Both live tabs use multi-select filter chips. Deselecting all shows an empty state with a reset button. Filters are client-side only — all posts are fetched then filtered in the browser.

### Meta API Limitations (Development Mode)

Several metrics return 0 until the app completes Meta App Review:

- `page_engaged_users`, `page_video_views` (Facebook)
- `profile_visits`, `total_interactions`, `shares` (Instagram account-level)
- Per-reel metrics may also be gated

This is expected. The app needs to be submitted for App Review and published before these unlock.

**Critical:** Do NOT embed `insights.metric(post_impressions_unique, post_engaged_users)` as a sub-field in the `/posts` Graph API query. These metrics are gated behind App Review, and embedding them causes the **entire posts request to fail** (not just return 0s). Fetch per-post insights separately after App Review is approved.

### Demo Data

`demoData.js` contains 365 days of seeded fake data for Facebook, Instagram, YouTube, TikTok. The `getDataContext()` function exports a text summary used by the AI Analyst. Eventually the demo tabs and this file will be replaced with real data.

---

## Pending Work

- [ ] **YouTube Analytics OAuth** — OAuth infrastructure is fully built (Client ID, Secret, refresh token in Vercel; `getAccessToken()` + `fetchYTAnalytics()` in `/api/youtube.js`). Blocked because the refresh token must come from the channel **owner** Google account, not a manager. Jolie is a manager — need to find whose Google account originally created the Lakepointe YouTube brand account and redo the OAuth Playground flow with that account. Once fixed, Advanced Metrics (watch time, avg watch time) will populate automatically. Impression CTR is separately blocked — not available in basic channel reports regardless of access level.
- [ ] **Meta App Review** — **SUBMITTED May 28, 2026. Pending approval (typically 1–5 business days).** Submitted 8 permissions across two use cases: `pages_read_user_content`, `read_insights`, `pages_read_engagement`, `pages_show_list`, `instagram_basic`, `instagram_manage_insights`, `business_management`, `public_profile`. Once approved: add `post_video_views` to the Facebook posts query; the `collaborators` field on Instagram posts will auto-activate (collab detection already wired up). Reach and views are distinct on Facebook — reach = unique people who saw it (`post_impressions_unique`), views = times the video was played (`post_video_views`).
- [ ] **Second Meta App Review (future)** — submit `pages_manage_posts` + `instagram_content_publish` once a post scheduling feature is built. Do NOT request these until the feature exists — Meta will reject if they can't find it in the demo.
- [ ] **Incoming collab posts** — Josh posts + invites LP as collaborator. Blocked by Meta API permissions (see "Incoming Collab Posts" note above). Unblock via: (a) get Josh's IG ID from his team and test direct media fetch, or (b) Meta App Review.
- [ ] **Facebook tab updates** — sticky bar, top-post cards (icons, Reach/Engagement/Shares breakdown), and numbered+sortable+paginated All Posts table are done. Still needed: per-post insights table (Engagement Rates section matching Instagram's Reel & Photo tables)
- [ ] **Token refresh automation** — currently manual every 60 days. Could automate with a cron job that uses the App Secret to refresh.
- [ ] **Database-backed data layer (Neon Postgres)** — planned future session (~3–5 hrs). Replace live API calls with: daily cron → fetch all platforms → upsert into Neon Postgres → dashboard reads from DB. Benefits: historical post engagement snapshots, faster loads, dashboard stays up when token expires. Use Neon via Vercel Marketplace. Will not affect Meta App Review (backend-only change, same UI/permissions).
- [ ] **TikTok integration** — pending TikTok for Business API access approval
- [x] **Overview tab** — live cross-platform overview is complete (KPIs, per-platform cards, best post by channel, milestones, top content, content type performance, best time to post)
- [x] **YouTube tab** — fully built out: sticky filter bar, content type chips, date filter, channel KPIs, content breakdown (single row), top-10 horizontal scroll rows, sortable All Videos table, OutsideDateRangeNote, pending OAuth placeholders
- [x] **AI Analyst** — built and wired to live data; floating button and UI removed June 2026 (components still in repo — see AIChatPanel section)
- [x] **Follower growth over time** — Redis snapshot infrastructure live. Cron runs daily at 6 AM UTC. Chart shown on Overview (all platforms), Facebook, Instagram, YouTube tabs. First snapshot stored June 2, 2026.
- [ ] **Follower growth chart — backfill** — APIs don't provide historical data so the chart starts from June 2, 2026 and builds one point per day. No action needed; just patience.
- [ ] **Remove remaining demo tabs** — TikTok demo tab and `demoData.js` can be removed once TikTok has live data (`getDataContext()` fallback in `/api/chat.js` can be removed too if AI Analyst stays off)

---

## People

- **Jolie Roberson** — Digital Platform Specialist, Lakepointe Church. Primary developer/owner of this repo.
- **Paul** — Stakeholder providing feedback on dashboard design and metrics.
- **Plafata** — Original creator of the repo (boss). Repo was duplicated from their personal account to the church org.

---

## Agent Workflow

For multi-step feature work, use this pattern at the start of a session:

1. **Explore agent** — search the codebase to locate relevant files before touching anything. Useful for "where is X implemented?" or "what files reference Y?"
2. **Plan agent** — design the implementation strategy. Use before writing code on anything non-trivial (new sections, API changes, layout redesigns).
3. **Run skill** — defined in `.claude/skills/run/SKILL.md`. Launches `npm run dev` on `localhost:3000` so Claude can test UI changes in a browser without the user manually running the server.

Suggested invocation: start a session by asking Claude to use an Explore agent to survey relevant files, then a Plan agent to draft the approach, then implement, then run to verify.

---

## How to Deploy Changes

### Feature branch workflow (recommended)

Use these three slash commands to manage features safely without touching production:

1. **`/branch feature-name`** — creates a new branch off latest `main`, pushes to GitHub. Vercel generates a preview URL in ~30–60 seconds (visible at vercel.com or in the PR once opened).
2. **`/ship your message`** — stages, commits, and pushes to the **current branch** (not necessarily main). On a feature branch this updates the Vercel preview URL; on `main` it deploys to production.
3. **`/pr`** — opens a GitHub Pull Request from the current feature branch into `main`. Merging the PR on GitHub triggers a production deploy.

**The rule:** `main` = stable production. Never ship experimental work directly to main. Branch → build → PR → merge.

### Direct deploy to production

Only use this if you're intentionally shipping to production from `main`:

```bash
cd ~/social-dashboard-v2/social-dashboard
git add .
git commit -m "Your message"
git push origin main
# Vercel auto-deploys on push to main
```

Or: `/ship your message` when already on the `main` branch.

Use `/doc` to update CLAUDE.md with the current session's changes and push: `/doc`

If Vercel doesn't auto-deploy or you need to force it:

- Go to vercel.com/plafatas-projects/social-dashboard-v2
- Deployments → find latest commit → promote to production

---

## How to Refresh the Meta Token

The Graph API Explorer cannot generate Page Tokens when "Require App Secret" is ON (it will show "Page access tokens cannot be generated"). Use this workaround:

1. Go to **Meta Developer Console** → Lakepointe Social Dashboard → **App Settings → Advanced → Security** → uncheck **"Require App Secret"** → Save
2. Go to developers.facebook.com → Tools → **Graph API Explorer**
3. Select app: **Lakepointe Social Dashboard**
4. Confirm permissions include: `read_insights`, `pages_show_list`, `pages_read_engagement`, `pages_read_user_content`, `instagram_basic`, `instagram_manage_insights`, `instagram_manage_comments`
5. Keep **User Token** selected, click **Generate Access Token** → complete Facebook login
6. In URL field enter: `142188242493004?fields=access_token` → click **Submit**
7. Copy the `access_token` from the JSON response (this is the Page Access Token)
8. Go to **Tools → Access Token Debugger** → paste token → Debug → **Extend Access Token**
9. Copy the new long-lived token
10. Go to **Vercel** → social-dashboard-v2 → Environment Variables → edit `META_PAGE_ACCESS_TOKEN` → paste → Save → Redeploy
11. Go back to **App Settings → Advanced → Security** → re-enable **"Require App Secret"** → Save

**Note:** The token expires every ~60 days. The dashboard will return `"Invalid OAuth 2.0 Access Token"` when it expires — that's the signal to run through this process again.

---

## Recent Changes (June 2026)

### June 3, 2026 (session 9)

- No code commits this session — token refresh and architecture planning only.

#### Key decisions and findings this session
- **Facebook data broke due to expired `META_PAGE_ACCESS_TOKEN`** — confirmed via `curl` against production URL returning `"Invalid OAuth 2.0 Access Token"`. Token expires every ~60 days as expected.
- **Token refresh workaround documented** — the Graph API Explorer cannot generate Page Tokens when "Require App Secret" is ON. Workaround: (1) temporarily disable "Require App Secret" in App Settings → Advanced, (2) generate User Token in Explorer, (3) call `142188242493004?fields=access_token` to exchange for Page Token, (4) extend via Access Token Debugger, (5) re-enable "Require App Secret". Instructions updated in "How to Refresh the Meta Token" section above.
- **Database-backed architecture planned (future session)** — considering migrating from live API calls to a daily cron → Neon Postgres → dashboard read pattern. Benefits: historical post engagement data, faster loads, dashboard stays up even when token expires. Estimate: ~3–5 hours of work. Decision: proceed in a future session.
- **Neon free tier is sufficient** — ~0.5 GB free storage; at ~200 KB/day ingestion rate that's years of runway.
- **Meta App Review unaffected** — the DB architecture change is backend-only; the dashboard UI and permissions stay identical, so the pending review is not impacted.

---

### June 2, 2026 (session 8)

- `d4e2893` — Add Instagram comment phrase search: `/api/ig-comment-search.js` (paginate all posts in date range, fetch comments per post, count phrase matches); `CommentSearch` component added to `InstagramAnalytics.js` below Follower Growth chart; `Search` icon added to lucide-react imports
- `d34b2e1` — Fix: Meta's `paging.next` URLs omit `appsecret_proof`; add `withProof()` helper to re-attach it before following any pagination link (both media list and per-post comments)
- `37efa90` — Add date range to comment phrase search: replace year dropdown with preset buttons (This year / Last year / Last 90d / Last 30d) + custom start/end date pickers; API now accepts `since`/`until` params instead of `year`
- PR #3 opened: `feature/caption-analyzer` → `main`

#### Key decisions this session
- **`instagram_manage_comments` does NOT require App Review for internal tools.** In dev mode (or Live mode with admin role), adding the permission to the app in Meta for Developers and regenerating the token is sufficient. No submission needed since the dashboard is internal-only.
- **Meta's `paging.next` URLs don't include `appsecret_proof`** — this is a systemic issue that will affect any new API route that paginates. Always wrap pagination URLs with `withProof(url, proof)` before following them.
- **Comment search is on-demand, not cached** — the scan can take 30–60 seconds depending on post count and comment volume. `maxDuration: 300` is set on the Vercel function. A loading hint in the UI sets expectations.
- **Token refresh instructions updated** — `instagram_manage_comments` added to the permission list in "How to Refresh the Meta Token" so it's included on every future token regeneration.
- **LinkDM context:** The social team uses LinkDM (not ManyChat) for comment automations. The "Sermon" keyword triggers a DM with a link when someone comments it. The comment phrase search was built specifically to measure this trigger's reach across posts.

---

### June 2, 2026 (session 7)

- `1ca4774` — Add follower growth over time: install `@upstash/redis`; `src/lib/redis.js` client; `/api/snapshots/save` (cron-triggered snapshot writer); `/api/snapshots` (read endpoint with `?days` filter); `vercel.json` cron at 06:00 UTC; `GrowthChartSection.js` shared card component; `AllOverview.js` placeholder replaced with real chart; `FollowerGrowthChart.js` trimmed to FB/IG/YT only with auto-hide for platforms with no data
- `7d3c9e3` — Add platform-specific growth charts to Facebook, Instagram, YouTube tabs; `fmtIsoDate` helper for MM-DD-YYYY footer format; chart X-axis tickFormatter for MM-DD display

#### Key decisions this session
- **Redis data structure:** Sorted set `followers:dates` (score = unix seconds, member = `YYYY-MM-DD`) for efficient `ZRANGE … BYSCORE` date-range queries. One key per day (`followers:YYYY-MM-DD`) stores the full JSON snapshot — idempotent writes (SET overwrites if cron runs twice in a day).
- **Upstash via Vercel Marketplace sets `KV_REST_API_*` vars**, not `UPSTASH_REDIS_REST_*` as the npm package's `Redis.fromEnv()` expects. `redis.js` uses `new Redis({ url, token })` with fallback to support both naming conventions.
- **Meta secrets are not available in local Development env vars** (Vercel security restriction, noted in session 4). `appSecretProof()` in `save.js` returns empty string if `META_APP_SECRET` is not set — prevents crash in local dev; in production the secret is always present.
- **`GrowthChartSection` is the single source of truth** for the chart card UI — imported by all four tabs so style/behavior changes only need to happen once. `activePlatform` prop filters to one line; omitting it shows all three.
- **First snapshot manually triggered** on preview URL immediately after deploy — confirmed `{ ok: true, snapshot: { date: "2026-06-02", facebook: 212784, instagram: 304704, youtube: 1010000 } }`.
- **`gh` CLI** installed via Homebrew and authenticated this session — now available for future `/pr` runs without fallback to the GitHub web URL.
- **Date format:** chart X-axis shows `MM-DD`; "tracking since" footer shows `MM-DD-YYYY`. ISO strings (`YYYY-MM-DD`) are only used internally for Redis keys and API responses.

---

### June 2, 2026 (session 6)

- `449c57f` — Update KPI milestones: Instagram goal 300K → 500K followers, YouTube goal 1M → 1.5M subscribers
- `a7c1a8b` — Remove AI Analyst floating button and all supporting code from `index.js` (`buildLiveContext`, `showAI`/`liveContext` state, `useEffect`, `AIChatPanel` render, related imports). Components still exist in repo but are not rendered.
- `3c1dc31` — Replace Total Posts KPI with Engaged Users (30d) on Facebook tab (`FacebookAnalytics.js`); remove Posts Fetched card and "X posts fetched" subtext from Overview top KPIs (`AllOverview.js`)
- `7888e48` — Add New Followers (30d) KPI to Overview cross-platform card row (FB `insights.newFans` + IG `insights.newFollowers`; YouTube excluded — no 30-day gain metric available in Data API v3)

#### Key decisions this session
- **Best Time to Post** is based on **engagement** (likes + comments), not reach or views — confirmed from `computeBestTimeData()` in `AllOverview.js`.
- **YouTube has no 30-day new subscriber metric** in Data API v3 — only lifetime `subscriberCount`. New Followers KPI on Overview is therefore FB + IG only, noted in subtext.
- **Overview KPI grid** is now a full 4-card row: Total Followers · 30-Day Reach · Total Engagement · New Followers (30d).
- **Facebook KPI card** (in `FacebookAnalytics.js`) is now: Page Followers · Reach (30d) · Engaged Users (30d) · Page Views (30d).

---

### June 1, 2026 (session 5)

- `605736b` — Add YouTube Analytics OAuth: `getAccessToken()` + `fetchYTAnalytics()` helpers in `/api/youtube.js`; `analytics` state + `fmtWatchTime` helper in `YouTubeAnalytics.js`; Advanced Metrics section conditionally renders real `StatCard` values or `PendingCard` based on `analytics` state
- `f11f5ad` — Expose `analyticsError` field in YouTube API response for debugging
- `a2db1d6` — Fix: split watch time and impressions into separate Analytics API requests (`impressions` not available in basic channel reports)
- `01b1661` — Fix: use explicit channel ID (`UC5f7yO3WU_Ns0WDCQuP5bAw`) instead of `channel==MINE` (which returns personal channel data, not the brand account)

#### Key decisions and findings this session
- **New env vars added to Vercel:** `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REFRESH_TOKEN`. OAuth 2.0 Client ID created in Google Cloud Console (OAuth consent screen configured as Internal).
- **`impressions`/`impressionsClickThroughRate` are not available** in basic YouTube Analytics channel reports — the API returns "Unknown identifier (impressions)". Fetched as best-effort in a separate request; both stay `null` and Impression CTR card remains pending.
- **`channel==MINE` returns personal channel data** — Jolie's Google account has two YouTube channels (personal: 0 subscribers; Lakepointe Church brand account: 1M+ subscribers). `channel==MINE` resolves to the personal one.
- **`channel==CHANNEL_ID` returns "Forbidden"** — YouTube Analytics API only allows explicit channel ID access for the account that **owns** the channel, not managers. Jolie has manager access, not owner access.
- **Root blocker:** Need to identify which Google account originally created the Lakepointe YouTube brand account (the owner, not just a manager) and redo the OAuth Playground flow with that account.
- **Code is complete and gracefully degrades** — all OAuth infrastructure is in place; the moment a valid owner-level refresh token is in Vercel, watch time and avg watch time will populate with no further code changes needed.

---

## Recent Changes (May 2026)

### May 28, 2026 (session 4)

- No code commits this session — all work was Meta App Review submission and local dev setup.

#### Key decisions and actions
- **Meta App Review submitted** (May 28, 2026). Permissions submitted: `pages_read_user_content`, `read_insights`, `pages_read_engagement`, `pages_show_list`, `instagram_basic`, `instagram_manage_insights`, `business_management`, `public_profile`. Use cases: "Manage everything on your Page" + "Manage messaging & content on Instagram". Reviewer URL: `https://social-dashboard-v2.vercel.app` (no login required).
- **`instagram_content_publish` removed from submission** — confirmed not used anywhere in the codebase. Will be added in a second App Review submission when a scheduling feature is built. Do not add it back until then.
- **`pages_manage_posts` deferred** — intentionally excluded from this submission. Required for future post scheduling feature. Requesting unused permissions is a common rejection reason.
- **Data processors declared**: Vercel (IT solutions) + Anthropic (IT solutions). Anthropic receives a text summary of Meta data via the AI Analyst feature.
- **Vercel CLI set up** for local development: `vercel link` + `vercel env pull`. Discovered: sensitive env vars (API keys) cannot be pulled to Development environment — Vercel security restriction. Decision: use production URL (`social-dashboard-v2.vercel.app`) for API testing; run `npm run dev` locally for UI-only changes.
- **`/verify` run against production**: FB API returning 100 posts + 209K fans, IG API returning 50 posts + 301K followers. v25.0 + appsecret_proof confirmed working. Brief transient 500 on Facebook first hit (recovered within 2 min) — likely rate limit, not a code issue.
- **Token refresh instructions updated** — removed `instagram_content_publish` from the permissions list in the "How to Refresh the Meta Token" section.

---

### May 27, 2026 (session 3)

- `d8ee947` — Bump all Meta Graph API routes from v21.0 → v25.0; add `appsecret_proof` to every Graph API call across `facebook.js`, `instagram.js`, `ig-carousel-children.js`, `fb-album-photos.js`

#### Key decisions this session
- **Meta App Review prep:** Reviewed what's needed to submit — permissions list, privacy policy URL, data deletion URL, screencasts per permission, business verification, and switching app to Live mode.
- **Meta Developer Console Advanced Settings updated:** Social Discovery turned OFF (was on — wrong for a private tool), domain `social-dashboard-v2.vercel.app` added to Domain Manager, notification email added, API version console setting set to v25.0.
- **`appsecret_proof` pattern:** "Require app secret" is now ON in the Meta console. Every server-side Graph API call must include `appsecret_proof = HMAC-SHA256(app_secret, access_token)`. Computed once per request handler (not per fetch call) using Node's built-in `crypto` module. `META_APP_SECRET` was already in Vercel env vars — no new secrets needed.
- **API version:** All four API routes now explicitly call `v25.0` (was `v21.0`). The Meta console "Upgrade API version" setting was already showing v25.0; code now matches.

---

### May 27, 2026 (session 2)

- `128de6c` / `811f4ba` / `54a770f` / `6207b4f` — Build PostSpotlight modal (originally PostDetailModal): 2-column layout, 3×2 metric grid, rate pills, reel video playback, CTA link. Wired to Instagram tab first.
- `8f63dc0` — Wire PostSpotlight to Facebook and YouTube tabs: clickable cards open the detail overlay across all three platform tabs.
- `37aec9e` — Fix FB Post Spotlight: map `contentType` to `mediaType` so video posts show 🎬 badge instead of photo; fix double-emoji in photo type label.
- `cda0b31` / `fa71429` / `24f9bae` — FB video embed: tried, broke (wrong URL), restored with correct format. `plugins/video.php` requires `facebook.com/{pageId}/videos/{videoId}` — splitting `post.id` on `_` gives `[pageId, videoId]`. Add YouTube embed (`youtube.com/embed/{videoId}`) so Shorts and regular videos play inline without OAuth.
- `17c52d9` — Add carousel/album slide navigation to PostSpotlight: IG carousels fetch from `/api/ig-carousel-children`, FB albums from `/api/fb-album-photos`. Left/right arrows, dot indicators, keyboard ArrowLeft/ArrowRight. Lazy fetch on spotlight open.
- `289396e` — Wire PostSpotlight to Overview tab: best post thumbnails and Top Content rows are clickable. `normalizePosts()` enriched with `spotlightPost` + `spotlightPlatform` per entry.
- `88e7fd0` — Add `/branch` and `/pr` slash command skills; update `/ship` to push to current branch (not always `main`).

#### Key decisions this session
- FB video embed URL format: `post.id` on Facebook is `{pageId}_{postId}`. Split on `_` to build `facebook.com/${pageId}/videos/${postId}`. `permalink.php?story_fbid=...` is silently rejected by `plugins/video.php` — this caused "Video Unavailable" and cost 2 commits to diagnose.
- YouTube embed just works for all video types including Shorts (`youtube.com/embed/{videoId}` — no auth, no special handling needed).
- Carousel slides are fetched lazily when the spotlight opens (not on page load) to keep the initial data fetch fast. If < 2 slides are returned, navigation UI is hidden.
- Feature branch workflow: `main` = stable production. New `/branch` skill checkouts from latest main, `/pr` opens GitHub PR, manual merge on GitHub triggers Vercel production deploy. `/ship` now detects the current branch and pushes there instead of always pushing to main.

---

### May 27, 2026 (session 1)

- `81d89d9` — Add day-drill-down to Best Time to Post: clicking a day bar in the By Day chart switches to By Hour and shows engagement by hour for that specific day (instead of the all-day average). A dismissible filter chip ("Mon only ✕") appears; switching back to By Day clears the filter.

#### Key decisions this session
- `byDayHour` data structure added to `computeBestTimeData()` in `AllOverview.js` — a map from each day name to its 24-hour engagement breakdown. Built alongside the existing `byDay` and `byHour` buckets in the same loop, so no extra API calls or passes over the post data.
- `BestTimeToPost.js` manages a `selectedDay` state. Clicking a bar calls `BarChart`'s `onClick` (not `Cell`'s `onClick`) to get the full payload. Clearing the filter or toggling back to By Day both reset `selectedDay` to `null`, falling back to the overall `byHour` average.
- The "Best hour" insight chip dynamically appends the selected day name (e.g. "Best hour (Mon): 9am") so context is clear without extra UI chrome.

---

---

### May 26, 2026 (session 2)

- `7637361` — Add sticky control bar, date filter, content type filter chips, pending OAuth placeholder cards, and content breakdown section to YouTube tab
- `24d6edb` — Replace YouTube bar charts with top-10 video card columns; add sortable All Videos table with Content Type column
- `9d69f51` — Switch YouTube top-10 from stacked columns to horizontal scrollable rows (matching Instagram's top posts layout)
- `621e570` — Polish YouTube tab: move content breakdown metrics to single row (Total Views / Avg Views / Avg Eng Rate), remove redundant "top performer" card, add `OutsideDateRangeNote` component that surfaces videos outside the date window with title + type
- `0fe0d6d` — Wire AI Analyst to live data: restore `AIChatPanel` + floating button in `index.js`; add `buildLiveContext()` that fetches all 3 platform caches via `Promise.allSettled` on mount and formats a structured context string; `AIChatPanel` sends `context` in POST body; `/api/chat` uses it if present, falls back to `getDataContext()`; fix "Lake Pointe" → "Lakepointe" in system prompt and panel footer; fix browser tab title; remove Demo Mode badge from header

#### Key decisions this session
- YouTube thumbnails use `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` — publicly available, no API key needed
- Duration sorting uses `durationSecs` (numeric field already in API response) rather than trying to sort the display string
- Live context is built client-side (the 3 caches use relative `fetch('/api/xxx')` URLs and cannot be imported server-side). Context string is passed in the POST body — server uses it if provided.
- All videos get exactly one of three content type labels (short/podcast/sermon). "50 loaded but 45 in view" discrepancy was NOT a labeling bug — 5 videos were simply outside the selected date range. `OutsideDateRangeNote` now surfaces these explicitly.

### May 26, 2026 (session 1)

- `8a9a50e` / `f1f0cd8` — Add live Overview tab (`AllOverview.js`): cross-platform KPIs, per-platform cards, best post by channel grid, milestone tracker, top performing content, content type performance, best time to post. Remove demo All tab.
- `aad8819` — Fix Overview polish: content type `avgEngagement` changed from raw count to reach-based rate (fixes "21967% engagement" bug); add `permalink` to YT posts so Shorts are clickable; change Best Post thumbnails from `aspect-video` to `aspect-square`; add `page_fan_adds` to FB API and show "New Followers (30d)" in FB overview card
- `b751cbd` — Update YouTube milestone target to 1M subscribers (was 100K)
- New `/doc` slash command added at `.claude/commands/doc.md` — updates and commits CLAUDE.md with session changes

#### Overview tab architecture notes
- Tab uses lazy mount + keep-alive pattern (mounted once, hidden with `display:none` on tab switch) — same as other live tabs
- Data fetched in parallel via `Promise.allSettled` from all 3 platform caches (`fbDataCache`, `igDataCache`, `ytDataCache`). Partial failures show error badges without blocking the rest of the page.
- `normalizePosts()` merges FB/IG/YT posts to a common shape sorted by engagement descending
- `computeContentTypeData()` groups into 9 buckets: FB Sermon/Photo/Video, IG Reel/Photo+Carousel/Collab, YT Short/Podcast/Sermon. `avgEngagement` = `totalEng / totalReach * 100` (rate, not count). FB buckets show `null` for `avgEngagement` since FB reach is 0 pre-App Review.
- Milestones: FB 250K followers, IG 500K followers, YT 1.5M subscribers
- Best Time to Post uses FB + IG post timestamps only (YT excluded — algorithmic reach)

### May 22, 2026 (session 2)

- `08af423` — Fix Facebook data load failure: removed `insights.metric()` sub-field from `/posts` query (gated behind App Review, caused entire request to fail)
- `dfc4cc4` — Replace Reach/Engagement/Shares text labels with Eye/MessageCircle/Share2 icons in Facebook top-post breakdown row
- `0b4c848` — Upgrade Next.js 14.2.3 → 14.2.35 (patches critical CVE); add `/ship` slash command
- `2bdf3c7` — Make Type column sortable in Instagram All Posts table
- `1632788` — Fix dynamic Top N label in reel/photo insights (was hardcoded "Top 10"); remove Age & Gender, Top Cities, Top Countries from Instagram tab

### May 22, 2026 (session 1)

- `5a5f3f3` — Add numbered sortable All Posts table for Facebook Analytics (defaults to newest first)
- `9e45382` — Replace text labels with icons in Facebook Top Posts cards; tighten font size
- `4d02eb7` — Apply same Top Posts icon + sizing changes to Instagram
- `cb572f9` — Update Facebook top-post cards to show Reach/Engagement/Shares breakdown; fetch `post_impressions_unique` and `post_engaged_users` per post (note: these were later removed from the sub-field query in `08af423` due to App Review gating)
