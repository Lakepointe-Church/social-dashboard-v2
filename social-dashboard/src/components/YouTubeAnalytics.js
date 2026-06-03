// ─────────────────────────────────────────────────────────────────────────────
// YouTubeAnalytics — sticky control bar, date filter, OAuth-pending metrics,
// content breakdown, top-10 video cards, sortable all-videos table
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, Eye, ThumbsUp, MessageSquare, RefreshCw, AlertCircle,
  ChevronDown, Clock, Lock, Activity,
} from 'lucide-react';
import PostSpotlight from './PostSpotlight';
import GrowthChartSection from './GrowthChartSection';

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtIsoDate(iso) {
  const [y, m, d] = (iso || '').split('-');
  return m && d ? `${m}-${d}-${y}` : iso;
}

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

function truncate(str, max = 36) {
  return str?.length > max ? str.slice(0, max) + '…' : str;
}

function fmtWatchTime(secs) {
  if (!secs) return '—';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function avg(arr, key) {
  if (!arr.length) return 0;
  return arr.reduce((s, v) => s + (v[key] || 0), 0) / arr.length;
}

// ── Content type config ───────────────────────────────────────────────────────
const CONTENT_FILTERS = [
  { id: 'podcast', label: 'Podcast', emoji: '🎙️', color: '#6366f1' },
  { id: 'sermon',  label: 'Sermons', emoji: '⛪',  color: '#0ea5e9' },
  { id: 'short',   label: 'Shorts',  emoji: '🎬',  color: '#f59e0b' },
];

const ALL_FILTER_IDS = CONTENT_FILTERS.map(f => f.id);

const TYPE_MAP = Object.fromEntries(CONTENT_FILTERS.map(f => [f.id, f]));

const RANK_COLORS = ['#FF0000', '#ef4444', '#f97316', '#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#64748b'];

function toYtSpotlight(video) {
  return {
    ...video,
    caption: video.title || '',
    mediaUrl: `https://img.youtube.com/vi/${video.id}/mqdefault.jpg`,
    permalink: `https://youtube.com/watch?v=${video.id}`,
    timestamp: video.publishedAt,
    commentsCount: video.commentCount,
    reach: video.viewCount,
    shares: null, saved: null, saveRate: null, shareRate: null,
    avgWatchTime: null, mediaType: null, videoUrl: null,
  };
}

// ── Sub-components ────────────────────────────────────────────────────────────
function StatCard({ label, value, subtext, icon, iconBg, iconColor }) {
  return (
    <div className="card card-hover animate-fade-in">
      <div className={`${iconBg} ${iconColor} w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0`}>
        {icon}
      </div>
      <div className="mt-3">
        <div className="text-2xl font-bold text-slate-900 tabular-nums">{value}</div>
        <div className="text-slate-500 text-sm font-medium mt-0.5">{label}</div>
        {subtext && <div className="text-slate-400 text-xs mt-1">{subtext}</div>}
      </div>
    </div>
  );
}

function PendingCard({ label, icon }) {
  return (
    <div className="card animate-fade-in border border-dashed border-slate-200 bg-slate-50/50">
      <div className="bg-slate-100 text-slate-400 w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="mt-3">
        <div className="text-2xl font-bold text-slate-300 tabular-nums flex items-center gap-2">
          0 <Lock size={13} className="text-slate-300" />
        </div>
        <div className="text-slate-500 text-sm font-medium mt-0.5">{label}</div>
        <div className="text-slate-400 text-xs mt-1">Pending · YouTube OAuth required</div>
      </div>
    </div>
  );
}

// ── Video card (top-10 sections) ──────────────────────────────────────────────
function VideoCard({ video, rank, metricValue, metricLabel, onVideoClick }) {
  const [imgError, setImgError] = useState(false);
  const typeConfig = TYPE_MAP[video.contentType] || { emoji: '📹', color: '#64748b', label: 'Video' };
  const rankColor  = RANK_COLORS[rank] || '#64748b';
  const thumbUrl   = `https://img.youtube.com/vi/${video.id}/mqdefault.jpg`;

  return (
    <div
      onClick={() => onVideoClick?.(video)}
      className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all group block cursor-pointer"
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
          <div
            className="w-full h-full flex flex-col items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #fff1f2, #ffe4e6)' }}
          >
            <span className="text-4xl">{typeConfig.emoji}</span>
            <span className="text-xs text-slate-400 px-4 text-center line-clamp-2">{truncate(video.title, 60)}</span>
          </div>
        )}
        {/* Rank badge */}
        <div
          className="absolute top-2 left-2 w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md"
          style={{ background: rankColor }}
        >
          {rank + 1}
        </div>
        {/* Content type badge */}
        <div className="absolute top-2 right-2 bg-black/50 text-white text-[10px] font-medium px-2 py-0.5 rounded-full backdrop-blur-sm">
          {typeConfig.emoji} {typeConfig.label}
        </div>
      </div>

      {/* Title + date */}
      <div className="px-3 pt-2.5 pb-1">
        <p className="text-slate-700 text-xs leading-snug line-clamp-2 min-h-[32px]">{video.title}</p>
        <p className="text-slate-400 text-[10px] mt-1 font-mono">{fmtDate(video.publishedAt)}</p>
      </div>

      {/* Primary metric */}
      <div className="px-3 pb-2 pt-1">
        <div className="text-lg font-bold tabular-nums" style={{ color: rankColor }}>{metricValue}</div>
        <div className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold">{metricLabel}</div>
      </div>

      {/* Stats footer */}
      <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100">
        <div className="px-2 py-2 text-center">
          <div className="text-slate-900 font-bold text-[11px] tabular-nums">{fmtBig(video.viewCount)}</div>
          <div className="text-slate-400 mt-1"><Eye size={12} className="mx-auto" /></div>
        </div>
        <div className="px-2 py-2 text-center">
          <div className="text-slate-900 font-bold text-[11px] tabular-nums">{fmtBig(video.likeCount)}</div>
          <div className="text-slate-400 mt-1"><ThumbsUp size={12} className="mx-auto" /></div>
        </div>
        <div className="px-2 py-2 text-center">
          <div className="text-slate-900 font-bold text-[11px] tabular-nums">{fmtBig(video.commentCount)}</div>
          <div className="text-slate-400 mt-1"><MessageSquare size={12} className="mx-auto" /></div>
        </div>
      </div>
    </div>
  );
}

// ── Top 10 section — horizontal scrollable rows ───────────────────────────────
function Top10Section({ videos, onVideoClick }) {
  if (!videos.length) return (
    <div className="card text-center py-12 text-slate-400 text-sm">No videos match the current filters.</div>
  );

  const byViews = [...videos].sort((a, b) => b.viewCount - a.viewCount).slice(0, 10);
  const byEng   = [...videos].sort((a, b) => b.engagementRate - a.engagementRate).slice(0, 10);

  function Row({ title, items, metricFn, metricLabel }) {
    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-slate-900 text-sm">{title}</h3>
          <span className="text-xs text-slate-400">Top {items.length} · scroll to see all</span>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {items.map((v, i) => (
            <div key={v.id} className="flex-shrink-0 w-56">
              <VideoCard video={v} rank={i} metricValue={metricFn(v)} metricLabel={metricLabel} onVideoClick={onVideoClick} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Row title="🏆 Top 10 by Views"           items={byViews} metricFn={v => fmtBig(v.viewCount)}               metricLabel="Views"    />
      <Row title="❤️ Top 10 by Engagement Rate" items={byEng}   metricFn={v => `${v.engagementRate.toFixed(2)}%`} metricLabel="Eng. Rate" />
    </div>
  );
}

// ── All videos table (sortable) ───────────────────────────────────────────────
function AllVideosTable({ videos, tableLimit, onLoadMore, onVideoClick }) {
  const [sort, setSort] = useState({ key: 'publishedAt', dir: 'desc' });

  const toggleSort = (key) =>
    setSort(prev => ({ key, dir: prev.key === key && prev.dir === 'desc' ? 'asc' : 'desc' }));

  const arrow = (key) => sort.key === key ? (sort.dir === 'desc' ? ' ↓' : ' ↑') : '';

  const thClass = (key) =>
    `text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide whitespace-nowrap cursor-pointer select-none transition-colors hover:text-slate-700 ${
      sort.key === key ? 'text-red-600' : 'text-slate-500'
    }`;

  const thClassLeft = (key) =>
    `text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide cursor-pointer select-none transition-colors hover:text-slate-700 ${
      sort.key === key ? 'text-red-600' : 'text-slate-500'
    }`;

  const mul = sort.dir === 'asc' ? 1 : -1;

  const sorted = [...videos].sort((a, b) => {
    if (sort.key === 'publishedAt') return mul * (new Date(a.publishedAt) - new Date(b.publishedAt));
    if (sort.key === 'title')       return mul * a.title.localeCompare(b.title);
    if (sort.key === 'contentType') return mul * (a.contentType || '').localeCompare(b.contentType || '');
    if (sort.key === 'durationSecs') return mul * ((a.durationSecs || 0) - (b.durationSecs || 0));
    return mul * ((a[sort.key] || 0) - (b[sort.key] || 0));
  });

  const visible = sorted.slice(0, tableLimit);

  if (!videos.length) return null;

  return (
    <div className="space-y-3">
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-8">#</th>
                <th className={thClassLeft('title')} onClick={() => toggleSort('title')}>
                  Title{arrow('title')}
                </th>
                <th className={thClassLeft('contentType')} onClick={() => toggleSort('contentType')}>
                  Type{arrow('contentType')}
                </th>
                <th className={thClassLeft('publishedAt')} onClick={() => toggleSort('publishedAt')}>
                  Published{arrow('publishedAt')}
                </th>
                <th className={thClass('durationSecs')} onClick={() => toggleSort('durationSecs')}>
                  Duration{arrow('durationSecs')}
                </th>
                <th className={thClass('viewCount')} onClick={() => toggleSort('viewCount')}>
                  Views{arrow('viewCount')}
                </th>
                <th className={thClass('likeCount')} onClick={() => toggleSort('likeCount')}>
                  Likes{arrow('likeCount')}
                </th>
                <th className={thClass('commentCount')} onClick={() => toggleSort('commentCount')}>
                  Comments{arrow('commentCount')}
                </th>
                <th className={thClass('engagementRate')} onClick={() => toggleSort('engagementRate')}>
                  Eng. Rate{arrow('engagementRate')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {visible.map((v, i) => {
                const typeConfig = TYPE_MAP[v.contentType] || { emoji: '📹', color: '#64748b', label: v.contentType };
                const engColor =
                  v.engagementRate > 5 ? 'text-emerald-600' :
                  v.engagementRate > 2 ? 'text-blue-500' : 'text-slate-400';
                return (
                  <tr key={v.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => onVideoClick?.(v)}>
                    <td className="px-4 py-3 text-xs text-slate-400 font-mono">{i + 1}</td>
                    <td className="px-4 py-3 max-w-xs">
                      <span className="text-slate-800 font-medium line-clamp-2 block" title={v.title}>
                        {v.title}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{ background: typeConfig.color + '18', color: typeConfig.color }}
                      >
                        {typeConfig.emoji} {typeConfig.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap font-mono">{fmtDate(v.publishedAt)}</td>
                    <td className="px-4 py-3 text-right text-slate-500 text-xs font-mono whitespace-nowrap">{v.duration}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-700 font-semibold">{v.viewCount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-600">{v.likeCount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-600">{v.commentCount.toLocaleString()}</td>
                    <td className={`px-4 py-3 text-right font-mono font-semibold ${engColor}`}>{v.engagementRate.toFixed(2)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {visible.length < videos.length && (
        <button
          onClick={onLoadMore}
          className="w-full text-xs font-semibold text-slate-500 hover:text-slate-700 border border-slate-200 rounded-xl py-2.5 hover:bg-slate-50 transition-all"
        >
          Load {Math.min(20, videos.length - visible.length)} more · {videos.length - visible.length} remaining
        </button>
      )}
    </div>
  );
}

// ── Outside date range disclosure ────────────────────────────────────────────
function OutsideDateRangeNote({ videos }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs">
      <div className="flex items-center justify-between">
        <span className="text-slate-500">
          <span className="font-semibold text-slate-700">{videos.length} video{videos.length !== 1 ? 's' : ''}</span> loaded but outside the current date range
        </span>
        <button
          onClick={() => setExpanded(e => !e)}
          className="text-red-600 hover:text-red-700 font-semibold ml-4 flex-shrink-0"
        >
          {expanded ? 'Hide' : 'Show titles'}
        </button>
      </div>
      {expanded && (
        <ul className="mt-3 space-y-1.5 border-t border-slate-200 pt-3">
          {videos.map(v => (
            <li key={v.id} className="flex items-start gap-3">
              <span className="text-slate-400 font-mono w-20 flex-shrink-0">{fmtDate(v.publishedAt)}</span>
              <a
                href={`https://youtube.com/watch?v=${v.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-700 hover:text-red-600 transition-colors"
              >
                {v.title}
              </a>
              <span className="ml-auto flex-shrink-0 text-slate-400">{TYPE_MAP[v.contentType]?.emoji} {v.contentType}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function YouTubeAnalytics() {
  const [channel,       setChannel]       = useState(null);
  const [analytics,     setAnalytics]     = useState(null);
  const [allVideos,     setAllVideos]      = useState([]);
  const [nextPageToken, setNextPageToken]  = useState(null);
  const [loading,       setLoading]        = useState(false);
  const [loadingMore,   setLoadingMore]    = useState(false);
  const [error,         setError]          = useState(null);
  const [fetchedAt,     setFetchedAt]      = useState(null);
  const [selectedVideo, setSelectedVideo]  = useState(null);
  const [activeFilters, setActiveFilters]  = useState(ALL_FILTER_IDS);
  const [datePreset,    setDatePreset]     = useState('90');
  const [customStart,   setCustomStart]    = useState('');
  const [customEnd,     setCustomEnd]      = useState('');
  const [tableLimit,    setTableLimit]     = useState(20);
  const [snapshots,        setSnapshots]        = useState([]);
  const [growthDays,       setGrowthDays]       = useState(90);
  const [snapshotsLoading, setSnapshotsLoading] = useState(false);

  const fetchSnapshots = useCallback(async (days) => {
    setSnapshotsLoading(true);
    try {
      const res  = await fetch(`/api/snapshots?days=${days}`);
      const json = await res.json();
      setSnapshots(json.snapshots || []);
    } catch { /* silent */ }
    setSnapshotsLoading(false);
  }, []);

  function handleGrowthDaysChange(days) {
    setGrowthDays(days);
    fetchSnapshots(days);
  }

  // ── Fetch first page ───────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setAllVideos([]);
    setNextPageToken(null);
    try {
      const res  = await fetch('/api/youtube');
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || `HTTP ${res.status}`); }
      const data = await res.json();
      if (data.channel)   setChannel(data.channel);
      if (data.analytics) setAnalytics(data.analytics);
      setAllVideos(data.videos || []);
      setNextPageToken(data.nextPageToken || null);
      setFetchedAt(data.fetchedAt);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Load next page from API ────────────────────────────────────────────────
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

  useEffect(() => { fetchData(); fetchSnapshots(90); }, [fetchData, fetchSnapshots]);

  const toggleFilter = useCallback((id) => {
    setActiveFilters(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
    setTableLimit(20);
  }, []);

  // ── Date range ─────────────────────────────────────────────────────────────
  const rangeStart = datePreset === 'custom'
    ? (customStart ? new Date(customStart) : null)
    : new Date(Date.now() - parseInt(datePreset, 10) * 864e5);
  const rangeEnd = datePreset === 'custom'
    ? (customEnd ? new Date(customEnd + 'T23:59:59') : null)
    : new Date();
  const dateLabel = datePreset === 'custom'
    ? (customStart && customEnd ? `${customStart} – ${customEnd}` : 'Custom range')
    : `Last ${datePreset} days`;

  // ── Filtering ──────────────────────────────────────────────────────────────
  const dateFilteredVideos = allVideos.filter(v => {
    const d = new Date(v.publishedAt);
    if (rangeStart && d < rangeStart) return false;
    if (rangeEnd   && d > rangeEnd)   return false;
    return true;
  });

  const filteredVideos = activeFilters.length === 0
    ? []
    : dateFilteredVideos.filter(v => activeFilters.includes(v.contentType));

  const counts = {};
  CONTENT_FILTERS.forEach(f => {
    counts[f.id] = dateFilteredVideos.filter(v => v.contentType === f.id).length;
  });

  // ── Filtered-view KPIs ─────────────────────────────────────────────────────
  const totalViews = filteredVideos.reduce((s, v) => s + v.viewCount, 0);
  const avgViews   = Math.round(avg(filteredVideos, 'viewCount'));
  const avgEngRate = filteredVideos.length
    ? (filteredVideos.reduce((s, v) => s + v.engagementRate, 0) / filteredVideos.length).toFixed(2)
    : '0.00';

  // Videos loaded but outside the current date range
  const dateFilteredIds    = new Set(dateFilteredVideos.map(v => v.id));
  const outsideDateRange   = allVideos.filter(v => !dateFilteredIds.has(v.id));

  // ── Per-type breakdown ─────────────────────────────────────────────────────
  const typeBreakdown = CONTENT_FILTERS.map(f => {
    const vids = dateFilteredVideos.filter(v => v.contentType === f.id);
    return {
      ...f,
      count:      vids.length,
      totalViews: vids.reduce((s, v) => s + v.viewCount, 0),
      avgViews:   Math.round(avg(vids, 'viewCount')),
      avgEng:     vids.length
        ? (vids.reduce((s, v) => s + v.engagementRate, 0) / vids.length).toFixed(2)
        : '0.00',
    };
  });

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading && !allVideos.length) {
    return (
      <div className="card flex items-center justify-center py-20">
        <div className="text-center">
          <RefreshCw size={28} className="animate-spin text-red-500 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Fetching live YouTube data…</p>
        </div>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error && !allVideos.length) {
    return (
      <div className="card border-red-100 bg-red-50">
        <div className="flex items-start gap-3">
          <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-700 text-sm">Failed to load YouTube data</p>
            <p className="text-red-500 text-xs mt-1">{error}</p>
            <button onClick={fetchData} className="mt-3 text-xs font-semibold text-red-600 hover:text-red-700 flex items-center gap-1">
              <RefreshCw size={12} /> Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <rect width="24" height="24" rx="6" fill="#FF0000"/>
          <path d="M21.5 7.5s-.2-1.2-.8-1.8c-.8-.8-1.7-.8-2.1-.8C16.1 4.7 12 4.7 12 4.7s-4.1 0-6.6.2c-.4 0-1.3 0-2.1.8-.6.6-.8 1.8-.8 1.8S2.3 8.9 2.3 10.3v1.3c0 1.4.2 2.8.2 2.8s.2 1.2.8 1.8c.8.8 1.9.8 2.3.8C6.9 17.3 12 17.3 12 17.3s4.1 0 6.6-.3c.4 0 1.3 0 2.1-.8.6-.6.8-1.8.8-1.8s.2-1.4.2-2.8v-1.3c0-1.4-.2-2.8-.2-2.8zM10.1 13.7V8.3l5.2 2.7-5.2 2.7z" fill="white"/>
        </svg>
        <div>
          <h2 className="font-bold text-slate-900 text-lg leading-tight">YouTube Analytics</h2>
          <p className="text-slate-400 text-xs">
            {channel?.name} · {allVideos.length} videos loaded
            {fetchedAt && ` · Updated ${new Date(fetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
          </p>
        </div>
      </div>

      {/* ── Sticky control bar ────────────────────────────────────────────── */}
      <div className="sticky top-16 z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 bg-white border-b border-slate-200 shadow-sm">
        <div className="py-2.5 flex items-center gap-3 flex-wrap">
          <div className="flex flex-wrap gap-1.5 flex-1 min-w-0 items-center">
            {CONTENT_FILTERS.map(f => {
              const isActive = activeFilters.includes(f.id);
              return (
                <button key={f.id} onClick={() => toggleFilter(f.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                    isActive
                      ? 'text-white border-transparent shadow-sm'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                  style={isActive ? { background: f.color, borderColor: f.color } : {}}>
                  <span>{f.emoji}</span>
                  <span>{f.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    {counts[f.id] ?? 0}
                  </span>
                </button>
              );
            })}
            {activeFilters.length === 0 && (
              <button onClick={() => setActiveFilters(ALL_FILTER_IDS)}
                className="text-xs font-semibold text-red-600 hover:text-red-700 px-1">Reset</button>
            )}
            <span className="text-xs text-slate-400 font-mono">{filteredVideos.length} videos</span>
          </div>
          <div className="h-5 w-px bg-slate-200 flex-shrink-0 hidden sm:block" />
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            <div className="flex items-center bg-slate-100 rounded-lg p-0.5 gap-0.5">
              {[{ label: '7d', value: '7' }, { label: '30d', value: '30' }, { label: '90d', value: '90' }].map(({ label, value }) => (
                <button key={value} onClick={() => { setDatePreset(value); setTableLimit(20); }}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-md transition-all ${datePreset === value ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
                  {label}
                </button>
              ))}
              <button onClick={() => { setDatePreset('custom'); setTableLimit(20); }}
                className={`text-xs font-semibold px-2.5 py-1 rounded-md transition-all ${datePreset === 'custom' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
                Custom
              </button>
            </div>
            {datePreset === 'custom' && (
              <div className="flex items-center gap-1.5">
                <input type="date" value={customStart} onChange={e => { setCustomStart(e.target.value); setTableLimit(20); }}
                  className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 focus:outline-none focus:border-red-300" />
                <span className="text-slate-400 text-xs">–</span>
                <input type="date" value={customEnd} onChange={e => { setCustomEnd(e.target.value); setTableLimit(20); }}
                  className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 focus:outline-none focus:border-red-300" />
              </div>
            )}
            <button onClick={fetchData} disabled={loading}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition-all disabled:opacity-50">
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* ── Channel-wide KPI cards ─────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h3 className="font-semibold text-slate-700 text-sm">Channel Overview</h3>
          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Channel-wide · not affected by filters</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Subscribers"      value={fmtBig(channel?.subscriberCount)}              subtext="YouTube channel"            icon={<TrendingUp size={20}/>}   iconBg="bg-red-100"    iconColor="text-red-600"    />
          <StatCard label="Total Views"       value={fmtBig(channel?.viewCount)}                   subtext="All-time across all videos"  icon={<Eye size={20}/>}          iconBg="bg-orange-100" iconColor="text-orange-600" />
          <StatCard label="Videos Published"  value={channel?.videoCount?.toLocaleString() ?? '—'} subtext="Total on channel"            icon={<MessageSquare size={20}/>} iconBg="bg-pink-100"   iconColor="text-pink-600"   />
          <StatCard label="Avg Views / Video" value={fmtBig(channel?.avgViewsPerVideo)}            subtext="All-time average"            icon={<ThumbsUp size={20}/>}     iconBg="bg-rose-100"   iconColor="text-rose-600"   />
        </div>
      </div>

      {/* ── Subscriber Growth ────────────────────────────────────────────────── */}
      <GrowthChartSection snapshots={snapshots} growthDays={growthDays} snapshotsLoading={snapshotsLoading}
        onDaysChange={handleGrowthDaysChange} activePlatform="YouTube" title="Subscriber Growth" />

      {/* ── Advanced metrics ──────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h3 className="font-semibold text-slate-700 text-sm">Advanced Metrics</h3>
          {analytics
            ? <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Last 365 days · Channel-wide</span>
            : <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                <Lock size={10} /> Pending · YouTube OAuth required
              </span>
          }
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {analytics ? (
            <>
              <StatCard
                label="Total Watch Time"
                value={`${fmtBig(Math.round(analytics.totalWatchMins / 60))} hrs`}
                subtext="Estimated, last 365 days"
                icon={<Clock size={20}/>}
                iconBg="bg-red-100" iconColor="text-red-600"
              />
              <StatCard
                label="Avg Watch Time / Video"
                value={fmtWatchTime(analytics.avgWatchSecs)}
                subtext="Minutes:seconds"
                icon={<Activity size={20}/>}
                iconBg="bg-orange-100" iconColor="text-orange-600"
              />
            </>
          ) : (
            <>
              <PendingCard label="Total Watch Time (hrs)" icon={<Clock size={20}/>}    />
              <PendingCard label="Avg Watch Time / Video" icon={<Activity size={20}/>} />
            </>
          )}
        </div>
      </div>

      {/* ── Content type breakdown ─────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h3 className="font-semibold text-slate-700 text-sm">Content Breakdown</h3>
          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{dateLabel}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {typeBreakdown.map(t => (
            <div key={t.id} className="card border-l-4" style={{ borderLeftColor: t.color }}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">{t.emoji}</span>
                <span className="font-semibold text-slate-800 text-sm">{t.label}</span>
                <span className="ml-auto text-xs text-slate-400 font-mono">{t.count} videos</span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div>
                  <div className="text-slate-400 mb-0.5">Total Views</div>
                  <div className="font-bold tabular-nums" style={{ color: t.color }}>{fmtBig(t.totalViews)}</div>
                </div>
                <div>
                  <div className="text-slate-400 mb-0.5">Avg Views</div>
                  <div className="font-bold tabular-nums" style={{ color: t.color }}>{fmtBig(t.avgViews)}</div>
                </div>
                <div>
                  <div className="text-slate-400 mb-0.5">Avg Eng. Rate</div>
                  <div className="font-bold tabular-nums" style={{ color: t.color }}>{t.avgEng}%</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Outside date range notice ─────────────────────────────────────── */}
      {outsideDateRange.length > 0 && (
        <OutsideDateRangeNote videos={outsideDateRange} />
      )}

      {/* ── Empty states ──────────────────────────────────────────────────── */}
      {activeFilters.length === 0 && (
        <div className="card text-center py-12">
          <p className="text-slate-500 text-sm font-medium mb-2">No content types selected</p>
          <button onClick={() => setActiveFilters(ALL_FILTER_IDS)}
            className="text-xs font-semibold text-red-600 hover:text-red-700">Reset filters</button>
        </div>
      )}

      {activeFilters.length > 0 && filteredVideos.length === 0 && allVideos.length > 0 && (
        <div className="card text-center py-12 text-slate-400 text-sm">
          No videos published in this date range.
        </div>
      )}

      {/* ── Filtered content ──────────────────────────────────────────────── */}
      {filteredVideos.length > 0 && (
        <>
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card">
              <div className="text-slate-500 text-xs font-medium mb-1">Videos in View</div>
              <div className="text-2xl font-bold tabular-nums text-red-600">{filteredVideos.length}</div>
              <div className="text-slate-400 text-xs mt-1">of {allVideos.length} loaded</div>
            </div>
            <div className="card">
              <div className="text-slate-500 text-xs font-medium mb-1">Total Views</div>
              <div className="text-2xl font-bold tabular-nums text-red-600">{fmtBig(totalViews)}</div>
              <div className="text-slate-400 text-xs mt-1">filtered selection</div>
            </div>
            <div className="card">
              <div className="text-slate-500 text-xs font-medium mb-1">Avg Views / Video</div>
              <div className="text-2xl font-bold tabular-nums text-red-600">{fmtBig(avgViews)}</div>
              <div className="text-slate-400 text-xs mt-1">filtered selection</div>
            </div>
            <div className="card">
              <div className="text-slate-500 text-xs font-medium mb-1">Avg Eng. Rate</div>
              <div className="text-2xl font-bold tabular-nums text-red-600">{avgEngRate}%</div>
              <div className="text-slate-400 text-xs mt-1">likes + comments / views</div>
            </div>
          </div>

          {/* Top 10 cards */}
          <Top10Section videos={filteredVideos} onVideoClick={v => setSelectedVideo(toYtSpotlight(v))} />

          {/* All Videos table */}
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-base">All Videos</h3>
            <span className="text-xs text-slate-400 font-mono">{filteredVideos.length} videos · click headers to sort</span>
          </div>

          <AllVideosTable
            videos={filteredVideos}
            tableLimit={tableLimit}
            onLoadMore={() => setTableLimit(t => t + 20)}
            onVideoClick={v => setSelectedVideo(toYtSpotlight(v))}
          />
        </>
      )}

      {/* ── Load more from API ─────────────────────────────────────────────── */}
      {nextPageToken && (
        <div className="flex flex-col items-center gap-2 pt-2">
          <p className="text-xs text-slate-400">
            {allVideos.length} videos loaded · more available from API
          </p>
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="flex items-center gap-2 text-sm font-semibold text-slate-600
                       border border-slate-200 rounded-xl px-5 py-2.5
                       hover:bg-slate-50 transition-all disabled:opacity-50"
          >
            {loadingMore
              ? <><RefreshCw size={14} className="animate-spin" /> Loading 50 more…</>
              : <><ChevronDown size={14} /> Load 50 more videos</>
            }
          </button>
        </div>
      )}

      {!nextPageToken && allVideos.length > 0 && (
        <p className="text-center text-xs text-slate-400 pt-2">
          All {allVideos.length} videos loaded
        </p>
      )}

      <PostSpotlight
        post={selectedVideo}
        onClose={() => setSelectedVideo(null)}
        accountName="Lakepointe Church"
        platform="youtube"
      />
    </div>
  );
}
