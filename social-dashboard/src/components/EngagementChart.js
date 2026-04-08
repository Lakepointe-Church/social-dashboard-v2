import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Cell, ResponsiveContainer,
} from 'recharts';
import { platforms } from '../data/demoData';

const ALL_DATA = [
  { name: 'TikTok',    value: 8.1,  fill: '#EE1D52' },
  { name: 'Instagram', value: 5.2,  fill: '#E1306C' },
  { name: 'YouTube',   value: 4.1,  fill: '#FF0000' },
  { name: 'Facebook',  value: 3.8,  fill: '#1877F2' },
  { name: 'LinkedIn',  value: 2.9,  fill: '#0A66C2' },
];

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 rounded-xl px-4 py-3 shadow-xl text-xs">
      <div className="text-slate-300 mb-1">{payload[0].payload.name}</div>
      <div className="text-white font-bold text-base">{payload[0].value}%</div>
      <div className="text-slate-400">engagement rate</div>
    </div>
  );
};

export default function EngagementChart({ activePlatform }) {
  const data = activePlatform
    ? ALL_DATA.filter(d => d.name === activePlatform)
    : ALL_DATA;

  return (
    <div className="space-y-3">
      {data.map(d => (
        <div key={d.name} className="flex items-center gap-3">
          <div className="text-sm text-slate-500 w-20 flex-shrink-0 text-right">{d.name}</div>
          <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${(d.value / 10) * 100}%`,
                background: d.fill,
              }}
            />
          </div>
          <div className="text-sm font-bold text-slate-800 w-10 flex-shrink-0 tabular-nums">
            {d.value}%
          </div>
        </div>
      ))}

      {/* Industry average line note */}
      <div className="pt-2 border-t border-slate-100 text-xs text-slate-400 flex items-center gap-2">
        <div className="h-px flex-1 border-t border-dashed border-slate-300" />
        Industry avg: 1.9%
        <div className="h-px flex-1 border-t border-dashed border-slate-300" />
      </div>
      <p className="text-xs text-slate-500 text-center">
        All platforms beat industry avg by
        {' '}<span className="font-semibold text-emerald-600">2.5×+</span>
      </p>
    </div>
  );
}
