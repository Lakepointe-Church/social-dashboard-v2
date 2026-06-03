import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Eye, ThumbsUp, MessageSquare, AlertCircle } from 'lucide-react';
import PostSpotlight from './PostSpotlight';

function fmtBig(n) {
  if (!n && n !== 0) return '—';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString();
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const CONTENT_FILTERS = [
  { id: 'sermon',  label: 'Sermons', emoji: '⛪',  color: '#0ea5e9', activeCls: 'bg-sky-500 text-white border-sky-500'    },
  { id: 'podcast', label: 'Podcast', emoji: '🎙️', color: '#6366f1', activeCls: 'bg-indigo-500 text-white border-indigo-500' },
  { id: 'short',   label: 'Shorts',  emoji: '🎬',  color: '#f59e0b', activeCls: 'bg-amber-500 text-white border-amber-500'  },
];

const TYPE_MAP = Object.fromEntries(CONTENT_FILTERS.map(f => [f.id, f]));

const SORT_OPTIONS = [
  { id: 'date',       label: 'Most Recent'   },
  { id: 'views',      label: 'Most Views'    },
  { id: 'engagement', label: 'Engagement %'  },
];

function toYtSpotlight(video) {
  return {
    ...video,
    caption:       video.title || '',
    mediaUrl:      `https://img.youtube.com/vi/${video.id}/mqdefault.jpg`,
    permalink:     `https://youtube.com/watch?v=${video.id}`,
    timestamp:     video.publishedAt,
    commentsCount: video.commentCount,
    reach:         video.viewCount,
    shares: null, saved: null, saveRate: null, shareRate: null,
    avgWatchTime: null, mediaType: null, videoUrl: null,
  };
}

function ThumbnailCard({ video, onVideoClick }) {
  const [imgError, setImgError] = useState(false);
  const typeConfig = TYPE_MAP[video.contentType] || { emoji: '📹', label: 'Video' };
  const thumbUrl   = `https://img.youtube.com/vi/${video.id}/hqdefault.jpg`;

  return (
    <div
      onClick={() => onVideoClick?.(video)}
      className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer group"
    >
      {/* Thumbnail */}
      <div className="relative bg-slate-100 overflow-hidden" style={{ aspectRatio: '16/9' }}>
        {!imgError ? (
          <img
            src={thumbUrl}
            alt={video.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-slate-50 to-slate-100">
            <span className="text-4xl">{typeConfig.emoji}</span>
          </div>
        )}
        <div className="absolute top-2 left-2 bg-black/50 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full backdrop-blur-sm">
          {typeConfig.emoji} {typeConfig.label}
        </div>
      </div>

      {/* Title + date */}
      <div className="p-3 pb-2">
        <p className="text-slate-700 text-xs font-medium leading-snug line-clamp-2 min-h-[32px]">{video.title}</p>
        <p className="text-slate-400 text-[10px] mt-1.5">{fmtDate(video.publishedAt)}</p>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100">
        <div className="px-2 py-2 text-center">
          <div className="text-slate-900 font-bold text-xs tabular-nums">{fmtBig(video.viewCount)}</div>
          <div className="text-slate-400 mt-0.5"><Eye size={11} className="mx-auto" /></div>
        </div>
        <div className="px-2 py-2 text-center">
          <div className="text-slate-900 font-bold text-xs tabular-nums">{video.engagementRate.toFixed(1)}%</div>
          <div className="text-slate-400 mt-0.5 text-[9px] font-semibold uppercase tracking-wide">Eng</div>
        </div>
        <div className="px-2 py-2 text-center">
          <div className="text-slate-900 font-bold text-xs tabular-nums">{fmtBig(video.likeCount)}</div>
          <div className="text-slate-400 mt-0.5"><ThumbsUp size={11} className="mx-auto" /></div>
        </div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm animate-pulse">
      <div className="bg-slate-100" style={{ aspectRatio: '16/9' }} />
      <div className="p-3 space-y-2">
        <div className="h-3 bg-slate-100 rounded w-full" />
        <div className="h-3 bg-slate-100 rounded w-3/4" />
        <div className="h-2 bg-slate-100 rounded w-1/3 mt-2" />
      </div>
      <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100">
        {[0, 1, 2].map(i => (
          <div key={i} className="px-2 py-3">
            <div className="h-3 bg-slate-100 rounded w-8 mx-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function YouTubeThumbnails() {
  const [allVideos,     setAllVideos]     = useState([]);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [loadingMore,   setLoadingMore]   = useState(false);
  const [error,         setError]         = useState(null);
  const [activeFilters, setActiveFilters] = useState(['sermon', 'podcast']);
  const [sortBy,        setSortBy]        = useState('date');
  const [spotlight,     setSpotlight]     = useState(null);
  const [displayLimit,  setDisplayLimit]  = useState(24);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setAllVideos([]);
    setNextPageToken(null);
    try {
      const res  = await fetch('/api/youtube');
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || `HTTP ${res.status}`); }
      const data = await res.json();
      setAllVideos(data.videos || []);
      setNextPageToken(data.nextPageToken || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!nextPageToken || loadingMore) return;
    setLoadingMore(true);
    try {
      const res  = await fetch(`/api/youtube?pageToken=${nextPageToken}`);
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || `HTTP ${res.status}`); }
      const data = await res.json();
      setAllVideos(prev => [...prev, ...(data.videos || [])]);
      setNextPageToken(data.nextPageToken || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingMore(false);
    }
  }, [nextPageToken, loadingMore]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleFilter = (id) => {
    setActiveFilters(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
    setDisplayLimit(24);
  };

  const counts = {};
  CONTENT_FILTERS.forEach(f => { counts[f.id] = allVideos.filter(v => v.contentType === f.id).length; });

  const filteredVideos = activeFilters.length === 0
    ? []
    : allVideos.filter(v => activeFilters.includes(v.contentType));

  const sortedVideos = [...filteredVideos].sort((a, b) => {
    if (sortBy === 'views')      return b.viewCount - a.viewCount;
    if (sortBy === 'engagement') return b.engagementRate - a.engagementRate;
    return new Date(b.publishedAt) - new Date(a.publishedAt);
  });

  const displayed  = sortedVideos.slice(0, displayLimit);
  const remaining  = sortedVideos.length - displayed.length;

  return (
    <div className="space-y-6">

      {/* ── Sticky control bar ──────────────────────────────────────────────── */}
      <div className="sticky top-16 z-20 bg-slate-50 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 border-b border-slate-100 shadow-sm">
        <div className="max-w-[1400px] mx-auto flex items-center gap-2 flex-wrap">

          {/* Content type chips */}
          {CONTENT_FILTERS.map(f => {
            const active = activeFilters.includes(f.id);
            return (
              <button
                key={f.id}
                onClick={() => toggleFilter(f.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  active ? f.activeCls : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {f.emoji} {f.label}
                <span className={`ml-0.5 text-[10px] font-bold ${active ? 'opacity-70' : 'text-slate-400'}`}>
                  {counts[f.id] ?? 0}
                </span>
              </button>
            );
          })}

          <div className="w-px h-5 bg-slate-200 mx-1" />

          {/* Sort options */}
          {SORT_OPTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => { setSortBy(s.id); setDisplayLimit(24); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                sortBy === s.id
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {s.label}
            </button>
          ))}

          <div className="ml-auto">
            <button
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition-all disabled:opacity-50"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* ── Error ──────────────────────────────────────────────────────────── */}
      {error && (
        <div className="card flex items-center gap-3 text-red-600 bg-red-50 border border-red-100">
          <AlertCircle size={18} /> <span className="text-sm">{error}</span>
        </div>
      )}

      {/* ── Loading skeletons ───────────────────────────────────────────────── */}
      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* ── Empty state — no filters selected ──────────────────────────────── */}
      {!loading && !error && activeFilters.length === 0 && (
        <div className="card text-center py-16">
          <p className="text-slate-400 text-sm mb-3">No content types selected.</p>
          <button
            onClick={() => setActiveFilters(['sermon', 'podcast'])}
            className="text-xs text-sky-600 font-semibold hover:underline"
          >
            Reset filters
          </button>
        </div>
      )}

      {/* ── Thumbnail grid ──────────────────────────────────────────────────── */}
      {!loading && !error && activeFilters.length > 0 && (
        <>
          <p className="text-xs text-slate-400">
            Showing {displayed.length} of {sortedVideos.length} videos
            {allVideos.length > sortedVideos.length && ` (${allVideos.length - sortedVideos.length} filtered out)`}
            {' · '}sorted by {SORT_OPTIONS.find(s => s.id === sortBy)?.label.toLowerCase()}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {displayed.map(video => (
              <ThumbnailCard
                key={video.id}
                video={video}
                onVideoClick={v => setSpotlight(toYtSpotlight(v))}
              />
            ))}
          </div>

          {/* Show more within already-fetched videos */}
          {remaining > 0 && (
            <div className="text-center pt-2">
              <button
                onClick={() => setDisplayLimit(prev => prev + 24)}
                className="px-6 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
              >
                Show {Math.min(remaining, 24)} more
              </button>
            </div>
          )}

          {/* Load next page from API */}
          {remaining === 0 && nextPageToken && (
            <div className="text-center pt-2">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="px-6 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50"
              >
                {loadingMore
                  ? <><RefreshCw size={14} className="animate-spin inline mr-1.5" />Loading…</>
                  : 'Load more videos from YouTube'}
              </button>
            </div>
          )}
        </>
      )}

      {/* ── PostSpotlight ────────────────────────────────────────────────────── */}
      {spotlight && (
        <PostSpotlight
          post={spotlight}
          onClose={() => setSpotlight(null)}
          accountName="Lakepointe Church"
          platform="youtube"
        />
      )}
    </div>
  );
}
