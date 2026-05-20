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
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shadow-lg"
     style={{ backgroundColor: '#ec5f2f' }}>⛪</div> 
            <div className="font-bold text-white leading-tight text-base">Lakepointe</div>
            <div className="text-slate-400 text-xs leading-tight">Social Analytics Dashboard</div>
          </div>
        </div>

        {/* Live badge */}
        <div className="hidden sm:flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-500/30
                        text-emerald-400 text-xs font-semibold px-3 py-1.5 rounded-full flex-shrink-0">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse-slow" />
          Demo Mode
        </div>

      
      </div>
    </header>
  );
}
