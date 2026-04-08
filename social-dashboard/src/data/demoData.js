// ─────────────────────────────────────────────────────────────────────────────
// Lake Pointe Church — Social Media Demo Data
// Replace with real API data when credentials are configured
// ─────────────────────────────────────────────────────────────────────────────

// ── Helpers ──────────────────────────────────────────────────────────────────
function seededRand(seed) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateDates(days) {
  const dates = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date('2026-04-07');
    d.setDate(d.getDate() - i);
    dates.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
  }
  return dates;
}

function generateTrend(start, end, days, volatility = 0.025, seed = 42) {
  const rand = seededRand(seed);
  return Array.from({ length: days }, (_, i) => {
    const trend = start + (end - start) * (i / (days - 1));
    const noise = trend * volatility * (rand() - 0.5) * 2;
    // Sunday spike simulation (every 7th day from offset)
    const sundayBoost = (i % 7 === 0) ? trend * 0.012 : 0;
    return Math.round(trend + noise + sundayBoost);
  });
}

const DAYS = 90;
const dates = generateDates(DAYS);

// ── Platform current stats ────────────────────────────────────────────────────
export const platforms = {
  facebook: {
    id: 'facebook',
    name: 'Facebook',
    color: '#1877F2',
    bgLight: '#EBF5FF',
    emoji: '📘',
    followers: 47823,
    followersStart: 46576,
    growth: 1247,
    growthPct: 2.68,
    reach: 234567,
    reachPrev: 218432,
    impressions: 412890,
    engagement: 18432,
    engagementPrev: 16890,
    engagementRate: 3.8,
    posts: 24,
    avgLikes: 412,
    avgComments: 34,
    avgShares: 89,
    videoViews: 67823,
    topCity: 'Rockwall, TX',
    status: 'Connected',
  },
  instagram: {
    id: 'instagram',
    name: 'Instagram',
    color: '#E1306C',
    bgLight: '#FDF2F8',
    emoji: '📷',
    followers: 28456,
    followersStart: 26312,
    growth: 2144,
    growthPct: 8.15,
    reach: 156789,
    reachPrev: 134567,
    impressions: 289034,
    engagement: 14234,
    engagementPrev: 11890,
    engagementRate: 5.2,
    posts: 31,
    avgLikes: 334,
    avgComments: 28,
    avgShares: 67,
    videoViews: 89012,
    topCity: 'Rockwall, TX',
    status: 'Connected',
  },
  youtube: {
    id: 'youtube',
    name: 'YouTube',
    color: '#FF0000',
    bgLight: '#FEF2F2',
    emoji: '▶️',
    followers: 89234,
    followersStart: 79456,
    growth: 9778,
    growthPct: 12.31,
    reach: 423891,
    reachPrev: 378234,
    impressions: 834567,
    engagement: 31245,
    engagementPrev: 27890,
    engagementRate: 4.1,
    posts: 16,
    avgLikes: 1234,
    avgComments: 156,
    avgShares: 234,
    videoViews: 423891,
    watchTimeHours: 18432,
    avgViewDuration: '4:23',
    topCity: 'Dallas-Fort Worth',
    status: 'Connected',
  },
  tiktok: {
    id: 'tiktok',
    name: 'TikTok',
    color: '#010101',
    colorAlt: '#EE1D52',
    bgLight: '#F9F9F9',
    emoji: '🎵',
    followers: 15672,
    followersStart: 11678,
    growth: 3994,
    growthPct: 34.2,
    reach: 287456,
    reachPrev: 198234,
    impressions: 412890,
    engagement: 23456,
    engagementPrev: 15678,
    engagementRate: 8.1,
    posts: 28,
    avgLikes: 678,
    avgComments: 89,
    avgShares: 145,
    videoViews: 287456,
    topCity: 'N/A (not available)',
    status: 'Connected',
    geoNote: 'Geographic data not available via TikTok API',
  },
  linkedin: {
    id: 'linkedin',
    name: 'LinkedIn',
    color: '#0A66C2',
    bgLight: '#EEF3FB',
    emoji: '💼',
    followers: 8341,
    followersStart: 8074,
    growth: 267,
    growthPct: 3.31,
    reach: 45678,
    reachPrev: 43234,
    impressions: 89034,
    engagement: 2456,
    engagementPrev: 2234,
    engagementRate: 2.9,
    posts: 12,
    avgLikes: 145,
    avgComments: 18,
    avgShares: 34,
    videoViews: 12890,
    topCity: 'Dallas-Fort Worth',
    status: 'Manual (CSV)',
  },
};

// ── 90-day follower history ───────────────────────────────────────────────────
const fbFollowers  = generateTrend(46576, 47823, DAYS, 0.008, 11);
const igFollowers  = generateTrend(26312, 28456, DAYS, 0.012, 22);
const ytFollowers  = generateTrend(79456, 89234, DAYS, 0.015, 33);
const ttFollowers  = generateTrend(11678, 15672, DAYS, 0.025, 44);
const liFollowers  = generateTrend(8074,   8341, DAYS, 0.007, 55);

export const followerHistory = dates.map((date, i) => ({
  date,
  Facebook:  fbFollowers[i],
  Instagram: igFollowers[i],
  YouTube:   ytFollowers[i],
  TikTok:    ttFollowers[i],
  LinkedIn:  liFollowers[i],
}));

// ── 90-day reach history ──────────────────────────────────────────────────────
const fbReach = generateTrend(195000, 234567, DAYS, 0.06, 66);
const igReach = generateTrend(121000, 156789, DAYS, 0.07, 77);
const ytReach = generateTrend(345000, 423891, DAYS, 0.08, 88);
const ttReach = generateTrend(180000, 287456, DAYS, 0.10, 99);

export const reachHistory = dates.map((date, i) => ({
  date,
  Facebook:  fbReach[i],
  Instagram: igReach[i],
  YouTube:   ytReach[i],
  TikTok:    ttReach[i],
}));

// ── 90-day engagement history ─────────────────────────────────────────────────
const fbEng = generateTrend(14500, 18432, DAYS, 0.07, 111);
const igEng = generateTrend(10200, 14234, DAYS, 0.09, 222);
const ytEng = generateTrend(25000, 31245, DAYS, 0.08, 333);
const ttEng = generateTrend(11000, 23456, DAYS, 0.12, 444);

export const engagementHistory = dates.map((date, i) => ({
  date,
  Facebook:  fbEng[i],
  Instagram: igEng[i],
  YouTube:   ytEng[i],
  TikTok:    ttEng[i],
}));

// ── Weekly summary (last 12 weeks) ────────────────────────────────────────────
export const weeklyStats = Array.from({ length: 12 }, (_, i) => {
  const weekNum = 12 - i;
  const rand = seededRand(weekNum * 13);
  return {
    week: `Wk ${weekNum}`,
    totalReach: Math.round(155000 + weekNum * 9000 + rand() * 15000),
    totalEngagement: Math.round(10000 + weekNum * 700 + rand() * 2000),
    totalFollowerGain: Math.round(280 + weekNum * 50 + rand() * 100),
    posts: Math.round(8 + rand() * 5),
  };
}).reverse();

// ── Top performing posts ──────────────────────────────────────────────────────
export const topPosts = [
  {
    id: 1,
    platform: 'youtube',
    platformName: 'YouTube',
    type: 'Video',
    title: '"When God Feels Silent" — Easter Sunday Sermon',
    date: 'Mar 31, 2026',
    thumbnail: 'https://via.placeholder.com/120x68/FF0000/FFFFFF?text=YT',
    views: 48234,
    likes: 3412,
    comments: 287,
    shares: 891,
    reach: 62340,
    watchTime: '5:12 avg',
    engagementRate: 9.6,
  },
  {
    id: 2,
    platform: 'tiktok',
    platformName: 'TikTok',
    type: 'Short Video',
    title: 'Worship moment from Easter — "Graves Into Gardens"',
    date: 'Apr 1, 2026',
    thumbnail: 'https://via.placeholder.com/120x68/010101/FFFFFF?text=TT',
    views: 94567,
    likes: 8234,
    comments: 412,
    shares: 2341,
    reach: 94567,
    watchTime: '0:42 avg',
    engagementRate: 11.6,
  },
  {
    id: 3,
    platform: 'instagram',
    platformName: 'Instagram',
    type: 'Reel',
    title: 'Easter baptisms — 47 people said yes to Jesus 🙌',
    date: 'Apr 1, 2026',
    thumbnail: 'https://via.placeholder.com/120x68/E1306C/FFFFFF?text=IG',
    views: 31890,
    likes: 4567,
    comments: 634,
    shares: 1234,
    reach: 31890,
    watchTime: '0:58 avg',
    engagementRate: 20.2,
  },
  {
    id: 4,
    platform: 'facebook',
    platformName: 'Facebook',
    type: 'Video',
    title: 'Easter Sunday full service — All 3 campuses LIVE',
    date: 'Mar 31, 2026',
    thumbnail: 'https://via.placeholder.com/120x68/1877F2/FFFFFF?text=FB',
    views: 28901,
    likes: 1823,
    comments: 312,
    shares: 789,
    reach: 42340,
    watchTime: '18:34 avg',
    engagementRate: 7.1,
  },
  {
    id: 5,
    platform: 'youtube',
    platformName: 'YouTube',
    type: 'Video',
    title: '"The Sermon on the Mount" — Part 1 of New Series',
    date: 'Apr 7, 2026',
    thumbnail: 'https://via.placeholder.com/120x68/FF0000/FFFFFF?text=YT',
    views: 19234,
    likes: 1456,
    comments: 198,
    shares: 412,
    reach: 24567,
    watchTime: '6:44 avg',
    engagementRate: 8.6,
  },
  {
    id: 6,
    platform: 'instagram',
    platformName: 'Instagram',
    type: 'Carousel',
    title: '10 ways your church family made an impact in Q1 2026',
    date: 'Apr 3, 2026',
    thumbnail: 'https://via.placeholder.com/120x68/E1306C/FFFFFF?text=IG',
    views: 12340,
    likes: 2890,
    comments: 234,
    shares: 567,
    reach: 18930,
    watchTime: null,
    engagementRate: 19.5,
  },
];

// ── Content type performance ──────────────────────────────────────────────────
export const contentTypeData = [
  { type: 'Live Service',   avgReach: 38420, avgEngagement: 8.2,  posts: 12, icon: '⛪' },
  { type: 'Short Video',    avgReach: 52340, avgEngagement: 10.4, posts: 34, icon: '🎬' },
  { type: 'Sermon Clip',    avgReach: 28900, avgEngagement: 7.1,  posts: 28, icon: '🎙️' },
  { type: 'Worship Music',  avgReach: 41230, avgEngagement: 9.3,  posts: 19, icon: '🎵' },
  { type: 'Devotional',     avgReach: 18450, avgEngagement: 6.4,  posts: 22, icon: '📖' },
  { type: 'Community Story',avgReach: 22100, avgEngagement: 11.2, posts: 15, icon: '❤️' },
  { type: 'Event Promo',    avgReach: 15670, avgEngagement: 4.8,  posts: 18, icon: '📣' },
  { type: 'Baptism',        avgReach: 45890, avgEngagement: 14.7, posts: 8,  icon: '💧' },
];

// ── Geographic breakdown ──────────────────────────────────────────────────────
export const geoData = {
  countries: [
    { name: 'United States', value: 82.4, followers: 127834, flag: '🇺🇸' },
    { name: 'Canada',        value: 4.1,  followers: 6367,   flag: '🇨🇦' },
    { name: 'Mexico',        value: 3.8,  followers: 5898,   flag: '🇲🇽' },
    { name: 'United Kingdom',value: 2.6,  followers: 4034,   flag: '🇬🇧' },
    { name: 'Australia',     value: 1.9,  followers: 2949,   flag: '🇦🇺' },
    { name: 'Brazil',        value: 1.4,  followers: 2172,   flag: '🇧🇷' },
    { name: 'Other',         value: 3.8,  followers: 5898,   flag: '🌍' },
  ],
  cities: [
    { name: 'Rockwall, TX',       value: 28.4, followers: 44094 },
    { name: 'Dallas, TX',         value: 19.2, followers: 29798 },
    { name: 'Heath, TX',          value: 11.7, followers: 18158 },
    { name: 'Rowlett, TX',        value: 8.9,  followers: 13815 },
    { name: 'Garland, TX',        value: 6.4,  followers: 9933  },
    { name: 'Forney, TX',         value: 5.1,  followers: 7917  },
    { name: 'Mesquite, TX',       value: 4.3,  followers: 6675  },
    { name: 'Other TX cities',    value: 9.8,  followers: 15213 },
    { name: 'Outside Texas',      value: 6.2,  followers: 9622  },
  ],
};

// ── Platform comparison (for AI context) ─────────────────────────────────────
export const platformComparison = [
  { platform: 'Facebook',  followers: 47823, growth: 2.68,  engRate: 3.8, reach: 234567, posts: 24 },
  { platform: 'Instagram', followers: 28456, growth: 8.15,  engRate: 5.2, reach: 156789, posts: 31 },
  { platform: 'YouTube',   followers: 89234, growth: 12.31, engRate: 4.1, reach: 423891, posts: 16 },
  { platform: 'TikTok',    followers: 15672, growth: 34.2,  engRate: 8.1, reach: 287456, posts: 28 },
  { platform: 'LinkedIn',  followers: 8341,  growth: 3.31,  engRate: 2.9, reach: 45678,  posts: 12 },
];

// ── Aggregate totals ──────────────────────────────────────────────────────────
export const totals = {
  totalFollowers:    189526,
  followerGrowth:    17430,
  followerGrowthPct: 10.1,
  totalReach:        1148381,
  totalEngagement:   89823,
  avgEngagementRate: 4.82,
  totalPosts:        111,
  totalVideoViews:   880092,
};

// ── Data context string for AI ────────────────────────────────────────────────
export function getDataContext() {
  return `
LAKE POINTE CHURCH — SOCIAL MEDIA ANALYTICS DATA (Last 90 Days)
Report Date: April 7, 2026

═══ AGGREGATE TOTALS ═══
Total Followers (All Platforms): 189,526
Total Follower Growth (90 days): +17,430 (+10.1%)
Total Monthly Reach: 1,148,381
Total Engagement: 89,823
Average Engagement Rate: 4.82%
Total Posts Published: 111
Total Video Views: 880,092

═══ PLATFORM BREAKDOWN ═══

FACEBOOK
  Followers: 47,823 (started at 46,576 — +1,247 / +2.68% growth)
  Monthly Reach: 234,567 (up from 218,432 prior period)
  Engagement: 18,432 (Rate: 3.8%)
  Posts: 24 | Avg Likes: 412 | Avg Comments: 34 | Avg Shares: 89
  Video Views: 67,823
  Top Location: Rockwall, TX

INSTAGRAM
  Followers: 28,456 (started at 26,312 — +2,144 / +8.15% growth)
  Monthly Reach: 156,789 (up from 134,567)
  Engagement: 14,234 (Rate: 5.2%)
  Posts: 31 | Avg Likes: 334 | Avg Comments: 28 | Avg Shares: 67
  Video Views: 89,012
  Top Location: Rockwall, TX
  Note: Reels consistently outperform static posts.

YOUTUBE
  Subscribers: 89,234 (started at 79,456 — +9,778 / +12.31% growth)
  Monthly Views: 423,891 (up from 378,234)
  Engagement: 31,245 (Rate: 4.1%)
  Videos: 16 | Avg Likes: 1,234 | Avg Comments: 156 | Avg Shares: 234
  Watch Time: 18,432 hours/month | Avg View Duration: 4:23
  Top Location: Dallas-Fort Worth metro

TIKTOK
  Followers: 15,672 (started at 11,678 — +3,994 / +34.2% growth)
  Monthly Views: 287,456 (up from 198,234)
  Engagement: 23,456 (Rate: 8.1%)
  Videos: 28 | Avg Likes: 678 | Avg Comments: 89 | Avg Shares: 145
  Note: Geographic data not available via TikTok API.
  Note: Fastest growing platform by percentage.

LINKEDIN
  Followers: 8,341 (started at 8,074 — +267 / +3.31% growth)
  Monthly Reach: 45,678 (up from 43,234)
  Engagement: 2,456 (Rate: 2.9%)
  Posts: 12 | Source: Manual CSV export
  Top Location: Dallas-Fort Worth

═══ TOP PERFORMING CONTENT ═══
1. YouTube: "When God Feels Silent" Easter Sermon — 48,234 views, 9.6% eng. rate
2. TikTok: Easter worship moment "Graves Into Gardens" — 94,567 views, 11.6% eng. rate
3. Instagram: Easter baptisms (47 people) Reel — 31,890 views, 20.2% eng. rate
4. Facebook: Easter Sunday full service LIVE — 28,901 views, 7.1% eng. rate
5. YouTube: "Sermon on the Mount Part 1" — 19,234 views, 8.6% eng. rate
6. Instagram: "10 ways your church made impact" carousel — 12,340 views, 19.5% eng. rate

═══ CONTENT TYPE PERFORMANCE ═══
Best by Reach: Short Video (52,340 avg reach)
Best by Engagement Rate: Baptism content (14.7% avg)
Best by Volume: Short Video (34 posts)
Worship Music: 41,230 avg reach, 9.3% engagement

═══ GEOGRAPHIC BREAKDOWN ═══
Top Countries: USA (82.4%), Canada (4.1%), Mexico (3.8%), UK (2.6%), Australia (1.9%)
Top Cities: Rockwall TX (28.4%), Dallas TX (19.2%), Heath TX (11.7%), Rowlett TX (8.9%), Garland TX (6.4%)
Total tracked followers with location: ~155,152

═══ WEEKLY TRENDS ═══
Week-over-week reach is up 15.3% over the 90-day period.
Engagement rate peaked at Easter weekend (late March / early April 2026).
Sunday posts consistently outperform weekday posts by 2.3x on average.
Video content outperforms static images by 3.1x in reach.

═══ KEY INSIGHTS ═══
- TikTok is the fastest-growing platform (34.2% in 90 days)
- YouTube has the highest absolute subscriber count (89,234)
- Instagram has the highest engagement rate among traditional platforms (5.2%)
- TikTok has the highest overall engagement rate (8.1%)
- Baptism and community story content has the highest emotional engagement
- Easter weekend was the highest-performing period of the 90 days
- YouTube at current growth rate (~108 subscribers/day) will hit 100,000 subscribers in approximately 10 days
`.trim();
}
