// ─────────────────────────────────────────────────────────────────────────────
// DynamicViz — renders AI-generated charts and tables
// Receives a visualization object from the AI API response
// ─────────────────────────────────────────────────────────────────────────────
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';

const FALLBACK_COLORS = [
  '#3B82F6','#EE1D52','#FF0000','#E1306C','#0A66C2',
  '#F59E0B','#10B981','#8B5CF6','#EC4899','#64748B',
];

function fmt(v) {
  if (typeof v !== 'number') return v;
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000)    return `${(v / 1000).toFixed(0)}K`;
  return v;
}

const ChartTooltip = ({ active, payload, label, unit }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 rounded-xl px-4 py-3 shadow-xl text-xs">
      {label && <div className="text-slate-300 font-medium mb-2">{label}</div>}
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full" style={{ background: entry.color || entry.fill }} />
          <span className="text-slate-300">{entry.name || entry.dataKey}:</span>
          <span className="text-white font-semibold">
            {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
            {unit || ''}
          </span>
        </div>
      ))}
    </div>
  );
};

function LineViz({ data, config }) {
  const { xKey = 'date', series = [] } = config || {};
  const step = Math.max(1, Math.floor(data.length / 20));
  const thinned = data.filter((_, i) => i % step === 0 || i === data.length - 1);

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={thinned} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
        <XAxis dataKey={xKey} tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
        <YAxis tickFormatter={fmt} tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
        <Tooltip content={<ChartTooltip />} />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
        {series.map((s, i) => (
          <Line
            key={s.key || i}
            type="monotone"
            dataKey={s.key}
            name={s.name || s.key}
            stroke={s.color || FALLBACK_COLORS[i]}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

function BarViz({ data, config }) {
  const { xKey = 'name', bars = [], unit = '' } = config || {};
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
        <XAxis dataKey={xKey} tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={v => `${v}${unit}`} tick={{ fill: '#94A3B8', fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
        <Tooltip content={<ChartTooltip unit={unit} />} />
        {bars.map((b, i) => (
          <Bar key={b.key || i} dataKey={b.key} name={b.name || b.key} radius={[6, 6, 0, 0]} maxBarSize={60}>
            {data.map((entry, j) => (
              <Cell key={j} fill={entry.fill || b.color || FALLBACK_COLORS[j % FALLBACK_COLORS.length]} />
            ))}
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

function PieViz({ data, config }) {
  const { nameKey = 'name', valueKey = 'value' } = config || {};
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={90}
          paddingAngle={3}
          dataKey={valueKey}
          nameKey={nameKey}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
          labelLine={false}
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.fill || FALLBACK_COLORS[i % FALLBACK_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<ChartTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  );
}

function TableViz({ data, config }) {
  const columns = config?.columns || (data[0] ? Object.keys(data[0]) : []);
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-100">
      <table className="w-full text-sm">
        <thead className="bg-slate-50">
          <tr>
            {columns.map(col => (
              <th key={col} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {data.map((row, i) => (
            <tr key={i} className="hover:bg-slate-50 transition-colors">
              {columns.map(col => (
                <td key={col} className="px-4 py-2.5 text-slate-700">
                  {row[col]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function DynamicViz({ visualization }) {
  if (!visualization || visualization.type === null) return null;

  const { type, title, description, data, config } = visualization;

  if (!data || !data.length) return null;

  return (
    <div className="mt-4 bg-slate-50 border border-slate-100 rounded-2xl p-4 animate-fade-in">
      {title && (
        <div className="mb-3">
          <div className="font-semibold text-slate-800 text-sm">{title}</div>
          {description && <div className="text-slate-400 text-xs mt-0.5">{description}</div>}
        </div>
      )}

      {type === 'line'  && <LineViz  data={data} config={config} />}
      {type === 'bar'   && <BarViz   data={data} config={config} />}
      {type === 'pie'   && <PieViz   data={data} config={config} />}
      {type === 'table' && <TableViz data={data} config={config} />}
    </div>
  );
}
