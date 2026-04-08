# Lake Pointe Social Dashboard

A live, AI-powered social media analytics dashboard for Lake Pointe Church.
Built with Next.js + Tailwind CSS, deployed on Vercel, with a Claude-powered AI Analyst.

## Quick Start (Local)

```bash
# 1. Install dependencies
cd social-dashboard
npm install

# 2. Set up environment variables
cp .env.example .env.local
# Edit .env.local and add your ANTHROPIC_API_KEY

# 3. Run locally
npm run dev
# Open http://localhost:3000
```

## Deploy to Vercel

1. Push this folder to your GitHub repo
2. Go to vercel.com → New Project → Import your repo
3. In Project Settings → Environment Variables, add:
   - `ANTHROPIC_API_KEY` = your key from console.anthropic.com
4. Click Deploy — done!

> The dashboard works in **Demo Mode** without any API keys.
> Only the AI Analyst feature requires `ANTHROPIC_API_KEY`.

## Adding Real Social Media Data

When you have API credentials, add them to `.env.local` (see `.env.example`)
and update `src/data/demoData.js` to fetch from real APIs instead of
returning static data.

## AI Analyst

Click **"Ask AI Analyst"** to open the chat panel. You can ask:
- "Which platform is growing fastest?"
- "What content type gets the most engagement?"
- "When will YouTube hit 100K subscribers?"
- "Compare reach across all platforms"
- "What should we focus on to grow faster?"

The AI reads all 90 days of data and returns insights plus custom charts.

## Tech Stack

- **Frontend**: Next.js 14, React, Tailwind CSS
- **Charts**: Recharts
- **AI**: Anthropic Claude (claude-sonnet-4-6)
- **Hosting**: Vercel (recommended)
- **Icons**: Lucide React
