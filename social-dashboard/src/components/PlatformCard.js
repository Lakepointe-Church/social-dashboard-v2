import { TrendingUp, Users, Eye, Heart, ExternalLink } from 'lucide-react';

function fmt(n) { return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n; }
function fmtFull(n) { return n?.toLocaleString() ?? '—'; }

export default function PlatformCard({ platform: p, compact, onClick }) {
  const growthPos = p.growthPct > 0;

  if (compact) {
    return (
      <button
        onClick={onClick}
        className="card card-hover text-left w-full animate-fade-in group"
        style={{ borderTop: `3px solid ${p.color}` }}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-xl">{p.emoji}</span>
          <span className={`text-xs font-bold ${growthPos ? 'text-emerald-600' : 'text-red-500'}`}>
            {growthPos ? '+' : ''}{p.growthPct}%
          </span>
        </div>
        <div className="text-slate-500 text-xs font-medium mb-1">{p.name}</div>
        <div className="text-xl font-bold text-slate-900 tabular-nums">{fmt(p.followers)}</div>
        <div className="text-slate-400 text-xs mt-1">followers</div>

        {/* Mini stats */}
        <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
          <div>
            <div className="text-slate-400 text-xs">Reach</div>
            <div className="text-slate-700 text-xs font-semibold">{fmt(p.reach)}</div>
          </div>
          <div>
            <div className="text-slate-400 text-xs">Eng. Rate</div>
            <div className="text-slate-700 text-xs font-semibold">{p.engagementRate}%</div>
          </div>
        </div>

        {p.status === 'Manual (CSV)' && (
          <div className="mt-2 text-xs text-amber-600 font-medium bg-amber-50 rounded-lg px-2 py-1">
            CSV Import
          </div>
        )}
      </button>
    );
  }

  // Expanded card (single platform view)
  return (
    <div
      className="card card-hover animate-fade-in"
      style={{ borderLeft: `4px solid ${p.color}` }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{p.emoji}</span>
          <div>
            <div className="font-bold text-slate-900 text-lg">{p.name}</div>
            <div className={`text-xs font-semibold px-2 py-0.5 rounded-full inline-block ${
              p.status === 'Connected'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-amber-100 text-amber-700'
            }`}>
              {p.status}
            </div>
          </div>
        </div>
        <div className={`text-sm font-bold px-3 py-1.5 rounded-xl ${
          growthPos ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
        }`}>
          {growthPos ? '▲' : '▼'} {Math.abs(p.growthPct)}%
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-50 rounded-xl p-3">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
            <Users size={12} /> Followers
          </div>
          <div className="text-xl font-bold text-slate-900 tabular-nums">{fmtFull(p.followers)}</div>
          <div className="text-xs text-emerald-600 font-medium">+{fmtFull(p.growth)}</div>
        </div>

        <div className="bg-slate-50 rounded-xl p-3">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
            <Eye size={12} /> Reach
          </div>
          <div className="text-xl font-bold text-slate-900 tabular-nums">{fmt(p.reach)}</div>
          <div className="text-xs text-slate-400">this period</div>
        </div>

        <div className="bg-slate-50 rounded-xl p-3">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
            <Heart size={12} /> Engagement
          </div>
          <div className="text-xl font-bold text-slate-900 tabular-nums">{fmtFull(p.engagement)}</div>
          <div className="text-xs text-emerald-600 font-medium">{p.engagementRate}% rate</div>
        </div>

        <div className="bg-slate-50 rounded-xl p-3">
          <div className="text-slate-400 text-xs mb-1">Posts</div>
          <div className="text-xl font-bold text-slate-900">{p.posts}</div>
          <div className="text-xs text-slate-400">published</div>
        </div>
      </div>

      {/* Per-post averages */}
      <div className="mt-4 flex gap-4 text-sm">
        <div className="flex items-center gap-1.5 text-slate-500">
          <span>👍</span>
          <span className="font-semibold text-slate-700">{fmtFull(p.avgLikes)}</span>
          <span>avg likes</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-500">
          <span>💬</span>
          <span className="font-semibold text-slate-700">{fmtFull(p.avgComments)}</span>
          <span>avg comments</span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-500">
          <span>🔁</span>
          <span className="font-semibold text-slate-700">{fmtFull(p.avgShares)}</span>
          <span>avg shares</span>
        </div>
      </div>

      {p.geoNote && (
        <div className="mt-3 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
          ⚠️ {p.geoNote}
        </div>
      )}

      {p.watchTimeHours && (
        <div className="mt-3 flex gap-4 text-sm text-slate-500">
          <span>🕐 {fmtFull(p.watchTimeHours)} hrs watch time</span>
          <span>📊 {p.avgViewDuration} avg duration</span>
        </div>
      )}
    </div>
  );
}
