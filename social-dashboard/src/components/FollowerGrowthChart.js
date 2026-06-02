import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts';

const PLATFORM_COLORS = {
  Facebook:  '#1877F2',
  Instagram: '#E1306C',
  YouTube:   '#FF0000',
};

const ALL_KEYS = ['Facebook', 'Instagram', 'YouTube'];

function fmt(v) {
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000)    return `${(v / 1000).toFixed(0)}K`;
  return v;
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border-0 rounded-xl px-4 py-3 shadow-xl">
      <p className="text-slate-300 text-xs font-medium mb-2">{label}</p>
      {payload.map(entry => (
        <div key={entry.dataKey} className="flex items-center gap-2 text-xs mb-1">
          <div className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-slate-300">{entry.dataKey}:</span>
          <span className="text-white font-semibold">{entry.value?.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
};

export default function FollowerGrowthChart({ data, activePlatform }) {
  // Only render lines for platforms that have at least one real data point
  const keysWithData = ALL_KEYS.filter(k => data.some(d => d[k] != null && d[k] > 0));
  const keys = activePlatform ? [activePlatform] : keysWithData;

  // Thin out data points for readability
  const step   = Math.max(1, Math.floor(data.length / 30));
  const thinned = data.filter((_, i) => i % step === 0 || i === data.length - 1);

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={thinned} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: '#94A3B8', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
          tickFormatter={v => { const [,m,d] = (v||'').split('-'); return m && d ? `${m}-${d}` : v; }}
        />
        <YAxis
          tickFormatter={fmt}
          tick={{ fill: '#94A3B8', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={45}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
        />
        {keys.map(key => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={PLATFORM_COLORS[key]}
            strokeWidth={activePlatform ? 3 : 2}
            dot={false}
            activeDot={{ r: 5, strokeWidth: 0 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
