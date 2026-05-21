// ─────────────────────────────────────────────────────────────────────────────
// FacebookAnalytics — live data from /api/facebook
// Multi-select content type filters — all toggleable including streams
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Users, Eye, Heart, TrendingUp, RefreshCw, AlertCircle, MapPin, Globe } from 'lucide-react';

const FB_BLUE = '#1877F2';

const CONTENT_FILTERS = [
  { id: 'photo',  label: '📷 Photos',          color: '#3b82f6' },
  { id: 'video',  label: '🎬 Videos & Reels',  color: '#8b5cf6' },
  { id: 'other',  label: '📝 Text & Links',    color: '#64748b' },
  { id: 'stream', label: '📺 Service Streams', color: '#f59e0b' },
];

function fmtBig(n) {
  if (!n && n !== 0) return '—';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString();
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function truncate(str, max = 80) {
  return str?.length > max ? str.slice(0, max) + '…' : str;
}

function getFbPostUrl(postId) {
  // postId format is pageId_postId
  const parts = postId?.split('_');
  if (parts?.length === 2) return `https://www.facebook.com/permalink.php?story_fbid=${parts[1]}&id=${parts[0]}`;
  return `https://www.facebook.com/${postId}`;
}

function contentTypeLabel(type) {
  if (type === 'photo')  return '📷 Photo';
  if (type === 'album')  return '🖼️ Album';
  if (type === 'video_inline' || type === 'video') return '🎬 Video';
  if (type === 'status') return '📝 Status';
  return type || '—';
}

function StatCard({ label, value, subtext, icon, iconBg, iconColor }) {
  return (
    <div className="card card-hover">
      <div className={`${iconBg} ${iconColor} w-10 h-10 rounded-xl flex items-center justify-center`}>{icon}</div>
      <div className="mt-3">
        <div className="text-2xl font-bold text-slate-900 tabular-nums">{value}</div>
        <div className="text-slate-500 text-sm font-medium mt-0.5">{label}</div>
        {subtext && <div className="text-slate-400 text-xs mt-1">{subtext}</div>}
      </div>
    </div>
  );
}

// ── Post card ─────────────────────────────────────────────────────────────────
function PostCard({ post, rank }) {
  const [imgError, setImgError] = useState(false);
  const rankColors = ['#1877F2', '#3b82f6', '#0ea5e9', '#06b6d4'];
  const engaged = post.likeCount + post.commentCount + post.shareCount;
  
  return (
    <a href={getFbPostUrl(post.id)} target="_blank" rel="noopener noreferrer"
      className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all group block">
      {/* Image */}
      <div className="relative bg-slate-100 overflow-hidden" style={{ aspectRatio: '3/4' }}>
        {post.thumbnail && !imgError ? (
          <img
            src={post.thumbnail}
            alt={truncate(post.message, 40)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImgError(true)}
            crossOrigin="anonymous"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #e0f2fe, #f0f4ff)' }}>
            <span className="text-4xl">{contentTypeLabel(post.type).split(' ')[0]}</span>
            <span className="text-xs text-slate-400 px-4 text-center line-clamp-2">{truncate(post.message, 60) || '(No caption)'}</span>
          </div>
        )}
        {/* Rank badge */}
        <div className="absolute top-2 left-2 w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md"
          style={{ background: rankColors[rank] || '#64748b' }}>
          {rank + 1}
        </div>
        {/* Type badge */}
        <div className="absolute top-2 right-2 bg-black/50 text-white text-[10px] font-medium px-2 py-0.5 rounded-full backdrop-blur-sm">
          {contentTypeLabel(post.type)}
        </div>
      </div>
      {/* Caption + date */}
      <div className="px-3 pt-2.5 pb-1">
        <p className="text-slate-700 text-xs leading-snug line-clamp-2 min-h-[32px]">
          {truncate(post.message, 80) || '(No caption)'}
        </p>
        <p className="text-slate-400 text-[10px] mt-1 font-mono">{fmtDate(post.createdTime)}</p>
      </div>
      {/* Engagement metric */}
      <div className="px-3 pb-3 pt-1">
        <div className="text-lg font-bold tabular-nums" style={{ color: rankColors[rank] || '#64748b' }}>
          {fmtBig(engaged)}
        </div>
        <div className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold">ENGAGED</div>
      </div>
      {/* Breakdown */}
      <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100">
        <div className="px-2 py-2 text-center">
          <div className="text-slate-900 font-bold text-xs tabular-nums">{fmtBig(post.likeCount)}</div>
          <div className="text-slate-400 text-[10px]">Likes</div>
        </div>
        <div className="px-2 py-2 text-center">
          <div className="text-slate-900 font-bold text-xs tabular-nums">{fmtBig(post.commentCount)}</div>
          <div className="text-slate-400 text-[10px]">Comments</div>
        </div>
        <div className="px-2 py-2 text-center">
          <div className="text-slate-900 font-bold text-xs tabular-nums">{fmtBig(post.shareCount)}</div>
          <div className="text-slate-400 text-[10px]">Shares</div>
        </div>
      </div>
    </a>
  );
}

// ── Top 4 section ─────────────────────────────────────────────────────────────
function Top4Section({ title, posts, metric, metricLabel }) {
  const sorted = [...posts].sort((a, b) => {
    const aVal = a[metric] || 0;
    const bVal = b[metric] || 0;
    return bVal - aVal;
  }).slice(0, 4);
  if (sorted.length === 0) return null;
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-slate-900 text-sm">{title}</h3>
        <span className="text-xs text-slate-400">Top 4</span>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {sorted.map((post, i) => (
          <PostCard key={post.id} post={post} rank={i} />
        ))}
        {sorted.length < 4 && Array.from({ length: 4 - sorted.length }).map((_, i) => (
          <div key={i} className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl flex items-center justify-center text-slate-300 text-sm" style={{ aspectRatio: '3/4' }}>
            No post
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Rate bar ───────────────────────────────────────────────────────────────────
function RateBar({ value, color, maxValue }) {
  const pct = maxValue > 0 ? Math.min((value / maxValue) * 100, 100) : 0;
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-bold font-mono" style={{ color }}>{value.toFixed(1)}%</span>
      <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

// ── Per-post engagement rate row ──────────────────────────────────────────────
function RateInsightsRow({ p, i, maxLike, maxComment, maxShare }) {
  const [imgError, setImgError] = useState(false);
  
  return (
    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <span className="text-slate-400 font-mono font-bold w-4 text-center flex-shrink-0">{i + 1}</span>
          <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 bg-slate-100">
            {p.thumbnail && !imgError ? (
              <img src={p.thumbnail} alt="" className="w-full h-full object-cover"
                onError={() => setImgError(true)} crossOrigin="anonymous" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-lg"
                style={{ background: 'linear-gradient(135deg,#e0f2fe,#f0f4ff)' }}>
                {contentTypeLabel(p.type).split(' ')[0]}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <a href={getFbPostUrl(p.id)} target="_blank" rel="noopener noreferrer"
              className="text-slate-700 font-medium hover:text-blue-600 transition-colors line-clamp-1 block">
              {truncate(p.message, 55) || '(No caption)'}
            </a>
          </div>
        </div>
      </td>
      <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{contentTypeLabel(p.type)}</td>
      <td className="px-3 py-2.5 text-slate-500 font-mono whitespace-nowrap">{fmtDate(p.createdTime)}</td>
      <td className="px-3 py-2.5 text-center">
        <span className="font-bold text-slate-800 tabular-nums text-sm">{fmtBig(p.engaged)}</span>
      </td>
      <td className="px-3 py-2.5 text-center"><RateBar value={p.likeRate}    color={FB_BLUE}   maxValue={maxLike}   /></td>
      <td className="px-3 py-2.5 text-center"><RateBar value={p.commentRate} color="#6366f1" maxValue={maxComment} /></td>
      <td className="px-3 py-2.5 text-center"><RateBar value={p.shareRate}   color="#f59e0b"   maxValue={maxShare}   /></td>
    </tr>
  );
}

function RateInsightsTable({ posts }) {
  const top10 = [...posts].sort((a, b) => b.engaged - a.engaged).slice(0, 10);
  if (top10.length === 0) return null;

  const maxLike    = Math.max(...top10.map(p => p.likeRate),    0.01);
  const maxComment = Math.max(...top10.map(p => p.commentRate), 0.01);
  const maxShare   = Math.max(...top10.map(p => p.shareRate),   0.01);

  return (
    <div className="overflow-x-auto mt-4">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50">
            <th className="text-left px-4 py-2.5 font-semibold text-slate-500 uppercase tracking-wide min-w-[200px]">Post</th>
            <th className="text-left px-3 py-2.5 font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Type</th>
            <th className="text-left px-3 py-2.5 font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Date</th>
            <th className="text-center px-3 py-2.5 font-semibold text-slate-700 uppercase tracking-wide whitespace-nowrap">Engaged</th>
            <th className="text-center px-3 py-2.5 font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: FB_BLUE }}>❤️ Like %</th>
            <th className="text-center px-3 py-2.5 font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: '#6366f1' }}>💬 Comment %</th>
            <th className="text-center px-3 py-2.5 font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: '#f59e0b' }}>🔗 Share %</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {top10.map((p, i) => (
            <RateInsightsRow
              key={p.id}
              p={p}
              i={i}
              maxLike={maxLike}
              maxComment={maxComment}
              maxShare={maxShare}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-slate-700 mb-1 max-w-[200px] leading-snug">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }} className="font-mono">{p.name}: {fmtBig(p.value)}</p>
      ))}
    </div>
  );
}

export default function FacebookAnalytics() {
  const [data,          setData]          = useState(null);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState(null);
  // Default: photos, videos, text all on — streams off
  const [activeFilters, setActiveFilters] = useState(['photo', 'video', 'other']);
  const [datePreset,    setDatePreset]    = useState('30');
  const [customStart,   setCustomStart]   = useState('');
  const [customEnd,     setCustomEnd]     = useState('');
  const [tableLimit,    setTableLimit]    = useState(20);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/facebook');
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || `HTTP ${res.status}`); }
      setData(await res.json());
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Allow toggling any filter — including deselecting all (shows empty state)
  function toggleFilter(id) {
    setActiveFilters(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
    setTableLimit(20);
  }

  if (loading && !data) return (
    <div className="card flex items-center justify-center py-20">
      <div className="text-center">
        <RefreshCw size={28} className="animate-spin mx-auto mb-3" style={{ color: FB_BLUE }} />
        <p className="text-slate-500 text-sm">Fetching live Facebook data…</p>
      </div>
    </div>
  );

  if (error && !data) return (
    <div className="card border-red-100 bg-red-50">
      <div className="flex items-start gap-3">
        <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-red-700 text-sm">Failed to load Facebook data</p>
          <p className="text-red-500 text-xs mt-1">{error}</p>
          <button onClick={fetchData} className="mt-3 text-xs font-semibold text-red-600 hover:text-red-700 flex items-center gap-1">
            <RefreshCw size={12} /> Try again
          </button>
        </div>
      </div>
    </div>
  );

  const { page, insights, posts = [], demographics = [], geo, fetchedAt } = data || {};

  const rangeStart = datePreset === 'custom'
    ? (customStart ? new Date(customStart) : null)
    : new Date(Date.now() - parseInt(datePreset, 10) * 864e5);
  const rangeEnd = datePreset === 'custom'
    ? (customEnd ? new Date(`${customEnd}T23:59:59`) : null)
    : new Date();

  const dateLabel = datePreset === 'custom'
    ? (customStart && customEnd ? `${customStart} → ${customEnd}` : 'Custom range')
    : `Last ${datePreset} days`;

  // ── Add rate metrics to posts ──────────────────────────────────────────────
  const postsWithRates = posts.map(p => {
    const totalEngagement = p.likeCount + p.commentCount + p.shareCount;
    const likeRate    = totalEngagement > 0 ? parseFloat((p.likeCount / totalEngagement * 100).toFixed(2)) : 0;
    const commentRate = totalEngagement > 0 ? parseFloat((p.commentCount / totalEngagement * 100).toFixed(2)) : 0;
    const shareRate   = totalEngagement > 0 ? parseFloat((p.shareCount / totalEngagement * 100).toFixed(2)) : 0;
    return { ...p, likeRate, commentRate, shareRate };
  });

  // ── Filtering ─────────────────────────────────────────────────────────────
  const filteredPosts   = postsWithRates
    .filter(p => activeFilters.includes(p.contentType))
    .filter(p => {
      const posted = new Date(p.createdTime);
      if (rangeStart && posted < rangeStart) return false;
      if (rangeEnd && posted > rangeEnd) return false;
      return true;
    });
  const sortedFilteredPosts = [...filteredPosts].sort((a, b) => new Date(b.createdTime) - new Date(a.createdTime));
  const visiblePosts        = sortedFilteredPosts.slice(0, tableLimit);


  // ── Counts per type ───────────────────────────────────────────────────────
  const counts = { photo: 0, video: 0, other: 0, stream: 0 };
  posts.forEach(p => { if (counts[p.contentType] !== undefined) counts[p.contentType]++; });

  const demoChartData = demographics.map(d => ({ age: d.age, Male: d.M, Female: d.F }));
  const cityData      = (geo?.cities    || []).slice(0, 8);
  const countryData   = (geo?.countries || []).slice(0, 6);

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: FB_BLUE }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
          </div>
          <div>
            <h2 className="font-bold text-slate-900 text-lg leading-tight">Facebook Analytics</h2>
            <p className="text-slate-400 text-xs">
              {page?.name} · Live data
              {fetchedAt && ` · Updated ${new Date(fetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
            </p>
          </div>
        </div>
        <button onClick={fetchData} disabled={loading}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition-all disabled:opacity-50">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* ── Sticky control bar ────────────────────────────────────────────────── */}
      <div className="sticky top-16 z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 bg-white border-b border-slate-200 shadow-sm">
        <div className="py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2 items-center min-w-0">
            {CONTENT_FILTERS.map(f => {
              const isActive = activeFilters.includes(f.id);
              return (
                <button
                  key={f.id}
                  onClick={() => toggleFilter(f.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                    isActive ? 'text-white border-transparent shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                  style={isActive ? { background: f.color, borderColor: f.color } : {}}
                >
                  {f.label}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {counts[f.id] ?? 0}
                  </span>
                </button>
              );
            })}
            {activeFilters.length === 0 && (
              <button
                onClick={() => setActiveFilters(['photo', 'video', 'other'])}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                Reset
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 justify-end flex-shrink-0">
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
                  className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 focus:outline-none focus:border-blue-300" />
                <span className="text-slate-400 text-xs">–</span>
                <input type="date" value={customEnd} onChange={e => { setCustomEnd(e.target.value); setTableLimit(20); }}
                  className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 focus:outline-none focus:border-blue-300" />
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 text-slate-500 text-xs whitespace-nowrap">
              <span>{filteredPosts.length} posts in view</span>
              <span>{dateLabel}</span>
            </div>
            <button onClick={fetchData} disabled={loading}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition-all disabled:opacity-50">
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Page Followers"   value={fmtBig(page?.followersCount)} subtext="Facebook Page"           icon={<Users size={20}/>}      iconBg="bg-blue-100"   iconColor="text-blue-600"   />
        <StatCard label="Reach (30d)"      value={fmtBig(insights?.reach)}      subtext="Unique accounts reached"  icon={<Eye size={20}/>}        iconBg="bg-indigo-100" iconColor="text-indigo-600" />
        <StatCard label="Total Posts"      value={posts.length}                  subtext={`${filteredPosts.length} in current filter`} icon={<Heart size={20}/>} iconBg="bg-pink-100" iconColor="text-pink-600" />
        <StatCard label="Page Views (30d)" value={fmtBig(insights?.pageViews)}  subtext="All page views"           icon={<TrendingUp size={20}/>} iconBg="bg-purple-100" iconColor="text-purple-600" />
      </div>

      {/* ── Empty state ────────────────────────────────────────────────────── */}
      {activeFilters.length === 0 && (
        <div className="card text-center py-12">
          <p className="text-slate-400 text-sm mb-3">No content types selected.</p>
          <button
            onClick={() => setActiveFilters(['photo', 'video', 'other'])}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 border border-blue-200 rounded-lg px-4 py-2 hover:bg-blue-50 transition-all"
          >
            Reset to default
          </button>
        </div>
      )}

      {/* ── Top posts 2×2 grid ───────────────────────────────────────────────── */}
      {filteredPosts.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Top4Section title="🏆 Top Posts by Likes"      posts={filteredPosts} metric="likeCount"    metricLabel="Likes"   />
          <Top4Section title="💬 Top Posts by Comments"  posts={filteredPosts} metric="commentCount" metricLabel="Comments" />
          <Top4Section title="🔗 Top Posts by Shares"     posts={filteredPosts} metric="shareCount"   metricLabel="Shares"  />
          <Top4Section title="❤️ Top Posts by Engagement" posts={filteredPosts} metric="engaged"      metricLabel="Engaged" />
        </div>
      )}

      {/* ── Per-post engagement rates ─────────────────────────────────────── */}
      {filteredPosts.length > 0 && (
        <div className="card">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">📊</span>
            <h3 className="font-bold text-slate-900 text-base">Engagement Rates — Per Post</h3>
            <span className="text-xs text-slate-400 font-mono">Top 10 by engagement</span>
          </div>
          <p className="text-slate-500 text-sm">Breakdown of how likes, comments, and shares contribute to engagement</p>
          <RateInsightsTable posts={filteredPosts} />
        </div>
      )}

      {/* ── Demographics ──────────────────────────────────────────────────── */}
      {demoChartData.length > 0 && (
        <div className="card">
          <h3 className="font-bold text-slate-900 text-base mb-1">Audience Age &amp; Gender</h3>
          <p className="text-slate-500 text-sm mb-4">Fan demographics breakdown</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={demoChartData} margin={{ left: 8, right: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="age" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtBig} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="Male"   fill={FB_BLUE} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Female" fill="#f472b6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Geographic ────────────────────────────────────────────────────── */}
      {(cityData.length > 0 || countryData.length > 0) && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {cityData.length > 0 && (
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <MapPin size={16} className="text-slate-400" />
                <h3 className="font-bold text-slate-900 text-base">Top Cities</h3>
              </div>
              <div className="space-y-2">
                {cityData.map((c, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-slate-400 text-xs font-mono w-4">{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-slate-700 text-sm font-medium">{c.name}</span>
                        <span className="text-slate-500 text-xs font-mono">{c.pct}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${c.pct}%`, background: FB_BLUE }} />
                      </div>
                    </div>
                    <span className="text-slate-400 text-xs font-mono w-12 text-right">{fmtBig(c.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {countryData.length > 0 && (
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <Globe size={16} className="text-slate-400" />
                <h3 className="font-bold text-slate-900 text-base">Top Countries</h3>
              </div>
              <div className="space-y-2">
                {countryData.map((c, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-slate-400 text-xs font-mono w-4">{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-slate-700 text-sm font-medium">{c.name}</span>
                        <span className="text-slate-500 text-xs font-mono">{c.pct}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${c.pct}%`, background: FB_BLUE }} />
                      </div>
                    </div>
                    <span className="text-slate-400 text-xs font-mono w-12 text-right">{fmtBig(c.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Posts table ───────────────────────────────────────────────────── */}
      {filteredPosts.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-base">All Posts</h3>
            <p className="text-slate-500 text-sm">Showing {visiblePosts.length} of {filteredPosts.length} posts · filtered view · Live from Facebook</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Post</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Likes</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Comments</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Shares</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {visiblePosts.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3 max-w-xs">
                      <a
                        href={getFbPostUrl(p.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-700 text-sm line-clamp-2 hover:text-blue-600 transition-colors block"
                        title="Open post on Facebook"
                      >
                        {truncate(p.message, 100) || '(No caption)'}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{contentTypeLabel(p.type)}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap font-mono">{fmtDate(p.createdTime)}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-700 font-semibold">{fmtBig(p.likeCount)}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-600">{fmtBig(p.commentCount)}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-600">{fmtBig(p.shareCount)}</td>
                    <td className="px-6 py-3 text-right font-mono font-semibold text-blue-500">{fmtBig(p.engaged)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {tableLimit < sortedFilteredPosts.length && (
            <div className="px-6 py-4 border-t border-slate-100 text-center">
              <button onClick={() => setTableLimit(prev => prev + 20)}
                className="text-sm font-semibold text-blue-600 border border-blue-200 rounded-lg px-5 py-2 hover:bg-blue-50 transition-all">
                Load 20 more · {sortedFilteredPosts.length - tableLimit} remaining
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
