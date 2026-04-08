import { useState } from 'react';
import Head from 'next/head';
import Header from '../components/Header';
import MetricCard from '../components/MetricCard';
import PlatformCard from '../components/PlatformCard';
import FollowerGrowthChart from '../components/FollowerGrowthChart';
import EngagementChart from '../components/EngagementChart';
import TopContent from '../components/TopContent';
import GeoBreakdown from '../components/GeoBreakdown';
import ContentTypeChart from '../components/ContentTypeChart';
import AIChatPanel from '../components/AIChatPanel';
import {
  platforms, totals, followerHistory, engagementHistory,
  reachHistory, topPosts, geoData, contentTypeData, weeklyStats,
} from '../data/demoData';
import {
  Users, TrendingUp, Eye, Heart, BarChart2, Sparkles,
} from 'lucide-react';

const PLATFORM_TABS = ['All', 'Facebook', 'Instagram', 'YouTube', 'TikTok', 'LinkedIn'];
const DATE_RANGES   = ['7 days', '30 days', '90 days'];

export default function Dashboard() {
  const [activeTab,       setActiveTab]       = useState('All');
  const [dateRange,       setDateRange]       = useState('90 days');
  const [showAI,          setShowAI]          = useState(false);
  const [chartDataType,   setChartDataType]   = useState('followers'); // followers | reach | engagement

  // Filter history based on date range
  const rangeMap = { '7 days': 7, '30 days': 30, '90 days': 90 };
  const days = rangeMap[dateRange];
  const followerSlice    = followerHistory.slice(-days);
  const engagementSlice  = engagementHistory.slice(-days);
  const reachSlice       = reachHistory.slice(-days);

  // Which chart data to show
  const chartData = chartDataType === 'followers'
    ? followerSlice
    : chartDataType === 'reach'
    ? reachSlice
    : engagementSlice;

  // Active platforms to show
  const activePlatforms = activeTab === 'All'
    ? Object.values(platforms)
    : [platforms[activeTab.toLowerCase()]].filter(Boolean);

  // Filtered top posts
  const filteredPosts = activeTab === 'All'
    ? topPosts
    : topPosts.filter(p => p.platformName === activeTab);

  return (
    <>
      <Head>
        <title>Lake Pointe Social Dashboard</title>
        <meta name="description" content="Lake Pointe Church Social Media Analytics Dashboard" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-slate-50">
        {/* ── Header ── */}
        <Header
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          dateRanges={DATE_RANGES}
          onToggleAI={() => setShowAI(v => !v)}
          aiActive={showAI}
        />

        <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 space-y-6">

          {/* ── Platform Tabs ── */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-1.5 flex gap-1 overflow-x-auto">
            {PLATFORM_TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm transition-all duration-150 ${
                  activeTab === tab ? 'tab-active' : 'tab-inactive'
                }`}
              >
                {tab !== 'All' && (
                  <span className="mr-1.5">{platforms[tab.toLowerCase()]?.emoji}</span>
                )}
                {tab}
              </button>
            ))}
          </div>

          {/* ── Summary Metric Cards ── */}
          {activeTab === 'All' && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                label="Total Followers"
                value={totals.totalFollowers.toLocaleString()}
                change={`+${totals.followerGrowthPct}%`}
                changePositive
                subtext={`+${totals.followerGrowth.toLocaleString()} this period`}
                icon={<Users size={20} />}
                iconBg="bg-blue-100"
                iconColor="text-blue-600"
              />
              <MetricCard
                label="Total Reach"
                value={totals.totalReach.toLocaleString()}
                change="+15.3%"
                changePositive
                subtext="Across all platforms"
                icon={<Eye size={20} />}
                iconBg="bg-purple-100"
                iconColor="text-purple-600"
              />
              <MetricCard
                label="Total Engagement"
                value={totals.totalEngagement.toLocaleString()}
                change="+18.7%"
                changePositive
                subtext={`${totals.avgEngagementRate}% avg rate`}
                icon={<Heart size={20} />}
                iconBg="bg-pink-100"
                iconColor="text-pink-600"
              />
              <MetricCard
                label="Video Views"
                value={totals.totalVideoViews.toLocaleString()}
                change="+31.2%"
                changePositive
                subtext={`${totals.totalPosts} posts published`}
                icon={<TrendingUp size={20} />}
                iconBg="bg-emerald-100"
                iconColor="text-emerald-600"
              />
            </div>
          )}

          {/* ── Platform Cards ── */}
          <div className={`grid gap-4 ${
            activeTab === 'All'
              ? 'grid-cols-2 lg:grid-cols-5'
              : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
          }`}>
            {activePlatforms.map(p => (
              <PlatformCard
                key={p.id}
                platform={p}
                compact={activeTab === 'All'}
                onClick={() => setActiveTab(p.name)}
              />
            ))}
          </div>

          {/* ── Charts Section ── */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

            {/* Growth Chart (wider) */}
            <div className="xl:col-span-2 card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-bold text-slate-900 text-lg">Growth Over Time</h2>
                  <p className="text-slate-500 text-sm">{dateRange} • All platforms</p>
                </div>
                <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
                  {[
                    { key: 'followers',  label: 'Followers'  },
                    { key: 'reach',      label: 'Reach'      },
                    { key: 'engagement', label: 'Engagement' },
                  ].map(opt => (
                    <button
                      key={opt.key}
                      onClick={() => setChartDataType(opt.key)}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                        chartDataType === opt.key
                          ? 'bg-white shadow-sm text-slate-900'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <FollowerGrowthChart
                data={chartData}
                activePlatform={activeTab === 'All' ? null : activeTab}
                dataType={chartDataType}
              />
            </div>

            {/* Engagement Rate Bars */}
            <div className="card">
              <h2 className="font-bold text-slate-900 text-lg mb-1">Engagement Rate</h2>
              <p className="text-slate-500 text-sm mb-4">% by platform</p>
              <EngagementChart
                activePlatform={activeTab === 'All' ? null : activeTab}
              />
            </div>
          </div>

          {/* ── Content Type Performance ── */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-bold text-slate-900 text-lg">Content Type Performance</h2>
                <p className="text-slate-500 text-sm">Avg reach & engagement rate by content format</p>
              </div>
            </div>
            <ContentTypeChart data={contentTypeData} />
          </div>

          {/* ── Bottom Section: Top Content + Geo ── */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <TopContent posts={filteredPosts} />
            <GeoBreakdown geoData={geoData} activeTab={activeTab} />
          </div>

          {/* AI Chat spacer so content doesn't hide behind panel */}
          {showAI && <div className="h-80" />}
        </main>

        {/* ── AI Chat Panel (slide-up) ── */}
        <AIChatPanel open={showAI} onClose={() => setShowAI(false)} />

        {/* AI Floating Button (when panel is closed) */}
        {!showAI && (
          <button
            onClick={() => setShowAI(true)}
            className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 bg-gradient-to-r
                       from-blue-600 to-violet-600 text-white font-semibold px-5 py-3.5 rounded-2xl
                       shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30
                       hover:-translate-y-0.5 transition-all duration-200"
          >
            <Sparkles size={18} />
            Ask AI Analyst
          </button>
        )}
      </div>
    </>
  );
}
