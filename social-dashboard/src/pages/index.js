import { useState } from 'react';
import Head from 'next/head';
import Header, { DATE_RANGES } from '../components/Header';
import MetricCard from '../components/MetricCard';
import PlatformCard from '../components/PlatformCard';
import PlatformIcon from '../components/PlatformIcon';
import FollowerGrowthChart from '../components/FollowerGrowthChart';
import EngagementChart from '../components/EngagementChart';
import TopContent from '../components/TopContent';
import GeoBreakdown from '../components/GeoBreakdown';
import ContentTypeChart from '../components/ContentTypeChart';
import AgeBreakdown from '../components/AgeBreakdown';
import MilestoneTracker from '../components/MilestoneTracker';
import BestTimeToPost from '../components/BestTimeToPost';
import AIChatPanel from '../components/AIChatPanel';
import CustomViewBuilder, { useWidgetConfig } from '../components/CustomViewBuilder';
import YouTubeAnalytics from '../components/YouTubeAnalytics';
import FacebookAnalytics from '../components/FacebookAnalytics';
import InstagramAnalytics from '../components/InstagramAnalytics';
import {
  platforms, totals, followerHistory, engagementHistory, reachHistory,
  topPosts, geoData, contentTypeData, ageData, milestones, bestTimeData,
  filterHistory, DATA_START_DATE, DATA_END_DATE,
} from '../data/demoData';
import { Users, TrendingUp, Eye, Heart, Sparkles } from 'lucide-react';

const PLATFORM_TABS = ['All'];

const LIVE_TABS = [
  { id: 'facebook-live',  label: 'Facebook',  badge: 'LIVE' },
  { id: 'instagram-live', label: 'Instagram', badge: 'LIVE' },
  { id: 'youtube-live',   label: 'YouTube',   badge: 'LIVE' },
];

function daysAgo(n) {
  const d = new Date(DATA_END_DATE);
  d.setDate(d.getDate() - n + 1);
  return d.toISOString().split('T')[0];
}

function LiveTabIcon({ id }) {
  if (id === 'facebook-live') return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#1877F2">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
  if (id === 'instagram-live') return (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <defs>
        <linearGradient id="ig-live" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f09433"/>
          <stop offset="100%" stopColor="#bc1888"/>
        </linearGradient>
      </defs>
      <path fill="url(#ig-live)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  );
  if (id === 'youtube-live') return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="6" fill="#FF0000"/>
      <path d="M21.5 7.5s-.2-1.2-.8-1.8c-.8-.8-1.7-.8-2.1-.8C16.1 4.7 12 4.7 12 4.7s-4.1 0-6.6.2c-.4 0-1.3 0-2.1.8-.6.6-.8 1.8-.8 1.8S2.3 8.9 2.3 10.3v1.3c0 1.4.2 2.8.2 2.8s.2 1.2.8 1.8c.8.8 1.9.8 2.3.8C6.9 17.3 12 17.3 12 17.3s4.1 0 6.6-.3c.4 0 1.3 0 2.1-.8.6-.6.8-1.8.8-1.8s.2-1.4.2-2.8v-1.3c0-1.4-.2-2.8-.2-2.8zM10.1 13.7V8.3l5.2 2.7-5.2 2.7z" fill="white"/>
    </svg>
  );
  return null;
}

export default function Dashboard() {
  const [activeTab,   setActiveTab]   = useState('All');
  const [dateRange,   setDateRange]   = useState('90 Days');
  const [startISO,    setStartISO]    = useState(daysAgo(90));
  const [endISO,      setEndISO]      = useState(DATA_END_DATE);
  const [showAI,      setShowAI]      = useState(false);
  const [showBuilder, setShowBuilder] = useState(false);
  const [chartType,   setChartType]   = useState('followers');

  const { enabled, toggle, resetAll } = useWidgetConfig();

  function handleDateRangeChange({ startISO: s, endISO: e, label }) {
    setStartISO(s); setEndISO(e); setDateRange(label);
  }

  const followerSlice = filterHistory(followerHistory,   startISO, endISO);
  const engageSlice   = filterHistory(engagementHistory, startISO, endISO);
  const reachSlice    = filterHistory(reachHistory,      startISO, endISO);

  const chartData = chartType === 'followers' ? followerSlice
                  : chartType === 'reach'     ? reachSlice
                  : engageSlice;

  const activePlatforms = activeTab === 'All'
    ? Object.values(platforms)
    : [platforms[activeTab.toLowerCase()]].filter(Boolean);

  const filteredPosts = activeTab === 'All'
    ? topPosts
    : topPosts.filter(p => p.platformName === activeTab);

  const show = (id) => enabled[id] !== false;
  const isLiveTab = LIVE_TABS.some(t => t.id === activeTab);

  return (
    <>
      <Head>
        <title>Lake Pointe Social Dashboard</title>
        <meta name="description" content="Lake Pointe Church Social Media Analytics" />
      </Head>

      <div className="min-h-screen bg-slate-50">
        <Header
          dateRange={dateRange} startISO={startISO} endISO={endISO}
          onDateRangeChange={handleDateRangeChange}
          onToggleAI={() => setShowAI(v => !v)} aiActive={showAI}
          onOpenBuilder={() => setShowBuilder(true)}
        />

        <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 space-y-6">

          {/* Tab bar */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-1.5 flex gap-1 overflow-x-auto">
            {PLATFORM_TABS.map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-2 flex-shrink-0 px-4 py-2 rounded-xl text-sm transition-all duration-150 ${
                  activeTab === tab ? 'tab-active' : 'tab-inactive'
                }`}>
                {tab !== 'All' && <PlatformIcon platform={tab.toLowerCase()} size={16} />}
                {tab}
              </button>
            ))}
            <div className="w-px bg-slate-200 mx-1 self-stretch" />
            {LIVE_TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150 ${
                  activeTab === tab.id ? 'tab-active' : 'tab-inactive'
                }`}>
                <LiveTabIcon id={tab.id} />
                <span>{tab.label}</span>
                <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                  {tab.badge}
                </span>
              </button>
            ))}
          </div>

          {/* Live views */}
          {activeTab === 'facebook-live'  && <FacebookAnalytics />}
          {activeTab === 'instagram-live' && <InstagramAnalytics />}
          {activeTab === 'youtube-live'   && <YouTubeAnalytics />}

          {/* Demo views */}
          {!isLiveTab && (
            <>
              {show('summary_metrics') && activeTab === 'All' && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <MetricCard label="Total Followers"  value={totals.totalFollowers.toLocaleString()}
                    change={`+${totals.followerGrowthPct}%`} changePositive subtext={`+${totals.followerGrowth.toLocaleString()} this period`}
                    icon={<Users size={20}/>} iconBg="bg-blue-100" iconColor="text-blue-600" />
                  <MetricCard label="Total Reach"      value={totals.totalReach.toLocaleString()}
                    change="+22.4%" changePositive subtext="Across all platforms"
                    icon={<Eye size={20}/>} iconBg="bg-purple-100" iconColor="text-purple-600" />
                  <MetricCard label="Total Engagement" value={totals.totalEngagement.toLocaleString()}
                    change="+31.2%" changePositive subtext={`${totals.avgEngagementRate}% avg rate`}
                    icon={<Heart size={20}/>} iconBg="bg-pink-100" iconColor="text-pink-600" />
                  <MetricCard label="Video Views"      value={totals.totalVideoViews.toLocaleString()}
                    change="+45.8%" changePositive subtext={`${totals.totalPosts} posts published`}
                    icon={<TrendingUp size={20}/>} iconBg="bg-emerald-100" iconColor="text-emerald-600" />
                </div>
              )}

              {show('platform_cards') && (
                <div className={`grid gap-4 ${activeTab === 'All' ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
                  {activePlatforms.map(p => (
                    <PlatformCard key={p.id} platform={p} compact={activeTab === 'All'} onClick={() => setActiveTab(p.name)} />
                  ))}
                </div>
              )}

              {show('milestones') && <MilestoneTracker milestones={milestones} />}

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                {show('growth_chart') && (
                  <div className="xl:col-span-2 card">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="font-bold text-slate-900 text-lg">Growth Over Time</h2>
                        <p className="text-slate-500 text-sm">{dateRange} · {followerSlice.length} days</p>
                      </div>
                      <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
                        {[['followers','Followers'],['reach','Reach'],['engagement','Engagement']].map(([k,l]) => (
                          <button key={k} onClick={() => setChartType(k)}
                            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                              chartType === k ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
                            }`}>{l}</button>
                        ))}
                      </div>
                    </div>
                    <FollowerGrowthChart data={chartData} activePlatform={activeTab === 'All' ? null : activeTab} dataType={chartType} />
                  </div>
                )}
                {show('engagement_chart') && (
                  <div className={show('growth_chart') ? 'card' : 'card xl:col-span-3'}>
                    <h2 className="font-bold text-slate-900 text-lg mb-1">Engagement Rate</h2>
                    <p className="text-slate-500 text-sm mb-4">% by platform</p>
                    <EngagementChart activePlatform={activeTab === 'All' ? null : activeTab} />
                  </div>
                )}
              </div>

              {show('content_type') && (
                <div className="card">
                  <div className="mb-4">
                    <h2 className="font-bold text-slate-900 text-lg">Content Type Performance</h2>
                    <p className="text-slate-500 text-sm">Avg reach & engagement rate by format</p>
                  </div>
                  <ContentTypeChart data={contentTypeData} />
                </div>
              )}

              {show('best_time') && <BestTimeToPost data={bestTimeData} />}

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {show('top_content') && <TopContent posts={filteredPosts} />}
                {show('geo_breakdown') && <GeoBreakdown geoData={geoData} activeTab={activeTab} />}
              </div>

              {show('age_breakdown') && <AgeBreakdown ageData={ageData} />}
              {showAI && <div className="h-80" />}
            </>
          )}
        </main>

        <AIChatPanel open={showAI} onClose={() => setShowAI(false)} />

        {!showAI && (
          <button onClick={() => setShowAI(true)}
            className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 bg-gradient-to-r
                       from-blue-600 to-violet-600 text-white font-semibold px-5 py-3.5 rounded-2xl
                       shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30
                       hover:-translate-y-0.5 transition-all duration-200">
            <Sparkles size={18} /> Ask AI Analyst
          </button>
        )}

        <CustomViewBuilder open={showBuilder} onClose={() => setShowBuilder(false)}
          enabled={enabled} toggle={toggle} resetAll={resetAll} />
      </div>
    </>
  );
}
