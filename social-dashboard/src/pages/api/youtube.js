// ─────────────────────────────────────────────────────────────────────────────
// /api/youtube — YouTube Data API v3 proxy
// Supports pagination via ?pageToken= query param.
// Returns 50 videos per page with content type classification.
// ─────────────────────────────────────────────────────────────────────────────

const CHANNEL_ID       = 'UC5f7yO3WU_Ns0WDCQuP5bAw'; // Lakepointe Church
const RESULTS_PER_PAGE = 50;
const PODCAST_MARKER   = 'Live Free with Josh Howerton';

// ── Duration helpers ──────────────────────────────────────────────────────────
function parseDurationSeconds(iso8601) {
  const match = iso8601?.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  return (parseInt(match[1] || 0) * 3600) +
         (parseInt(match[2] || 0) * 60)   +
          parseInt(match[3] || 0);
}

function formatDuration(seconds) {
  if (!seconds) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return `${m}:${String(s).padStart(2,'0')}`;
}

// ── Content type classification ───────────────────────────────────────────────
function classifyVideo(title, durationISO) {
  const seconds = parseDurationSeconds(durationISO);
  if (seconds > 0 && seconds <= 180) return 'short';           // Under 3 min → Short
  if (title?.includes(PODCAST_MARKER))  return 'podcast';      // Live Free → Podcast
  return 'sermon';                                              // Everything else → Sermon
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey    = process.env.YOUTUBE_API_KEY;
  const pageToken = req.query.pageToken || '';

  if (!apiKey) {
    return res.status(500).json({
      error: 'YOUTUBE_API_KEY not configured.',
      hint:  'Add YOUTUBE_API_KEY to your Vercel environment variables.',
    });
  }

  try {
    // ── 1. Channel stats (first page only) ───────────────────────────────────
    let channelInfo = null;
    if (!pageToken) {
      const channelRes  = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${CHANNEL_ID}&key=${apiKey}`
      );
      const channelData = await channelRes.json();
      if (channelData.error) throw new Error(channelData.error.message);
      if (!channelData.items?.length) return res.status(404).json({ error: 'Channel not found.' });

      const ch             = channelData.items[0];
      const st             = ch.statistics;
      const subscriberCount = parseInt(st.subscriberCount || 0);
      const viewCount       = parseInt(st.viewCount       || 0);
      const videoCount      = parseInt(st.videoCount      || 0);

      channelInfo = {
        name:             ch.snippet.title,
        subscriberCount,
        viewCount,
        videoCount,
        avgViewsPerVideo: videoCount > 0 ? Math.round(viewCount / videoCount) : 0,
      };
    }

    // ── 2. Paginated video list ───────────────────────────────────────────────
    const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
    searchUrl.searchParams.set('part',       'snippet');
    searchUrl.searchParams.set('channelId',  CHANNEL_ID);
    searchUrl.searchParams.set('order',      'date');
    searchUrl.searchParams.set('maxResults', String(RESULTS_PER_PAGE));
    searchUrl.searchParams.set('type',       'video');
    searchUrl.searchParams.set('key',        apiKey);
    if (pageToken) searchUrl.searchParams.set('pageToken', pageToken);

    const searchRes  = await fetch(searchUrl.toString());
    const searchData = await searchRes.json();
    if (searchData.error) throw new Error(searchData.error.message);

    const nextPageToken = searchData.nextPageToken || null;

    // ── 3. Per-video stats + duration ─────────────────────────────────────────
    let videos = [];
    if (searchData.items?.length) {
      const videoIds = searchData.items
        .map(v => v.id.videoId)
        .filter(Boolean)
        .join(',');

      const videoRes  = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet,contentDetails&id=${videoIds}&key=${apiKey}`
      );
      const videoData = await videoRes.json();
      if (videoData.error) throw new Error(videoData.error.message);

      videos = (videoData.items || []).map(v => {
        const viewCount    = parseInt(v.statistics.viewCount    || 0);
        const likeCount    = parseInt(v.statistics.likeCount    || 0);
        const commentCount = parseInt(v.statistics.commentCount || 0);
        const engRate      = viewCount > 0
          ? parseFloat(((likeCount + commentCount) / viewCount * 100).toFixed(2))
          : 0;
        const durationISO  = v.contentDetails?.duration || '';
        const durationSecs = parseDurationSeconds(durationISO);

        return {
          id:             v.id,
          title:          v.snippet.title,
          publishedAt:    v.snippet.publishedAt,
          thumbnail:      v.snippet.thumbnails?.medium?.url || '',
          durationSecs,
          duration:       formatDuration(durationSecs),
          contentType:    classifyVideo(v.snippet.title, durationISO),
          viewCount,
          likeCount,
          commentCount,
          engagementRate: engRate,
        };
      });
    }

    return res.status(200).json({
      channel: channelInfo,
      videos,
      nextPageToken,
      fetchedAt: new Date().toISOString(),
    });

  } catch (err) {
    console.error('YouTube API error:', err);
    return res.status(500).json({
      error:  'Failed to fetch YouTube data.',
      detail: err.message,
    });
  }
}
