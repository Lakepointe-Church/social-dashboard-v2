import { useState } from 'react';
import { Users } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import PlatformIcon from './PlatformIcon';

const PLATFORM_TABS = [
  { id: 'all',       label: 'All Platforms' },
  { id: 'facebook',  label: 'Facebook'  },
  { id: 'instagram', label: 'Instagram' },
  { id: 'youtube',   label: 'YouTube'   },
  { id: 'tiktok',    label: 'TikTok'    },
];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 rounded-xl px-4 py-3 shadow-xl text-xs">
      <div className="text-slate-300 font-medium mb-2">Age {label}</div>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full" style={{ background: p.fill }} />
          <span className="text-slate-300">{p.name}:</span>
          <span className="text-white font-semibold">{p.value}%</span>
        </div>
      ))}
      <div className="text-slate-400 mt-1 pt-1 border-t border-slate-700">
        Total: {(payload.reduce((s, p) => s + (p.value || 0), 0)).toFixed(1)}%
      </div>
    </div>
  );
};

export default function AgeBreakdown({ ageData }) {
  const [platform, setPlatform] = useState('all');
  const data = ageData[platform] || ageData.all;

  // Calculate totals for insight chips
  const maleTotal   = data.reduce((s, d) => s + d.male, 0).toFixed(1);
  const femaleTotal = data.reduce((s, d) => s + d.female, 0).toFixed(1);
  const peak = data.reduce((best, d) => (d.male + d.female > best.male + best.female ? d : best), data[0]);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users size={18} className="text-violet-500" />
          <h2 className="font-bold text-slate-900 text-lg">Audience Age & Gender</h2>
        </div>
      </div>

      {/* Platform tabs */}
      <div className="flex gap-1 bg-slate-50 rounded-xl p-1 mb-4 overflow-x-auto">
        {PLATFORM_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setPlatform(tab.id)}
            className={`flex items-center gap-1.5 flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              platform === tab.id
                ? 'bg-white shadow-sm text-slate-900'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.id !== 'all' && <PlatformIcon platform={tab.id} size={14} />}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Insight chips */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="badge bg-blue-100 text-blue-700">♂ Male {maleTotal}%</div>
        <div className="badge bg-pink-100 text-pink-700">♀ Female {femaleTotal}%</div>
        <div className="badge bg-violet-100 text-violet-700">Peak: Ages {peak?.age}</div>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
          <XAxis dataKey="age" tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis
            tickFormatter={v => `${v}%`}
            tick={{ fill: '#94A3B8', fontSize: 10 }}
            axisLine={false} tickLine={false} width={36}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
          <Bar dataKey="male"   name="Male"   fill="#3B82F6" radius={[4,4,0,0]} maxBarSize={40} />
          <Bar dataKey="female" name="Female" fill="#EC4899" radius={[4,4,0,0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
