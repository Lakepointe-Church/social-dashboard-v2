// Live Check — fetches real-time metrics for any recent post without touching the DB.
// Usage: <LiveCheck platform="instagram" recentPosts={igData.media} />
// recentPosts should be the post list from the DB endpoint (used to search by caption).

import { useState } from 'react';
import { Zap, X, RefreshCw, ExternalLink, AlertCircle } from 'lucide-react';

const PLATFORM_COLORS = {
  instagram: '#E1306C',
  facebook:  '#1877F2',
  youtube:   '#FF0000',
};

function fmtBig(n) {
  if (!n && n !== 0) return '—';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString();
}

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function MetricPill({ label, value, color }) {
  return (
    <div className="flex flex-col items-center px-3 py-2 rounded-xl bg-slate-50">
      <span className="text-sm font-bold tabular-nums" style={{ color }}>{value}</span>
      <span className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold mt-0.5">{label}</span>
    </div>
  );
}

export default function LiveCheck({ platform, recentPosts = [] }) {
  const [open,    setOpen]    = useState(false);
  const [postId,  setPostId]  = useState('');
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);
  const [error,   setError]   = useState(null);

  const accentColor = PLATFORM_COLORS[platform] || '#64748b';

  // Extract post ID from URL or use directly
  function parseId(input) {
    input = input.trim();
    // Instagram: https://www.instagram.com/p/SHORTCODE/ → need to use numeric ID from recentPosts
    // Facebook: https://www.facebook.com/... → post IDs are numeric (pageId_postId)
    // YouTube: https://www.youtube.com/watch?v=ID or https://youtu.be/ID
    if (platform === 'youtube') {
      const m = input.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      if (m) return m[1];
    }
    // If it looks like a raw ID already, use it
    if (/^[0-9_]+$/.test(input) || /^[a-zA-Z0-9_-]{11}$/.test(input)) return input;
    return input;
  }

  async function handleCheck() {
    const id = parseId(postId);
    if (!id) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const r    = await fetch(`/api/live-post?platform=${platform}&id=${id}`);
      const data = await r.json();
      if (!r.ok || data.error) throw new Error(data.error || 'Failed to fetch');
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function renderMetrics() {
    if (!result) return null;
    if (platform === 'instagram') return (
      <div className="grid grid-cols-3 gap-2 mt-3">
        <MetricPill label={result.mediaType === 'REELS' || result.mediaType === 'VIDEO' ? 'Views' : 'Reach'} value={fmtBig(result.reach)} color={accentColor} />
        <MetricPill label="Likes"    value={fmtBig(result.likeCount)}    color={accentColor} />
        <MetricPill label="Comments" value={fmtBig(result.commentCount)} color={accentColor} />
        <MetricPill label="Shares"   value={fmtBig(result.shareCount)}   color={accentColor} />
        <MetricPill label="Saves"    value={fmtBig(result.saved)}        color={accentColor} />
        <MetricPill label="Eng Rate" value={`${result.engagementRate}%`} color={accentColor} />
        {result.avgWatchTime > 0 && (
          <MetricPill label="Avg Watch" value={`${(result.avgWatchTime / 1000).toFixed(1)}s`} color={accentColor} />
        )}
      </div>
    );
    if (platform === 'facebook') return (
      <div className="grid grid-cols-3 gap-2 mt-3">
        <MetricPill label="Likes"    value={fmtBig(result.likeCount)}    color={accentColor} />
        <MetricPill label="Comments" value={fmtBig(result.commentCount)} color={accentColor} />
        <MetricPill label="Shares"   value={fmtBig(result.shareCount)}   color={accentColor} />
      </div>
    );
    if (platform === 'youtube') return (
      <div className="grid grid-cols-3 gap-2 mt-3">
        <MetricPill label="Views"    value={fmtBig(result.viewCount)}    color={accentColor} />
        <MetricPill label="Likes"    value={fmtBig(result.likeCount)}    color={accentColor} />
        <MetricPill label="Comments" value={fmtBig(result.commentCount)} color={accentColor} />
        <MetricPill label="Eng Rate" value={`${result.engagementRate}%`} color={accentColor} />
      </div>
    );
  }

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => { setOpen(true); setResult(null); setError(null); setPostId(''); }}
        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all hover:opacity-90"
        style={{ background: accentColor, color: 'white', border: 'none' }}
      >
        <Zap size={12} /> Live Check
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-5"
            onClick={e => e.stopPropagation()}
            style={{ borderTop: `4px solid ${accentColor}` }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-1.5">
                  <Zap size={16} style={{ color: accentColor }} /> Live Post Check
                </h3>
                <p className="text-slate-400 text-xs mt-0.5">Fetches current metrics live — not stored in the database</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            {/* Post ID input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={postId}
                onChange={e => setPostId(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCheck()}
                placeholder={
                  platform === 'youtube'
                    ? 'YouTube video ID or URL…'
                    : platform === 'instagram'
                    ? 'Instagram post ID…'
                    : 'Facebook post ID (pageId_postId)…'
                }
                className="flex-1 text-xs border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-slate-400"
              />
              <button
                onClick={handleCheck}
                disabled={loading || !postId.trim()}
                className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl text-white disabled:opacity-50"
                style={{ background: accentColor }}
              >
                {loading ? <RefreshCw size={12} className="animate-spin" /> : <Zap size={12} />}
                {loading ? 'Checking…' : 'Check'}
              </button>
            </div>

            {/* Recent posts hint */}
            {recentPosts.length > 0 && !result && !error && (
              <div className="mt-3">
                <p className="text-[10px] text-slate-400 uppercase tracking-wide font-semibold mb-2">Recent posts — click to check</p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {recentPosts.slice(0, 8).map(p => {
                    const pid = p.id || p.videoId;
                    const ts  = p.timestamp || p.createdTime || p.publishedAt;
                    const lbl = p.caption || p.message || p.title || pid;
                    return (
                      <button
                        key={pid}
                        onClick={() => { setPostId(pid); }}
                        className="w-full text-left text-xs px-3 py-2 rounded-lg hover:bg-slate-50 border border-slate-100 flex items-center justify-between gap-2"
                      >
                        <span className="line-clamp-1 text-slate-700">{lbl?.slice(0, 60) || '(No caption)'}</span>
                        <span className="text-slate-400 flex-shrink-0 text-[10px]">{timeAgo(ts)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mt-3 flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl p-3">
                <AlertCircle size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-red-600 text-xs">{error}</p>
              </div>
            )}

            {/* Result */}
            {result && (
              <div className="mt-3 border border-slate-100 rounded-xl p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-slate-700 text-xs line-clamp-2 leading-snug">
                    {result.caption || result.message || result.title || '(No caption)'}
                  </p>
                  {result.permalink && (
                    <a href={result.permalink} target="_blank" rel="noreferrer" className="flex-shrink-0 text-slate-400 hover:text-slate-600">
                      <ExternalLink size={13} />
                    </a>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Posted {timeAgo(result.timestamp || result.createdTime || result.publishedAt)} · Live as of {new Date(result.fetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
                {renderMetrics()}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
