---
description: Launch the Lakepointe Social Dashboard dev server and drive it with a browser
---

# Run skill — Lakepointe Social Dashboard

## Stack
Next.js 14, React 18, Tailwind CSS. Entry point: `social-dashboard/` directory.

## Launch

```bash
cd /Users/jolieroberson/social-dashboard-v2/social-dashboard
npm run dev
```

Server starts on **http://localhost:3000**. Wait for `ready - started server on 0.0.0.0:3000` in stdout before opening the browser.

## Environment
Live API routes (`/api/instagram`, `/api/facebook`, `/api/youtube`) require env vars that are set in Vercel but NOT in `.env.local` locally. If you need to test API routes locally, the user must add them to `.env.local`. For UI-only changes, the dev server runs fine without them (API calls will fail but components render).

## Tab structure
- **Demo tabs** (All, Facebook, Instagram, YouTube, TikTok) — use hardcoded data, always render without API keys
- **Live tabs** (Facebook LIVE, Instagram LIVE, YouTube LIVE) — require API keys; will show loading/error states without them

## What to test
After UI changes, always check:
1. The specific tab/component that was changed
2. The sticky control bar stays pinned while scrolling (Instagram LIVE)
3. Content type filter chips still update counts correctly
4. Date range filter still narrows the post list
5. All Posts table: sort, Load More, row numbers all work
6. No layout breakage at narrow viewport (toggle browser width)

## Key URLs
- Dashboard: http://localhost:3000
- Instagram debug: http://localhost:3000/api/instagram-debug (requires env vars)
- Collab debug: http://localhost:3000/api/instagram-collab-debug (requires env vars)
- Production: https://social-dashboard-v2.vercel.app
