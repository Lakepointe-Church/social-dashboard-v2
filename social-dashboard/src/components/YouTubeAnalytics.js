// ─────────────────────────────────────────────────────────────────────────────
// YouTubeAnalytics — with content type filter tabs + pagination
// Tabs: All · Podcast · Sermons · Shorts
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { TrendingUp, Eye, ThumbsUp, MessageSquare, RefreshCw, AlertCircle, ChevronDown } from 'lucide-react';

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
const TABS = [
  { id: 'all',     label: 'All',      emoji: '📊' },
  { id: 'podcast', label: 'Podcast',  emoji: '🎙️'  },
  { id: 'sermon',  label: 'Sermons',  emoji: '⛪'  },
  { id: 'short',   label: 'Shorts',   emoji: '🎬'  },
];

const TAB_COLORS = {
  all:     '#FF0000',
  podcast: '#6366f1',
  sermon:  '#0ea5e9',
  short:   '#f59e0b',
};

const TAB_DESCRIPTIONS = {
  all:     'All uploaded videos',
  podcast: 'Live Free with Josh Howerton episodes',
  sermon:  'Full sermons & worship experiences',
  short:   'YouTube Shorts (under 3 min)',
};

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

function ContentTypeCharts({ videos, color }) {
  if (!videos.length) return (
    <div className="card text-center py-12 text-slate-400 text-sm">No videos in this category yet.</div>
  );

  // Show up to 10 most recent for charts
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
                <Cell key={i} fill={i === viewsData.length - 1 ? color : color + '66'} />
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

function VideoTable({ videos }) {
  if (!videos.length) return null;
  return (
    <div className="card p-0 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Title</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Published</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Duration</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Views</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Likes</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Comments</th>
              <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Eng. Rate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {videos.map(v => {
              const engColor =
                v.engagementRate > 5 ? 'text-emerald-600' :
                v.engagementRate > 2 ? 'text-blue-500' : 'text-slate-400';
              return (
                <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3 max-w-xs">
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
  const [activeTab,     setActiveTab]      = useState('podcast'); // default to podcast

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

  // ── Load next page ─────────────────────────────────────────────────────────
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

  // ── Filter videos by active tab ────────────────────────────────────────────
  const filteredVideos = activeTab === 'all'
    ? allVideos
    : allVideos.filter(v => v.contentType === activeTab);

  // ── Per-tab KPIs ───────────────────────────────────────────────────────────
  const tabColor = TAB_COLORS[activeTab];
  const totalViews      = filteredVideos.reduce((s, v) => s + v.viewCount, 0);
  const avgViews        = Math.round(avg(filteredVideos, 'viewCount'));
  const avgEngRate      = filteredVideos.length
    ? (filteredVideos.reduce((s, v) => s + v.engagementRate, 0) / filteredVideos.length).toFixed(2)
    : '0.00';
  const topVideo        = filteredVideos.reduce((best, v) => (!best || v.viewCount > best.viewCount) ? v : best, null);

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
      <div className="flex items-center justify-between">
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

      {/* ── Channel-wide KPI cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Subscribers"      value={fmtBig(channel?.subscriberCount)} subtext="YouTube channel"           icon={<TrendingUp size={20}/>}   iconBg="bg-red-100"    iconColor="text-red-600"    />
        <StatCard label="Total Views"      value={fmtBig(channel?.viewCount)}       subtext="All-time across all videos" icon={<Eye size={20}/>}          iconBg="bg-orange-100" iconColor="text-orange-600" />
        <StatCard label="Videos Published" value={channel?.videoCount?.toLocaleString() ?? '—'} subtext="Total on channel" icon={<MessageSquare size={20}/>} iconBg="bg-pink-100"   iconColor="text-pink-600"   />
        <StatCard label="Avg Views / Video" value={fmtBig(channel?.avgViewsPerVideo)} subtext="All-time average"         icon={<ThumbsUp size={20}/>}     iconBg="bg-rose-100"   iconColor="text-rose-600"   />
      </div>

      {/* ── Content type filter tabs ───────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-1.5 flex gap-1 overflow-x-auto">
        {TABS.map(tab => {
          const count = tab.id === 'all' ? allVideos.length : allVideos.filter(v => v.contentType === tab.id).length;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span>{tab.emoji}</span>
              <span>{tab.label}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-mono ${
                isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Per-tab description + KPIs ─────────────────────────────────────── */}
      {filteredVideos.length > 0 && (
        <>
          <div className="flex items-center gap-2">
            <div className="w-1 h-6 rounded-full" style={{ background: tabColor }} />
            <p className="text-slate-500 text-sm">{TAB_DESCRIPTIONS[activeTab]} · {filteredVideos.length} videos</p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card">
              <div className="text-slate-500 text-xs font-medium mb-1">Videos in View</div>
              <div className="text-2xl font-bold tabular-nums" style={{ color: tabColor }}>{filteredVideos.length}</div>
              <div className="text-slate-400 text-xs mt-1">of {allVideos.length} loaded</div>
            </div>
            <div className="card">
              <div className="text-slate-500 text-xs font-medium mb-1">Total Views</div>
              <div className="text-2xl font-bold tabular-nums" style={{ color: tabColor }}>{fmtBig(totalViews)}</div>
              <div className="text-slate-400 text-xs mt-1">across this category</div>
            </div>
            <div className="card">
              <div className="text-slate-500 text-xs font-medium mb-1">Avg Views / Video</div>
              <div className="text-2xl font-bold tabular-nums" style={{ color: tabColor }}>{fmtBig(avgViews)}</div>
              <div className="text-slate-400 text-xs mt-1">this category</div>
            </div>
            <div className="card">
              <div className="text-slate-500 text-xs font-medium mb-1">Avg Eng. Rate</div>
              <div className="text-2xl font-bold tabular-nums" style={{ color: tabColor }}>{avgEngRate}%</div>
              <div className="text-slate-400 text-xs mt-1">likes + comments / views</div>
            </div>
          </div>

          {/* Top video callout */}
          {topVideo && (
            <div className="card border-l-4" style={{ borderLeftColor: tabColor }}>
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
          <ContentTypeCharts videos={filteredVideos} color={tabColor} />

          {/* Table header */}
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-base">
              {TABS.find(t => t.id === activeTab)?.emoji} {TABS.find(t => t.id === activeTab)?.label} Catalogue
            </h3>
            <span className="text-xs text-slate-400 font-mono">{filteredVideos.length} videos · sorted newest first</span>
          </div>

          <VideoTable videos={filteredVideos} />
        </>
      )}

      {/* ── Load More ─────────────────────────────────────────────────────── */}
      {nextPageToken && (
        <div className="flex flex-col items-center gap-2 pt-2">
          <p className="text-xs text-slate-400">
            {allVideos.length} videos loaded · more available
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
