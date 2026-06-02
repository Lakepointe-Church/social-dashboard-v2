// ─────────────────────────────────────────────────────────────────────────────
// InstagramAnalytics — live data from /api/instagram
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import { fetchInstagramData, invalidateInstagramCache } from '../lib/igDataCache';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Users, Eye, Heart, TrendingUp, Share2, UserPlus, RefreshCw, AlertCircle, MessageCircle, Search } from 'lucide-react';
import PostSpotlight from './PostSpotlight';
import GrowthChartSection from './GrowthChartSection';

const IG_PINK   = '#E1306C';
const IG_PURPLE = '#833AB4';

const CONTENT_FILTERS = [
  { id: 'photo',    label: '📷 Photos',    color: '#3b82f6' },
  { id: 'carousel', label: '🖼️ Carousels', color: '#0ea5e9' },
  { id: 'reel',     label: '🎬 Reels',     color: '#8b5cf6' },
  { id: 'collab',   label: '🤝 Collabs',   color: '#f59e0b' },
  { id: 'other',    label: '📝 Other',     color: '#64748b' },
];

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

function fmtWatchTime(ms) {
  if (!ms) return '—';
  const s = ms / 1000;
  if (s >= 60) return `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
  return `${s.toFixed(1)}s`;
}

function truncate(str, max = 60) {
  return str?.length > max ? str.slice(0, max) + '…' : str;
}

function mediaTypeLabel(type) {
  if (type === 'IMAGE')          return '📷 Photo';
  if (type === 'VIDEO')          return '🎬 Reel';
  if (type === 'CAROUSEL_ALBUM') return '🖼️ Carousel';
  if (type === 'REELS')          return '🎬 Reel';
  return type || '—';
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
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

// ── Post grid card ────────────────────────────────────────────────────────────
function PostCard({ post, rank, metric, metricLabel, onPostClick }) {
  const [imgError, setImgError] = useState(false);
  const rankColors = ['#E1306C', '#833AB4', '#f59e0b', '#3b82f6'];
  const emoji = post.mediaType === 'REELS' || post.mediaType === 'VIDEO' ? '🎬'
              : post.mediaType === 'CAROUSEL_ALBUM' ? '🖼️' : '📷';

  return (
    <div
      onClick={() => onPostClick?.(post)}
      className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all group block cursor-pointer">
      {/* Image */}
      <div className="relative bg-slate-100 overflow-hidden" style={{ aspectRatio: '3/4' }}>
        {post.mediaUrl && !imgError ? (
          <img
            src={post.mediaUrl}
            alt={truncate(post.caption, 40)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImgError(true)}
            crossOrigin="anonymous"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #fdf2f8, #f5f3ff)' }}>
            <span className="text-4xl">{emoji}</span>
            <span className="text-xs text-slate-400 px-4 text-center line-clamp-2">{truncate(post.caption, 60)}</span>
          </div>
        )}
        {/* Rank badge */}
        <div className="absolute top-2 left-2 w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-md"
          style={{ background: rankColors[rank] || '#64748b' }}>
          {rank + 1}
        </div>
        {/* Type badge */}
        <div className="absolute top-2 right-2 bg-black/50 text-white text-[10px] font-medium px-2 py-0.5 rounded-full backdrop-blur-sm">
          {mediaTypeLabel(post.mediaType)}
        </div>
      </div>
      {/* Caption + date */}
      <div className="px-3 pt-2.5 pb-1">
        <p className="text-slate-700 text-xs leading-snug line-clamp-2 min-h-[32px]">
          {truncate(post.caption, 80) || '(No caption)'}
        </p>
        <p className="text-slate-400 text-[10px] mt-1 font-mono">{fmtDate(post.timestamp)}</p>
      </div>
      {/* Primary metric + breakdown */}
      <div className="px-3 pb-3 pt-1">
        <div className="text-lg font-bold tabular-nums" style={{ color: rankColors[rank] || '#64748b' }}>
          {fmtBig(metric)}
        </div>
        <div className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold">{metricLabel}</div>
      </div>
      <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100">
        <div className="px-2 py-2 text-center">
          <div className="text-slate-900 font-bold text-[11px] tabular-nums">{fmtBig(post.engagement)}</div>
          <div className="text-slate-400 mt-1"><Heart size={12} className="mx-auto" /></div>
        </div>
        <div className="px-2 py-2 text-center">
          <div className="text-slate-900 font-bold text-[11px] tabular-nums">{fmtBig(post.shares)}</div>
          <div className="text-slate-400 mt-1"><Share2 size={12} className="mx-auto" /></div>
        </div>
        <div className="px-2 py-2 text-center">
          <div className="text-slate-900 font-bold text-[11px] tabular-nums">{fmtBig(post.reach)}</div>
          <div className="text-slate-400 mt-1"><Eye size={12} className="mx-auto" /></div>
        </div>
      </div>
    </div>
  );
}

// ── Top 4 section ─────────────────────────────────────────────────────────────
function Top4Section({ title, posts, metric, metricLabel, sortKey, onPostClick }) {
  const sorted = [...posts].sort((a, b) => b[sortKey] - a[sortKey]).slice(0, 4);
  if (sorted.length === 0) return null;
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-slate-900 text-sm">{title}</h3>
        <span className="text-xs text-slate-400">Top 4</span>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {sorted.map((post, i) => (
          <PostCard key={post.id} post={post} rank={i} metric={post[sortKey]} metricLabel={metricLabel} onPostClick={onPostClick} />
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

// ── Rate row (for per-post insights table) ────────────────────────────────────
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

// ── Per-post rate insights table ──────────────────────────────────────────────
function RateInsightsRow({ p, i, isReel, maxShare, maxLike, maxSave, maxComment, onPostClick }) {
  const [imgError, setImgError] = useState(false);
  const emoji = p.mediaType === 'REELS' || p.mediaType === 'VIDEO' ? '🎬'
              : p.mediaType === 'CAROUSEL_ALBUM' ? '🖼️' : '📷';

  return (
    <tr key={p.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => onPostClick?.(p)}>
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <span className="text-slate-400 font-mono font-bold w-4 text-center flex-shrink-0">{i + 1}</span>
          <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 bg-slate-100">
            {p.mediaUrl && !imgError ? (
              <img src={p.mediaUrl} alt="" className="w-full h-full object-cover"
                onError={() => setImgError(true)} crossOrigin="anonymous" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-lg"
                style={{ background: 'linear-gradient(135deg,#fdf2f8,#f5f3ff)' }}>{emoji}</div>
            )}
          </div>
          <div className="min-w-0">
            <span className="text-slate-700 font-medium hover:text-pink-600 transition-colors line-clamp-1 block">
              {truncate(p.caption, 55) || '(No caption)'}
            </span>
          </div>
        </div>
      </td>
      <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{mediaTypeLabel(p.mediaType)}</td>
      <td className="px-3 py-2.5 text-slate-500 font-mono whitespace-nowrap">{fmtDate(p.timestamp)}</td>
      <td className="px-3 py-2.5 text-center">
        <span className="font-bold text-slate-800 tabular-nums text-sm">{fmtBig(p.reach)}</span>
      </td>
      <td className="px-3 py-2.5 text-center"><RateBar value={p.shareRate}   color="#f59e0b"   maxValue={maxShare}   /></td>
      <td className="px-3 py-2.5 text-center"><RateBar value={p.likeRate}    color={IG_PINK}   maxValue={maxLike}    /></td>
      <td className="px-3 py-2.5 text-center"><RateBar value={p.saveRate}    color={IG_PURPLE} maxValue={maxSave}    /></td>
      {!isReel && <td className="px-3 py-2.5 text-center"><RateBar value={p.commentRate} color="#6366f1" maxValue={maxComment} /></td>}
      {isReel  && (
        <td className="px-3 py-2.5 text-center">
          <span className="font-bold tabular-nums text-sm" style={{ color: '#10b981' }}>{fmtWatchTime(p.avgWatchTime)}</span>
        </td>
      )}
    </tr>
  );
}

function RateInsightsTable({ posts, type, onPostClick }) {
  const isReel = type === 'reel';
  const top10  = [...posts].sort((a, b) => b.reach - a.reach).slice(0, 10);
  if (top10.length === 0) return null;

  const maxShare   = Math.max(...top10.map(p => p.shareRate),   0.01);
  const maxLike    = Math.max(...top10.map(p => p.likeRate),    0.01);
  const maxSave    = Math.max(...top10.map(p => p.saveRate),    0.01);
  const maxComment = Math.max(...top10.map(p => p.commentRate), 0.01);

  return (
    <div className="overflow-x-auto mt-4">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50">
            <th className="text-left px-4 py-2.5 font-semibold text-slate-500 uppercase tracking-wide min-w-[200px]">Post</th>
            <th className="text-left px-3 py-2.5 font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Type</th>
            <th className="text-left px-3 py-2.5 font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Date</th>
            <th className="text-center px-3 py-2.5 font-semibold text-slate-700 uppercase tracking-wide whitespace-nowrap">Views</th>
            <th className="text-center px-3 py-2.5 font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: '#f59e0b' }}>🔗 Share</th>
            <th className="text-center px-3 py-2.5 font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: IG_PINK }}>❤️ Like</th>
            <th className="text-center px-3 py-2.5 font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: IG_PURPLE }}>🔖 Save</th>
            {!isReel && <th className="text-center px-3 py-2.5 font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: '#6366f1' }}>💬 Comment</th>}
            {isReel && <th className="text-center px-3 py-2.5 font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: '#10b981' }}>⏱ Avg Watch</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {top10.map((p, i) => (
            <RateInsightsRow
              key={p.id}
              p={p}
              i={i}
              isReel={isReel}
              maxShare={maxShare}
              maxLike={maxLike}
              maxSave={maxSave}
              maxComment={maxComment}
              onPostClick={onPostClick}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Comment Phrase Search ─────────────────────────────────────────────────────
function CommentSearch() {
  const currentYear = new Date().getFullYear();
  const [phrase,      setPhrase]     = useState('sermon');
  const [year,        setYear]       = useState(String(currentYear));
  const [searching,   setSearching]  = useState(false);
  const [results,     setResults]    = useState(null);
  const [searchError, setSearchError] = useState(null);

  async function runSearch() {
    if (!phrase.trim()) return;
    setSearching(true);
    setResults(null);
    setSearchError(null);
    try {
      const r    = await fetch(`/api/ig-comment-search?phrase=${encodeURIComponent(phrase.trim())}&year=${year}`);
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'Search failed');
      setResults(data);
    } catch (err) {
      setSearchError(err.message);
    } finally {
      setSearching(false);
    }
  }

  const years = [currentYear, currentYear - 1, currentYear - 2];

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-1">
        <MessageCircle size={18} className="text-pink-500" />
        <h3 className="font-bold text-slate-900 text-base">Comment Phrase Search</h3>
      </div>
      <p className="text-slate-500 text-sm mb-4">
        Count how many times a word or phrase was commented across your posts in a given year.
      </p>

      <div className="flex items-center gap-2 flex-wrap">
        <input
          type="text"
          value={phrase}
          onChange={e => setPhrase(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !searching && runSearch()}
          placeholder="e.g. sermon"
          className="flex-1 min-w-[160px] text-sm border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:border-pink-300 font-mono"
        />
        <select
          value={year}
          onChange={e => setYear(e.target.value)}
          className="text-sm border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:border-pink-300">
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <button
          onClick={runSearch}
          disabled={searching || !phrase.trim()}
          className="flex items-center gap-1.5 text-sm font-semibold text-white px-4 py-2 rounded-lg transition-all disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #E1306C, #833AB4)' }}>
          {searching ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
          {searching ? 'Scanning…' : 'Search'}
        </button>
      </div>

      {searching && (
        <p className="text-xs text-slate-400 mt-2">
          This may take 30–60 seconds — scanning all posts and their comments…
        </p>
      )}

      {searchError && (
        <div className="mt-4 flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl p-3">
          <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-700 text-sm font-semibold">Search failed</p>
            <p className="text-red-500 text-xs mt-0.5">{searchError}</p>
          </div>
        </div>
      )}

      {results && (
        <div className="mt-5 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl p-4 text-center border border-pink-100"
              style={{ background: 'linear-gradient(135deg, #fdf2f8, #f5f3ff)' }}>
              <div className="text-3xl font-bold tabular-nums" style={{ color: IG_PINK }}>
                {results.totalMatches.toLocaleString()}
              </div>
              <div className="text-xs text-slate-500 mt-1 font-medium">"{results.phrase}" comments</div>
              <div className="text-xs text-slate-400 mt-0.5">in {results.year}</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-100">
              <div className="text-3xl font-bold tabular-nums text-slate-700">{results.postsScanned}</div>
              <div className="text-xs text-slate-500 mt-1 font-medium">Posts scanned</div>
              <div className="text-xs text-slate-400 mt-0.5">from {results.year}</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 text-center border border-slate-100">
              <div className="text-3xl font-bold tabular-nums text-slate-700">{results.postsWithMatches}</div>
              <div className="text-xs text-slate-500 mt-1 font-medium">Posts with matches</div>
              <div className="text-xs text-slate-400 mt-0.5">
                {results.postsScanned > 0
                  ? Math.round(results.postsWithMatches / results.postsScanned * 100)
                  : 0}% of posts
              </div>
            </div>
          </div>

          {results.breakdown.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left px-4 py-2.5 font-semibold text-slate-500 uppercase tracking-wide w-8">#</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-slate-500 uppercase tracking-wide min-w-[200px]">Post</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Date</th>
                    <th className="text-right px-4 py-2.5 font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: IG_PINK }}>Matches</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {results.breakdown.map((item, i) => (
                    <tr key={item.mediaId} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-2.5 text-slate-400 font-mono font-bold">{i + 1}</td>
                      <td className="px-4 py-2.5">
                        <a href={item.permalink} target="_blank" rel="noreferrer"
                          className="text-slate-700 hover:text-pink-600 transition-colors line-clamp-2 block">
                          {truncate(item.caption, 80) || '(No caption)'}
                        </a>
                      </td>
                      <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap font-mono">{fmtDate(item.timestamp)}</td>
                      <td className="px-4 py-2.5 text-right">
                        <span className="font-bold tabular-nums text-sm" style={{ color: IG_PINK }}>{item.matchCount}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {results.totalMatches === 0 && (
            <p className="text-center text-slate-400 text-sm py-4">
              No comments containing "{results.phrase}" found in {results.year}.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map(p => <p key={p.name} style={{ color: p.color }} className="font-mono">{p.name}: {fmtBig(p.value)}</p>)}
    </div>
  );
}

export default function InstagramAnalytics() {
  const [data,          setData]          = useState(null);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState(null);
  const [activeFilters, setActiveFilters] = useState(['photo', 'carousel', 'reel']);
  const [tableSort,     setTableSort]     = useState({ key: 'timestamp', dir: 'desc' });
  const [tableLimit,    setTableLimit]    = useState(20);
  const [datePreset,    setDatePreset]    = useState('30');
  const [customStart,   setCustomStart]   = useState('');
  const [customEnd,     setCustomEnd]     = useState('');
  const [selectedPost,  setSelectedPost]  = useState(null);
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

  const fetchData = useCallback(async (forceRefresh = false) => {
    setLoading(true); setError(null);
    try {
      if (forceRefresh) invalidateInstagramCache();
      setData(await fetchInstagramData());
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); fetchSnapshots(90); }, [fetchData, fetchSnapshots]);

  function toggleFilter(id) {
    setActiveFilters(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
    setTableLimit(20);
  }

  if (loading && !data) return (
    <div className="card flex items-center justify-center py-20">
      <div className="text-center">
        <RefreshCw size={28} className="animate-spin mx-auto mb-3" style={{ color: IG_PINK }} />
        <p className="text-slate-500 text-sm">Fetching live Instagram data…</p>
      </div>
    </div>
  );

  if (error && !data) return (
    <div className="card border-red-100 bg-red-50">
      <div className="flex items-start gap-3">
        <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-red-700 text-sm">Failed to load Instagram data</p>
          <p className="text-red-500 text-xs mt-1">{error}</p>
          <button onClick={() => fetchData(true)} className="mt-3 text-xs font-semibold text-red-600 flex items-center gap-1">
            <RefreshCw size={12} /> Try again
          </button>
        </div>
      </div>
    </div>
  );

  const { account, insights, media = [], demographics = [], geo, fetchedAt } = data || {};

  const rangeStart = datePreset === 'custom'
    ? (customStart ? new Date(customStart) : null)
    : new Date(Date.now() - parseInt(datePreset) * 864e5);
  const rangeEnd = datePreset === 'custom'
    ? (customEnd ? new Date(customEnd + 'T23:59:59') : null)
    : new Date();

  const filteredMedia = media
    .filter(m => activeFilters.includes(m.contentType))
    .filter(m => {
      const t = new Date(m.timestamp);
      if (rangeStart && t < rangeStart) return false;
      if (rangeEnd   && t > rangeEnd)   return false;
      return true;
    });
  const sortedMedia   = [...filteredMedia].sort((a, b) => {
    const mul = tableSort.dir === 'asc' ? 1 : -1;
    if (tableSort.key === 'timestamp') return mul * (new Date(a.timestamp) - new Date(b.timestamp));
    if (tableSort.key === 'contentType') return mul * (a.contentType || '').localeCompare(b.contentType || '');
    return mul * ((a[tableSort.key] || 0) - (b[tableSort.key] || 0));
  });
  const visibleMedia  = sortedMedia.slice(0, tableLimit);
  const counts = { photo: 0, carousel: 0, reel: 0, collab: 0, other: 0 };
  media.filter(m => {
    const t = new Date(m.timestamp);
    if (rangeStart && t < rangeStart) return false;
    if (rangeEnd   && t > rangeEnd)   return false;
    return true;
  }).forEach(m => { if (counts[m.contentType] !== undefined) counts[m.contentType]++; });

  const reelsInView     = filteredMedia.filter(m => m.contentType === 'reel');
  const photosInView    = filteredMedia.filter(m => m.contentType === 'photo' || m.contentType === 'carousel');
  const hasReels        = activeFilters.includes('reel') && reelsInView.length > 0;
  const hasPhotos       = (activeFilters.includes('photo') || activeFilters.includes('carousel')) && photosInView.length > 0;


  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
          </svg>
        </div>
        <div>
          <h2 className="font-bold text-slate-900 text-lg leading-tight">Instagram Analytics</h2>
          <p className="text-slate-400 text-xs">
            @{account?.username} · Live data
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
                    isActive ? 'text-white border-transparent shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                  style={isActive ? { background: f.color, borderColor: f.color } : {}}>
                  {f.label}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    {counts[f.id] ?? 0}
                  </span>
                </button>
              );
            })}
            {activeFilters.length === 0 && (
              <button onClick={() => setActiveFilters(['photo', 'carousel', 'reel'])}
                className="text-xs font-semibold text-pink-600 hover:text-pink-700 px-1">Reset</button>
            )}
            <span className="text-xs text-slate-400 font-mono">{filteredMedia.length} posts</span>
          </div>
          {/* Divider */}
          <div className="h-5 w-px bg-slate-200 flex-shrink-0 hidden sm:block" />
          {/* Date presets */}
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
                  className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 focus:outline-none focus:border-pink-300" />
                <span className="text-slate-400 text-xs">–</span>
                <input type="date" value={customEnd} onChange={e => { setCustomEnd(e.target.value); setTableLimit(20); }}
                  className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 focus:outline-none focus:border-pink-300" />
              </div>
            )}
            <button onClick={() => fetchData(true)} disabled={loading}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition-all disabled:opacity-50">
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* ── 6 KPI Cards ───────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h3 className="font-semibold text-slate-700 text-sm">Profile Overview</h3>
          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Account-wide · not affected by filters</span>
        </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard label="Followers"        value={fmtBig(account?.followersCount)} subtext="All time"     icon={<Users size={18}/>}     iconBg="bg-pink-100"    iconColor="text-pink-600"    />
        <StatCard label="New Followers"    value={fmtBig(insights?.newFollowers)}  subtext="Last 30 days" icon={<UserPlus size={18}/>}  iconBg="bg-rose-100"    iconColor="text-rose-600"    />
        <StatCard label="Views"             value={fmtBig(insights?.reach)}         subtext="Last 30 days" icon={<Eye size={18}/>}       iconBg="bg-purple-100"  iconColor="text-purple-600"  />
        <StatCard label="Profile Visits"   value={fmtBig(insights?.profileViews)}  subtext="Last 30 days" icon={<TrendingUp size={18}/>} iconBg="bg-indigo-100" iconColor="text-indigo-600"  />
        <StatCard label="Engagement"       value={fmtBig(insights?.interactions)}  subtext="Last 30 days" icon={<Heart size={18}/>}     iconBg="bg-fuchsia-100" iconColor="text-fuchsia-600" />
        <StatCard label="Shares"           value={fmtBig(insights?.shares)}        subtext="Last 30 days" icon={<Share2 size={18}/>}    iconBg="bg-orange-100"  iconColor="text-orange-600"  />
      </div>
      </div>


{/* ── Follower Growth ──────────────────────────────────────────────────── */}
      <GrowthChartSection snapshots={snapshots} growthDays={growthDays} snapshotsLoading={snapshotsLoading}
        onDaysChange={handleGrowthDaysChange} activePlatform="Instagram" title="Follower Growth" />

{/* ── Comment Phrase Search ───────────────────────────────────────────── */}
      <CommentSearch />

{/* ── Empty state ────────────────────────────────────────────────────── */}
      {activeFilters.length === 0 && (
        <div className="card text-center py-12">
          <p className="text-slate-400 text-sm mb-3">No content types selected.</p>
          <button onClick={() => setActiveFilters(['photo', 'carousel', 'reel'])}
            className="text-xs font-semibold text-pink-600 border border-pink-200 rounded-lg px-4 py-2 hover:bg-pink-50 transition-all">
            Reset to default
          </button>
        </div>
      )}

      {filteredMedia.length > 0 && (<>

        {/* ── Top posts 2×2 grid ────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Top4Section title="🏆 Top Posts by Views"      posts={filteredMedia} sortKey="reach"      metricLabel="Views"   onPostClick={setSelectedPost} />
          <Top4Section title="❤️ Top Posts by Engagement" posts={filteredMedia} sortKey="engagement" metricLabel="Engaged" onPostClick={setSelectedPost} />
          <Top4Section title="🔗 Top Posts by Shares"     posts={filteredMedia} sortKey="shares"     metricLabel="Shares"  onPostClick={setSelectedPost} />
          <Top4Section title="🔖 Top Posts by Saves"      posts={filteredMedia} sortKey="saved"      metricLabel="Saves"   onPostClick={setSelectedPost} />
        </div>

        {/* ── Reel insights ─────────────────────────────────────────────────── */}
        {hasReels && (
          <div className="card">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">🎬</span>
              <h3 className="font-bold text-slate-900 text-base">Reel Insights — Per Post</h3>
              <span className="text-xs text-slate-400 font-mono">Top {Math.min(10, reelsInView.length)} by views</span>
            </div>
            <p className="text-slate-500 text-sm">Rate metrics in Instagram&apos;s priority order for views impact</p>
            <RateInsightsTable posts={reelsInView} type="reel" onPostClick={setSelectedPost} />
          </div>
        )}

        {/* ── Photo & carousel insights ──────────────────────────────────────── */}
        {hasPhotos && (
          <div className="card">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">📷</span>
              <h3 className="font-bold text-slate-900 text-base">Photo &amp; Carousel Insights — Per Post</h3>
              <span className="text-xs text-slate-400 font-mono">Top {Math.min(10, photosInView.length)} by views</span>
            </div>
            <p className="text-slate-500 text-sm">Engagement rate breakdown per post</p>
            <RateInsightsTable posts={photosInView} type="photo" onPostClick={setSelectedPost} />
          </div>
        )}

      </>)}

      {/* ── Full table ─────────────────────────────────────────────────────── */}
      {filteredMedia.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-base">All Posts</h3>
            <p className="text-slate-500 text-sm">{filteredMedia.length} posts · filtered view · Live from Instagram</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-center px-3 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wide w-8">#</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Post</th>
                  <th
                    className={`text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide cursor-pointer select-none whitespace-nowrap transition-colors ${tableSort.key === 'contentType' ? 'text-pink-600' : 'text-slate-500 hover:text-slate-700'}`}
                    onClick={() => { setTableSort(prev => ({ key: 'contentType', dir: prev.key === 'contentType' && prev.dir === 'desc' ? 'asc' : 'desc' })); setTableLimit(20); }}>
                    Type{tableSort.key === 'contentType' ? (tableSort.dir === 'desc' ? ' ↓' : ' ↑') : ''}
                  </th>
                  {[
                    { label: 'Date',      key: 'timestamp',      left: true  },
                    { label: 'Views',     key: 'reach'                        },
                    { label: 'Likes',     key: 'likeCount'                    },
                    { label: 'Comments',  key: 'commentsCount'                },
                    { label: 'Saves',     key: 'saved'                        },
                    { label: 'Shares',    key: 'shares'                       },
                    { label: 'Eng. Rate', key: 'engagementRate', last: true   },
                  ].map(col => {
                    const active = tableSort.key === col.key;
                    return (
                      <th key={col.key}
                        className={`${col.left ? 'text-left' : 'text-right'} ${col.last ? 'px-6' : 'px-4'} py-3 text-xs font-semibold uppercase tracking-wide cursor-pointer select-none whitespace-nowrap transition-colors ${active ? 'text-pink-600' : 'text-slate-500 hover:text-slate-700'}`}
                        onClick={() => { setTableSort(prev => ({ key: col.key, dir: prev.key === col.key && prev.dir === 'desc' ? 'asc' : 'desc' })); setTableLimit(20); }}>
                        {col.label}{active ? (tableSort.dir === 'desc' ? ' ↓' : ' ↑') : ''}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {visibleMedia.map((m, idx) => {
                  const engColor = m.engagementRate > 5 ? 'text-emerald-600' : m.engagementRate > 2 ? 'text-blue-500' : 'text-slate-400';
                  return (
                    <tr
                      key={m.id}
                      className={`hover:bg-slate-50 transition-colors cursor-pointer ${m.contentType === 'collab' ? 'bg-amber-50/40' : ''}`}
                      onClick={() => setSelectedPost(m)}
                    >
                      <td className="px-3 py-3 text-center text-slate-400 text-xs font-mono font-bold">{idx + 1}</td>
                      <td className="px-6 py-3 max-w-xs">
                        <span className="text-slate-700 text-sm line-clamp-2 hover:text-pink-600 transition-colors block">
                          {truncate(m.caption, 100) || '(No caption)'}
                        </span>
                        {m.contentType === 'collab' && <span className="text-[10px] text-amber-600 font-semibold">🤝 Collab</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{mediaTypeLabel(m.mediaType)}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap font-mono">{fmtDate(m.timestamp)}</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-700 font-semibold">{fmtBig(m.reach)}</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-600">{fmtBig(m.likeCount)}</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-600">{fmtBig(m.commentsCount)}</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-600">{fmtBig(m.saved)}</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-600">{fmtBig(m.shares)}</td>
                      <td className={`px-6 py-3 text-right font-mono font-semibold ${engColor}`}>{m.engagementRate.toFixed(2)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {tableLimit < sortedMedia.length && (
            <div className="px-6 py-4 border-t border-slate-100 text-center">
              <button onClick={() => setTableLimit(prev => prev + 20)}
                className="text-sm font-semibold text-pink-600 border border-pink-200 rounded-lg px-5 py-2 hover:bg-pink-50 transition-all">
                Load 20 more · {sortedMedia.length - tableLimit} remaining
              </button>
            </div>
          )}
        </div>
      )}

      <PostSpotlight
        post={selectedPost}
        onClose={() => setSelectedPost(null)}
        accountName={account?.username || 'lpconnect'}
      />
    </div>
  );
}
