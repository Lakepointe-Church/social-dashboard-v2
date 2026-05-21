# Lakepointe Social Dashboard — CLAUDE.md

This file gives Claude context about the project so it can help effectively without needing to re-explain everything each session.

---

## Project Overview

A live social media analytics dashboard for **Lakepointe Church** (@lpconnect). Built with **Next.js 14 + Tailwind CSS**, deployed on **Vercel**. The dashboard has two layers:

- **Demo tabs** (All, Facebook, Instagram, YouTube, TikTok) — use hardcoded data from `src/data/demoData.js`. These will eventually be replaced with live data or removed.
- **Live tabs** (Facebook LIVE, Instagram LIVE, YouTube LIVE) — pull real data from Meta Graph API and YouTube Data API v3 via serverless functions.

**GitHub repo:** `github.com/Lakepointe-Church/social-dashboard-v2`
**Live URL:** `social-dashboard-v2.vercel.app`
**Stack:** Next.js 14, React 18, Tailwind CSS, Recharts, Lucide React

---

## File Structure

```
social-dashboard/
├── pages/
│   ├── index.js                  ← Main dashboard — all tabs wired here
│   └── api/
│       ├── facebook.js           ← Meta Graph API proxy (Facebook Page)
│       ├── instagram.js          ← Meta Graph API proxy (Instagram @lpconnect)
│       └── youtube.js            ← YouTube Data API v3 proxy
├── src/
│   ├── components/
│   │   ├── FacebookAnalytics.js  ← Facebook LIVE tab component
│   │   ├── InstagramAnalytics.js ← Instagram LIVE tab component
│   │   ├── YouTubeAnalytics.js   ← YouTube LIVE tab component
│   │   ├── Header.js             ← Top nav bar
│   │   ├── MetricCard.js         ← KPI card (demo tabs)
│   │   ├── PlatformCard.js       ← Platform summary card (demo tabs)
│   │   ├── FollowerGrowthChart.js
│   │   ├── EngagementChart.js
│   │   ├── TopContent.js
│   │   ├── GeoBreakdown.js
│   │   ├── ContentTypeChart.js
│   │   ├── AgeBreakdown.js
│   │   ├── MilestoneTracker.js
│   │   ├── BestTimeToPost.js
│   │   ├── AIChatPanel.js        ← AI Analyst chat (uses /api/chat)
│   │   └── CustomViewBuilder.js  ← Widget toggle UI
│   └── data/
│       └── demoData.js           ← All hardcoded demo data + getDataContext()
├── package.json
├── next.config.js
├── tailwind.config.js
└── CLAUDE.md                     ← This file
```

---

## Environment Variables (Vercel)

| Key | Description |
|-----|-------------|
| `META_PAGE_ACCESS_TOKEN` | Long-lived Facebook Page token (expires ~60 days, must be refreshed manually) |
| `META_PAGE_ID` | `142188242493004` — Lakepointe Church Facebook Page |
| `META_INSTAGRAM_ID` | `17841400949863101` — @lpconnect Instagram Business account |
| `META_APP_SECRET` | Lakepointe Social Dashboard app secret |
| `YOUTUBE_API_KEY` | YouTube Data API v3 key (Google Cloud) |
| `ANTHROPIC_API_KEY` | Powers the AI Analyst chat panel |

---

## API Routes

### `/api/facebook`
- **Auth:** `META_PAGE_ACCESS_TOKEN` (Page token)
- **Data:** Page followers, 30-day insights (reach, impressions, engaged users, page views), recent posts with likes/comments/shares, fan demographics, fan cities/countries
- **Content classification:** `stream` (service streams), `photo`, `video`, `other`
- **Date range:** Accepts `?since=UNIX&until=UNIX`

### `/api/instagram`
- **Auth:** `META_PAGE_ACCESS_TOKEN` (same token works for linked Instagram Business account)
- **Instagram ID:** `META_INSTAGRAM_ID`
- **Data:** Account summary, 30-day insights, new followers, 50 recent media with per-post insights, demographics, geo
- **Content classification:** `photo`, `carousel`, `reel` (VIDEO + REELS merged), `collab`, `other`
- **Collab detection:** Caption contains "josh howerton", "live free", "@joshhowerton", "@livefreewjh"
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
- **Approach 1 — Business Discovery by username:** `GET /{LP_ID}?fields=business_discovery.fields(id)&username=joshhowerton` → fails with `(#100) The parameter username is required` regardless of URL encoding strategy. Root cause unknown — may be a permissions gate or @joshhowerton not being a Business/Creator account.
- **Approach 2 — LP's own `/media` with `collaborators` field:** Collab posts where LP accepted Josh's invite do NOT appear in `/{LP_ID}/media`. The Graph API `/media` endpoint only returns posts where the account is the primary (owner) author, not co-author collabs.
- **Approach 3 — Josh's Facebook Page ID lookup:** `GET /379215606172427?fields=instagram_business_account` → fails with permission error requiring `Page Public Content Access` feature (gated behind Meta App Review).
- **If Josh's IG account ID becomes available** (from his team directly): skip Business Discovery entirely and try `GET /{josh-ig-id}/media?fields=...,collaborators` — may work without Business Discovery since that was the lookup step, not necessarily the access gate.
- **Workaround:** Ask Josh's team to consistently include `@lpconnect`, `@joshhowerton`, or `live free` in collab post captions — caption-based detection already picks those up.
- **Real fix:** Meta App Review (unlocks Business Discovery + Page Public Content Access).

### `/api/youtube`
- **Auth:** `YOUTUBE_API_KEY` (public API key — no OAuth yet)
- **Channel:** `UC5f7yO3WU_Ns0WDCQuP5bAw` (Lakepointe Church)
- **Data:** Channel stats, paginated video list (50 per page) with per-video stats
- **Pagination:** Accepts `?pageToken=TOKEN` for subsequent pages
- **Content classification:** `short` (≤3 min), `podcast` (title contains "Live Free with Josh Howerton" or "Live Free"), `sermon` (everything else)
- **Note:** Watch time, impressions CTR require YouTube Analytics API + OAuth. Pending access to Lakepointe YouTube account.

---

## InstagramAnalytics.js — Current Features (as of May 2026)

- **Sticky control bar** (`sticky top-16 z-20`) — content type filter chips, date range presets (7d/30d/90d + custom), and Refresh button stay pinned below the main app header while scrolling. `top-16` accounts for the main `Header.js` which is `h-16 sticky top-0`.
- **Profile Overview KPI cards** — labeled "Account-wide · not affected by filters" because these pull from account-level insights (not per-post), so content type and date filters don't change them.
- **Date range filter** — client-side, defaults to last 30 days. Filters all content sections (top posts, insights tables, all posts table). Does NOT re-fetch from API — always works on the 50 most recently fetched posts.
- **Top posts grid** — 2×2 layout: Views, Engagement, Shares, Saves. Each section is half the screen width with 4 posts in a horizontal row. Images use 3:4 portrait aspect ratio.
- **Reel & Photo insights tables** — top 10 per type, sorted by views. Columns: Post, Type, Date, Views, rate metrics. Reels also show Avg Watch Time. Skip Rate and Repost Rate were removed when Instagram deprecated the `plays` and `clips_replays_count` metrics in v22.0.
- **All Posts table** — numbered rows, sortable columns (click header to toggle asc/desc, active column highlighted pink), paginated 20 at a time with "Load More" button showing remaining count.

---

## Key Design Decisions

### Token Management
- Facebook/Instagram uses a **long-lived Page Access Token** stored in Vercel env vars. Expires every ~60 days. Manually refresh via: Meta Graph API Explorer → generate token → `142188242493004?fields=name,fan_count,access_token` → Access Token Debugger → Extend Access Token → update `META_PAGE_ACCESS_TOKEN` in Vercel → Redeploy.
- YouTube uses a simple **API key** (no OAuth). Advanced analytics (watch time, CTR) will require OAuth when Lakepointe YouTube account access is obtained.

### Content Filters (Instagram & Facebook)
Both live tabs use multi-select filter chips. Deselecting all shows an empty state with a reset button. Filters are client-side only — all posts are fetched then filtered in the browser.

### Meta API Limitations (Development Mode)
Several metrics return 0 until the app completes Meta App Review:
- `page_engaged_users`, `page_video_views` (Facebook)
- `profile_visits`, `total_interactions`, `shares` (Instagram account-level)
- Per-reel metrics may also be gated

This is expected. The app needs to be submitted for App Review and published before these unlock.

### Demo Data
`demoData.js` contains 365 days of seeded fake data for Facebook, Instagram, YouTube, TikTok. The `getDataContext()` function exports a text summary used by the AI Analyst. Eventually the demo tabs and this file will be replaced with real data.

---

## Pending Work

- [ ] **YouTube OAuth** — need access to Lakepointe YouTube Studio account. Required for: cumulative watch time, avg watch time per episode, impression CTR. OAuth flow is set up in Google Cloud (Client ID + Secret exist), just needs account access.
- [ ] **Meta App Review** — submit app for review to unlock gated metrics (engaged users, video views, profile visits, interactions, shares at account level)
- [ ] **Incoming collab posts** — Josh posts + invites LP as collaborator. Blocked by Meta API permissions (see "Incoming Collab Posts" note above). Unblock via: (a) get Josh's IG ID from his team and test direct media fetch, or (b) Meta App Review.
- [ ] **Facebook tab updates** — apply same changes as Instagram: 2×2 top posts grid (Views/Engagement/Shares/Saves), per-post insights table with Type+Date columns, sticky control bar with date range + content filters, numbered+sortable+paginated All Posts table
- [ ] **Token refresh automation** — currently manual every 60 days. Could automate with a cron job that uses the App Secret to refresh.
- [ ] **TikTok integration** — pending TikTok for Business API access approval
- [ ] **Remove demo tabs** — once all 4 platforms have live data, the demo tabs (All, Facebook, Instagram, YouTube, TikTok) and `demoData.js` can be removed
- [ ] **Top nav redesign** — the current header (90 Days, Customize, AI Analyst) will be redesigned. Date range selector has been moved to individual live tab headers.

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

```bash
cd ~/social-dashboard-v2/social-dashboard
git add .
git commit -m "Your message"
git push origin main
# Vercel auto-deploys on push to main
```

If Vercel doesn't auto-deploy or you need to force it:
- Go to vercel.com/plafatas-projects/social-dashboard-v2
- Deployments → find latest commit → promote to production

---

## How to Refresh the Meta Token

1. Go to developers.facebook.com → Tools → Graph API Explorer
2. Select app: **Lakepointe Social Dashboard**
3. Add permissions: `read_insights`, `pages_show_list`, `pages_read_engagement`, `pages_read_user_content`, `instagram_basic`, `instagram_manage_insights`, `instagram_content_publish`
4. Click **Generate Access Token** → complete Facebook login → select Lakepointe Church page
5. In URL field: `142188242493004?fields=name,fan_count,access_token` → Submit
6. Copy the `access_token` from the JSON response
7. Go to Tools → Access Token Debugger → paste token → Debug → **Extend Access Token**
8. Copy the new long-lived token
9. Go to Vercel → social-dashboard-v2 → Environment Variables → edit `META_PAGE_ACCESS_TOKEN` → paste → Save → Redeploy
