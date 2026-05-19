// ─────────────────────────────────────────────────────────────────────────────
// InstagramAnalytics — live data from /api/instagram
// Multi-select content type filters including Collabs
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';
import { Users, Eye, Heart, TrendingUp, RefreshCw, AlertCircle, MapPin, Globe } from 'lucide-react';

const IG_PINK   = '#E1306C';
const IG_PURPLE = '#833AB4';

const CONTENT_FILTERS = [
  { id: 'photo',    label: '📷 Photos',    color: '#3b82f6' },
  { id: 'carousel', label: '🖼️ Carousels', color: '#0ea5e9' },
  { id: 'reel',     label: '🎬 Reels',     color: '#8b5cf6' },
  { id: 'video',    label: '📹 Videos',    color: '#6366f1' },
  { id: 'collab',   label: '🤝 Collabs',   color: '#f59e0b' },
  { id: 'other',    label: '📝 Other',     color: '#64748b' },
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

function mediaTypeLabel(type) {
  if (type === 'IMAGE')          return '📷 Photo';
  if (type === 'VIDEO')          return '📹 Video';
  if (type === 'CAROUSEL_ALBUM') return '🖼️ Carousel';
  if (type === 'REELS')          return '🎬 Reel';
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

export default function InstagramAnalytics() {
  const [data,          setData]          = useState(null);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState(null);
  // Default: photos, carousels, reels, videos on — collabs and other off
  const [activeFilters, setActiveFilters] = useState(['photo', 'carousel', 'reel', 'video']);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/instagram');
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || `HTTP ${res.status}`); }
      setData(await res.json());
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  function toggleFilter(id) {
    setActiveFilters(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
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
          <button onClick={fetchData} className="mt-3 text-xs font-semibold text-red-600 hover:text-red-700 flex items-center gap-1">
            <RefreshCw size={12} /> Try again
          </button>
        </div>
      </div>
    </div>
  );

  const { account, insights, media = [], demographics = [], geo, fetchedAt } = data || {};

  // ── Filtering ─────────────────────────────────────────────────────────────
  const filteredMedia  = media.filter(m => activeFilters.includes(m.contentType));
  const topMedia       = [...filteredMedia].sort((a, b) => b.engagement - a.engagement).slice(0, 8).reverse();
  const mediaChartData = topMedia.map(m => ({
    name:    truncate(m.caption, 32) || mediaTypeLabel(m.mediaType),
    Reach:   m.reach,
    Likes:   m.likeCount,
    Saved:   m.saved,
  }));

  // ── Counts per type ───────────────────────────────────────────────────────
  const counts = { photo: 0, carousel: 0, reel: 0, video: 0, collab: 0, other: 0 };
  media.forEach(m => { if (counts[m.contentType] !== undefined) counts[m.contentType]++; });

  const demoChartData = demographics.map(d => ({ age: d.age, Male: d.M, Female: d.F }));
  const cityData      = (geo?.cities    || []).slice(0, 8);
  const countryData   = (geo?.countries || []).slice(0, 6);

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)' }}>
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
        <button onClick={fetchData} disabled={loading}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition-all disabled:opacity-50">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Followers"        value={fmtBig(account?.followersCount)}  subtext={`Following ${fmtBig(account?.followsCount)}`} icon={<Users size={20}/>}      iconBg="bg-pink-100"   iconColor="text-pink-600"   />
        <StatCard label="Reach (30d)"      value={fmtBig(insights?.reach)}          subtext="Unique accounts reached"                      icon={<Eye size={20}/>}        iconBg="bg-purple-100" iconColor="text-purple-600" />
        <StatCard label="Total Posts"      value={fmtBig(account?.mediaCount)}      subtext={`${filteredMedia.length} in current filter`}  icon={<Heart size={20}/>}      iconBg="bg-rose-100"   iconColor="text-rose-600"   />
        <StatCard label="Impressions (30d)" value={fmtBig(insights?.impressions)}   subtext="Total content impressions"                    icon={<TrendingUp size={20}/>}  iconBg="bg-orange-100" iconColor="text-orange-600" />
      </div>

      {/* ── Content type filter chips ──────────────────────────────────────── */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Content Type Filter</h3>
            <p className="text-slate-400 text-xs mt-0.5">Toggle to include/exclude types. Deselect all to clear the view.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono">{filteredMedia.length} posts in view</span>
            {activeFilters.length === 0 && (
              <button onClick={() => setActiveFilters(['photo', 'carousel', 'reel', 'video'])}
                className="text-xs font-semibold text-pink-600 hover:text-pink-700">Reset</button>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {CONTENT_FILTERS.map(f => {
            const isActive = activeFilters.includes(f.id);
            return (
              <button key={f.id} onClick={() => toggleFilter(f.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                  isActive ? 'text-white border-transparent shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
                style={isActive ? { background: f.color, borderColor: f.color } : {}}>
                {f.label}
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-mono ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  {counts[f.id] ?? 0}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Empty state ────────────────────────────────────────────────────── */}
      {activeFilters.length === 0 && (
        <div className="card text-center py-12">
          <p className="text-slate-400 text-sm mb-3">No content types selected.</p>
          <button onClick={() => setActiveFilters(['photo', 'carousel', 'reel', 'video'])}
            className="text-xs font-semibold text-pink-600 hover:text-pink-700 border border-pink-200 rounded-lg px-4 py-2 hover:bg-pink-50 transition-all">
            Reset to default
          </button>
        </div>
      )}

      {/* ── Charts ────────────────────────────────────────────────────────── */}
      {filteredMedia.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="card">
            <h3 className="font-bold text-slate-900 text-base mb-1">Top Posts — Reach</h3>
            <p className="text-slate-500 text-sm mb-4">Top {topMedia.length} posts by engagement</p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={mediaChartData} layout="vertical" margin={{ left: 8, right: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={fmtBig} />
                <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="Reach" radius={[0, 4, 4, 0]}>
                  {mediaChartData.map((_, i) => (
                    <Cell key={i} fill={i === mediaChartData.length - 1 ? IG_PINK : '#f9a8d4'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="card">
            <h3 className="font-bold text-slate-900 text-base mb-1">Top Posts — Likes &amp; Saves</h3>
            <p className="text-slate-500 text-sm mb-4">Top {topMedia.length} posts</p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={mediaChartData} layout="vertical" margin={{ left: 8, right: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={fmtBig} />
                <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="Likes" fill={IG_PINK}   radius={[0, 4, 4, 0]} />
                <Bar dataKey="Saved" fill={IG_PURPLE} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Demographics ──────────────────────────────────────────────────── */}
      {demoChartData.length > 0 && (
        <div className="card">
          <h3 className="font-bold text-slate-900 text-base mb-1">Audience Age &amp; Gender</h3>
          <p className="text-slate-500 text-sm mb-4">Follower demographics breakdown</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={demoChartData} margin={{ left: 8, right: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="age" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={fmtBig} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="Male"   fill={IG_PURPLE} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Female" fill={IG_PINK}   radius={[4, 4, 0, 0]} />
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
                        <div className="h-full rounded-full" style={{ width: `${c.pct}%`, background: IG_PINK }} />
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
                        <div className="h-full rounded-full" style={{ width: `${c.pct}%`, background: IG_PURPLE }} />
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

      {/* ── Media table ───────────────────────────────────────────────────── */}
      {filteredMedia.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-base">Posts</h3>
            <p className="text-slate-500 text-sm">{filteredMedia.length} posts · filtered view · Live from Instagram</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Post</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Reach</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Likes</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Comments</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Saved</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Eng. Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredMedia.map(m => {
                  const engColor = m.engagementRate > 5 ? 'text-emerald-600' : m.engagementRate > 2 ? 'text-blue-500' : 'text-slate-400';
                  const isCollab = m.contentType === 'collab';
                  return (
                    <tr key={m.id} className={`hover:bg-slate-50 transition-colors ${isCollab ? 'bg-amber-50/40' : ''}`}>
                      <td className="px-6 py-3 max-w-xs">
                        <a href={m.permalink} target="_blank" rel="noopener noreferrer"
                          className="text-slate-700 text-sm line-clamp-2 hover:text-pink-600 transition-colors block">
                          {truncate(m.caption, 100) || '(No caption)'}
                        </a>
                        {isCollab && <span className="text-[10px] text-amber-600 font-semibold">🤝 Collab</span>}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{mediaTypeLabel(m.mediaType)}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap font-mono">{fmtDate(m.timestamp)}</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-700 font-semibold">{fmtBig(m.reach)}</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-600">{fmtBig(m.likeCount)}</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-600">{fmtBig(m.commentsCount)}</td>
                      <td className="px-4 py-3 text-right font-mono text-slate-600">{fmtBig(m.saved)}</td>
                      <td className={`px-6 py-3 text-right font-mono font-semibold ${engColor}`}>{m.engagementRate.toFixed(2)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
