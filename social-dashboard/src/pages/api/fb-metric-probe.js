// ─────────────────────────────────────────────────────────────────────────────
// /api/fb-metric-probe — Phase 2 diagnostic only; delete once Phase 2 is done
// Tests candidate metric names against the live account and reports what works
// ─────────────────────────────────────────────────────────────────────────────

import crypto from 'crypto';

const PAGE_ID = process.env.META_PAGE_ID;

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const token  = process.env.META_PAGE_ACCESS_TOKEN;
  const secret = process.env.META_APP_SECRET;
  if (!token || !secret || !PAGE_ID) return res.status(500).json({ error: 'Missing env vars' });

  const base  = 'https://graph.facebook.com/v25.0';
  const proof = crypto.createHmac('sha256', secret).update(token).digest('hex');
  const now     = Math.floor(Date.now() / 1000);
  const daysAgo = n => Math.floor((Date.now() - n * 24 * 60 * 60 * 1000) / 1000);

  // ── Page-level candidates (period=week) ────────────────────────────────────
  const pageWeekCandidates = [
    // reach / impressions replacements
    'page_reach',
    'page_total_actions',
    'page_total_views',
    'page_content_activity',
    'page_video_views',
    'page_post_engagements',
    // engaged users replacements
    'page_actions_post_reactions_total',
    'page_posts_activity',
    // fan adds replacements
    'page_fan_adds_unique',
    'page_daily_follows',
    'page_daily_follows_unique',
    'page_follows',
    'page_fans_adds',
    'page_fans_adds_unique',
  ];

  const pageWeekResults = await Promise.allSettled(
    pageWeekCandidates.map(metric =>
      fetch(`${base}/${PAGE_ID}/insights?metric=${metric}&period=week&since=${daysAgo(28)}&until=${now}&access_token=${token}&appsecret_proof=${proof}`)
        .then(r => r.json())
    )
  );

  const pageWeekReport = {};
  pageWeekResults.forEach((r, i) => {
    const m = pageWeekCandidates[i];
    if (r.status === 'rejected') {
      pageWeekReport[m] = { status: 'network_error', error: String(r.reason) };
    } else if (r.value.error) {
      pageWeekReport[m] = { status: 'api_error', error: r.value.error.message };
    } else {
      const total = (r.value.data || []).reduce((s, d) =>
        s + (d.values || []).reduce((sv, v) => sv + (typeof v.value === 'object'
          ? Object.values(v.value).reduce((a, b) => a + b, 0)
          : (v.value || 0)), 0), 0);
      pageWeekReport[m] = { status: 'ok', total };
    }
  });

  // ── Page-level candidates (period=day) — some metrics only work day-period ─
  const pageDayCandidates = [
    'page_reach',
    'page_fan_adds',
    'page_fan_adds_unique',
    'page_engaged_users',
    'page_post_engagements',
    'page_daily_follows',
    'page_daily_follows_unique',
  ];

  const pageDayResults = await Promise.allSettled(
    pageDayCandidates.map(metric =>
      fetch(`${base}/${PAGE_ID}/insights?metric=${metric}&period=day&since=${daysAgo(28)}&until=${now}&access_token=${token}&appsecret_proof=${proof}`)
        .then(r => r.json())
    )
  );

  const pageDayReport = {};
  pageDayResults.forEach((r, i) => {
    const m = pageDayCandidates[i];
    if (r.status === 'rejected') {
      pageDayReport[m] = { status: 'network_error', error: String(r.reason) };
    } else if (r.value.error) {
      pageDayReport[m] = { status: 'api_error', error: r.value.error.message };
    } else {
      const total = (r.value.data || []).reduce((s, d) =>
        s + (d.values || []).reduce((sv, v) => sv + (v.value || 0), 0), 0);
      pageDayReport[m] = { status: 'ok', total };
    }
  });

  // ── Post-level candidates — test against the most recent post ──────────────
  const postsRes  = await fetch(`${base}/${PAGE_ID}/posts?fields=id&limit=1&access_token=${token}&appsecret_proof=${proof}`);
  const postsData = await postsRes.json();
  const samplePostId = postsData.data?.[0]?.id || null;

  const postReport = { samplePostId, results: {} };

  if (samplePostId) {
    const postCandidates = [
      'post_impressions_unique',
      'post_impressions',
      'post_reach',
      'post_reach_unique',
      'post_total_views',
      'post_views_unique',
      'post_engaged_users',
      'post_engagements',
      'post_total_reactions',
      'post_reactions_by_type_total',
      'post_activity',
    ];

    const postResults = await Promise.allSettled(
      postCandidates.map(metric =>
        fetch(`${base}/${samplePostId}/insights?metric=${metric}&access_token=${token}&appsecret_proof=${proof}`)
          .then(r => r.json())
      )
    );

    postResults.forEach((r, i) => {
      const m = postCandidates[i];
      if (r.status === 'rejected') {
        postReport.results[m] = { status: 'network_error', error: String(r.reason) };
      } else if (r.value.error) {
        postReport.results[m] = { status: 'api_error', error: r.value.error.message };
      } else {
        const val = r.value.data?.[0]?.values?.[0]?.value ?? r.value.data?.[0]?.value ?? null;
        postReport.results[m] = { status: 'ok', value: val };
      }
    });
  }

  return res.status(200).json({
    _note: 'Phase 2 diagnostic — delete this file once Phase 2 is complete',
    pageMetrics_period_week: pageWeekReport,
    pageMetrics_period_day:  pageDayReport,
    postMetrics:             postReport,
  });
}
