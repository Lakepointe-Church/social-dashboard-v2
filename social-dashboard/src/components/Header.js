import { Sparkles, ChevronDown, Sliders } from 'lucide-react';
import { useState } from 'react';

export const DATE_RANGES = ['7 days', '30 days', '90 days', 'Last Quarter', '1 Year'];

export default function Header({ dateRange, onDateRangeChange, onToggleAI, aiActive, onOpenBuilder }) {
  const [showDropdown, setShowDropdown] = useState(false);

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
                        text-emerald-400 text-xs font-semibold px-3 py-1.5 rounded-full">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse-slow" />
          Demo Mode
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {/* Date Range */}
          <div className="relative">
            <button
              onClick={() => setShowDropdown(v => !v)}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200
                         text-sm font-medium px-3 py-2 rounded-xl transition-all border border-slate-700"
            >
              <span>📅</span>
              <span className="hidden sm:inline">{dateRange}</span>
              <ChevronDown size={14} className="text-slate-400" />
            </button>
            {showDropdown && (
              <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-xl border
                              border-slate-100 overflow-hidden z-50 min-w-[150px]">
                {DATE_RANGES.map(dr => (
                  <button
                    key={dr}
                    onClick={() => { onDateRangeChange(dr); setShowDropdown(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors
                               ${dateRange === dr ? 'text-blue-600 font-semibold bg-blue-50' : 'text-slate-700'}`}
                  >
                    {dr}
                  </button>
                ))}
              </div>
            )}
          </div>

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
