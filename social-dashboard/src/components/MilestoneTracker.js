import { Target } from 'lucide-react';
import PlatformIcon from './PlatformIcon';

export default function MilestoneTracker({ milestones }) {
  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <Target size={18} className="text-amber-500" />
        <h2 className="font-bold text-slate-900 text-lg">Upcoming Milestones</h2>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {milestones.map(m => {
          const pct = Math.min(100, (m.current / m.target) * 100);
          const remaining = (m.target - m.current).toLocaleString();
          return (
            <div key={m.platform} className="bg-slate-50 rounded-2xl p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <PlatformIcon platform={m.platform} size={28} />
                <span className="text-xs font-bold text-amber-600 bg-amber-100 px-2 py-1 rounded-full">
                  ~{m.daysAway}d away
                </span>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-0.5">{m.label}</div>
                <div className="text-lg font-bold text-slate-900 tabular-nums">
                  {m.current.toLocaleString()}
                  <span className="text-sm text-slate-400 font-normal"> / {m.target.toLocaleString()}</span>
                </div>
                <div className="text-xs text-slate-500 mt-0.5">{remaining} to go</div>
              </div>
              {/* Progress bar */}
              <div className="bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, background: m.color }}
                />
              </div>
              <div className="text-xs font-semibold text-right" style={{ color: m.color }}>
                {pct.toFixed(1)}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
