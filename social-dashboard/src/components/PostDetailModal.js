import { useState, useEffect, useCallback } from 'react';
import { X, ExternalLink, Eye, Heart, MessageCircle, Share2, Bookmark, Clock } from 'lucide-react';

const IG_PINK     = '#E1306C';
const IG_PURPLE   = '#833AB4';
const IG_GRADIENT = 'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)';

function fmtBig(n) {
  if (!n && n !== 0) return '—';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString();
}

function fmtWatchTime(ms) {
  if (!ms) return '—';
  const s = ms / 1000;
  if (s >= 60) return `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
  return `${s.toFixed(1)}s`;
}

function fmtDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

function MetricCell({ icon, label, value, color }) {
  return (
    <div className="flex flex-col items-center justify-center py-4 px-2 gap-1.5">
      <div style={{ color: color || '#94a3b8' }}>{icon}</div>
      <div className="text-xl font-bold tabular-nums text-slate-900 leading-tight">{value}</div>
      <div className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold text-center leading-tight">
        {label}
      </div>
    </div>
  );
}

function InstagramIcon() {
  return (
    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
      style={{ background: IG_GRADIENT }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
    </div>
  );
}

export default function PostDetailModal({ post, onClose, accountName = 'lpconnect' }) {
  const [visible,  setVisible]  = useState(false);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (post) {
      setImgError(false);
      // defer one frame so the transition fires
      requestAnimationFrame(() => setVisible(true));
      document.body.style.overflow = 'hidden';
    } else {
      setVisible(false);
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [post]);

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(onClose, 200);
  }, [onClose]);

  useEffect(() => {
    if (!post) return;
    function onKey(e) { if (e.key === 'Escape') handleClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [post, handleClose]);

  if (!post) return null;

  const isReel   = post.mediaType === 'REELS' || post.mediaType === 'VIDEO';
  const typeEmoji = isReel ? '🎬' : post.mediaType === 'CAROUSEL_ALBUM' ? '🖼️' : '📷';
  const typeLabel = isReel ? 'Reel' : post.mediaType === 'CAROUSEL_ALBUM' ? 'Carousel' : 'Photo';

  const engRate  = post.engagementRate ?? 0;
  const engColor = engRate > 5 ? '#059669' : engRate > 2 ? '#3b82f6' : '#94a3b8';

  const metrics = [
    { icon: <Eye size={16} />,           label: isReel ? 'Views' : 'Reach',   value: fmtBig(post.reach),         color: '#8b5cf6' },
    { icon: <Heart size={16} />,         label: 'Likes',                       value: fmtBig(post.likeCount),     color: IG_PINK   },
    { icon: <MessageCircle size={16} />, label: 'Comments',                    value: fmtBig(post.commentsCount), color: '#6366f1' },
    { icon: <Bookmark size={16} />,      label: 'Saves',                       value: fmtBig(post.saved),         color: IG_PURPLE },
    { icon: <Share2 size={16} />,        label: 'Shares',                      value: fmtBig(post.shares),        color: '#f59e0b' },
    ...(isReel ? [{ icon: <Clock size={16} />, label: 'Avg Watch', value: fmtWatchTime(post.avgWatchTime), color: '#10b981' }] : []),
  ];
  const COLS = 3;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`}
      onClick={handleClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal card */}
      <div
        className={`relative bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh] transition-all duration-200 ${visible ? 'translate-y-0 scale-100' : 'translate-y-4 scale-95'}`}
        style={{ borderTop: `4px solid ${IG_PINK}` }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1">

          {/* Post image */}
          <div className="relative bg-slate-100 w-full overflow-hidden" style={{ maxHeight: '340px' }}>
            {post.mediaUrl && !imgError ? (
              <img
                src={post.mediaUrl}
                alt={post.caption?.slice(0, 60) || 'Post image'}
                className="w-full object-cover"
                style={{ maxHeight: '340px' }}
                onError={() => setImgError(true)}
                crossOrigin="anonymous"
              />
            ) : (
              <div className="w-full h-56 flex flex-col items-center justify-center gap-3"
                style={{ background: 'linear-gradient(135deg,#fdf2f8,#f5f3ff)' }}>
                <span className="text-5xl">{typeEmoji}</span>
                {post.caption && (
                  <span className="text-xs text-slate-400 px-6 text-center line-clamp-2">
                    {post.caption.slice(0, 80)}
                  </span>
                )}
              </div>
            )}
            {/* Content type badge */}
            <div className="absolute bottom-2 left-2 bg-black/50 text-white text-[11px] font-semibold px-2.5 py-1 rounded-full backdrop-blur-sm">
              {typeEmoji} {typeLabel}
            </div>
          </div>

          {/* Content area */}
          <div className="p-5 space-y-4">

            {/* Platform header */}
            <div className="flex items-center gap-3">
              <InstagramIcon />
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900">@{accountName}</div>
                <div className="text-xs text-slate-400">{fmtDateTime(post.timestamp)}</div>
              </div>
            </div>

            {/* Full caption */}
            {post.caption ? (
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                {post.caption}
              </p>
            ) : (
              <p className="text-sm text-slate-400 italic">(No caption)</p>
            )}

            {/* Engagement rate pill + collab badge */}
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="inline-flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 rounded-full"
                style={{ background: `${engColor}20`, color: engColor }}
              >
                ⚡ {engRate.toFixed(2)}% Engagement Rate
              </span>
              {post.contentType === 'collab' && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
                  🤝 Collab
                </span>
              )}
            </div>

            {/* Metric grid */}
            <div className="rounded-xl border border-slate-100 overflow-hidden bg-white">
              <div className="grid grid-cols-3">
                {metrics.map((m, i) => (
                  <div
                    key={i}
                    className={[
                      i % COLS !== COLS - 1 ? 'border-r border-slate-100' : '',
                      i >= COLS            ? 'border-t border-slate-100' : '',
                    ].filter(Boolean).join(' ')}
                  >
                    <MetricCell {...m} />
                  </div>
                ))}
              </div>
            </div>

            {/* View on Instagram */}
            {post.permalink && (
              <a
                href={post.permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-sm text-white transition-opacity hover:opacity-90"
                style={{ background: IG_GRADIENT }}
              >
                <ExternalLink size={15} />
                View on Instagram
              </a>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
