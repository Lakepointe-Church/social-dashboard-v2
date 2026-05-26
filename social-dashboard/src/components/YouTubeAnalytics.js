// ─────────────────────────────────────────────────────────────────────────────
// YouTubeAnalytics — sticky control bar, date filter, OAuth-pending metrics,
// content breakdown section, numbered video table with client-side pagination
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import {
  TrendingUp, Eye, ThumbsUp, MessageSquare, RefreshCw, AlertCircle,
  ChevronDown, Clock, MousePointer, Lock, Activity,
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────
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

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-slate-700 mb-1 max-w-[200px] leading-snug">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }} className="font-mono">
          {p.name}: {fmtBig(p.value)}
        </p>
      ))}
    </div>
  );
}

function ContentTypeCharts({ videos }) {
  if (!videos.length) return (
    <div className="card text-center py-12 text-slate-400 text-sm">No videos match the current filters.</div>
  );

  const chartVideos = [...videos].slice(0, 10).reverse();

  const viewsData = chartVideos.map(v => ({ name: truncate(v.title, 32), Views: v.viewCount }));
  const engData   = chartVideos.map(v => ({ name: truncate(v.title, 32), Likes: v.likeCount, Comments: v.commentCount }));

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <div className="card">
        <h3 className="font-bold text-slate-900 text-base mb-1">Views</h3>
        <p className="text-slate-500 text-sm mb-4">Most recent {chartVideos.length}</p>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={viewsData} layout="vertical" margin={{ left: 8, right: 24 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={fmtBig} />
            <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 10 }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="Views" radius={[0, 4, 4, 0]}>
              {viewsData.map((_, i) => (
                <Cell key={i} fill={i === viewsData.length - 1 ? '#FF0000' : '#FF000066'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="card">
        <h3 className="font-bold text-slate-900 text-base mb-1">Likes &amp; Comments</h3>
        <p className="text-slate-500 text-sm mb-4">Most recent {chartVideos.length}</p>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={engData} layout="vertical" margin={{ left: 8, right: 24 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={fmtBig} />
            <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 10 }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="Likes"    fill="#fb923c" radius={[0, 4, 4, 0]} />
            <Bar dataKey="Comments" fill="#a78bfa" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function VideoTable({ videos, tableLimit, onLoadMore }) {
  const visible = videos.slice(0, tableLimit);
  if (!videos.length) return null;
  return (
    <div className="space-y-3">
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-8">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Title</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Published</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Duration</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Views</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Likes</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Comments</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Eng. Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {visible.map((v, i) => {
                const engColor =
                  v.engagementRate > 5 ? 'text-emerald-600' :
                  v.engagementRate > 2 ? 'text-blue-500' : 'text-slate-400';
                return (
                  <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-xs text-slate-400 font-mono">{i + 1}</td>
                    <td className="px-4 py-3 max-w-xs">
                      <a
                        href={`https://youtube.com/watch?v=${v.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-800 font-medium hover:text-red-600 transition-colors line-clamp-2 block"
                        title={v.title}
                      >
                        {v.title}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap font-mono">{fmtDate(v.publishedAt)}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs font-mono whitespace-nowrap">{v.duration}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-700 font-semibold">{v.viewCount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-600">{v.likeCount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-600">{v.commentCount.toLocaleString()}</td>
                    <td className={`px-6 py-3 text-right font-mono font-semibold ${engColor}`}>{v.engagementRate.toFixed(2)}%</td>
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

// ── Main component ────────────────────────────────────────────────────────────
export default function YouTubeAnalytics() {
  const [channel,       setChannel]       = useState(null);
  const [allVideos,     setAllVideos]      = useState([]);
  const [nextPageToken, setNextPageToken]  = useState(null);
  const [loading,       setLoading]        = useState(false);
  const [loadingMore,   setLoadingMore]    = useState(false);
  const [error,         setError]          = useState(null);
  const [fetchedAt,     setFetchedAt]      = useState(null);
  const [activeFilters, setActiveFilters]  = useState(ALL_FILTER_IDS);
  const [datePreset,    setDatePreset]     = useState('90');
  const [customStart,   setCustomStart]    = useState('');
  const [customEnd,     setCustomEnd]      = useState('');
  const [tableLimit,    setTableLimit]     = useState(20);

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
      if (data.channel) setChannel(data.channel);
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

  useEffect(() => { fetchData(); }, [fetchData]);

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

  // Counts per type (for chips badge)
  const counts = {};
  CONTENT_FILTERS.forEach(f => {
    counts[f.id] = dateFilteredVideos.filter(v => v.contentType === f.id).length;
  });

  // ── Filtered-view KPIs ─────────────────────────────────────────────────────
  const totalViews  = filteredVideos.reduce((s, v) => s + v.viewCount, 0);
  const avgViews    = Math.round(avg(filteredVideos, 'viewCount'));
  const avgEngRate  = filteredVideos.length
    ? (filteredVideos.reduce((s, v) => s + v.engagementRate, 0) / filteredVideos.length).toFixed(2)
    : '0.00';
  const topVideo    = filteredVideos.reduce((best, v) => (!best || v.viewCount > best.viewCount) ? v : best, null);

  // ── Per-type breakdown (all date-filtered) ─────────────────────────────────
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
          {/* Content type chips */}
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
          {/* Divider */}
          <div className="h-5 w-px bg-slate-200 flex-shrink-0 hidden sm:block" />
          {/* Date presets + refresh */}
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
          <StatCard label="Subscribers"       value={fmtBig(channel?.subscriberCount)}          subtext="YouTube channel"            icon={<TrendingUp size={20}/>}   iconBg="bg-red-100"    iconColor="text-red-600"    />
          <StatCard label="Total Views"        value={fmtBig(channel?.viewCount)}                subtext="All-time across all videos"  icon={<Eye size={20}/>}          iconBg="bg-orange-100" iconColor="text-orange-600" />
          <StatCard label="Videos Published"   value={channel?.videoCount?.toLocaleString() ?? '—'} subtext="Total on channel"        icon={<MessageSquare size={20}/>} iconBg="bg-pink-100"   iconColor="text-pink-600"   />
          <StatCard label="Avg Views / Video"  value={fmtBig(channel?.avgViewsPerVideo)}         subtext="All-time average"           icon={<ThumbsUp size={20}/>}     iconBg="bg-rose-100"   iconColor="text-rose-600"   />
        </div>
      </div>

      {/* ── Advanced metrics — pending OAuth ──────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h3 className="font-semibold text-slate-700 text-sm">Advanced Metrics</h3>
          <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
            <Lock size={10} /> Pending · YouTube OAuth required
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <PendingCard label="Total Watch Time (hrs)" icon={<Clock size={20}/>}        />
          <PendingCard label="Avg Watch Time / Video" icon={<Activity size={20}/>}     />
          <PendingCard label="Impression CTR"         icon={<MousePointer size={20}/>} />
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
              <div className="grid grid-cols-2 gap-3 text-xs">
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

      {/* ── Empty state — no filters selected ────────────────────────────── */}
      {activeFilters.length === 0 && (
        <div className="card text-center py-12">
          <p className="text-slate-500 text-sm font-medium mb-2">No content types selected</p>
          <button onClick={() => setActiveFilters(ALL_FILTER_IDS)}
            className="text-xs font-semibold text-red-600 hover:text-red-700">Reset filters</button>
        </div>
      )}

      {/* ── Empty state — date range has no results ───────────────────────── */}
      {activeFilters.length > 0 && filteredVideos.length === 0 && allVideos.length > 0 && (
        <div className="card text-center py-12 text-slate-400 text-sm">
          No videos published in this date range.
        </div>
      )}

      {/* ── Filtered content ──────────────────────────────────────────────── */}
      {filteredVideos.length > 0 && (
        <>
          {/* Summary KPIs for filtered view */}
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

          {/* Top performer callout */}
          {topVideo && (
            <div className="card border-l-4 border-l-red-500">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">🏆 Top Performer</div>
              <a
                href={`https://youtube.com/watch?v=${topVideo.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-slate-800 hover:text-red-600 transition-colors"
              >
                {topVideo.title}
              </a>
              <div className="flex gap-4 mt-2 text-xs text-slate-500 font-mono">
                <span>{topVideo.viewCount.toLocaleString()} views</span>
                <span>{topVideo.likeCount.toLocaleString()} likes</span>
                <span>{topVideo.engagementRate.toFixed(2)}% eng.</span>
                <span>{fmtDate(topVideo.publishedAt)}</span>
              </div>
            </div>
          )}

          {/* Charts */}
          <ContentTypeCharts videos={filteredVideos} />

          {/* Video table */}
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-base">Video Catalogue</h3>
            <span className="text-xs text-slate-400 font-mono">{filteredVideos.length} videos · sorted newest first</span>
          </div>

          <VideoTable
            videos={filteredVideos}
            tableLimit={tableLimit}
            onLoadMore={() => setTableLimit(t => t + 20)}
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

    </div>
  );
}
