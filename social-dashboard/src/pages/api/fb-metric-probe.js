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
    // New names: viewers = unique accounts (reach), views = total appearances (impressions)
    'page_viewers',
    'page_views',
    // Already confirmed working
    'page_video_views',
    'page_post_engagements',
    'page_daily_follows_unique',
    // Old names to confirm still dead
    'page_reach',
    'page_impressions_unique',
    'page_impressions',
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

  // ── Post-level candidates ──────────────────────────────────────────────────
  // Fetch most recent post + most recent video post separately (some metrics only apply to videos)
  const postsRes  = await fetch(`${base}/${PAGE_ID}/posts?fields=id,attachments{type}&limit=10&access_token=${token}&appsecret_proof=${proof}`);
  const postsData = await postsRes.json();
  const allPosts  = postsData.data || [];
  const samplePostId  = allPosts[0]?.id || null;
  const videoPost     = allPosts.find(p => ['video_inline','video'].includes(p.attachments?.data?.[0]?.type));
  const sampleVideoId = videoPost?.id || null;

  // Meta renamed metrics Jun 2026: reach→viewers, impressions→views
  // Candidates without metric_type
  const postCandidates = [
    // New names (viewers = unique accounts, views = total appearances)
    'post_viewers',
    'post_views',
    'viewers',
    'views',
    // Still testing old names to confirm dead
    'post_impressions_unique',
    'post_reach',
    // Video-specific
    'post_video_views',
    'post_video_viewers',
    // Other working metrics from previous run
    'post_reactions_by_type_total',
    'post_clicks',
  ];

  // Candidates with metric_type=total_value
  const postTotalValueCandidates = [
    'viewers',
    'views',
    'post_viewers',
    'post_views',
    'post_clicks',
    'reach',
    'impressions',
  ];

  const postReport = { samplePostId, sampleVideoId, results: {}, totalValueResults: {}, videoResults: {} };

  if (samplePostId) {
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

    // Test with metric_type=total_value
    const tvResults = await Promise.allSettled(
      postTotalValueCandidates.map(metric =>
        fetch(`${base}/${samplePostId}/insights?metric=${metric}&metric_type=total_value&access_token=${token}&appsecret_proof=${proof}`)
          .then(r => r.json())
      )
    );
    tvResults.forEach((r, i) => {
      const m = postTotalValueCandidates[i];
      if (r.status === 'rejected') {
        postReport.totalValueResults[m] = { status: 'network_error', error: String(r.reason) };
      } else if (r.value.error) {
        postReport.totalValueResults[m] = { status: 'api_error', error: r.value.error.message };
      } else {
        const val = r.value.data?.[0]?.total_value?.value ?? r.value.data?.[0]?.values?.[0]?.value ?? null;
        postReport.totalValueResults[m] = { status: 'ok', value: val };
      }
    });
  }

  // Test video-specific metrics against a known video post
  if (sampleVideoId && sampleVideoId !== samplePostId) {
    const videoMetrics = ['post_viewers', 'post_views', 'post_video_views', 'post_video_viewers', 'post_video_view_time', 'post_video_complete_views_30s'];
    const videoResults = await Promise.allSettled(
      videoMetrics.map(metric =>
        fetch(`${base}/${sampleVideoId}/insights?metric=${metric}&access_token=${token}&appsecret_proof=${proof}`)
          .then(r => r.json())
      )
    );
    videoResults.forEach((r, i) => {
      const m = videoMetrics[i];
      if (r.status === 'rejected') {
        postReport.videoResults[m] = { status: 'network_error', error: String(r.reason) };
      } else if (r.value.error) {
        postReport.videoResults[m] = { status: 'api_error', error: r.value.error.message };
      } else {
        const val = r.value.data?.[0]?.values?.[0]?.value ?? r.value.data?.[0]?.value ?? null;
        postReport.videoResults[m] = { status: 'ok', value: val };
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
