import { useState } from 'react';
import { MapPin } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import PlatformIcon from './PlatformIcon';

const COLORS = ['#3B82F6','#8B5CF6','#EC4899','#F59E0B','#10B981','#6366F1','#64748B'];

const PLATFORM_TABS = [
  { id: 'all',       label: 'All' },
  { id: 'facebook',  label: 'Facebook'  },
  { id: 'instagram', label: 'Instagram' },
  { id: 'youtube',   label: 'YouTube'   },
  { id: 'tiktok',    label: 'TikTok'    },
];

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 rounded-xl px-3 py-2 shadow-xl text-xs">
      <div className="text-white font-semibold">{payload[0].name}</div>
      <div className="text-slate-300">{payload[0].value}% of audience</div>
    </div>
  );
};

export default function GeoBreakdown({ geoData, activeTab, title = 'Geographic Reach', hideTabs = false }) {
  const [geoTab, setGeoTab] = useState(activeTab || 'all');
  const [view,   setView]   = useState('cities'); // cities | countries

  const isTikTok = geoTab === 'tiktok';
  const data = isTikTok ? null : (geoData[geoTab] || geoData.all);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MapPin size={18} className="text-blue-500" />
          <h2 className="font-bold text-slate-900 text-lg">{title}</h2>
        </div>
        {/* Cities / Countries toggle */}
        {!isTikTok && (
          <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
            {['cities', 'countries'].map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium capitalize transition-all ${
                  view === v ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        )}
      </div>

      {!hideTabs && (
        <div className="flex gap-1 bg-slate-50 rounded-xl p-1 mb-4 overflow-x-auto">
          {PLATFORM_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setGeoTab(tab.id)}
              className={`flex items-center gap-1.5 flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                geoTab === tab.id
                  ? 'bg-white shadow-sm text-slate-900'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.id !== 'all' && <PlatformIcon platform={tab.id} size={14} />}
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {isTikTok ? (
        <div className="flex flex-col items-center justify-center h-40 text-center">
          <div className="mb-3"><PlatformIcon platform="tiktok" size={36} /></div>
          <div className="text-slate-700 font-semibold">Geographic Data Unavailable</div>
          <div className="text-slate-400 text-sm mt-1 max-w-xs">
            TikTok does not expose audience location through its Business API.
          </div>
        </div>
      ) : view === 'cities' ? (
        <div className="space-y-2">
          {(data?.cities || []).slice(0, 8).map((city, i) => (
            <div key={city.name} className="flex items-center gap-2">
              <div className="text-xs text-slate-400 w-4 text-right flex-shrink-0">{i + 1}</div>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-slate-700 truncate">{city.name}</span>
                  <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                    <span className="text-xs text-slate-400">{city.followers?.toLocaleString()}</span>
                    <span className="text-xs font-bold text-slate-800">{city.value}%</span>
                  </div>
                </div>
                <div className="bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${(city.value / (data?.cities?.[0]?.value || 1)) * 100}%`, background: '#3B82F6' }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={data?.countries} cx="50%" cy="50%" innerRadius={45} outerRadius={72}
                   paddingAngle={2} dataKey="value" nameKey="name">
                {(data?.countries || []).map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2">
            {(data?.countries || []).map((c, i) => (
              <div key={c.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS[i] }} />
                  <span className="text-slate-600">{c.flag} {c.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">{c.followers?.toLocaleString()}</span>
                  <span className="font-semibold text-slate-800">{c.value}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
