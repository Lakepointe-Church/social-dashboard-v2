import { MapPin } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const COLORS = ['#3B82F6','#8B5CF6','#EC4899','#F59E0B','#10B981','#6366F1','#64748B'];

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 rounded-xl px-3 py-2 shadow-xl text-xs">
      <div className="text-white font-semibold">{payload[0].name}</div>
      <div className="text-slate-300">{payload[0].value}% of audience</div>
    </div>
  );
};

export default function GeoBreakdown({ geoData, activeTab }) {
  const isTikTok = activeTab === 'TikTok';

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <MapPin size={18} className="text-blue-500" />
        <h2 className="font-bold text-slate-900 text-lg">Geographic Reach</h2>
      </div>

      {isTikTok ? (
        <div className="flex flex-col items-center justify-center h-48 text-center">
          <div className="text-4xl mb-3">🎵</div>
          <div className="text-slate-700 font-semibold">TikTok Geographic Data Unavailable</div>
          <div className="text-slate-400 text-sm mt-2 max-w-xs">
            TikTok does not expose audience location through its Business API.
            This is a platform limitation, not a configuration issue.
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Donut chart — countries */}
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
              By Country
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={geoData.countries}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                >
                  {geoData.countries.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 mt-2">
              {geoData.countries.slice(0, 4).map((c, i) => (
                <div key={c.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i] }} />
                    <span className="text-slate-600">{c.flag} {c.name}</span>
                  </div>
                  <span className="font-semibold text-slate-800">{c.value}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top cities */}
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Top Cities
            </div>
            <div className="space-y-2">
              {geoData.cities.slice(0, 7).map((city, i) => (
                <div key={city.name} className="flex items-center gap-2">
                  <div className="text-xs text-slate-400 w-4 text-right">{i + 1}</div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="text-xs text-slate-700 truncate">{city.name}</span>
                      <span className="text-xs font-bold text-slate-800 ml-2 flex-shrink-0">{city.value}%</span>
                    </div>
                    <div className="bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-500"
                        style={{ width: `${city.value * 3}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
