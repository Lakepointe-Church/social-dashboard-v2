import { Eye, Heart, MessageCircle, Share2, Trophy } from 'lucide-react';

const PLATFORM_COLORS = {
  facebook:  '#1877F2',
  instagram: '#E1306C',
  youtube:   '#FF0000',
  tiktok:    '#EE1D52',
  linkedin:  '#0A66C2',
};

function fmt(n) {
  if (!n) return '—';
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toString();
}

export default function TopContent({ posts }) {
  if (!posts.length) {
    return (
      <div className="card flex items-center justify-center h-48 text-slate-400 text-sm">
        No posts to display for this platform yet.
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <Trophy size={18} className="text-amber-500" />
        <h2 className="font-bold text-slate-900 text-lg">Top Performing Content</h2>
      </div>

      <div className="space-y-3">
        {posts.slice(0, 6).map((post, idx) => (
          <div
            key={post.id}
            className="flex gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors duration-150 group"
          >
            {/* Rank */}
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold
              ${idx === 0 ? 'bg-amber-100 text-amber-600' :
                idx === 1 ? 'bg-slate-100 text-slate-500' :
                idx === 2 ? 'bg-orange-50 text-orange-500' : 'bg-slate-50 text-slate-400'}`}>
              {idx + 1}
            </div>

            {/* Thumbnail */}
            <div
              className="w-16 h-9 rounded-lg flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
              style={{ background: PLATFORM_COLORS[post.platform] }}
            >
              {post.platformName.slice(0, 2).toUpperCase()}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-slate-800 leading-snug truncate"
                   title={post.title}>
                {post.title}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-full text-white"
                  style={{ background: PLATFORM_COLORS[post.platform] }}
                >
                  {post.type}
                </span>
                <span className="text-slate-400 text-xs">{post.date}</span>
              </div>
            </div>

            {/* Stats */}
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <Eye size={11} /> {fmt(post.reach)}
              </div>
              <div className="text-xs font-bold text-emerald-600">
                {post.engagementRate}%
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
