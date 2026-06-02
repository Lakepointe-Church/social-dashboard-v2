import { Redis } from '@upstash/redis';

// Upstash via Vercel Marketplace sets KV_REST_API_* vars.
// Direct Upstash sets UPSTASH_REDIS_REST_* vars.
// Support both.
export const redis = new Redis({
  url:   process.env.KV_REST_API_URL   || process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
});
