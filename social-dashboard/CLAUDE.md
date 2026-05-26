# Lakepointe Social Dashboard — CLAUDE.md

This file gives Claude context about the project so it can help effectively without needing to re-explain everything each session.

---

## Project Overview

A live social media analytics dashboard for **Lakepointe Church** (@lpconnect). Built with **Next.js 14 + Tailwind CSS**, deployed on **Vercel**. The dashboard has two layers:

- **Live tabs** (Overview, Facebook, Instagram, Instagram Audience, YouTube) — pull real data from Meta Graph API and YouTube Data API v3 via serverless functions. The demo All tab has been removed.
- **Demo data** (`src/data/demoData.js`) — still present but only used by the AI Analyst `getDataContext()`. Will be fully removed once remaining demo tabs are gone.

**GitHub repo:** `github.com/Lakepointe-Church/social-dashboard-v2`
**Live URL:** `social-dashboard-v2.vercel.app`
**Stack:** Next.js 14, React 18, Tailwind CSS, Recharts, Lucide React

---

## File Structure

```
social-dashboard/
├── pages/
│   ├── index.js                  ← Main dashboard — all tabs + AI panel wired here
│   └── api/
│       ├── facebook.js           ← Meta Graph API proxy (Facebook Page)
│       ├── instagram.js          ← Meta Graph API proxy (Instagram @lpconnect)
│       ├── youtube.js            ← YouTube Data API v3 proxy
│       └── chat.js               ← AI Analyst endpoint (Anthropic claude-sonnet-4-6)
├── src/
│   ├── components/
│   │   ├── AllOverview.js        ← Cross-platform Overview tab (live)
│   │   ├── FacebookAnalytics.js  ← Facebook LIVE tab component
│   │   ├── InstagramAnalytics.js ← Instagram LIVE tab component
│   │   ├── InstagramAudience.js  ← Instagram Audience tab component
│   │   ├── YouTubeAnalytics.js   ← YouTube LIVE tab component (fully built out)
│   │   ├── Header.js             ← Top nav bar (simplified — no props, no Demo Mode badge)
│   │   ├── MetricCard.js         ← KPI card component
│   │   ├── PlatformCard.js       ← Platform summary card
│   │   ├── FollowerGrowthChart.js
│   │   ├── EngagementChart.js
│   │   ├── TopContent.js         ← Cross-platform top posts, ranked by engagement
│   │   ├── GeoBreakdown.js
│   │   ├── ContentTypeChart.js   ← Bar chart by content type (accepts barKey/barLabel props)
│   │   ├── AgeBreakdown.js
│   │   ├── MilestoneTracker.js   ← Follower milestone progress bars
│   │   ├── BestTimeToPost.js
│   │   ├── AIChatPanel.js        ← AI Analyst slide-up chat panel (wired to live data)
│   │   ├── DynamicViz.js         ← Renders AI Analyst chart/table responses
│   │   └── CustomViewBuilder.js  ← Widget toggle UI
│   ├── lib/
│   │   ├── igDataCache.js        ← 5-min client-side cache for /api/instagram
│   │   ├── fbDataCache.js        ← 5-min client-side cache for /api/facebook
│   │   └── ytDataCache.js        ← 5-min client-side cache for /api/youtube
│   └── data/
│       └── demoData.js           ← Hardcoded demo data + getDataContext() for AI Analyst fallback
├── package.json
├── next.config.js
├── tailwind.config.js
└── CLAUDE.md                     ← This file
```

---

## Environment Variables (Vercel)

| Key                      | Description                                                                   |
| ------------------------ | ----------------------------------------------------------------------------- |
| `META_PAGE_ACCESS_TOKEN` | Long-lived Facebook Page token (expires ~60 days, must be refreshed manually) |
| `META_PAGE_ID`           | `142188242493004` — Lakepointe Church Facebook Page                           |
| `META_INSTAGRAM_ID`      | `17841400949863101` — @lpconnect Instagram Business account                   |
| `META_APP_SECRET`        | Lakepointe Social Dashboard app secret                                        |
| `YOUTUBE_API_KEY`        | YouTube Data API v3 key (Google Cloud)                                        |
| `ANTHROPIC_API_KEY`      | Powers the AI Analyst chat panel                                              |

---

## API Routes

### `/api/facebook`

- **Auth:** `META_PAGE_ACCESS_TOKEN` (Page token)
- **Data:** Page followers, 30-day insights (reach, impressions, engaged users, page views, new fans), recent posts with likes/comments/shares, fan demographics, fan cities/countries
- **Content classification:** `stream` (service streams), `photo`, `video`, `other`
- **`page_fan_adds`** included in insight metrics — returns new followers in the 28-day window. Exposed as `insights.newFans` in the API response. Shown in the Overview tab FB card as "New Followers (30d)".
- **Date range:** Accepts `?since=UNIX&until=UNIX`

### `/api/instagram`

- **Auth:** `META_PAGE_ACCESS_TOKEN` (same token works for linked Instagram Business account)
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

### `/api/youtube`

- **Auth:** `YOUTUBE_API_KEY` (public API key — no OAuth yet)
- **Channel:** `UC5f7yO3WU_Ns0WDCQuP5bAw` (Lakepointe Church)
- **Data:** Channel stats, paginated video list (50 per page) with per-video stats
- **Pagination:** Accepts `?pageToken=TOKEN` for subsequent pages
- **Content classification:** `short` (≤3 min), `podcast` (title contains "Live Free with Josh Howerton" or "Live Free"), `sermon` (everything else)
- **Note:** Watch time, impressions CTR require YouTube Analytics API + OAuth. Pending access to Lakepointe YouTube account.

---

## YouTubeAnalytics.js — Current Features (as of May 2026)

- **Sticky control bar** (`sticky top-16 z-20`) — content type filter chips (Podcast, Sermon, Short with emoji + color), date range presets (7d/30d/90d + custom), Refresh button. Multi-select: deselecting all shows empty state with reset.
- **Channel Overview KPIs** — Subscribers, Total Views, Total Videos, Avg Views/Video. Labeled "Channel-wide · not affected by filters" since these are lifetime channel stats.
- **Advanced Metrics (Pending OAuth)** — Total Watch Time, Avg Watch Time/Video, Impression CTR shown as `0 🔒` with amber "Pending · YouTube OAuth required" badge. These require YouTube Analytics API + OAuth which is blocked until Lakepointe YouTube account access is obtained.
- **Content Breakdown** — `grid-cols-3` inside each content type card: Total Views, Avg Views, Avg Engagement Rate all in one row.
- **Top 10 sections** — Two side-by-side horizontal scroll rows: "Top 10 by Views" and "Top 10 by Engagement". Cards are `w-56 flex-shrink-0` in a `flex gap-3 overflow-x-auto pb-2` row. Each card shows thumbnail (16:9 via `aspect-video`, using `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` — public, no API key needed), title, rank badge, and primary metric.
- **All Videos table** — sortable by all columns including Type. Self-contained `sort` state `{ key, dir }`. Uses `durationSecs` (numeric) for duration sorting instead of the display string. Colored pill for Type column (green=short, blue=podcast, violet=sermon). Paginated with "Load More" button.
- **OutsideDateRangeNote** — collapsible notice at the bottom of the video list that lists videos which were fetched but fall outside the selected date window (with title + content type). This explains count discrepancies like "50 loaded but 45 in view."
- **Content type classification** (in `/api/youtube.js`): `short` (≤180s), `podcast` (title contains "Live Free with Josh Howerton" or "Live Free"), `sermon` (everything else). All videos get exactly one of these three labels — no unclassified bucket.

---

## AIChatPanel.js — AI Analyst (Live Data, as of May 2026)

The AI Analyst is a slide-up chat panel powered by `claude-sonnet-4-6` via the Anthropic API.

**Architecture:**
- Floating "Ask AI Analyst" button (`fixed bottom-6 right-6`) in `index.js` toggles the panel
- `AIChatPanel.js` accepts a `liveContext` prop (a pre-built text summary string)
- On send, the client POSTs `{ message, history, context: liveContext }` to `/api/chat`
- `/api/chat` uses `req.body.context` if provided; falls back to `getDataContext()` (demo data) if all platform fetches failed

**Live context building (in `index.js`):**
- `buildLiveContext(fbData, igData, ytData)` — called once on mount via `useEffect` + `Promise.allSettled`
- Calls all 3 caches in parallel; partial failures produce `null` for that platform (graceful degradation)
- Produces a structured text summary: followers, reach/impressions, top 3 posts per platform with caption snippet, engagement rates
- Client-side only — the three data caches use relative `fetch('/api/xxx')` URLs and cannot be imported in server-side code

**Suggested questions** — 8 preset prompt chips shown on the welcome screen. Can be updated to match what Jolie/leadership actually ask most.

**`/api/chat` system prompt:** Instructs Claude to always return valid JSON in the shape `{ message, highlights, visualization }`. The `DynamicViz.js` component renders the `visualization` field as a Recharts chart or table.

---

## InstagramAnalytics.js — Current Features (as of May 2026)

- **Sticky control bar** (`sticky top-16 z-20`) — content type filter chips, date range presets (7d/30d/90d + custom), and Refresh button stay pinned below the main app header while scrolling. `top-16` accounts for the main `Header.js` which is `h-16 sticky top-0`.
- **Profile Overview KPI cards** — labeled "Account-wide · not affected by filters" because these pull from account-level insights (not per-post), so content type and date filters don't change them.
- **Date range filter** — client-side, defaults to last 30 days. Filters all content sections (top posts, insights tables, all posts table). Does NOT re-fetch from API — always works on the 50 most recently fetched posts.
- **Top posts grid** — 2×2 layout: Views, Engagement, Shares, Saves. Each section is half the screen width with 4 posts in a horizontal row. Images use 3:4 portrait aspect ratio.
- **Reel & Photo insights tables** — top N per type (dynamic count, max 10), sorted by views. Columns: Post, Type, Date, Views, rate metrics. Reels also show Avg Watch Time. Skip Rate and Repost Rate were removed when Instagram deprecated the `plays` and `clips_replays_count` metrics in v22.0.
- **All Posts table** — numbered rows, sortable columns including Type (click header to toggle asc/desc, active column highlighted pink), paginated 20 at a time with "Load More" button showing remaining count.
- **Demographics & geo removed** — Age & Gender chart, Top Cities, and Top Countries were removed from the Instagram tab (May 2026) to revisit later.

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

**Critical:** Do NOT embed `insights.metric(post_impressions_unique, post_engaged_users)` as a sub-field in the `/posts` Graph API query. These metrics are gated behind App Review, and embedding them causes the **entire posts request to fail** (not just return 0s). Fetch per-post insights separately after App Review is approved.

### Demo Data

`demoData.js` contains 365 days of seeded fake data for Facebook, Instagram, YouTube, TikTok. The `getDataContext()` function exports a text summary used by the AI Analyst. Eventually the demo tabs and this file will be replaced with real data.

---

## Pending Work

- [ ] **YouTube OAuth** — need access to Lakepointe YouTube Studio account. Required for: cumulative watch time, avg watch time per episode, impression CTR. OAuth flow is set up in Google Cloud (Client ID + Secret exist), just needs account access. The Advanced Metrics section in the YouTube tab shows these as `0 🔒` with "Pending · YouTube OAuth required" until resolved.
- [ ] **Meta App Review** — submit app for review to unlock gated metrics (engaged users, video views, profile visits, interactions, shares at account level). Once approved: add `post_video_views` to the Facebook posts query and update `PostCard` to show a play icon + video views instead of eye icon + reach when `post.contentType === 'video'`. Reach and views are distinct on Facebook — reach = unique people who saw it (`post_impressions_unique`), views = times the video was played (`post_video_views`).
- [ ] **Incoming collab posts** — Josh posts + invites LP as collaborator. Blocked by Meta API permissions (see "Incoming Collab Posts" note above). Unblock via: (a) get Josh's IG ID from his team and test direct media fetch, or (b) Meta App Review.
- [ ] **Facebook tab updates** — sticky bar, top-post cards (icons, Reach/Engagement/Shares breakdown), and numbered+sortable+paginated All Posts table are done. Still needed: per-post insights table (Engagement Rates section matching Instagram's Reel & Photo tables)
- [ ] **Token refresh automation** — currently manual every 60 days. Could automate with a cron job that uses the App Secret to refresh.
- [ ] **TikTok integration** — pending TikTok for Business API access approval
- [x] **Overview tab** — live cross-platform overview is complete (KPIs, per-platform cards, best post by channel, milestones, top content, content type performance, best time to post)
- [x] **YouTube tab** — fully built out: sticky filter bar, content type chips, date filter, channel KPIs, content breakdown (single row), top-10 horizontal scroll rows, sortable All Videos table, OutsideDateRangeNote, pending OAuth placeholders
- [x] **AI Analyst** — wired to live data: `buildLiveContext()` in `index.js` fetches all 3 platforms on mount and passes context string to `AIChatPanel`, which forwards it to `/api/chat`. Falls back to demo data if all fetches fail.
- [ ] **Remove remaining demo tabs** — TikTok demo tab and `demoData.js` (except `getDataContext()` fallback for AI Analyst) can be removed once TikTok has live data
- [ ] **AI Analyst suggested questions** — update the 8 preset prompt chips in `AIChatPanel.js` to reflect questions Jolie/leadership actually ask most often

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

Use the `/ship` slash command (`.claude/commands/ship.md`) to stage, commit, and push in one step: `/ship your message here`

Use the `/doc` slash command (`.claude/commands/doc.md`) to update CLAUDE.md with the current session's changes and push: `/doc`

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

---

## Recent Changes (May 2026)

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
- Milestones: FB 250K followers, IG 300K followers, YT 1M subscribers
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
