export default function ContentTypeChart({ data }) {
  const maxReach = Math.max(...data.map(d => d.avgReach));

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
      {data.map(d => (
        <div key={d.type} className="bg-slate-50 hover:bg-slate-100 rounded-xl p-3
                                     transition-colors duration-150 text-center group">
          <div className="text-2xl mb-2">{d.icon}</div>
          <div className="text-xs font-semibold text-slate-700 mb-3 leading-tight min-h-[32px] flex items-center justify-center">
            {d.type}
          </div>

          {/* Reach bar */}
          <div className="bg-slate-200 rounded-full h-1.5 mb-2 overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full"
              style={{ width: `${(d.avgReach / maxReach) * 100}%` }}
            />
          </div>

          <div className="text-xs text-slate-500">
            <span className="font-bold text-slate-800">
              {(d.avgReach / 1000).toFixed(0)}K
            </span>{' '}reach
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            <span className="font-bold text-emerald-600">{d.avgEngagement}%</span>{' '}eng.
          </div>
          <div className="text-xs text-slate-400 mt-1">{d.posts} posts</div>
        </div>
      ))}
    </div>
  );
}
