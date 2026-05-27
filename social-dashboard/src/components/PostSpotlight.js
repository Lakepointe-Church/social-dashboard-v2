import { useState, useEffect, useCallback } from 'react';
import { X, ExternalLink, Eye, Heart, MessageCircle, Share2, Bookmark, Clock, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';

const IG_PINK     = '#E1306C';
const IG_PURPLE   = '#833AB4';
const IG_GRADIENT = 'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)';
const FB_BLUE     = '#1877F2';
const FB_GRADIENT = 'linear-gradient(45deg,#1877F2,#42a5f5)';
const YT_RED      = '#FF0000';
const YT_GRADIENT = 'linear-gradient(45deg,#ff0000,#ff6b35)';

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

function RatePill({ icon, label, value, color }) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold"
      style={{ background: `${color}18`, color }}>
      {icon}
      <span className="text-slate-500 font-medium">{label}</span>
      <span className="font-mono font-bold">{value}</span>
    </div>
  );
}

function MetricCell({ icon, label, value, color }) {
  return (
    <div className="flex flex-col items-center justify-center py-3 px-2 gap-1">
      <div style={{ color: color || '#94a3b8' }}>{icon}</div>
      <div className="text-lg font-bold tabular-nums text-slate-900 leading-tight">{value}</div>
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

function FacebookIcon() {
  return (
    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
      style={{ background: FB_BLUE }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    </div>
  );
}

function YouTubeIcon() {
  return (
    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
      style={{ background: YT_RED }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    </div>
  );
}

const PLATFORM_CONFIG = {
  instagram: { accentColor: IG_PINK,  gradient: IG_GRADIENT, Icon: InstagramIcon, viewLabel: 'View on Instagram', prefix: '@' },
  facebook:  { accentColor: FB_BLUE,  gradient: FB_GRADIENT, Icon: FacebookIcon,  viewLabel: 'View on Facebook',  prefix: ''  },
  youtube:   { accentColor: YT_RED,   gradient: YT_GRADIENT, Icon: YouTubeIcon,   viewLabel: 'Watch on YouTube',  prefix: ''  },
};

export default function PostSpotlight({ post, onClose, accountName = 'lpconnect', platform = 'instagram' }) {
  const [visible,       setVisible]       = useState(false);
  const [imgError,      setImgError]      = useState(false);
  const [slides,        setSlides]        = useState([]);
  const [activeSlide,   setActiveSlide]   = useState(0);
  const [loadingSlides, setLoadingSlides] = useState(false);

  useEffect(() => {
    if (post) {
      setImgError(false);
      setSlides([]);
      setActiveSlide(0);
      requestAnimationFrame(() => setVisible(true));
      document.body.style.overflow = 'hidden';

      // Fetch carousel / album children
      if (post.mediaType === 'CAROUSEL_ALBUM') {
        setLoadingSlides(true);
        const endpoint = platform === 'facebook'
          ? `/api/fb-album-photos?id=${post.id}`
          : `/api/ig-carousel-children?id=${post.id}`;
        fetch(endpoint)
          .then(r => r.json())
          .then(data => { if (data.slides?.length > 1) setSlides(data.slides); })
          .catch(() => {})
          .finally(() => setLoadingSlides(false));
      }
    } else {
      setVisible(false);
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [post, platform]);

  // Reset imgError when changing slides
  useEffect(() => { setImgError(false); }, [activeSlide]);

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(onClose, 200);
  }, [onClose]);

  useEffect(() => {
    if (!post) return;
    function onKey(e) {
      if (e.key === 'Escape') handleClose();
      if (e.key === 'ArrowLeft'  && slides.length > 1) setActiveSlide(s => Math.max(0, s - 1));
      if (e.key === 'ArrowRight' && slides.length > 1) setActiveSlide(s => Math.min(slides.length - 1, s + 1));
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [post, handleClose, slides]);

  if (!post) return null;

  const config    = PLATFORM_CONFIG[platform] || PLATFORM_CONFIG.instagram;
  const { Icon }  = config;
  const isReel    = post.mediaType === 'REELS' || post.mediaType === 'VIDEO';
  const typeEmoji = isReel ? '🎬' : post.mediaType === 'CAROUSEL_ALBUM' ? '🖼️' : '📷';
  const typeLabel = isReel
    ? (platform === 'facebook' ? 'Video' : 'Reel')
    : post.mediaType === 'CAROUSEL_ALBUM' ? 'Carousel'
    : platform === 'youtube' ? '▶ Video'
    : 'Photo';

  // Active slide media (falls back to post's own media when no slides loaded)
  const hasSlides     = slides.length > 1;
  const currentSlide  = hasSlides ? slides[activeSlide] : null;
  const activeMediaUrl = currentSlide?.mediaUrl ?? post.mediaUrl;
  const activeVideoUrl = currentSlide?.videoUrl ?? post.videoUrl;

  const engRate  = post.engagementRate ?? 0;
  const engColor = engRate > 5 ? '#059669' : engRate > 2 ? '#3b82f6' : '#94a3b8';

  // Rate pills — Instagram only
  const rates = platform === 'instagram' ? [
    { icon: <Bookmark size={11} />, label: 'Save',  value: `${(post.saveRate  ?? 0).toFixed(1)}%`, color: IG_PURPLE },
    { icon: <Share2 size={11} />,   label: 'Share', value: `${(post.shareRate ?? 0).toFixed(1)}%`, color: '#f59e0b' },
    ...(isReel && post.avgWatchTime
      ? [{ icon: <Clock size={11} />, label: 'Avg Watch', value: fmtWatchTime(post.avgWatchTime), color: '#10b981' }]
      : []
    ),
  ] : [];

  // Metric grid — varies by platform
  const reachLabel = platform === 'youtube' ? 'Views' : isReel ? 'Views' : 'Reach';
  const reachColor = platform === 'youtube' ? YT_RED : '#8b5cf6';
  const likesColor = platform === 'facebook' ? FB_BLUE : platform === 'youtube' ? '#f59e0b' : IG_PINK;

  const baseMetrics = [
    { icon: <Eye size={15} />,           label: reachLabel,   value: fmtBig(post.reach),         color: reachColor },
    { icon: <TrendingUp size={15} />,    label: 'Eng. Rate',  value: `${engRate.toFixed(2)}%`,   color: engColor   },
    { icon: <Heart size={15} />,         label: 'Likes',      value: fmtBig(post.likeCount),     color: likesColor },
    { icon: <MessageCircle size={15} />, label: 'Comments',   value: fmtBig(post.commentsCount), color: '#6366f1'  },
  ];

  const metrics = platform === 'instagram'
    ? [...baseMetrics,
        { icon: <Bookmark size={15} />, label: 'Saves',   value: fmtBig(post.saved),   color: IG_PURPLE },
        { icon: <Share2 size={15} />,   label: 'Shares',  value: fmtBig(post.shares),  color: '#f59e0b' },
      ]
    : platform === 'facebook'
    ? [...baseMetrics,
        { icon: <Share2 size={15} />,   label: 'Shares',  value: fmtBig(post.shares),  color: '#f59e0b' },
      ]
    : platform === 'youtube' && post.duration
    ? [...baseMetrics,
        { icon: <Clock size={15} />,    label: 'Duration', value: post.duration,        color: '#10b981' },
      ]
    : baseMetrics;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`}
      onClick={handleClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal card — stacked on mobile, side-by-side on desktop */}
      <div
        className={`relative bg-white w-full sm:max-w-3xl rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col sm:flex-row max-h-[92vh] transition-all duration-200 ${visible ? 'translate-y-0 scale-100' : 'translate-y-4 scale-95'}`}
        style={{ borderTop: `4px solid ${config.accentColor}` }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        {/* ── Left column: post image / video ───────────────────────────── */}
        <div className="relative bg-slate-100 h-60 sm:h-auto sm:w-2/5 flex-shrink-0 overflow-hidden">
          {platform === 'facebook' && isReel && post.permalink ? (
            <iframe
              src={`https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(post.permalink)}&show_text=false&width=500`}
              className="absolute inset-0 w-full h-full"
              scrolling="no"
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : isReel && activeVideoUrl && !imgError ? (
            <video
              src={activeVideoUrl}
              className="absolute inset-0 w-full h-full object-cover"
              controls
              playsInline
              loop
              onError={() => setImgError(true)}
            />
          ) : activeMediaUrl && !imgError ? (
            <img
              src={activeMediaUrl}
              alt={post.caption?.slice(0, 60) || 'Post image'}
              className="absolute inset-0 w-full h-full object-cover"
              onError={() => setImgError(true)}
              crossOrigin="anonymous"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3"
              style={{ background: platform === 'facebook' ? 'linear-gradient(135deg,#e0f2fe,#f0f4ff)' : platform === 'youtube' ? 'linear-gradient(135deg,#fff1f2,#ffe4e6)' : 'linear-gradient(135deg,#fdf2f8,#f5f3ff)' }}>
              <span className="text-5xl">{platform === 'youtube' ? '▶️' : typeEmoji}</span>
              {post.caption && (
                <span className="text-xs text-slate-400 px-6 text-center line-clamp-3">
                  {post.caption.slice(0, 100)}
                </span>
              )}
            </div>
          )}

          {/* Loading spinner while fetching slides */}
          {loadingSlides && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-10">
              <div className="w-6 h-6 border-2 border-white/50 border-t-white rounded-full animate-spin" />
            </div>
          )}

          {/* Slide navigation arrows */}
          {hasSlides && (
            <>
              {activeSlide > 0 && (
                <button
                  onClick={e => { e.stopPropagation(); setActiveSlide(s => s - 1); }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                >
                  <ChevronLeft size={18} />
                </button>
              )}
              {activeSlide < slides.length - 1 && (
                <button
                  onClick={e => { e.stopPropagation(); setActiveSlide(s => s + 1); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                >
                  <ChevronRight size={18} />
                </button>
              )}
              {/* Dot indicators */}
              <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-1.5 z-10">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    onClick={e => { e.stopPropagation(); setActiveSlide(i); }}
                    className={`rounded-full transition-all ${i === activeSlide ? 'w-2 h-2 bg-white' : 'w-1.5 h-1.5 bg-white/50 hover:bg-white/75'}`}
                  />
                ))}
              </div>
            </>
          )}

          {/* Content type badge — hide when FB iframe or native video controls are showing */}
          {!(platform === 'facebook' && isReel && post.permalink) && !(isReel && activeVideoUrl && !imgError) && (
            <div className="absolute bottom-2 left-2 bg-black/50 text-white text-[11px] font-semibold px-2.5 py-1 rounded-full backdrop-blur-sm">
              {platform === 'youtube' ? '▶ Video' : hasSlides ? `🖼️ ${activeSlide + 1} / ${slides.length}` : `${typeEmoji} ${typeLabel}`}
            </div>
          )}
        </div>

        {/* ── Right column: metadata + stats ────────────────────────────── */}
        <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
          <div className="p-5 flex flex-col gap-4">

            {/* Platform header */}
            <div className="flex items-center gap-3 pr-8">
              <Icon />
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900">
                  {config.prefix}{accountName}
                </div>
                <div className="text-xs text-slate-400">{fmtDateTime(post.timestamp)}</div>
              </div>
              {platform === 'instagram' && post.contentType === 'collab' && (
                <span className="ml-auto text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 flex-shrink-0">
                  🤝 Collab
                </span>
              )}
            </div>

            {/* Rate pills — IG only */}
            {rates.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {rates.map((r, i) => <RatePill key={i} {...r} />)}
              </div>
            )}

            {/* Caption / title */}
            {post.caption ? (
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                {post.caption}
              </p>
            ) : (
              <p className="text-sm text-slate-400 italic">(No caption)</p>
            )}

            {/* Metric grid */}
            <div className="rounded-xl border border-slate-100 overflow-hidden">
              <div className="grid grid-cols-3">
                {metrics.map((m, i) => (
                  <div
                    key={i}
                    className={[
                      i % 3 !== 2 ? 'border-r border-slate-100' : '',
                      i >= 3      ? 'border-t border-slate-100' : '',
                    ].filter(Boolean).join(' ')}
                  >
                    <MetricCell {...m} />
                  </div>
                ))}
              </div>
            </div>

            {/* View on platform */}
            {post.permalink && (
              <a
                href={post.permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-sm text-white transition-opacity hover:opacity-90"
                style={{ background: config.gradient }}
              >
                <ExternalLink size={15} />
                {config.viewLabel}
              </a>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
