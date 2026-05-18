// ─────────────────────────────────────────────────────────────────────────────
// YouTubeAnalytics component
// Fetches live data from /api/youtube and renders it using the existing
// Lake Pointe dashboard design system (Tailwind + Recharts).
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { TrendingUp, Eye, ThumbsUp, MessageSquare, RefreshCw, AlertCircle } from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtBig(n) {
  if (!n && n !== 0) return '—';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString();
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function truncate(str, max = 42) {
  return str?.length > max ? str.slice(0, max) + '…' : str;
}

// ── Sub-components ────────────────────────────────────────────────────────────
function StatCard({ label, value, subtext, icon, iconBg, iconColor }) {
  return (
    <div className="card card-hover animate-fade-in">
      <div className="flex items-start justify-between">
        <div className={`${iconBg} ${iconColor} w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0`}>
          {icon}
        </div>
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
      <p className="font-semibold text-slate-700 mb-1 max-w-[180px] leading-snug">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }} className="font-mono">
          {p.name}: {fmtBig(p.value)}
        </p>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function YouTubeAnalytics() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/youtube');
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-fetch on mount
  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading && !data) {
    return (
      <div className="card flex items-center justify-center py-20">
        <div className="text-center">
          <RefreshCw size={28} className="animate-spin text-red-500 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Fetching live YouTube data…</p>
        </div>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (error && !data) {
    return (
      <div className="card border-red-100 bg-red-50">
        <div className="flex items-start gap-3">
          <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-700 text-sm">Failed to load YouTube data</p>
            <p className="text-red-500 text-xs mt-1">{error}</p>
            <p className="text-slate-500 text-xs mt-2">
              Make sure <code className="bg-red-100 px-1 rounded">YOUTUBE_API_KEY</code> is set
              in your Vercel environment variables.
            </p>
            <button
              onClick={fetchData}
              className="mt-3 text-xs font-semibold text-red-600 hover:text-red-700 flex items-center gap-1"
            >
              <RefreshCw size={12} /> Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { channel, recentVideos = [], fetchedAt } = data || {};

  // Prepare chart data (most recent 8 videos, oldest→newest left→right)
  const chartVideos = [...recentVideos].reverse().slice(-8);
  const viewsChartData = chartVideos.map(v => ({
    name:  truncate(v.title, 30),
    Views: v.viewCount,
  }));
  const engagementChartData = chartVideos.map(v => ({
    name:     truncate(v.title, 30),
    Likes:    v.likeCount,
    Comments: v.commentCount,
  }));

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Header bar ───────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* YouTube logo mark */}
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <rect width="24" height="24" rx="6" fill="#FF0000"/>
            <path d="M21.5 7.5s-.2-1.2-.8-1.8c-.8-.8-1.7-.8-2.1-.8C16.1 4.7 12 4.7 12 4.7s-4.1 0-6.6.2c-.4 0-1.3 0-2.1.8-.6.6-.8 1.8-.8 1.8S2.3 8.9 2.3 10.3v1.3c0 1.4.2 2.8.2 2.8s.2 1.2.8 1.8c.8.8 1.9.8 2.3.8C6.9 17.3 12 17.3 12 17.3s4.1 0 6.6-.3c.4 0 1.3 0 2.1-.8.6-.6.8-1.8.8-1.8s.2-1.4.2-2.8v-1.3c0-1.4-.2-2.8-.2-2.8zM10.1 13.7V8.3l5.2 2.7-5.2 2.7z" fill="white"/>
          </svg>
          <div>
            <h2 className="font-bold text-slate-900 text-lg leading-tight">YouTube Analytics</h2>
            <p className="text-slate-400 text-xs">
              {channel?.name} · Live data
              {fetchedAt && ` · Updated ${new Date(fetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
            </p>
          </div>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500
                     hover:text-slate-700 border border-slate-200 rounded-lg px-3 py-1.5
                     hover:bg-slate-50 transition-all disabled:opacity-50"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* ── KPI cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Subscribers"
          value={fmtBig(channel?.subscriberCount)}
          subtext="YouTube channel"
          icon={<TrendingUp size={20} />}
          iconBg="bg-red-100"
          iconColor="text-red-600"
        />
        <StatCard
          label="Total Views"
          value={fmtBig(channel?.viewCount)}
          subtext="All-time across all videos"
          icon={<Eye size={20} />}
          iconBg="bg-orange-100"
          iconColor="text-orange-600"
        />
        <StatCard
          label="Videos Published"
          value={channel?.videoCount?.toLocaleString() ?? '—'}
          subtext="Total on channel"
          icon={<MessageSquare size={20} />}
          iconBg="bg-pink-100"
          iconColor="text-pink-600"
        />
        <StatCard
          label="Avg Views / Video"
          value={fmtBig(channel?.avgViewsPerVideo)}
          subtext="All-time average"
          icon={<ThumbsUp size={20} />}
          iconBg="bg-rose-100"
          iconColor="text-rose-600"
        />
      </div>

      {/* ── Charts ────────────────────────────────────────────────────────── */}
      {recentVideos.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">

          {/* Views chart */}
          <div className="card">
            <h3 className="font-bold text-slate-900 text-base mb-1">Recent Video Views</h3>
            <p className="text-slate-500 text-sm mb-4">Latest {chartVideos.length} videos</p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={viewsChartData} layout="vertical" margin={{ left: 8, right: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={fmtBig} />
                <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="Views" radius={[0, 4, 4, 0]}>
                  {viewsChartData.map((_, i) => (
                    <Cell key={i} fill={i === viewsChartData.length - 1 ? '#FF0000' : '#fca5a5'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Engagement chart */}
          <div className="card">
            <h3 className="font-bold text-slate-900 text-base mb-1">Likes &amp; Comments</h3>
            <p className="text-slate-500 text-sm mb-4">Latest {chartVideos.length} videos</p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={engagementChartData} layout="vertical" margin={{ left: 8, right: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={fmtBig} />
                <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="Likes"    fill="#fb923c" radius={[0, 4, 4, 0]} />
                <Bar dataKey="Comments" fill="#a78bfa" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Recent videos table ────────────────────────────────────────────── */}
      {recentVideos.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-base">Recent Videos</h3>
            <p className="text-slate-500 text-sm">Latest {recentVideos.length} uploads · Live from YouTube</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Title</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Published</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Views</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Likes</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Comments</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Eng. Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recentVideos.map((v, i) => {
                  const engColor =
                    v.engagementRate > 5 ? 'text-emerald-600' :
                    v.engagementRate > 2 ? 'text-blue-500' :
                    'text-slate-400';
                  return (
                    <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3">
                        <a
                          href={`https://youtube.com/watch?v=${v.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-800 font-medium hover:text-red-600 transition-colors line-clamp-2 max-w-xs block"
                          title={v.title}
                        >
                          {v.title}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap font-mono">
                        {fmtDate(v.publishedAt)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-700 font-semibold">
                        {v.viewCount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-600">
                        {v.likeCount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-600">
                        {v.commentCount.toLocaleString()}
                      </td>
                      <td className={`px-6 py-3 text-right font-mono font-semibold ${engColor}`}>
                        {v.engagementRate.toFixed(2)}%
                      </td>
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
