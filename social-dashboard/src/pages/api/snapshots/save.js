import { redis } from '../../../lib/redis';
import crypto from 'crypto';

const FB_API     = 'https://graph.facebook.com/v25.0';
const YT_CHANNEL = 'UC5f7yO3WU_Ns0WDCQuP5bAw';

function appSecretProof(token) {
  if (!process.env.META_APP_SECRET) return '';
  return crypto
    .createHmac('sha256', process.env.META_APP_SECRET)
    .update(token)
    .digest('hex');
}

export default async function handler(req, res) {
  // Vercel injects Authorization: Bearer <CRON_SECRET> for cron calls.
  // Skip auth check in local dev where CRON_SECRET is not set.
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers['authorization'] !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = process.env.META_PAGE_ACCESS_TOKEN;
  const proof = appSecretProof(token);

  const [fbRes, igRes, ytRes] = await Promise.allSettled([
    fetch(
      `${FB_API}/${process.env.META_PAGE_ID}?fields=followers_count` +
      `&access_token=${token}&appsecret_proof=${proof}`
    ).then(r => r.json()),

    fetch(
      `${FB_API}/${process.env.META_INSTAGRAM_ID}?fields=followers_count` +
      `&access_token=${token}&appsecret_proof=${proof}`
    ).then(r => r.json()),

    fetch(
      `https://www.googleapis.com/youtube/v3/channels` +
      `?part=statistics&id=${YT_CHANNEL}&key=${process.env.YOUTUBE_API_KEY}`
    ).then(r => r.json()),
  ]);

  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const score = Math.floor(Date.now() / 1000);          // unix seconds

  const snapshot = {
    date:      today,
    facebook:  fbRes.status === 'fulfilled' ? (fbRes.value?.followers_count ?? null) : null,
    instagram: igRes.status === 'fulfilled' ? (igRes.value?.followers_count ?? null) : null,
    youtube:   ytRes.status === 'fulfilled'
      ? (ytRes.value?.items?.[0]?.statistics?.subscriberCount
          ? parseInt(ytRes.value.items[0].statistics.subscriberCount, 10)
          : null)
      : null,
  };

  // Idempotent: SET overwrites if the cron runs more than once today
  await redis.set(`followers:${today}`, JSON.stringify(snapshot));
  await redis.zadd('followers:dates', { score, member: today });

  return res.status(200).json({ ok: true, snapshot });
}
