// SyncNow — triggers a full /api/db-sync, then refreshes the current tab's data.
// Replaces the per-post Live Check. After syncing, all posts (including ones
// published since the last cron) are in the DB and visible to the whole team.

import { useState } from 'react';
import { RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

export default function SyncNow({ onSyncComplete, color = '#3b82f6' }) {
  const [status, setStatus] = useState('idle'); // idle | syncing | success | error
  const [summary, setSummary] = useState(null);

  async function handleSync() {
    setStatus('syncing');
    setSummary(null);
    try {
      const r    = await fetch('/api/db-sync');
      const data = await r.json();
      if (!r.ok || !data.ok) throw new Error(data.error || 'Sync failed');

      const res = data.results || {};
      const ig  = typeof res.instagram_posts === 'number' ? res.instagram_posts : null;
      const fb  = typeof res.facebook_posts  === 'number' ? res.facebook_posts  : null;
      const yt  = typeof res.youtube_videos  === 'number' ? res.youtube_videos  : null;
      const parts = [ig && `${ig} IG`, fb && `${fb} FB`, yt && `${yt} YT`].filter(Boolean);
      setSummary(parts.join(' · ') || 'Done');

      setStatus('success');
      onSyncComplete?.();

      setTimeout(() => { setStatus('idle'); setSummary(null); }, 4000);
    } catch (e) {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  }

  if (status === 'syncing') {
    return (
      <button disabled className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed">
        <RefreshCw size={12} className="animate-spin" /> Syncing…
      </button>
    );
  }

  if (status === 'success') {
    return (
      <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100">
        <CheckCircle2 size={12} /> Updated{summary ? ` · ${summary}` : ''}
      </span>
    );
  }

  if (status === 'error') {
    return (
      <span className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl bg-red-50 text-red-600 border border-red-100">
        <AlertCircle size={12} /> Sync failed — try again
      </span>
    );
  }

  return (
    <button
      onClick={handleSync}
      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all hover:opacity-80"
      style={{ color, borderColor: color, background: `${color}12` }}
    >
      <RefreshCw size={12} /> Sync Now
    </button>
  );
}
