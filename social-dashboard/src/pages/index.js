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
import {
  platforms, totals, followerHistory, engagementHistory, reachHistory,
  topPosts, geoData, contentTypeData, ageData, milestones, bestTimeData, DAYS,
} from '../data/demoData';
import { Users, TrendingUp, Eye, Heart } from 'lucide-react';
import { Sparkles } from 'lucide-react';

const PLATFORM_TABS = ['All', 'Facebook', 'Instagram', 'YouTube', 'TikTok'];

// Map date range label → number of days
const RANGE_DAYS = {
  '7 days':       7,
  '30 days':      30,
  '90 days':      90,
  'Last Quarter': 91,
  '1 Year':       365,
};

export default function Dashboard() {
  const [activeTab,     setActiveTab]     = useState('All');
  const [dateRange,     setDateRange]     = useState('90 days');
  const [showAI,        setShowAI]        = useState(false);
  const [showBuilder,   setShowBuilder]   = useState(false);
  const [chartType,     setChartType]     = useState('followers');

  const { enabled, toggle, resetAll } = useWidgetConfig();

  const days          = RANGE_DAYS[dateRange] ?? 90;
  const followerSlice = followerHistory.slice(-days);
  const engageSlice   = engagementHistory.slice(-days);
  const reachSlice    = reachHistory.slice(-days);

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

  return (
    <>
      <Head>
        <title>Lake Pointe Social Dashboard</title>
        <meta name="description" content="Lake Pointe Church Social Media Analytics" />
      </Head>

      <div className="min-h-screen bg-slate-50">
        <Header
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          onToggleAI={() => setShowAI(v => !v)}
          aiActive={showAI}
          onOpenBuilder={() => setShowBuilder(true)}
        />

        <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 space-y-6">

          {/* Platform Tabs */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-1.5 flex gap-1 overflow-x-auto">
            {PLATFORM_TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-2 flex-shrink-0 px-4 py-2 rounded-xl text-sm transition-all duration-150 ${
                  activeTab === tab ? 'tab-active' : 'tab-inactive'
                }`}
              >
                {tab !== 'All' && <PlatformIcon platform={tab.toLowerCase()} size={16} />}
                {tab}
              </button>
            ))}
          </div>

          {/* Summary Metric Cards */}
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

          {/* Platform Cards */}
          {show('platform_cards') && (
            <div className={`grid gap-4 ${
              activeTab === 'All' ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
            }`}>
              {activePlatforms.map(p => (
                <PlatformCard key={p.id} platform={p} compact={activeTab === 'All'} onClick={() => setActiveTab(p.name)} />
              ))}
            </div>
          )}

          {/* Milestones */}
          {show('milestones') && <MilestoneTracker milestones={milestones} />}

          {/* Growth + Engagement Charts */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            {show('growth_chart') && (
              <div className="xl:col-span-2 card">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="font-bold text-slate-900 text-lg">Growth Over Time</h2>
                    <p className="text-slate-500 text-sm">{dateRange} • All platforms</p>
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

          {/* Content Type Performance */}
          {show('content_type') && (
            <div className="card">
              <div className="mb-4">
                <h2 className="font-bold text-slate-900 text-lg">Content Type Performance</h2>
                <p className="text-slate-500 text-sm">Avg reach & engagement rate by format</p>
              </div>
              <ContentTypeChart data={contentTypeData} />
            </div>
          )}

          {/* Best Time to Post */}
          {show('best_time') && <BestTimeToPost data={bestTimeData} />}

          {/* Top Content + Geo */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {show('top_content') && <TopContent posts={filteredPosts} />}
            {show('geo_breakdown') && <GeoBreakdown geoData={geoData} activeTab={activeTab} />}
          </div>

          {/* Age & Gender */}
          {show('age_breakdown') && <AgeBreakdown ageData={ageData} />}

          {showAI && <div className="h-80" />}
        </main>

        {/* AI Panel */}
        <AIChatPanel open={showAI} onClose={() => setShowAI(false)} />

        {/* AI Floating Button */}
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

        {/* Custom View Builder Modal */}
        <CustomViewBuilder
          open={showBuilder}
          onClose={() => setShowBuilder(false)}
          enabled={enabled}
          toggle={toggle}
          resetAll={resetAll}
        />
      </div>
    </>
  );
}
