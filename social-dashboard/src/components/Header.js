import { Sparkles, Sliders } from 'lucide-react';
import DateRangePicker from './DateRangePicker';

export default function Header({
  dateRange, startISO, endISO, onDateRangeChange,
  onToggleAI, aiActive, onOpenBuilder,
}) {
  return (
    <header className="bg-slate-900 text-white sticky top-0 z-30 shadow-lg">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">

        {/* Logo */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600
                          flex items-center justify-center text-lg shadow-lg">⛪</div>
          <div>
            <div className="font-bold text-white leading-tight text-base">Lake Pointe</div>
            <div className="text-slate-400 text-xs leading-tight">Social Analytics</div>
          </div>
        </div>

        {/* Live badge */}
        <div className="hidden sm:flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-500/30
                        text-emerald-400 text-xs font-semibold px-3 py-1.5 rounded-full flex-shrink-0">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse-slow" />
          Demo Mode
        </div>

        <div className="flex items-center gap-2 ml-auto">

          {/* Date Range Picker — replaces the old dropdown */}
          <DateRangePicker
            startISO={startISO}
            endISO={endISO}
            presetLabel={dateRange}
            onChange={({ startISO, endISO, label }) =>
              onDateRangeChange({ startISO, endISO, label })
            }
          />

          {/* Customize */}
          <button
            onClick={onOpenBuilder}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200
                       text-sm font-medium px-3 py-2 rounded-xl transition-all border border-slate-700"
            title="Customize Dashboard"
          >
            <Sliders size={15} />
            <span className="hidden sm:inline">Customize</span>
          </button>

          {/* AI Toggle */}
          <button
            onClick={onToggleAI}
            className={`flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl
                        transition-all duration-200 border ${
              aiActive
                ? 'bg-gradient-to-r from-blue-600 to-violet-600 text-white border-transparent shadow-lg shadow-blue-500/25'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
          >
            <Sparkles size={15} />
            <span className="hidden sm:inline">AI Analyst</span>
          </button>
        </div>
      </div>
    </header>
  );
}
