// ─────────────────────────────────────────────────────────────────────────────
// /api/youtube — YouTube Data API v3 proxy
// Fetches live channel stats + recent video performance for Lakepointe Church.
// API key is stored securely in YOUTUBE_API_KEY environment variable.
// ─────────────────────────────────────────────────────────────────────────────

const CHANNEL_ID = 'UC5f7yO3WU_Ns0WDCQuP5bAw'; // Lakepointe Church

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.YOUTUBE_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: 'YOUTUBE_API_KEY not configured.',
      hint: 'Add YOUTUBE_API_KEY to your Vercel environment variables.',
    });
  }

  try {
    // ── 1. Channel statistics ─────────────────────────────────────────────────
    const channelRes = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${CHANNEL_ID}&key=${apiKey}`
    );
    const channelData = await channelRes.json();

    if (channelData.error) {
      throw new Error(channelData.error.message);
    }

    if (!channelData.items?.length) {
      return res.status(404).json({ error: 'Channel not found.' });
    }

    const channel   = channelData.items[0];
    const stats     = channel.statistics;
    const snippet   = channel.snippet;

    // ── 2. Recent videos (latest 10) ─────────────────────────────────────────
    const searchRes = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${CHANNEL_ID}&order=date&maxResults=10&type=video&key=${apiKey}`
    );
    const searchData = await searchRes.json();

    if (searchData.error) {
      throw new Error(searchData.error.message);
    }

    // ── 3. Per-video statistics ───────────────────────────────────────────────
    let recentVideos = [];

    if (searchData.items?.length) {
      const videoIds = searchData.items.map(v => v.id.videoId).join(',');
      const videoRes = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet,contentDetails&id=${videoIds}&key=${apiKey}`
      );
      const videoData = await videoRes.json();

      if (videoData.error) {
        throw new Error(videoData.error.message);
      }

      recentVideos = (videoData.items || []).map(v => {
        const viewCount    = parseInt(v.statistics.viewCount    || 0);
        const likeCount    = parseInt(v.statistics.likeCount    || 0);
        const commentCount = parseInt(v.statistics.commentCount || 0);
        const engRate      = viewCount > 0
          ? parseFloat(((likeCount + commentCount) / viewCount * 100).toFixed(2))
          : 0;

        return {
          id:           v.id,
          title:        v.snippet.title,
          publishedAt:  v.snippet.publishedAt,
          thumbnail:    v.snippet.thumbnails?.medium?.url || '',
          duration:     v.contentDetails?.duration || '',
          viewCount,
          likeCount,
          commentCount,
          engagementRate: engRate,
        };
      });
    }

    // ── Response ──────────────────────────────────────────────────────────────
    const subscriberCount = parseInt(stats.subscriberCount || 0);
    const viewCount       = parseInt(stats.viewCount       || 0);
    const videoCount      = parseInt(stats.videoCount      || 0);
    const avgViewsPerVideo = videoCount > 0 ? Math.round(viewCount / videoCount) : 0;

    return res.status(200).json({
      channel: {
        name:              snippet.title,
        description:       snippet.description,
        subscriberCount,
        viewCount,
        videoCount,
        avgViewsPerVideo,
        hiddenSubscriberCount: stats.hiddenSubscriberCount,
      },
      recentVideos,
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
