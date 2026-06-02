import { useState, useEffect, useCallback } from 'react';
import { fetchInstagramData, invalidateInstagramCache } from '../lib/igDataCache';
import { fetchFacebookData, invalidateFacebookCache } from '../lib/fbDataCache';
import { fetchYouTubeData, invalidateYouTubeCache } from '../lib/ytDataCache';
import MetricCard from './MetricCard';
import FollowerGrowthChart from './FollowerGrowthChart';
import MilestoneTracker from './MilestoneTracker';
import TopContent from './TopContent';
import ContentTypeChart from './ContentTypeChart';
import BestTimeToPost from './BestTimeToPost';
import PostSpotlight from './PostSpotlight';
import { Users, Eye, Heart, RefreshCw, AlertCircle, TrendingUp, BarChart2 } from 'lucide-react';

const MILESTONES = [
  { platform: 'facebook',  label: 'Reach 250K Followers',   target: 250000, color: '#1877F2' },
  { platform: 'instagram', label: 'Reach 500K Followers',   target: 500000, color: '#E1306C' },
  { platform: 'youtube',   label: 'Reach 1.5M Subscribers', target: 1500000, color: '#FF0000' },
];

function fmtBig(n) {
  if (!n && n !== 0) return '—';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString();
}

function getFbPostUrl(postId) {
  const parts = postId?.split('_');
  if (parts?.length === 2) return `https://www.facebook.com/permalink.php?story_fbid=${parts[1]}&id=${parts[0]}`;
  return `https://www.facebook.com/${postId}`;
}

function normalizePosts(fbData, igData, ytData) {
  const fb = (fbData?.posts || []).map(p => {
    const engaged = p.engaged ?? (p.likeCount + p.commentCount + p.shareCount);
    const reach   = p.reach ?? 0;
    return {
      id:             `fb-${p.id}`,
      platform:       'facebook',
      platformName:   'Facebook',
      title:          (p.message || 'Facebook post').slice(0, 80),
      thumbnail:      p.thumbnail || null,
      permalink:      getFbPostUrl(p.id),
      contentType:    p.contentType,
      type:           p.contentType.charAt(0).toUpperCase() + p.contentType.slice(1),
      date:           new Date(p.createdTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      engagement:     p.engaged || 0,
      reach:          null,
      engagementRate: null,
      timestamp:      p.createdTime,
      spotlightPlatform: 'facebook',
      spotlightPost: {
        ...p,
        caption:        p.message || '',
        mediaUrl:       p.thumbnail || null,
        permalink:      getFbPostUrl(p.id),
        timestamp:      p.createdTime,
        commentsCount:  p.commentCount,
        shares:         p.shareCount,
        engagementRate: reach > 0 ? parseFloat((engaged / reach * 100).toFixed(2)) : 0,
        saved: null, saveRate: null, shareRate: null, avgWatchTime: null, videoUrl: null,
        mediaType:
          (p.contentType === 'video' || p.contentType === 'stream') ? 'VIDEO' :
          p.type === 'album' ? 'CAROUSEL_ALBUM' : null,
      },
    };
  });

  const ig = (igData?.media || []).map(m => ({
    id:             `ig-${m.id}`,
    platform:       'instagram',
    platformName:   'Instagram',
    title:          (m.caption || 'Instagram post').slice(0, 80),
    thumbnail:      m.mediaUrl || null,
    permalink:      m.permalink || null,
    contentType:    m.contentType,
    type:           m.contentType.charAt(0).toUpperCase() + m.contentType.slice(1),
    date:           new Date(m.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    engagement:     m.engagement || (m.likeCount + (m.commentsCount || 0)),
    reach:          m.reach || 0,
    engagementRate: m.engagementRate || null,
    timestamp:      m.timestamp,
    spotlightPlatform: 'instagram',
    spotlightPost:  { ...m },
  }));

  const yt = (ytData?.videos || []).map(v => ({
    id:             `yt-${v.id}`,
    platform:       'youtube',
    platformName:   'YouTube',
    title:          v.title || 'YouTube video',
    thumbnail:      v.thumbnail || null,
    permalink:      `https://www.youtube.com/watch?v=${v.id}`,
    contentType:    v.contentType,
    type:           v.contentType.charAt(0).toUpperCase() + v.contentType.slice(1),
    date:           new Date(v.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    engagement:     (v.likeCount || 0) + (v.commentCount || 0),
    reach:          v.viewCount || 0,
    engagementRate: v.engagementRate || null,
    timestamp:      v.publishedAt,
    spotlightPlatform: 'youtube',
    spotlightPost: {
      ...v,
      caption:       v.title || '',
      mediaUrl:      `https://img.youtube.com/vi/${v.id}/mqdefault.jpg`,
      permalink:     `https://youtube.com/watch?v=${v.id}`,
      timestamp:     v.publishedAt,
      commentsCount: v.commentCount,
      reach:         v.viewCount,
      shares: null, saved: null, saveRate: null, shareRate: null,
      avgWatchTime: null, mediaType: null, videoUrl: null,
    },
  }));

  return [...fb, ...ig, ...yt].sort((a, b) => b.engagement - a.engagement);
}

function computeContentTypeData(fbData, igData, ytData) {
  const buckets = {};

  const add = (key, icon, engagement, reach) => {
    if (!buckets[key]) buckets[key] = { type: key, icon, posts: 0, totalEng: 0, totalReach: 0 };
    buckets[key].posts++;
    buckets[key].totalEng   += engagement;
    buckets[key].totalReach += reach;
  };

  (fbData?.posts || []).forEach(p => {
    const map = { stream: ['FB Sermon', '⛪'], photo: ['FB Photo', '📷'], video: ['FB Video', '🎬'] };
    const entry = map[p.contentType];
    if (entry) add(entry[0], entry[1], p.engaged || 0, 0); // FB reach unavailable pre-App Review
  });

  (igData?.media || []).forEach(m => {
    // Photo and Carousel merged into one bucket
    const map = { reel: ['IG Reel', '🎬'], carousel: ['IG Photo/Carousel', '📷'], photo: ['IG Photo/Carousel', '📷'], collab: ['IG Collab', '🤝'] };
    const entry = map[m.contentType];
    if (entry) add(entry[0], entry[1], m.engagement || (m.likeCount + (m.commentsCount || 0)), m.reach || 0);
  });

  (ytData?.videos || []).forEach(v => {
    const map = { short: ['YT Short', '⚡'], podcast: ['YT Podcast', '🎙️'], sermon: ['YT Sermon', '⛪'] };
    const entry = map[v.contentType] || ['YT Other', '📹'];
    add(entry[0], entry[1], (v.likeCount || 0) + (v.commentCount || 0), v.viewCount || 0);
  });

  return Object.values(buckets)
    .filter(b => b.posts > 0)
    .map(b => ({
      type:          b.type,
      icon:          b.icon,
      posts:         b.posts,
      avgReach:      b.posts > 0 ? Math.round(b.totalReach / b.posts) : 0,
      avgEngagement: b.totalReach > 0 ? parseFloat((b.totalEng / b.totalReach * 100).toFixed(1)) : null,
    }));
}

function computeBestTimeData(fbData, igData) {
  const DAY_NAMES       = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const byDayMap        = Object.fromEntries(DAY_NAMES.map(d => [d, []]));
  const byHourBuckets   = Array.from({ length: 24 }, () => []);
  const byDayHourMap    = Object.fromEntries(DAY_NAMES.map(d => [d, Array.from({ length: 24 }, () => [])]));

  const formatHour = h => {
    if (h === 0)  return '12am';
    if (h === 12) return '12pm';
    return h < 12 ? `${h}am` : `${h - 12}pm`;
  };

  (fbData?.posts || []).forEach(p => {
    const d = new Date(p.createdTime);
    const dayName = DAY_NAMES[d.getDay()];
    const hour = d.getHours();
    const val = p.engaged || 0;
    byDayMap[dayName].push(val);
    byHourBuckets[hour].push(val);
    byDayHourMap[dayName][hour].push(val);
  });

  (igData?.media || []).forEach(m => {
    const d = new Date(m.timestamp);
    const dayName = DAY_NAMES[d.getDay()];
    const hour = d.getHours();
    const val = m.engagement || (m.likeCount + (m.commentsCount || 0));
    byDayMap[dayName].push(val);
    byHourBuckets[hour].push(val);
    byDayHourMap[dayName][hour].push(val);
  });

  const avg = arr => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

  return {
    byDay:  DAY_NAMES.map(day => ({ day, engagement: avg(byDayMap[day]), posts: byDayMap[day].length })),
    byHour: byHourBuckets.map((vals, i) => ({ hour: formatHour(i), engagement: avg(vals), posts: vals.length })),
    byDayHour: Object.fromEntries(DAY_NAMES.map(day => [
      day,
      byDayHourMap[day].map((vals, i) => ({ hour: formatHour(i), engagement: avg(vals), posts: vals.length })),
    ])),
  };
}

function ChannelHighlight({ label, color, tabId, post, error, onNavigate, onPostClick }) {
  const body = error ? (
    <div className="h-32 flex items-center justify-center rounded-xl bg-slate-50">
      <p className="text-slate-400 text-xs">Data unavailable</p>
    </div>
  ) : !post ? (
    <div className="h-32 flex items-center justify-center rounded-xl bg-slate-50">
      <p className="text-slate-400 text-xs">Loading…</p>
    </div>
  ) : (
    <>
      <div
        className="relative rounded-xl overflow-hidden mb-3 group cursor-pointer"
        onClick={() => onPostClick?.(post)}
      >
        {post.thumbnail ? (
          <img src={post.thumbnail} alt="" className="w-full aspect-square object-cover group-hover:opacity-90 transition-opacity" />
        ) : (
          <div className="w-full aspect-square flex items-center justify-center text-white text-2xl font-bold rounded-xl"
               style={{ background: color }}>
            {label.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-xl" />
      </div>

      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-white" style={{ background: color }}>
          {post.type}
        </span>
        <span className="text-xs text-slate-400">{post.date}</span>
      </div>

      <p className="text-sm text-slate-700 leading-snug line-clamp-2 mb-3" title={post.title}>
        {post.title}
      </p>

      <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
        <div className="flex items-center gap-1">
          <Heart size={11} className="text-pink-400" />
          <span className="font-semibold text-slate-700">{fmtBig(post.engagement)}</span> engaged
        </div>
        {post.reach > 0 && (
          <div className="flex items-center gap-1">
            <Eye size={11} className="text-purple-400" />
            <span className="font-semibold text-slate-700">{fmtBig(post.reach)}</span>
            {post.platform === 'youtube' ? ' views' : ' reach'}
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="card overflow-hidden" style={{ borderTop: `3px solid ${color}` }}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-bold" style={{ color }}>{label}</span>
        {post?.engagementRate != null && (
          <span className="text-xs font-semibold text-emerald-600">{post.engagementRate}% rate</span>
        )}
      </div>
      {body}
    </div>
  );
}

function PlatformErrorBadge({ platform, error }) {
  if (!error) return null;
  return (
    <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-100 px-2 py-1 rounded-lg">
      <AlertCircle size={12} /> {platform} unavailable
    </div>
  );
}

function PlatformOverviewCard({ label, color, tabId, stats, error, onNavigate }) {
  return (
    <div
      className="card cursor-pointer hover:shadow-md transition-shadow duration-150"
      style={{ borderTop: `3px solid ${color}` }}
      onClick={() => onNavigate?.(tabId)}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-bold" style={{ color }}>{label}</span>
        {error
          ? <span className="text-xs text-red-400 font-medium">Unavailable</span>
          : <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-full">LIVE</span>
        }
      </div>
      {error ? (
        <p className="text-xs text-slate-400 italic">Data could not be loaded</p>
      ) : (
        <div className="space-y-2">
          {stats.map(s => (
            <div key={s.label} className="flex items-center justify-between">
              <span className="text-xs text-slate-500">{s.label}</span>
              <span className="text-sm font-bold text-slate-900 tabular-nums">{s.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AllOverview({ onNavigate }) {
  const [fbData, setFbData] = useState(null);
  const [igData, setIgData] = useState(null);
  const [ytData, setYtData] = useState(null);
  const [fbError, setFbError] = useState(null);
  const [igError, setIgError] = useState(null);
  const [ytError, setYtError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [snapshots, setSnapshots]         = useState([]);
  const [growthDays, setGrowthDays]       = useState(90);
  const [snapshotsLoading, setSnapshotsLoading] = useState(false);
  const [selectedPost,     setSelectedPost]     = useState(null);
  const [selectedPlatform, setSelectedPlatform] = useState('instagram');

  const handlePostClick = useCallback((normalizedPost) => {
    setSelectedPlatform(normalizedPost.spotlightPlatform);
    setSelectedPost(normalizedPost.spotlightPost);
  }, []);

  const fetchAll = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    if (forceRefresh) {
      invalidateFacebookCache();
      invalidateInstagramCache();
      invalidateYouTubeCache();
    }
    const [fbRes, igRes, ytRes] = await Promise.allSettled([
      fetchFacebookData(),
      fetchInstagramData(),
      fetchYouTubeData(),
    ]);
    setFbData(fbRes.status === 'fulfilled' ? fbRes.value : null);
    setFbError(fbRes.status === 'rejected'  ? (fbRes.reason?.message || 'Failed') : null);
    setIgData(igRes.status === 'fulfilled' ? igRes.value : null);
    setIgError(igRes.status === 'rejected'  ? (igRes.reason?.message || 'Failed') : null);
    setYtData(ytRes.status === 'fulfilled' ? ytRes.value : null);
    setYtError(ytRes.status === 'rejected'  ? (ytRes.reason?.message || 'Failed') : null);
    setLoading(false);
  }, []);

  const fetchSnapshots = useCallback(async (days) => {
    setSnapshotsLoading(true);
    try {
      const res  = await fetch(`/api/snapshots?days=${days}`);
      const json = await res.json();
      setSnapshots(json.snapshots || []);
    } catch { /* silent — chart just stays empty */ }
    setSnapshotsLoading(false);
  }, []);

  function handleGrowthDaysChange(days) {
    setGrowthDays(days);
    fetchSnapshots(days);
  }

  useEffect(() => { fetchAll(); fetchSnapshots(90); }, [fetchAll, fetchSnapshots]);

  // ── KPI totals ─────────────────────────────────────────────────────────────
  const totalFollowers = (fbData?.page?.followersCount    || 0)
                       + (igData?.account?.followersCount  || 0)
                       + (ytData?.channel?.subscriberCount || 0);

  const totalReach = (fbData?.insights?.reach || 0) + (igData?.insights?.reach || 0);
  const totalNewFollowers = (fbData?.insights?.newFans || 0) + (igData?.insights?.newFollowers || 0);

  const fbEngagement  = (fbData?.posts   || []).reduce((s, p) => s + (p.engaged || 0), 0);
  const igEngagement  = (igData?.media   || []).reduce((s, m) => s + (m.engagement || (m.likeCount + (m.commentsCount || 0))), 0);
  const ytEngagement  = (ytData?.videos  || []).reduce((s, v) => s + (v.likeCount || 0) + (v.commentCount || 0), 0);
  const totalEngagement = fbEngagement + igEngagement + ytEngagement;
  const totalPosts    = (fbData?.posts?.length  || 0)
                      + (igData?.media?.length   || 0)
                      + (ytData?.videos?.length  || 0);

  // ── Per-platform engagement snapshot ───────────────────────────────────────
  const fbAvgEng  = fbData?.posts?.length
    ? Math.round(fbEngagement / fbData.posts.length) : null;
  const igAvgRate = igData?.media?.length
    ? parseFloat((igData.media.reduce((s, m) => s + (m.engagementRate || 0), 0) / igData.media.length).toFixed(2)) : null;
  const ytAvgRate = ytData?.videos?.length
    ? parseFloat((ytData.videos.reduce((s, v) => s + (v.engagementRate || 0), 0) / ytData.videos.length).toFixed(2)) : null;

  // ── Milestones ─────────────────────────────────────────────────────────────
  const liveMilestones = MILESTONES.map(m => ({
    ...m,
    current: m.platform === 'facebook'  ? (fbData?.page?.followersCount       || 0)
            : m.platform === 'instagram' ? (igData?.account?.followersCount    || 0)
            : m.platform === 'youtube'   ? (ytData?.channel?.subscriberCount   || 0)
            : 0,
  }));

  // ── Derived sections ───────────────────────────────────────────────────────
  const allPostsRanked  = normalizePosts(fbData, igData, ytData);
  const allPosts        = allPostsRanked.slice(0, 6);
  const topFbPost       = allPostsRanked.find(p => p.platform === 'facebook')  || null;
  const topIgPost       = allPostsRanked.find(p => p.platform === 'instagram') || null;
  const topYtPost       = allPostsRanked.find(p => p.platform === 'youtube')   || null;
  const contentTypeData = computeContentTypeData(fbData, igData, ytData);
  const bestTimeData    = (fbData || igData) ? computeBestTimeData(fbData, igData) : null;

  const anyLoaded  = fbData || igData || ytData;
  const allLoading = loading && !anyLoaded;

  if (allLoading) return (
    <div className="card flex items-center justify-center py-20">
      <div className="text-center">
        <RefreshCw size={28} className="animate-spin mx-auto mb-3 text-blue-500" />
        <p className="text-slate-500 text-sm">Loading all platforms…</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-slate-900 text-lg leading-tight">All Platforms Overview</h2>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <p className="text-slate-400 text-xs">Combined live data · Facebook, Instagram, YouTube</p>
            <PlatformErrorBadge platform="Facebook"  error={fbError} />
            <PlatformErrorBadge platform="Instagram" error={igError} />
            <PlatformErrorBadge platform="YouTube"   error={ytError} />
          </div>
        </div>
        <button onClick={() => fetchAll(true)} disabled={loading}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition-all disabled:opacity-50">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* ── Cross-platform KPI cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Followers" value={fmtBig(totalFollowers)}
          subtext="FB + IG + YT subscribers"
          icon={<Users size={20} />} iconBg="bg-blue-100" iconColor="text-blue-600"
        />
        <MetricCard
          label="30-Day Reach" value={fmtBig(totalReach)}
          subtext={ytData?.channel ? 'FB + IG · YT pending OAuth' : 'Facebook + Instagram'}
          icon={<Eye size={20} />} iconBg="bg-purple-100" iconColor="text-purple-600"
        />
        <MetricCard
          label="Total Engagement" value={fmtBig(totalEngagement)}
          subtext="FB + IG + YT combined"
          icon={<Heart size={20} />} iconBg="bg-pink-100" iconColor="text-pink-600"
        />
        <MetricCard
          label="New Followers (30d)" value={fmtBig(totalNewFollowers)}
          subtext="FB + IG · YT unavailable"
          icon={<TrendingUp size={20} />} iconBg="bg-emerald-100" iconColor="text-emerald-600"
        />
      </div>

      {/* ── Per-platform overview ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <PlatformOverviewCard
          label="Facebook" color="#1877F2" tabId="facebook-live"
          error={fbError} onNavigate={onNavigate}
          stats={[
            { label: 'Page Followers',     value: fmtBig(fbData?.page?.followersCount) },
            { label: '30-Day Reach',       value: fmtBig(fbData?.insights?.reach) },
            { label: 'New Followers (30d)', value: fmtBig(fbData?.insights?.newFans) },
          ]}
        />
        <PlatformOverviewCard
          label="Instagram" color="#E1306C" tabId="instagram-live"
          error={igError} onNavigate={onNavigate}
          stats={[
            { label: 'Followers',     value: fmtBig(igData?.account?.followersCount) },
            { label: '30-Day Reach',  value: fmtBig(igData?.insights?.reach) },
            { label: 'New Followers', value: fmtBig(igData?.insights?.newFollowers) },
          ]}
        />
        <PlatformOverviewCard
          label="YouTube" color="#FF0000" tabId="youtube-live"
          error={ytError} onNavigate={onNavigate}
          stats={[
            { label: 'Subscribers',    value: fmtBig(ytData?.channel?.subscriberCount) },
            { label: 'Total Views',    value: fmtBig(ytData?.channel?.viewCount) },
            { label: 'Videos (total)', value: ytData?.channel?.videoCount?.toLocaleString() || '—' },
          ]}
        />
      </div>

      {/* ── Best Post per Channel ───────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Best Post by Channel</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <ChannelHighlight label="Facebook"  color="#1877F2" tabId="facebook-live"
            post={topFbPost} error={fbError} onNavigate={onNavigate} onPostClick={handlePostClick} />
          <ChannelHighlight label="Instagram" color="#E1306C" tabId="instagram-live"
            post={topIgPost} error={igError} onNavigate={onNavigate} onPostClick={handlePostClick} />
          <ChannelHighlight label="YouTube"   color="#FF0000" tabId="youtube-live"
            post={topYtPost} error={ytError} onNavigate={onNavigate} onPostClick={handlePostClick} />
        </div>
      </div>

      {/* ── Milestones ───────────────────────────────────────────────────────── */}
      <MilestoneTracker milestones={liveMilestones} />

      {/* ── Top Content + Engagement Snapshot ───────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2">
          <TopContent posts={allPosts} onPostClick={handlePostClick} />
        </div>
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 size={18} className="text-violet-500" />
            <h2 className="font-bold text-slate-900 text-lg">Engagement Snapshot</h2>
          </div>
          <div className="space-y-4">
            {[
              {
                label: 'Facebook',
                color: '#1877F2',
                value: fbAvgEng != null ? `${fbAvgEng.toLocaleString()} actions` : '—',
                note:  'Avg interactions per post',
                sub:   fbAvgEng != null ? 'Reach-based rate pending App Review' : null,
              },
              {
                label: 'Instagram',
                color: '#E1306C',
                value: igAvgRate != null ? `${igAvgRate}%` : '—',
                note:  'Avg reach-based rate',
                sub:   null,
              },
              {
                label: 'YouTube',
                color: '#FF0000',
                value: ytAvgRate != null ? `${ytAvgRate}%` : '—',
                note:  'Avg view-based rate',
                sub:   null,
              },
            ].map((p, i, arr) => (
              <div key={p.label}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-sm font-semibold" style={{ color: p.color }}>{p.label}</span>
                  <span className="text-lg font-bold text-slate-900 tabular-nums">{p.value}</span>
                </div>
                <p className="text-xs text-slate-400">{p.note}</p>
                {p.sub && <p className="text-[10px] text-amber-500 mt-0.5">{p.sub}</p>}
                {i < arr.length - 1 && <div className="h-px bg-slate-100 mt-3" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Follower Growth Over Time ─────────────────────────────────────────── */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp size={18} className="text-emerald-500" />
            <h2 className="font-bold text-slate-900 text-lg">Follower Growth Over Time</h2>
          </div>
          <div className="flex items-center gap-1">
            {[{ label: '30d', days: 30 }, { label: '90d', days: 90 }, { label: 'All', days: 0 }].map(({ label, days }) => (
              <button
                key={label}
                onClick={() => handleGrowthDaysChange(days)}
                className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-all ${
                  growthDays === days
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {snapshotsLoading ? (
          <div className="h-[280px] flex items-center justify-center">
            <RefreshCw size={20} className="animate-spin text-slate-300" />
          </div>
        ) : snapshots.length === 0 ? (
          <div className="h-[280px] flex flex-col items-center justify-center gap-2 text-center">
            <TrendingUp size={28} className="text-slate-200" />
            <p className="text-slate-500 text-sm font-medium">No snapshots yet</p>
            <p className="text-slate-400 text-xs max-w-xs">
              The first snapshot runs tonight at 6 AM UTC. Check back tomorrow — the chart builds one data point per day.
            </p>
          </div>
        ) : (
          <>
            <FollowerGrowthChart data={snapshots} />
            <p className="text-xs text-slate-400 text-center mt-2">
              {snapshots.length} {snapshots.length === 1 ? 'snapshot' : 'snapshots'} · tracking since {snapshots[0]?.date} · updates daily
              {snapshots.length < 7 && ' · chart fills in over time'}
            </p>
          </>
        )}
      </div>

      {/* ── Content Type Performance ─────────────────────────────────────────── */}
      {contentTypeData.length > 0 && (
        <div className="card">
          <div className="mb-4">
            <h2 className="font-bold text-slate-900 text-lg">Content Type Performance</h2>
            <p className="text-slate-500 text-sm">Avg reach / views per post by content format · IG + YT · FB pending App Review</p>
          </div>
          <ContentTypeChart data={contentTypeData} barKey="avgReach" barLabel="avg reach" />
        </div>
      )}

      {/* ── Best Time to Post ────────────────────────────────────────────────── */}
      {bestTimeData && (
        <div>
          <BestTimeToPost data={bestTimeData} />
          <p className="text-xs text-slate-400 mt-2 text-center">
            Based on Facebook + Instagram post timing · YouTube excluded (algorithmic reach)
          </p>
        </div>
      )}

      <PostSpotlight
        post={selectedPost}
        onClose={() => setSelectedPost(null)}
        platform={selectedPlatform}
        accountName={
          selectedPlatform === 'instagram' ? (igData?.account?.username || 'lpconnect') :
          selectedPlatform === 'facebook'  ? (fbData?.page?.name       || 'Lakepointe Church') :
          'Lakepointe Church'
        }
      />
    </div>
  );
}
