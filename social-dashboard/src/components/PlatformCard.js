import { TrendingUp, Users, Eye, Heart } from 'lucide-react';
import PlatformIcon from './PlatformIcon';

function fmt(n)     { return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n); }
function fmtFull(n) { return n?.toLocaleString() ?? '—'; }

export default function PlatformCard({ platform: p, compact, onClick }) {
  const growthPos = p.growthPct > 0;

  if (compact) {
    return (
      <button onClick={onClick} className="card card-hover text-left w-full animate-fade-in"
        style={{ borderTop: `3px solid ${p.color}` }}>
        <div className="flex items-center justify-between mb-3">
          <PlatformIcon platform={p.id} size={28} />
          <span className={`text-xs font-bold ${growthPos ? 'text-emerald-600' : 'text-red-500'}`}>
            {growthPos ? '+' : ''}{p.growthPct}%
          </span>
        </div>
        <div className="text-slate-500 text-xs font-medium mb-1">{p.name}</div>
        <div className="text-xl font-bold text-slate-900 tabular-nums">{fmt(p.followers)}</div>
        <div className="text-slate-400 text-xs mt-0.5">followers</div>
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
          <div className="mt-2 text-xs text-amber-600 font-medium bg-amber-50 rounded-lg px-2 py-1">CSV Import</div>
        )}
      </button>
    );
  }

  return (
    <div className="card card-hover animate-fade-in" style={{ borderLeft: `4px solid ${p.color}` }}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <PlatformIcon platform={p.id} size={36} />
          <div>
            <div className="font-bold text-slate-900 text-lg">{p.name}</div>
            <div className={`text-xs font-semibold px-2 py-0.5 rounded-full inline-block ${
              p.status === 'Connected' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            }`}>{p.status}</div>
          </div>
        </div>
        <div className={`text-sm font-bold px-3 py-1.5 rounded-xl ${
          growthPos ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
        }`}>
          {growthPos ? '▲' : '▼'} {Math.abs(p.growthPct)}%
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { icon: <Users size={12}/>, label:'Followers', value: fmtFull(p.followers), sub: `+${fmtFull(p.growth)}`, subColor:'text-emerald-600' },
          { icon: <Eye size={12}/>,   label:'Reach',     value: fmt(p.reach),          sub:'this period',            subColor:'text-slate-400'   },
          { icon: <Heart size={12}/>, label:'Engagement',value: fmtFull(p.engagement), sub:`${p.engagementRate}% rate`, subColor:'text-emerald-600' },
          {                           label:'Posts',     value: p.posts,               sub:'published',              subColor:'text-slate-400'   },
        ].map((stat, i) => (
          <div key={i} className="bg-slate-50 rounded-xl p-3">
            {stat.icon && (
              <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
                {stat.icon} {stat.label}
              </div>
            )}
            {!stat.icon && <div className="text-slate-400 text-xs mb-1">{stat.label}</div>}
            <div className="text-xl font-bold text-slate-900 tabular-nums">{stat.value}</div>
            <div className={`text-xs font-medium ${stat.subColor}`}>{stat.sub}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex gap-4 text-sm">
        <span className="flex items-center gap-1.5 text-slate-500">👍 <span className="font-semibold text-slate-700">{fmtFull(p.avgLikes)}</span> avg likes</span>
        <span className="flex items-center gap-1.5 text-slate-500">💬 <span className="font-semibold text-slate-700">{fmtFull(p.avgComments)}</span> avg comments</span>
        <span className="flex items-center gap-1.5 text-slate-500">🔁 <span className="font-semibold text-slate-700">{fmtFull(p.avgShares)}</span> avg shares</span>
      </div>

      {p.geoNote && (
        <div className="mt-3 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">⚠️ {p.geoNote}</div>
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
