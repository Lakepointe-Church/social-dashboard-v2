import { TrendingUp, RefreshCw } from 'lucide-react';
import FollowerGrowthChart from './FollowerGrowthChart';

function fmtIsoDate(iso) {
  const [y, m, d] = (iso || '').split('-');
  return m && d ? `${m}-${d}-${y}` : iso;
}

const DAY_OPTIONS = [
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
  { label: 'All', days: 0 },
];

export default function GrowthChartSection({
  snapshots,
  growthDays,
  snapshotsLoading,
  onDaysChange,
  activePlatform = null,
  title = 'Follower Growth Over Time',
}) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp size={18} className="text-emerald-500" />
          <h2 className="font-bold text-slate-900 text-lg">{title}</h2>
        </div>
        <div className="flex items-center gap-1">
          {DAY_OPTIONS.map(({ label, days }) => (
            <button
              key={label}
              onClick={() => onDaysChange(days)}
              className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-all ${
                growthDays === days
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {snapshotsLoading ? (
        <div className="h-[280px] flex items-center justify-center">
          <RefreshCw size={20} className="animate-spin text-slate-300" />
        </div>
      ) : snapshots.length === 0 ? (
        <div className="h-[280px] flex flex-col items-center justify-center gap-2 text-center">
          <TrendingUp size={28} className="text-slate-200" />
          <p className="text-slate-500 text-sm font-medium">No snapshots yet</p>
          <p className="text-slate-400 text-xs max-w-xs">
            The first snapshot runs tonight at 6 AM UTC. Check back tomorrow — the chart builds one data point per day.
          </p>
        </div>
      ) : (
        <>
          <FollowerGrowthChart data={snapshots} activePlatform={activePlatform} />
          <p className="text-xs text-slate-400 text-center mt-2">
            {snapshots.length} {snapshots.length === 1 ? 'snapshot' : 'snapshots'}
            {' · '}tracking since {fmtIsoDate(snapshots[0]?.date)}
            {' · '}updates daily
            {snapshots.length < 7 && ' · chart fills in over time'}
          </p>
        </>
      )}
    </div>
  );
}
