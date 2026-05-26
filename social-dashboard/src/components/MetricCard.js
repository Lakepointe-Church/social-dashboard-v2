import { TrendingUp, TrendingDown } from 'lucide-react';

export default function MetricCard({
  label, value, change, changePositive, subtext, icon, iconBg, iconColor,
}) {
  return (
    <div className="card card-hover animate-fade-in">
      <div className="flex items-start justify-between">
        <div className={`${iconBg} ${iconColor} w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0`}>
          {icon}
        </div>
        {change && (
          <span className={`badge ${changePositive ? 'badge-green' : 'badge-red'} text-xs`}>
            {changePositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {change}
          </span>
        )}
      </div>
      <div className="mt-3">
        <div className="text-2xl font-bold text-slate-900 tabular-nums">{value}</div>
        <div className="text-slate-500 text-sm font-medium mt-0.5">{label}</div>
        {subtext && (
          <div className="text-slate-400 text-xs mt-1">{subtext}</div>
        )}
      </div>
    </div>
  );
}
