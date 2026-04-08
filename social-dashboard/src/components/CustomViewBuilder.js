import { useState, useEffect } from 'react';
import { Layout, X, Eye, EyeOff, GripVertical, Check, Sliders } from 'lucide-react';

export const ALL_WIDGETS = [
  { id: 'summary_metrics',   label: 'Summary Metrics',        description: 'Total followers, reach, engagement, video views',  icon: '📊', defaultOn: true  },
  { id: 'platform_cards',    label: 'Platform Cards',          description: 'Per-platform quick stats for each network',         icon: '🃏', defaultOn: true  },
  { id: 'growth_chart',      label: 'Growth Over Time',        description: 'Followers, reach, or engagement trend line chart',  icon: '📈', defaultOn: true  },
  { id: 'engagement_chart',  label: 'Engagement Rate',         description: 'Engagement rate comparison across platforms',       icon: '💬', defaultOn: true  },
  { id: 'milestones',        label: 'Milestone Tracker',       description: 'Progress bars toward follower/subscriber goals',    icon: '🎯', defaultOn: true  },
  { id: 'content_type',      label: 'Content Type Performance',description: 'Which content formats drive the most reach',        icon: '🎬', defaultOn: true  },
  { id: 'top_content',       label: 'Top Performing Content',  description: 'Your best posts across all platforms',             icon: '🏆', defaultOn: true  },
  { id: 'geo_breakdown',     label: 'Geographic Reach',        description: 'Where your followers are by city and country',     icon: '🗺️', defaultOn: true  },
  { id: 'age_breakdown',     label: 'Age & Gender',            description: 'Audience demographics breakdown by platform',      icon: '👥', defaultOn: true  },
  { id: 'best_time',         label: 'Best Time to Post',       description: 'When your audience is most engaged',               icon: '🕗', defaultOn: true  },
];

const STORAGE_KEY = 'lp_dashboard_widgets';

function loadSaved() {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { return null; }
}

export function useWidgetConfig() {
  const [enabled, setEnabled] = useState(() => {
    const saved = loadSaved();
    if (saved) return saved;
    return Object.fromEntries(ALL_WIDGETS.map(w => [w.id, w.defaultOn]));
  });

  function toggle(id) {
    setEnabled(prev => {
      const next = { ...prev, [id]: !prev[id] };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }

  function resetAll() {
    const defaults = Object.fromEntries(ALL_WIDGETS.map(w => [w.id, w.defaultOn]));
    setEnabled(defaults);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults)); } catch {}
  }

  return { enabled, toggle, resetAll };
}

export default function CustomViewBuilder({ open, onClose, enabled, toggle, resetAll }) {
  if (!open) return null;

  const enabledCount = Object.values(enabled).filter(Boolean).length;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg
                      max-h-[85vh] flex flex-col animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
              <Sliders size={18} className="text-blue-600" />
            </div>
            <div>
              <div className="font-bold text-slate-900">Customize Dashboard</div>
              <div className="text-slate-400 text-xs">{enabledCount} of {ALL_WIDGETS.length} widgets visible</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={resetAll} className="text-xs text-blue-600 font-medium hover:underline">
              Reset all
            </button>
            <button onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Widget list */}
        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-2">
          {ALL_WIDGETS.map(widget => {
            const isOn = enabled[widget.id];
            return (
              <button
                key={widget.id}
                onClick={() => toggle(widget.id)}
                className={`w-full flex items-center gap-4 p-3 rounded-xl border transition-all duration-150 text-left ${
                  isOn
                    ? 'bg-blue-50 border-blue-200 hover:bg-blue-100'
                    : 'bg-slate-50 border-slate-100 hover:bg-slate-100 opacity-60'
                }`}
              >
                <span className="text-2xl flex-shrink-0">{widget.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className={`font-semibold text-sm ${isOn ? 'text-slate-900' : 'text-slate-500'}`}>
                    {widget.label}
                  </div>
                  <div className="text-xs text-slate-400 truncate">{widget.description}</div>
                </div>
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  isOn ? 'bg-blue-600' : 'bg-slate-200'
                }`}>
                  {isOn
                    ? <Check size={13} className="text-white" />
                    : <EyeOff size={13} className="text-slate-400" />}
                </div>
              </button>
            );
          })}
        </div>

        <div className="px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="btn-primary w-full justify-center flex items-center gap-2">
            <Eye size={16} /> Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
}
