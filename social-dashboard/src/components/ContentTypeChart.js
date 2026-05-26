export default function ContentTypeChart({ data, barKey = 'avgReach', barLabel = 'reach' }) {
  const maxReach = Math.max(...data.map(d => d[barKey] || 0), 1);

  return (
    <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
      {data.map(d => (
        <div key={d.type} className="bg-slate-50 hover:bg-slate-100 rounded-xl p-2
                                     transition-colors duration-150 text-center group">
          <div className="text-xl mb-1">{d.icon}</div>
          <div className="text-[10px] font-semibold text-slate-700 mb-2 leading-tight min-h-[28px] flex items-center justify-center">
            {d.type}
          </div>

          {/* Bar */}
          <div className="bg-slate-200 rounded-full h-1.5 mb-2 overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full"
              style={{ width: `${((d[barKey] || 0) / maxReach) * 100}%` }}
            />
          </div>

          <div className="text-[10px] text-slate-500">
            <span className="font-bold text-slate-800">
              {barKey === 'avgReach'
                ? (d.avgReach >= 1000 ? `${(d.avgReach / 1000).toFixed(0)}K` : d.avgReach.toLocaleString())
                : (d[barKey] || 0).toLocaleString()}
            </span>{' '}{barLabel}
          </div>
          {barKey === 'avgReach' && (
            <div className="text-[10px] text-slate-500 mt-0.5">
              <span className="font-bold text-emerald-600">{d.avgEngagement}%</span>{' '}eng.
            </div>
          )}
          <div className="text-[10px] text-slate-400 mt-1">{d.posts} posts</div>
        </div>
      ))}
    </div>
  );
}
