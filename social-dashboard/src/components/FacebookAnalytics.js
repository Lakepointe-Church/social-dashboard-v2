// ─────────────────────────────────────────────────────────────────────────────
// FacebookAnalytics — live data from /api/facebook
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { Users, Eye, Heart, TrendingUp, RefreshCw, AlertCircle, MapPin, Globe } from 'lucide-react';

const FB_BLUE = '#1877F2';

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

function StatCard({ label, value, subtext, icon, iconBg, iconColor }) {
  return (
    <div className="card card-hover">
      <div className={`${iconBg} ${iconColor} w-10 h-10 rounded-xl flex items-center justify-center`}>
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
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

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

  // Chart data — top 8 posts by reach
  const topPosts = [...posts].sort((a, b) => b.engaged - a.engaged).slice(0, 8).reverse();
  const postsChartData = topPosts.map(p => ({ name: truncate(p.message, 30) || 'Post', Likes: p.likeCount || 0, Comments: p.commentCount || 0 }));

  // Demographics chart
  const demoChartData = demographics.map(d => ({ age: d.age, Male: d.M, Female: d.F }));

  // Geo chart
  const cityData    = (geo?.cities    || []).slice(0, 8);
  const countryData = (geo?.countries || []).slice(0, 6);

  const engRate = page?.followersCount > 0
    ? ((insights?.engagedUsers || 0) / page.followersCount * 100).toFixed(2)
    : '0.00';

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
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

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Page Followers"   value={fmtBig(page?.followersCount)} subtext="Facebook Page"          icon={<Users size={20}/>}     iconBg="bg-blue-100"   iconColor="text-blue-600"   />
        <StatCard label="Reach (30d)"      value={fmtBig(insights?.reach)}      subtext="Unique accounts reached" icon={<Eye size={20}/>}       iconBg="bg-indigo-100" iconColor="text-indigo-600" />
        <StatCard label="Engaged (30d)"    value={fmtBig(insights?.engagedUsers)} subtext={`${engRate}% eng. rate`} icon={<Heart size={20}/>}   iconBg="bg-pink-100"   iconColor="text-pink-600"   />
        <StatCard label="Video Views (30d)" value={fmtBig(insights?.videoViews)} subtext="All video content"      icon={<TrendingUp size={20}/>} iconBg="bg-purple-100" iconColor="text-purple-600" />
      </div>

      {/* Post performance charts */}
      {posts.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="card">
            <h3 className="font-bold text-slate-900 text-base mb-1">Top Posts — Likes</h3>
            <p className="text-slate-500 text-sm mb-4">Top {topPosts.length} posts by engagement</p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={postsChartData} layout="vertical" margin={{ left: 8, right: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={fmtBig} />
                <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="Likes" radius={[0, 4, 4, 0]}>
                  {postsChartData.map((_, i) => (
                    <Cell key={i} fill={i === postsChartData.length - 1 ? FB_BLUE : '#93c5fd'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="card">
            <h3 className="font-bold text-slate-900 text-base mb-1">Top Posts — Comments</h3>
            <p className="text-slate-500 text-sm mb-4">Top {topPosts.length} posts</p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={postsChartData} layout="vertical" margin={{ left: 8, right: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={fmtBig} />
                <YAxis type="category" dataKey="name" width={160} tick={{ fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="Comments" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Demographics */}
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
              <Bar dataKey="Male"   fill={FB_BLUE}  radius={[4, 4, 0, 0]} />
              <Bar dataKey="Female" fill="#f472b6"  radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Geographic */}
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

      {/* Posts table */}
      {posts.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-base">Recent Posts</h3>
            <p className="text-slate-500 text-sm">Latest {posts.length} posts · Live from Facebook</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Post</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Likes</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Comments</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Shares</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Eng.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {posts.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3 max-w-xs">
                      <p className="text-slate-700 text-sm line-clamp-2">{truncate(p.message, 100) || '(No caption)'}</p>
                      <span className="text-xs text-slate-400 capitalize">{p.type}</span>
                    </td>
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
        </div>
      )}
    </div>
  );
}
