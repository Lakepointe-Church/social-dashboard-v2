import { useState, useEffect, useCallback } from 'react';
import { fetchInstagramData, invalidateInstagramCache } from '../lib/igDataCache';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { RefreshCw, AlertCircle, FileText, HelpCircle, AlignLeft, Hash, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import PostSpotlight from './PostSpotlight';

const IG_PINK = '#E1306C';

const CONTENT_FILTERS = [
  { id: 'photo',    label: '📷 Photos',    color: '#3b82f6' },
  { id: 'carousel', label: '🖼️ Carousels', color: '#0ea5e9' },
  { id: 'reel',     label: '🎬 Reels',     color: '#8b5cf6' },
  { id: 'collab',   label: '🤝 Collabs',   color: '#f59e0b' },
  { id: 'other',    label: '📝 Other',     color: '#64748b' },
];

const BAND_COLORS = {
  weak:      '#94a3b8',
  fair:      '#f59e0b',
  strong:    '#3b82f6',
  excellent: '#E1306C',
};

// ── Caption scoring ────────────────────────────────────────────────────────────

function extractHook(caption) {
  if (!caption) return '';
  const firstLine = caption.split('\n')[0].trim();
  const words = firstLine.split(/\s+/).filter(Boolean);
  return words.slice(0, 15).join(' ');
}

function scoreHook(caption) {
  if (!caption || !caption.trim()) return 0;
  const hook = extractHook(caption);
  if (!hook.trim()) return 0;

  const hookLower  = hook.toLowerCase();
  const wordCount  = hook.split(/\s+/).filter(Boolean).length;
  const startsWithHashtag = /^#/.test(hook.trim());

  let score = 0;

  if (startsWithHashtag) score -= 2;
  if (wordCount <= 3)    score -= 1;

  if (hook.includes('?')) score += 2;

  const firstThreeWords = hook.split(/\s+/).slice(0, 3).join(' ').toLowerCase();
  const numberWords = ['one','two','three','four','five','six','seven','eight','nine','ten'];
  if (/^\d+\s/.test(hook) || numberWords.some(n => firstThreeWords.split(' ').includes(n))) score += 2;

  const urgency = ['join us','join me','this sunday','this weekend','today','tomorrow','tonight',"don't miss",'last chance','happening','come out','register','sign up'];
  if (urgency.some(w => hookLower.includes(w))) score += 1;

  const emotional = ['love','faith','hope','family','community','together','truth','real','honest','peace','joy','grace','grateful','blessed','changed','struggle','heart','worship','broken','healing','courage','freedom'];
  if (emotional.some(w => hookLower.includes(w))) score += 1;

  if (wordCount >= 8 && wordCount <= 14) score += 1;

  if (hook.includes('@') || hookLower.includes('lakepointe') || hookLower.includes('lpconnect')) score += 1;

  const cta = ['comment','share this','tag a','save this','click','watch','swipe','tell us','drop a','dm us','link in bio'];
  if (cta.some(w => hookLower.includes(w))) score += 1;

  return Math.max(0, Math.min(10, score));
}

function bandForScore(s) {
  if (s <= 2) return 'weak';
  if (s <= 5) return 'fair';
  if (s <= 8) return 'strong';
  return 'excellent';
}

function extractHashtags(caption) {
  if (!caption) return [];
  return (caption.match(/#[\w]+/g) || []).map(h => h.toLowerCase());
}

function avg(arr) {
  if (!arr.length) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function truncate(str, max = 60) {
  return str?.length > max ? str.slice(0, max) + '…' : str;
}

function mediaEmoji(type) {
  if (type === 'IMAGE')          return '📷';
  if (type === 'VIDEO')          return '🎬';
  if (type === 'CAROUSEL_ALBUM') return '🖼️';
  if (type === 'REELS')          return '🎬';
  return '📝';
}

// ── Score badge ────────────────────────────────────────────────────────────────
function ScoreBadge({ score }) {
  const band = bandForScore(score);
  const colors = {
    weak:      'bg-slate-100 text-slate-500',
    fair:      'bg-amber-100 text-amber-700',
    strong:    'bg-blue-100 text-blue-700',
    excellent: 'bg-pink-100 text-pink-700',
  };
  return (
    <span className={`inline-flex items-center text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 ${colors[band]}`}>
      {score}/10
    </span>
  );
}

// ── Stat card ──────────────────────────────────────────────────────────────────
function StatCard({ label, value, subtext, icon, iconBg, iconColor }) {
  return (
    <div className="card">
      <div className={`${iconBg} ${iconColor} w-10 h-10 rounded-xl flex items-center justify-center`}>{icon}</div>
      <div className="mt-3">
        <div className="text-2xl font-bold text-slate-900 tabular-nums">{value}</div>
        <div className="text-slate-500 text-sm font-medium mt-0.5">{label}</div>
        {subtext && <div className="text-slate-400 text-xs mt-1">{subtext}</div>}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function InstagramCaptions() {
  const [data,          setData]          = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);
  const [activeFilters, setActiveFilters] = useState(['photo','carousel','reel','collab','other']);
  const [datePreset,    setDatePreset]    = useState('30');
  const [customStart,   setCustomStart]   = useState('');
  const [customEnd,     setCustomEnd]     = useState('');
  const [selectedPost,  setSelectedPost]  = useState(null);
  const [tableLimit,    setTableLimit]    = useState(20);
  const [tableSort,     setTableSort]     = useState({ key: 'hookScore', dir: 'desc' });

  const fetchData = useCallback(async (forceRefresh = false) => {
    setLoading(true); setError(null);
    try {
      if (forceRefresh) invalidateInstagramCache();
      setData(await fetchInstagramData());
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  function toggleFilter(id) {
    setActiveFilters(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
    setTableLimit(20);
  }

  function toggleSort(key) {
    setTableSort(prev => prev.key === key && prev.dir === 'desc' ? { key, dir: 'asc' } : { key, dir: 'desc' });
  }

  const { account, media = [], fetchedAt } = data || {};

  const rangeStart = datePreset === 'custom'
    ? (customStart ? new Date(customStart) : null)
    : new Date(Date.now() - parseInt(datePreset) * 864e5);
  const rangeEnd = datePreset === 'custom'
    ? (customEnd ? new Date(customEnd + 'T23:59:59') : null)
    : new Date();

  const filteredMedia = media
    .filter(m => activeFilters.includes(m.contentType))
    .filter(m => {
      const t = new Date(m.timestamp);
      if (rangeStart && t < rangeStart) return false;
      if (rangeEnd   && t > rangeEnd)   return false;
      return true;
    });

  const counts = { photo: 0, carousel: 0, reel: 0, collab: 0, other: 0 };
  media.filter(m => {
    const t = new Date(m.timestamp);
    if (rangeStart && t < rangeStart) return false;
    if (rangeEnd   && t > rangeEnd)   return false;
    return true;
  }).forEach(m => { if (counts[m.contentType] !== undefined) counts[m.contentType]++; });

  // ── Derived caption data ─────────────────────────────────────────────────
  const captionData = filteredMedia
    .filter(m => m.caption && m.caption.trim())
    .map(m => ({
      ...m,
      hook:      extractHook(m.caption),
      hookScore: scoreHook(m.caption),
      wordCount: m.caption.split(/\s+/).filter(Boolean).length,
      hashtags:  extractHashtags(m.caption),
    }));

  // ── KPIs ─────────────────────────────────────────────────────────────────
  const avgHookScore = captionData.length
    ? Math.round(avg(captionData.map(m => m.hookScore)) * 10) / 10
    : 0;

  const questionPosts = captionData.filter(m => m.hook.includes('?'));
  const questionPct   = captionData.length
    ? Math.round(questionPosts.length / captionData.length * 100)
    : 0;

  const avgWordCount = captionData.length
    ? Math.round(avg(captionData.map(m => m.wordCount)))
    : 0;

  const allHashtags = captionData.flatMap(m => m.hashtags);
  const hashtagFreq = allHashtags.reduce((acc, h) => { acc[h] = (acc[h] || 0) + 1; return acc; }, {});
  const topHashtag  = Object.entries(hashtagFreq).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  // ── Score band distribution ───────────────────────────────────────────────
  const scoreBands = [
    { label: 'Weak',      range: '0–2',  band: 'weak',      count: captionData.filter(m => m.hookScore <= 2).length },
    { label: 'Fair',      range: '3–5',  band: 'fair',      count: captionData.filter(m => m.hookScore >= 3 && m.hookScore <= 5).length },
    { label: 'Strong',    range: '6–8',  band: 'strong',    count: captionData.filter(m => m.hookScore >= 6 && m.hookScore <= 8).length },
    { label: 'Excellent', range: '9–10', band: 'excellent', count: captionData.filter(m => m.hookScore >= 9).length },
  ];

  // ── Best / weakest ───────────────────────────────────────────────────────
  const topHooks = [...captionData]
    .sort((a, b) => b.hookScore - a.hookScore || b.engagementRate - a.engagementRate)
    .slice(0, 5);
  const bottomHooks = [...captionData]
    .sort((a, b) => a.hookScore - b.hookScore || a.engagementRate - b.engagementRate)
    .slice(0, 5);

  // ── Insights ─────────────────────────────────────────────────────────────
  const nonQuestionPosts  = captionData.filter(m => !m.hook.includes('?'));
  const qCommentRate      = avg(questionPosts.map(m => m.commentRate || 0));
  const nqCommentRate     = avg(nonQuestionPosts.map(m => m.commentRate || 0));
  const questionMultiplier = (questionPosts.length >= 2 && nonQuestionPosts.length >= 2 && nqCommentRate > 0)
    ? (qCommentRate / nqCommentRate).toFixed(1)
    : null;

  const numberOpenerPosts = captionData.filter(m =>
    /^\d+\s/.test(m.hook) ||
    ['one','two','three','four','five','six','seven','eight','nine','ten']
      .some(n => m.hook.toLowerCase().split(/\s+/).slice(0, 3).includes(n))
  );
  const nonNumberPosts    = captionData.filter(m => !numberOpenerPosts.includes(m));
  const numberAvgScore    = avg(numberOpenerPosts.map(m => m.hookScore));
  const nonNumberAvgScore = avg(nonNumberPosts.map(m => m.hookScore));
  const numberAdvantage   = (numberAvgScore - nonNumberAvgScore).toFixed(1);

  const shortCaptionPct = captionData.length
    ? Math.round(captionData.filter(m => m.wordCount < 20).length / captionData.length * 100)
    : 0;

  const ctaWords = ['comment','share this','tag a','save this','click','watch','swipe','tell us','drop a','dm us','link in bio'];
  const ctaPct   = captionData.length
    ? Math.round(captionData.filter(m => ctaWords.some(w => m.hook.toLowerCase().includes(w))).length / captionData.length * 100)
    : 0;

  // ── Sortable captions table ───────────────────────────────────────────────
  const sortedCaptions = [...captionData].sort((a, b) => {
    const mul = tableSort.dir === 'asc' ? 1 : -1;
    if (tableSort.key === 'timestamp') return mul * (new Date(a.timestamp) - new Date(b.timestamp));
    return mul * ((a[tableSort.key] || 0) - (b[tableSort.key] || 0));
  });
  const visibleCaptions = sortedCaptions.slice(0, tableLimit);

  // ── Loading / error ───────────────────────────────────────────────────────
  if (loading && !data) return (
    <div className="card flex items-center justify-center py-20">
      <div className="text-center">
        <RefreshCw size={28} className="animate-spin mx-auto mb-3" style={{ color: IG_PINK }} />
        <p className="text-slate-500 text-sm">Fetching caption data…</p>
      </div>
    </div>
  );

  if (error && !data) return (
    <div className="card border-red-100 bg-red-50">
      <div className="flex items-start gap-3">
        <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-red-700 text-sm">Failed to load Instagram data</p>
          <p className="text-red-500 text-xs mt-1">{error}</p>
          <button onClick={() => fetchData(true)} className="mt-3 text-xs font-semibold text-red-600 flex items-center gap-1">
            <RefreshCw size={12} /> Try again
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)' }}>
          <FileText size={16} color="white" />
        </div>
        <div>
          <h2 className="font-bold text-slate-900 text-lg leading-tight">Caption Analyzer</h2>
          <p className="text-slate-400 text-xs">
            @{account?.username} · {captionData.length} captions analyzed
            {fetchedAt && ` · Updated ${new Date(fetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
          </p>
        </div>
      </div>

      {/* ── Sticky control bar ────────────────────────────────────────────── */}
      <div className="sticky top-16 z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 bg-white border-b border-slate-200 shadow-sm">
        <div className="py-2.5 flex items-center gap-3 flex-wrap">
          {/* Content type chips */}
          <div className="flex flex-wrap gap-1.5 flex-1 min-w-0 items-center">
            {CONTENT_FILTERS.map(f => {
              const isActive = activeFilters.includes(f.id);
              return (
                <button key={f.id} onClick={() => toggleFilter(f.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                    isActive ? 'text-white border-transparent shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                  style={isActive ? { background: f.color, borderColor: f.color } : {}}>
                  {f.label}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    {counts[f.id] ?? 0}
                  </span>
                </button>
              );
            })}
            {activeFilters.length === 0 && (
              <button onClick={() => setActiveFilters(['photo','carousel','reel','collab','other'])}
                className="text-xs text-pink-600 font-medium underline underline-offset-2">
                Reset filters
              </button>
            )}
          </div>

          {/* Date range */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {['7','30','90'].map(d => (
              <button key={d} onClick={() => { setDatePreset(d); setCustomStart(''); setCustomEnd(''); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                  datePreset === d ? 'text-white border-transparent shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                }`}
                style={datePreset === d ? { background: IG_PINK, borderColor: IG_PINK } : {}}>
                {d}d
              </button>
            ))}
            <button onClick={() => setDatePreset('custom')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                datePreset === 'custom' ? 'text-white border-transparent shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
              }`}
              style={datePreset === 'custom' ? { background: IG_PINK, borderColor: IG_PINK } : {}}>
              Custom
            </button>
            {datePreset === 'custom' && (
              <div className="flex items-center gap-1.5 ml-1">
                <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
                  className="text-xs border border-slate-200 rounded-lg px-2 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-pink-400" />
                <span className="text-slate-400 text-xs">→</span>
                <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
                  className="text-xs border border-slate-200 rounded-lg px-2 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-pink-400" />
              </div>
            )}
          </div>

          {/* Refresh */}
          <button onClick={() => fetchData(true)} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-50 flex-shrink-0">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Empty states ──────────────────────────────────────────────────── */}
      {filteredMedia.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-slate-400 text-sm">No posts match the current filters.</p>
          <button onClick={() => setActiveFilters(['photo','carousel','reel','collab','other'])}
            className="mt-3 text-xs text-pink-600 font-semibold underline underline-offset-2">
            Reset filters
          </button>
        </div>
      ) : captionData.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-slate-400 text-sm">No captions found in the filtered posts.</p>
        </div>
      ) : (
        <>
          {/* ── KPI cards ─────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              label="Avg Hook Score"
              value={`${avgHookScore} / 10`}
              subtext={`${captionData.length} posts analyzed`}
              icon={<span className="text-lg">🎯</span>}
              iconBg="bg-pink-50"
              iconColor="text-pink-600"
            />
            <StatCard
              label="Captions w/ a Question"
              value={`${questionPct}%`}
              subtext={`${questionPosts.length} of ${captionData.length} posts`}
              icon={<HelpCircle size={20} />}
              iconBg="bg-violet-50"
              iconColor="text-violet-600"
            />
            <StatCard
              label="Avg Caption Length"
              value={`${avgWordCount} words`}
              subtext="Across filtered posts"
              icon={<AlignLeft size={20} />}
              iconBg="bg-slate-50"
              iconColor="text-slate-500"
            />
            <StatCard
              label="Most-Used Hashtag"
              value={topHashtag ?? '—'}
              subtext={topHashtag ? `${hashtagFreq[topHashtag]} uses` : 'No hashtags found'}
              icon={<Hash size={20} />}
              iconBg="bg-fuchsia-50"
              iconColor="text-fuchsia-600"
            />
          </div>

          {/* ── Hook Score Distribution ────────────────────────────────────── */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Hook Score Distribution</h3>
                <p className="text-slate-400 text-xs mt-0.5">How your captions score on the opening hook (0–10)</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                {scoreBands.map(b => (
                  <div key={b.band} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: BAND_COLORS[b.band] }} />
                    <span className="text-xs text-slate-500">{b.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={scoreBands} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={value => [value, 'Posts']}
                  labelFormatter={(label, payload) =>
                    payload?.[0]?.payload ? `${label} (${payload[0].payload.range})` : label
                  }
                  contentStyle={{ background: '#0f172a', border: 'none', borderRadius: 12, color: '#f8fafc' }}
                  itemStyle={{ color: '#e2e8f0' }}
                  labelStyle={{ color: '#94a3b8' }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={80}>
                  {scoreBands.map(b => <Cell key={b.band} fill={BAND_COLORS[b.band]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* ── Best / Weakest openers ─────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card">
              <h3 className="font-bold text-slate-900 text-sm mb-3">🏅 Best Hook Openers</h3>
              <div className="space-y-1">
                {topHooks.map(post => (
                  <div key={post.id} onClick={() => setSelectedPost(post)}
                    className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
                    <ScoreBadge score={post.hookScore} />
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-700 text-xs font-medium leading-snug line-clamp-2">
                        {truncate(post.hook, 90) || '(No hook)'}
                      </p>
                      <p className="text-slate-400 text-[10px] mt-1">
                        {mediaEmoji(post.mediaType)} · {fmtDate(post.timestamp)} · ❤️ {post.engagementRate?.toFixed(1) ?? '0'}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h3 className="font-bold text-slate-900 text-sm mb-3">⚠️ Weakest Hook Openers</h3>
              <div className="space-y-1">
                {bottomHooks.map(post => (
                  <div key={post.id} onClick={() => setSelectedPost(post)}
                    className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
                    <ScoreBadge score={post.hookScore} />
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-700 text-xs font-medium leading-snug line-clamp-2">
                        {truncate(post.hook || post.caption, 90) || '(No caption)'}
                      </p>
                      <p className="text-slate-400 text-[10px] mt-1">
                        {mediaEmoji(post.mediaType)} · {fmtDate(post.timestamp)} · ❤️ {post.engagementRate?.toFixed(1) ?? '0'}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Insights panel ─────────────────────────────────────────────── */}
          <div className="card">
            <h3 className="font-bold text-slate-900 text-sm mb-4">💡 Caption Strategy Insights</h3>
            <div className="divide-y divide-slate-50">

              {questionMultiplier && parseFloat(questionMultiplier) !== 1 && (
                <div className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-slate-800 text-sm font-semibold">
                      Questions drive {questionMultiplier}× more comments
                    </p>
                    <p className="text-slate-400 text-xs mt-0.5">
                      Question hooks average {qCommentRate.toFixed(2)}% comment rate vs. {nqCommentRate.toFixed(2)}% for non-question openers.
                    </p>
                  </div>
                </div>
              )}

              {numberOpenerPosts.length >= 2 && parseFloat(numberAdvantage) > 0 && (
                <div className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-slate-800 text-sm font-semibold">
                      Number openers score {numberAdvantage} pts higher on average
                    </p>
                    <p className="text-slate-400 text-xs mt-0.5">
                      Posts starting with a number ("3 things", "5 ways") average {numberAvgScore.toFixed(1)}/10 vs. {nonNumberAvgScore.toFixed(1)}/10 for other openers.
                    </p>
                  </div>
                </div>
              )}

              {shortCaptionPct > 25 && (
                <div className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-slate-800 text-sm font-semibold">
                      {shortCaptionPct}% of captions are under 20 words
                    </p>
                    <p className="text-slate-400 text-xs mt-0.5">
                      Short captions miss the chance to invite community response and drive saves. Try adding a question, a story beat, or a clear next step.
                    </p>
                  </div>
                </div>
              )}

              {ctaPct < 40 && (
                <div className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-slate-800 text-sm font-semibold">
                      Only {ctaPct}% of captions open with a clear call to action
                    </p>
                    <p className="text-slate-400 text-xs mt-0.5">
                      Leading with an action ("Share this if…", "Tag someone who needs this") signals to followers what to do and boosts engagement signals.
                    </p>
                  </div>
                </div>
              )}

              {topHashtag && (
                <div className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <Info size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-slate-800 text-sm font-semibold">
                      Top topic: {topHashtag} ({hashtagFreq[topHashtag]} posts)
                    </p>
                    <p className="text-slate-400 text-xs mt-0.5">
                      Consistent topic tagging helps Instagram surface your content to the right audience. Consider reinforcing this across your series.
                    </p>
                  </div>
                </div>
              )}

              {avgHookScore < 5 && (
                <div className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <Info size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-slate-800 text-sm font-semibold">
                      Average hook score is {avgHookScore}/10 — there's room to grow
                    </p>
                    <p className="text-slate-400 text-xs mt-0.5">
                      Even one small change — adding a question, leading with a number, or naming a felt need — can meaningfully lift your hook strength and early engagement.
                    </p>
                  </div>
                </div>
              )}

            </div>
          </div>

          {/* ── All Captions Table ─────────────────────────────────────────── */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 text-sm">All Captions</h3>
              <span className="text-xs text-slate-400">{captionData.length} posts</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left font-semibold text-slate-400 py-2 pr-3 w-8">#</th>
                    <th className="text-left font-semibold text-slate-400 py-2 pr-4">Hook Preview</th>
                    {[
                      { key: 'hookScore',     label: 'Score'    },
                      { key: 'engagementRate', label: 'Eng. Rate' },
                      { key: 'timestamp',      label: 'Date'     },
                    ].map(({ key, label }) => {
                      const active = tableSort.key === key;
                      return (
                        <th key={key} onClick={() => toggleSort(key)}
                          className={`text-left font-semibold py-2 pr-4 cursor-pointer select-none whitespace-nowrap ${
                            active ? 'text-pink-500' : 'text-slate-400 hover:text-slate-600'
                          }`}>
                          {label} {active ? (tableSort.dir === 'desc' ? '↓' : '↑') : ''}
                        </th>
                      );
                    })}
                    <th className="text-left font-semibold text-slate-400 py-2">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleCaptions.map((post, i) => (
                    <tr key={post.id} onClick={() => setSelectedPost(post)}
                      className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors">
                      <td className="py-2.5 pr-3 text-slate-300 font-mono">{i + 1}</td>
                      <td className="py-2.5 pr-4 max-w-xs">
                        <p className="text-slate-700 font-medium line-clamp-1">{truncate(post.hook, 70) || '(No hook)'}</p>
                        {post.caption && post.caption.trim() !== post.hook && (
                          <p className="text-slate-400 mt-0.5 line-clamp-1">{truncate(post.caption, 60)}</p>
                        )}
                      </td>
                      <td className="py-2.5 pr-4"><ScoreBadge score={post.hookScore} /></td>
                      <td className="py-2.5 pr-4 text-slate-600 tabular-nums">{post.engagementRate?.toFixed(1) ?? '0'}%</td>
                      <td className="py-2.5 pr-4 text-slate-400 font-mono">{fmtDate(post.timestamp)}</td>
                      <td className="py-2.5 text-slate-500">{mediaEmoji(post.mediaType)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {sortedCaptions.length > tableLimit && (
              <button onClick={() => setTableLimit(l => l + 20)}
                className="mt-4 w-full text-xs text-slate-500 font-medium py-2.5 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all">
                Load more · {sortedCaptions.length - tableLimit} remaining
              </button>
            )}
          </div>
        </>
      )}

      {/* ── Post Spotlight ────────────────────────────────────────────────── */}
      {selectedPost && (
        <PostSpotlight
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
          accountName={account?.username || 'lpconnect'}
          platform="instagram"
        />
      )}

    </div>
  );
}
