// ─────────────────────────────────────────────────────────────────────────────
// Lake Pointe Church — Social Media Demo Data (v2)
// 365 days of data · Facebook, Instagram, YouTube, TikTok
// ─────────────────────────────────────────────────────────────────────────────

function seededRand(seed) {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646; };
}

// Anchor dates for the demo dataset
export const DATA_END_DATE   = '2026-04-07';
export const DATA_START_DATE = '2025-04-07';

function generateDates(days) {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(DATA_END_DATE);
    d.setDate(d.getDate() - (days - 1 - i));
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });
}

function generateISODates(days) {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(DATA_END_DATE);
    d.setDate(d.getDate() - (days - 1 - i));
    return d.toISOString().split('T')[0];
  });
}

// Filter any history array to an ISO date range ('YYYY-MM-DD')
export function filterHistory(history, startISO, endISO) {
  if (!startISO || !endISO) return history;
  return history.filter(item => item.dateISO >= startISO && item.dateISO <= endISO);
}

function generateTrend(start, end, days, volatility = 0.025, seed = 42) {
  const rand = seededRand(seed);
  return Array.from({ length: days }, (_, i) => {
    const trend    = start + (end - start) * (i / (days - 1));
    const noise    = trend * volatility * (rand() - 0.5) * 2;
    const sunBoost = (i % 7 === 0) ? trend * 0.014 : 0;
    return Math.round(trend + noise + sunBoost);
  });
}

export const DAYS = 365;
const dates    = generateDates(DAYS);
const isoDates = generateISODates(DAYS);

// ── Platform definitions ──────────────────────────────────────────────────────
export const platforms = {
  facebook: {
    id: 'facebook', name: 'Facebook', color: '#1877F2', bgLight: '#EBF5FF',
    followers: 47823, followersStart: 43210, growth: 4613, growthPct: 10.7,
    reach: 234567, reachPrev: 218432, engagement: 18432, engagementPrev: 16890,
    engagementRate: 3.8, posts: 24, avgLikes: 412, avgComments: 34, avgShares: 89,
    videoViews: 67823, topCity: 'Rockwall, TX', status: 'Connected',
  },
  instagram: {
    id: 'instagram', name: 'Instagram', color: '#E1306C', bgLight: '#FDF2F8',
    followers: 28456, followersStart: 22100, growth: 6356, growthPct: 28.8,
    reach: 156789, reachPrev: 134567, engagement: 14234, engagementPrev: 11890,
    engagementRate: 5.2, posts: 31, avgLikes: 334, avgComments: 28, avgShares: 67,
    videoViews: 89012, topCity: 'Rockwall, TX', status: 'Connected',
  },
  youtube: {
    id: 'youtube', name: 'YouTube', color: '#FF0000', bgLight: '#FEF2F2',
    followers: 89234, followersStart: 52000, growth: 37234, growthPct: 71.6,
    reach: 423891, reachPrev: 378234, engagement: 31245, engagementPrev: 27890,
    engagementRate: 4.1, posts: 16, avgLikes: 1234, avgComments: 156, avgShares: 234,
    videoViews: 423891, watchTimeHours: 18432, avgViewDuration: '4:23',
    topCity: 'Dallas-Fort Worth', status: 'Connected',
  },
  tiktok: {
    id: 'tiktok', name: 'TikTok', color: '#010101', colorAlt: '#EE1D52', bgLight: '#F9F9F9',
    followers: 15672, followersStart: 3200, growth: 12472, growthPct: 389.8,
    reach: 287456, reachPrev: 198234, engagement: 23456, engagementPrev: 15678,
    engagementRate: 8.1, posts: 28, avgLikes: 678, avgComments: 89, avgShares: 145,
    videoViews: 287456, topCity: 'N/A', status: 'Connected',
    geoNote: 'Geographic data not available via TikTok API',
  },
};

// ── 365-day time series ───────────────────────────────────────────────────────
const fbF  = generateTrend(43210, 47823, DAYS, 0.008, 11);
const igF  = generateTrend(22100, 28456, DAYS, 0.012, 22);
const ytF  = generateTrend(52000, 89234, DAYS, 0.015, 33);
const ttF  = generateTrend(3200,  15672, DAYS, 0.025, 44);

export const followerHistory = dates.map((date, i) => ({
  date, dateISO: isoDates[i], Facebook: fbF[i], Instagram: igF[i], YouTube: ytF[i], TikTok: ttF[i],
}));

const fbR = generateTrend(155000, 234567, DAYS, 0.06, 66);
const igR = generateTrend( 90000, 156789, DAYS, 0.07, 77);
const ytR = generateTrend(210000, 423891, DAYS, 0.08, 88);
const ttR = generateTrend( 50000, 287456, DAYS, 0.10, 99);

export const reachHistory = dates.map((date, i) => ({
  date, dateISO: isoDates[i], Facebook: fbR[i], Instagram: igR[i], YouTube: ytR[i], TikTok: ttR[i],
}));

const fbE = generateTrend( 9000, 18432, DAYS, 0.07, 111);
const igE = generateTrend( 5500, 14234, DAYS, 0.09, 222);
const ytE = generateTrend(12000, 31245, DAYS, 0.08, 333);
const ttE = generateTrend( 2500, 23456, DAYS, 0.12, 444);

export const engagementHistory = dates.map((date, i) => ({
  date, dateISO: isoDates[i], Facebook: fbE[i], Instagram: igE[i], YouTube: ytE[i], TikTok: ttE[i],
}));

// ── Weekly summary ────────────────────────────────────────────────────────────
export const weeklyStats = Array.from({ length: 52 }, (_, i) => {
  const w = 52 - i;
  const r = seededRand(w * 13);
  return {
    week: `Wk ${w}`,
    totalReach:        Math.round(55000  + w * 3500 + r() * 12000),
    totalEngagement:   Math.round(3800   + w * 280  + r() * 1500),
    totalFollowerGain: Math.round(60     + w * 18   + r() * 40),
    posts: Math.round(8 + r() * 5),
  };
}).reverse();

// ── Top posts ─────────────────────────────────────────────────────────────────
export const topPosts = [
  { id:1, platform:'youtube',   platformName:'YouTube',   type:'Video',       title:'"When God Feels Silent" — Easter Sunday Sermon',        date:'Mar 31, 2026', views:48234, likes:3412, comments:287, shares:891, reach:62340, watchTime:'5:12 avg', engagementRate:9.6  },
  { id:2, platform:'tiktok',    platformName:'TikTok',    type:'Short Video', title:'Worship moment — "Graves Into Gardens"',                 date:'Apr 1, 2026',  views:94567, likes:8234, comments:412, shares:2341, reach:94567, watchTime:'0:42 avg', engagementRate:11.6 },
  { id:3, platform:'instagram', platformName:'Instagram', type:'Reel',        title:'Easter baptisms — 47 people said yes to Jesus 🙌',       date:'Apr 1, 2026',  views:31890, likes:4567, comments:634, shares:1234, reach:31890, watchTime:'0:58 avg', engagementRate:20.2 },
  { id:4, platform:'facebook',  platformName:'Facebook',  type:'Video',       title:'Easter Sunday full service — All 3 campuses LIVE',       date:'Mar 31, 2026', views:28901, likes:1823, comments:312, shares:789,  reach:42340, watchTime:'18:34 avg',engagementRate:7.1  },
  { id:5, platform:'youtube',   platformName:'YouTube',   type:'Video',       title:'"The Sermon on the Mount" — Part 1',                    date:'Apr 7, 2026',  views:19234, likes:1456, comments:198, shares:412,  reach:24567, watchTime:'6:44 avg', engagementRate:8.6  },
  { id:6, platform:'instagram', platformName:'Instagram', type:'Carousel',    title:'10 ways your church family made an impact in Q1 2026',  date:'Apr 3, 2026',  views:12340, likes:2890, comments:234, shares:567,  reach:18930, watchTime:null,        engagementRate:19.5 },
];

// ── Content type performance ──────────────────────────────────────────────────
export const contentTypeData = [
  { type:'Live Service',    avgReach:38420, avgEngagement:8.2,  posts:12, icon:'⛪' },
  { type:'Short Video',     avgReach:52340, avgEngagement:10.4, posts:34, icon:'🎬' },
  { type:'Sermon Clip',     avgReach:28900, avgEngagement:7.1,  posts:28, icon:'🎙️'  },
  { type:'Worship Music',   avgReach:41230, avgEngagement:9.3,  posts:19, icon:'🎵' },
  { type:'Devotional',      avgReach:18450, avgEngagement:6.4,  posts:22, icon:'📖' },
  { type:'Community Story', avgReach:22100, avgEngagement:11.2, posts:15, icon:'❤️'  },
  { type:'Event Promo',     avgReach:15670, avgEngagement:4.8,  posts:18, icon:'📣' },
  { type:'Baptism',         avgReach:45890, avgEngagement:14.7, posts:8,  icon:'💧' },
];

// ── Best time to post (engagement by hour/day) ────────────────────────────────
export const bestTimeData = {
  byHour: [
    { hour:'12am', engagement:120  },{ hour:'1am',  engagement:80   },
    { hour:'2am',  engagement:60   },{ hour:'3am',  engagement:45   },
    { hour:'4am',  engagement:55   },{ hour:'5am',  engagement:90   },
    { hour:'6am',  engagement:210  },{ hour:'7am',  engagement:380  },
    { hour:'8am',  engagement:620  },{ hour:'9am',  engagement:840  },
    { hour:'10am', engagement:1120 },{ hour:'11am', engagement:1340 },
    { hour:'12pm', engagement:1580 },{ hour:'1pm',  engagement:1420 },
    { hour:'2pm',  engagement:1280 },{ hour:'3pm',  engagement:1190 },
    { hour:'4pm',  engagement:1310 },{ hour:'5pm',  engagement:1480 },
    { hour:'6pm',  engagement:1720 },{ hour:'7pm',  engagement:1890 },
    { hour:'8pm',  engagement:1950 },{ hour:'9pm',  engagement:1780 },
    { hour:'10pm', engagement:1340 },{ hour:'11pm', engagement:780  },
  ],
  byDay: [
    { day:'Sun', engagement:3840, posts:18 },
    { day:'Mon', engagement:1240, posts:12 },
    { day:'Tue', engagement:980,  posts:11 },
    { day:'Wed', engagement:1560, posts:14 },
    { day:'Thu', engagement:1120, posts:10 },
    { day:'Fri', engagement:1680, posts:13 },
    { day:'Sat', engagement:2340, posts:15 },
  ],
};

// ── Geographic breakdown ──────────────────────────────────────────────────────
export const geoData = {
  all: {
    countries: [
      { name:'United States', value:82.4, followers:127834, flag:'🇺🇸' },
      { name:'Canada',        value:4.1,  followers:6367,   flag:'🇨🇦' },
      { name:'Mexico',        value:3.8,  followers:5898,   flag:'🇲🇽' },
      { name:'United Kingdom',value:2.6,  followers:4034,   flag:'🇬🇧' },
      { name:'Australia',     value:1.9,  followers:2949,   flag:'🇦🇺' },
      { name:'Brazil',        value:1.4,  followers:2172,   flag:'🇧🇷' },
      { name:'Other',         value:3.8,  followers:5898,   flag:'🌍' },
    ],
    cities: [
      { name:'Rockwall, TX',    value:28.4, followers:44094 },
      { name:'Dallas, TX',      value:19.2, followers:29798 },
      { name:'Heath, TX',       value:11.7, followers:18158 },
      { name:'Rowlett, TX',     value:8.9,  followers:13815 },
      { name:'Garland, TX',     value:6.4,  followers:9933  },
      { name:'Forney, TX',      value:5.1,  followers:7917  },
      { name:'Mesquite, TX',    value:4.3,  followers:6675  },
      { name:'Other TX cities', value:9.8,  followers:15213 },
      { name:'Outside Texas',   value:6.2,  followers:9622  },
    ],
  },
  facebook: {
    countries: [
      { name:'United States', value:88.1, followers:42133, flag:'🇺🇸' },
      { name:'Canada',        value:3.8,  followers:1817,  flag:'🇨🇦' },
      { name:'Mexico',        value:2.9,  followers:1387,  flag:'🇲🇽' },
      { name:'United Kingdom',value:2.1,  followers:1004,  flag:'🇬🇧' },
      { name:'Other',         value:3.1,  followers:1482,  flag:'🌍' },
    ],
    cities: [
      { name:'Rockwall, TX',    value:31.2, followers:14922 },
      { name:'Dallas, TX',      value:20.8, followers:9947  },
      { name:'Heath, TX',       value:13.4, followers:6408  },
      { name:'Rowlett, TX',     value:9.7,  followers:4641  },
      { name:'Garland, TX',     value:7.1,  followers:3396  },
      { name:'Forney, TX',      value:5.6,  followers:2678  },
      { name:'Other TX cities', value:12.2, followers:5834  },
    ],
  },
  instagram: {
    countries: [
      { name:'United States', value:79.4, followers:22594, flag:'🇺🇸' },
      { name:'Canada',        value:5.2,  followers:1480,  flag:'🇨🇦' },
      { name:'Mexico',        value:4.8,  followers:1366,  flag:'🇲🇽' },
      { name:'Brazil',        value:3.1,  followers:882,   flag:'🇧🇷' },
      { name:'Other',         value:7.5,  followers:2134,  flag:'🌍' },
    ],
    cities: [
      { name:'Rockwall, TX',    value:24.6, followers:6993 },
      { name:'Dallas, TX',      value:18.9, followers:5378 },
      { name:'Heath, TX',       value:10.2, followers:2903 },
      { name:'Rowlett, TX',     value:8.1,  followers:2305 },
      { name:'Garland, TX',     value:6.3,  followers:1793 },
      { name:'Mesquite, TX',    value:5.8,  followers:1650 },
      { name:'Other TX cities', value:26.1, followers:7424 },
    ],
  },
  youtube: {
    countries: [
      { name:'United States', value:76.8, followers:68532, flag:'🇺🇸' },
      { name:'Canada',        value:5.4,  followers:4819,  flag:'🇨🇦' },
      { name:'United Kingdom',value:4.2,  followers:3748,  flag:'🇬🇧' },
      { name:'Australia',     value:3.1,  followers:2766,  flag:'🇦🇺' },
      { name:'Other',         value:10.5, followers:9369,  flag:'🌍' },
    ],
    cities: [
      { name:'Dallas-Fort Worth', value:35.4, followers:31589 },
      { name:'Houston, TX',       value:12.1, followers:10797 },
      { name:'Austin, TX',        value:8.9,  followers:7942  },
      { name:'Rockwall, TX',      value:7.8,  followers:6960  },
      { name:'San Antonio, TX',   value:5.6,  followers:4998  },
      { name:'Other TX cities',   value:15.1, followers:13474 },
      { name:'Outside Texas',     value:15.1, followers:13474 },
    ],
  },
  tiktok: null, // not available via API
};

// ── Age & gender demographics ─────────────────────────────────────────────────
export const ageData = {
  all: [
    { age:'13–17', male:2.8,  female:3.9  },
    { age:'18–24', male:11.2, female:15.4 },
    { age:'25–34', male:17.8, female:21.6 },
    { age:'35–44', male:15.2, female:18.9 },
    { age:'45–54', male:8.4,  female:10.6 },
    { age:'55–64', male:4.1,  female:5.8  },
    { age:'65+',   male:2.9,  female:4.1  },
  ],
  facebook: [
    { age:'13–17', male:1.2,  female:1.8  },
    { age:'18–24', male:6.8,  female:8.9  },
    { age:'25–34', male:14.2, female:17.4 },
    { age:'35–44', male:18.9, female:22.8 },
    { age:'45–54', male:13.2, female:15.6 },
    { age:'55–64', male:7.8,  female:9.4  },
    { age:'65+',   male:5.6,  female:7.2  },
  ],
  instagram: [
    { age:'13–17', male:4.8,  female:7.2  },
    { age:'18–24', male:18.4, female:24.8 },
    { age:'25–34', male:22.1, female:26.4 },
    { age:'35–44', male:11.8, female:14.2 },
    { age:'45–54', male:4.2,  female:5.6  },
    { age:'55–64', male:1.4,  female:2.1  },
    { age:'65+',   male:0.6,  female:0.8  },
  ],
  youtube: [
    { age:'13–17', male:3.8,  female:3.2  },
    { age:'18–24', male:14.6, female:12.8 },
    { age:'25–34', male:21.4, female:18.6 },
    { age:'35–44', male:17.2, female:14.8 },
    { age:'45–54', male:9.8,  female:7.4  },
    { age:'55–64', male:5.2,  female:3.8  },
    { age:'65+',   male:3.4,  female:2.1  },
  ],
  tiktok: [
    { age:'13–17', male:6.8,  female:9.4  },
    { age:'18–24', male:24.8, female:31.2 },
    { age:'25–34', male:18.4, female:22.6 },
    { age:'35–44', male:8.2,  female:10.4 },
    { age:'45–54', male:2.8,  female:3.4  },
    { age:'55–64', male:0.8,  female:1.2  },
    { age:'65+',   male:0.2,  female:0.4  },
  ],
};

// ── Milestones ────────────────────────────────────────────────────────────────
export const milestones = [
  { platform:'youtube',   label:'100K Subscribers',  current:89234, target:100000, color:'#FF0000', daysAway:10,  emoji:'🎯' },
  { platform:'facebook',  label:'50K Followers',      current:47823, target:50000,  color:'#1877F2', daysAway:18,  emoji:'🎯' },
  { platform:'instagram', label:'30K Followers',      current:28456, target:30000,  color:'#E1306C', daysAway:12,  emoji:'🎯' },
  { platform:'tiktok',    label:'20K Followers',      current:15672, target:20000,  color:'#EE1D52', daysAway:25,  emoji:'🎯' },
];

// ── Aggregates ────────────────────────────────────────────────────────────────
export const totals = {
  totalFollowers:    181185,
  followerGrowth:    60675,
  followerGrowthPct: 50.3,
  totalReach:        1102703,
  totalEngagement:   87367,
  avgEngagementRate: 5.4,
  totalPosts:        99,
  totalVideoViews:   868179,
};

// ── Platform comparison ───────────────────────────────────────────────────────
export const platformComparison = [
  { platform:'Facebook',  followers:47823, growth:10.7,  engRate:3.8, reach:234567, posts:24 },
  { platform:'Instagram', followers:28456, growth:28.8,  engRate:5.2, reach:156789, posts:31 },
  { platform:'YouTube',   followers:89234, growth:71.6,  engRate:4.1, reach:423891, posts:16 },
  { platform:'TikTok',    followers:15672, growth:389.8, engRate:8.1, reach:287456, posts:28 },
];

// ── AI context string ─────────────────────────────────────────────────────────
export function getDataContext() {
  return `
LAKE POINTE CHURCH — SOCIAL MEDIA ANALYTICS (Last 365 Days)
Report Date: April 7, 2026
Platforms Tracked: Facebook, Instagram, YouTube, TikTok

═══ TOTALS ═══
Total Followers: 181,185 | Growth (365d): +60,675 (+50.3%)
Total Monthly Reach: 1,102,703 | Total Engagement: 87,367
Avg Engagement Rate: 5.4% | Total Posts: 99 | Video Views: 868,179

═══ PLATFORM DETAILS ═══

FACEBOOK  — 47,823 followers (+4,613 / +10.7% last 365d)
  Reach: 234,567 | Engagement: 18,432 (3.8%) | Posts: 24
  Avg: 412 likes · 34 comments · 89 shares | Video Views: 67,823
  Top city: Rockwall TX (31.2%) | Top country: USA (88.1%)

INSTAGRAM — 28,456 followers (+6,356 / +28.8%)
  Reach: 156,789 | Engagement: 14,234 (5.2%) | Posts: 31
  Avg: 334 likes · 28 comments · 67 shares | Video Views: 89,012
  Top city: Rockwall TX (24.6%) | Top country: USA (79.4%)

YOUTUBE   — 89,234 subscribers (+37,234 / +71.6%) ← FASTEST ABSOLUTE GROWTH
  Views: 423,891 | Engagement: 31,245 (4.1%) | Videos: 16
  Watch Time: 18,432 hrs | Avg Duration: 4:23
  ~108 new subs/day → will hit 100K in ~10 days
  Top city: Dallas-Fort Worth (35.4%) | Top country: USA (76.8%)

TIKTOK    — 15,672 followers (+12,472 / +389.8%) ← FASTEST % GROWTH
  Views: 287,456 | Engagement: 23,456 (8.1%) | Videos: 28
  Avg: 678 likes · 89 comments · 145 shares
  Note: Geographic/demographic data NOT available via TikTok API.

═══ AUDIENCE DEMOGRAPHICS ═══

Overall age split (male/female %):
  13–17: M 2.8% / F 3.9%
  18–24: M 11.2% / F 15.4%
  25–34: M 17.8% / F 21.6%  ← Largest segment
  35–44: M 15.2% / F 18.9%
  45–54: M 8.4% / F 10.6%
  55–64: M 4.1% / F 5.8%
  65+:   M 2.9% / F 4.1%
Female-skewed overall audience.

Facebook skews older (35–54 peak). Instagram & TikTok skew younger (18–34 peak).
YouTube has a strong 25–44 core.

═══ GEOGRAPHIC BREAKDOWN ═══

Top Cities (all platforms): Rockwall TX 28.4%, Dallas TX 19.2%, Heath TX 11.7%, Rowlett TX 8.9%, Garland TX 6.4%
Top Countries: USA 82.4%, Canada 4.1%, Mexico 3.8%, UK 2.6%, Australia 1.9%
YouTube has the most geographic diversity — 23.2% international audience.
Facebook audience is most local (88.1% USA, heavy Rockwall/Dallas TX).

═══ TOP CONTENT ═══
1. TikTok — Easter worship "Graves Into Gardens": 94,567 views, 11.6% eng
2. YouTube — Easter sermon "When God Feels Silent": 48,234 views, 9.6% eng
3. Instagram — Easter baptisms Reel (47 baptisms): 31,890 views, 20.2% eng
4. Facebook — Easter Sunday LIVE all campuses: 28,901 views, 7.1% eng
5. Instagram — "10 ways church made impact" carousel: 12,340 views, 19.5% eng

Best content by engagement rate: Baptism content (14.7% avg), Community Stories (11.2%)
Best content by reach: Short videos (52,340 avg), Worship music (41,230 avg)
Sunday posts outperform weekday posts by 3.1x. Video outperforms static by 3.1x.

═══ BEST TIMES TO POST ═══
Best day: Sunday (3,840 avg engagement, 3.1x above average)
Wednesday is the #2 day (mid-week sermon study content performs well)
Best hours: 6–9pm (peak: 8pm at 1,950 avg engagement)
Worst time: 2–5am

═══ MILESTONES ═══
YouTube: 89,234 / 100,000 subscribers — ~10 days away
Facebook: 47,823 / 50,000 followers — ~18 days away
Instagram: 28,456 / 30,000 followers — ~12 days away
TikTok: 15,672 / 20,000 followers — ~25 days away
`.trim();
}
