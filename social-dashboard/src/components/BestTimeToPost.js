import { Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useState } from 'react';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 rounded-xl px-3 py-2 shadow-xl text-xs">
      <div className="text-slate-300 font-medium">{label}</div>
      <div className="text-white font-bold">{payload[0]?.value?.toLocaleString()} avg eng.</div>
    </div>
  );
};

export default function BestTimeToPost({ data }) {
  const [view, setView] = useState('day'); // day | hour
  const chartData = view === 'day' ? data.byDay : data.byHour;
  const xKey      = view === 'day' ? 'day' : 'hour';
  const max       = Math.max(...chartData.map(d => d.engagement));

  const bestDay  = data.byDay.reduce((b, d) => d.engagement > b.engagement ? d : b);
  const bestHour = data.byHour.reduce((b, d) => d.engagement > b.engagement ? d : b);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock size={18} className="text-green-500" />
          <h2 className="font-bold text-slate-900 text-lg">Best Time to Post</h2>
        </div>
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
          {[['day', 'By Day'], ['hour', 'By Hour']].map(([v, label]) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                view === v ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Insight chips */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="badge badge-green">🏆 Best day: {bestDay.day}</div>
        <div className="badge badge-green">🕗 Best hour: {bestHour.hour}</div>
        <div className="badge badge-blue">Sunday is 3.1× better than avg</div>
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
          <XAxis dataKey={xKey} tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false}
                 interval={view === 'hour' ? 3 : 0} />
          <YAxis hide />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="engagement" radius={[4, 4, 0, 0]} maxBarSize={view === 'day' ? 48 : 20}>
            {chartData.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.engagement === max ? '#10B981' : '#CBD5E1'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
