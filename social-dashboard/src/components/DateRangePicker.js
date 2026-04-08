import { useState, useRef, useEffect } from 'react';
import { CalendarDays, ChevronDown, X, Check } from 'lucide-react';
import { DATA_START_DATE, DATA_END_DATE } from '../data/demoData';

// Quick preset ranges relative to DATA_END_DATE
const PRESETS = [
  { label: '7 Days',       days: 7   },
  { label: '30 Days',      days: 30  },
  { label: '90 Days',      days: 90  },
  { label: 'Last Quarter', days: 91  },
  { label: '6 Months',     days: 180 },
  { label: '1 Year',       days: 365 },
];

function daysAgo(n) {
  const d = new Date(DATA_END_DATE);
  d.setDate(d.getDate() - n + 1);
  return d.toISOString().split('T')[0];
}

function formatDisplay(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  const dt = new Date(+y, +m - 1, +d);
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function DateRangePicker({ startISO, endISO, onChange, presetLabel, onPresetChange }) {
  const [open,      setOpen]      = useState(false);
  const [localStart, setLocalStart] = useState(startISO || daysAgo(90));
  const [localEnd,   setLocalEnd]   = useState(endISO   || DATA_END_DATE);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function applyCustom() {
    if (localStart && localEnd && localStart <= localEnd) {
      onChange({ startISO: localStart, endISO: localEnd, label: 'Custom Range' });
      setOpen(false);
    }
  }

  function applyPreset(preset) {
    const start = daysAgo(preset.days);
    const end   = DATA_END_DATE;
    setLocalStart(start);
    setLocalEnd(end);
    onChange({ startISO: start, endISO: end, label: preset.label });
    setOpen(false);
  }

  // Display label in the trigger button
  const triggerLabel = presetLabel === 'Custom Range'
    ? `${formatDisplay(startISO)} – ${formatDisplay(endISO)}`
    : (presetLabel || '90 Days');

  const isCustomActive = presetLabel === 'Custom Range';

  return (
    <div className="relative" ref={ref}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-xl
                    transition-all border ${
          open
            ? 'bg-blue-600 text-white border-blue-600'
            : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
        }`}
      >
        <CalendarDays size={15} />
        <span className="hidden sm:inline max-w-[180px] truncate">{triggerLabel}</span>
        <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 bg-white rounded-2xl shadow-2xl
                        border border-slate-100 w-80 overflow-hidden animate-fade-in">

          {/* Preset quick-picks */}
          <div className="p-3 border-b border-slate-100">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2 px-1">
              Quick Select
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {PRESETS.map(p => {
                const active = presetLabel === p.label;
                return (
                  <button
                    key={p.label}
                    onClick={() => applyPreset(p)}
                    className={`text-xs font-medium px-2 py-2 rounded-xl transition-all ${
                      active
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-50 text-slate-600 hover:bg-blue-50 hover:text-blue-700'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom date inputs */}
          <div className="p-4">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
              Custom Range
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs text-slate-500 font-medium block mb-1">From</label>
                <input
                  type="date"
                  min={DATA_START_DATE}
                  max={localEnd || DATA_END_DATE}
                  value={localStart}
                  onChange={e => setLocalStart(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2.5
                             focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                             text-slate-700 bg-slate-50"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 font-medium block mb-1">To</label>
                <input
                  type="date"
                  min={localStart || DATA_START_DATE}
                  max={DATA_END_DATE}
                  value={localEnd}
                  onChange={e => setLocalEnd(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2.5
                             focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                             text-slate-700 bg-slate-50"
                />
              </div>
            </div>

            {/* Selected range summary */}
            {localStart && localEnd && (
              <div className="text-xs text-slate-500 bg-slate-50 rounded-xl px-3 py-2 mb-3">
                {formatDisplay(localStart)} → {formatDisplay(localEnd)}
                {' '}
                <span className="text-blue-600 font-medium">
                  ({Math.round((new Date(localEnd) - new Date(localStart)) / 86400000) + 1} days)
                </span>
              </div>
            )}

            <button
              onClick={applyCustom}
              disabled={!localStart || !localEnd || localStart > localEnd}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700
                         disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold
                         py-2.5 rounded-xl transition-all"
            >
              <Check size={14} /> Apply Custom Range
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
