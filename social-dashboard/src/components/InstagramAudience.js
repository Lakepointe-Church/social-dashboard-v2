import { useMemo, useState, useEffect, useCallback } from 'react';
import { Users, Eye, TrendingUp, UserPlus, Heart, Share2, RefreshCw, AlertCircle } from 'lucide-react';
import MetricCard from './MetricCard';
import AgeBreakdown from './AgeBreakdown';
import GeoBreakdown from './GeoBreakdown';
import { instagramAudience, platforms } from '../data/demoData';

export default function InstagramAudience() {
  // Demo audience data (followers + viewers)
  const followers = instagramAudience?.followers || {};
  const viewers   = instagramAudience?.viewers   || {};

  const [liveData, setLiveData] = useState(null);
  const [datePreset, setDatePreset] = useState('30');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/instagram');
      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(errorBody.error || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setLiveData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const liveFollowers    = liveData?.account || {};
  const liveInsights     = liveData?.insights || {};
  const liveDemographics = liveData?.demographics || [];
  const liveGeo          = liveData?.geo || {};

  const followersAgeData = useMemo(() => ({
    all: liveDemographics,
    instagram: liveDemographics,
  }), [liveDemographics]);

  const viewersAgeData = useMemo(() => ({
    all: liveDemographics,
    instagram: liveDemographics,
  }), [liveDemographics]);

  const newFollowersAgeData = useMemo(() => ({
    all: liveDemographics,
    instagram: liveDemographics,
  }), [liveDemographics]);

  const newFollowersGeo = useMemo(() => ({
    cities: liveGeo.cities || [],
    countries: liveGeo.countries || [],
  }), [liveGeo]);

  const followersGeo = useMemo(() => ({
    cities: liveGeo.cities || [],
    countries: liveGeo.countries || [],
  }), [liveGeo]);

  const viewersGeo = useMemo(() => ({
    cities: liveGeo.cities || [],
    countries: liveGeo.countries || [],
  }), [liveGeo]);

  const liveFollowersCount = liveFollowers.followersCount ?? 0;
  const liveNewFollowersCount = liveInsights.newFollowers ?? 0;
  const liveViewsCount = liveInsights.reach ?? 0;
  const liveProfileVisits = liveInsights.profileViews ?? 0;
  const liveEngagement = liveInsights.interactions ?? 0;
  const liveShares = liveInsights.shares ?? 0;
  const sourceLabel = liveData ? 'Live audience' : (loading ? 'Fetching live audience' : 'No live data');

  return (
    <div className="space-y-6 animate-fade-in">

      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
          </svg>
        </div>
        <div>
          <h2 className="font-bold text-slate-900 text-lg leading-tight">Instagram Audience</h2>
          <p className="text-slate-400 text-xs">Followers &amp; Viewers — Cities, Age, Gender</p>
        </div>
      </div>

      {/* Sticky control bar */}
      <div className="sticky top-16 z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 bg-white border-b border-slate-200 shadow-sm">
        <div className="py-2.5 flex items-center gap-3 flex-wrap">
          <div className="flex-1 text-sm text-slate-500">{sourceLabel} · {datePreset === 'custom' ? `${customStart || 'start'} → ${customEnd || 'end'}` : `${datePreset} days`}</div>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-100 rounded-lg p-0.5 gap-0.5">
              {[{ label: '7d', value: '7' }, { label: '30d', value: '30' }, { label: '90d', value: '90' }].map(({ label, value }) => (
                <button key={value} onClick={() => setDatePreset(value)}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-md transition-all ${datePreset === value ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
                  {label}
                </button>
              ))}
              <button onClick={() => setDatePreset('custom')}
                className={`text-xs font-semibold px-2.5 py-1 rounded-md transition-all ${datePreset === 'custom' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
                Custom
              </button>
            </div>
            {datePreset === 'custom' && (
              <div className="flex items-center gap-1.5">
                <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
                  className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 focus:outline-none focus:border-pink-300" />
                <span className="text-slate-400 text-xs">–</span>
                <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
                  className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 focus:outline-none focus:border-pink-300" />
              </div>
            )}
            <button onClick={fetchData} disabled={loading}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition-all disabled:opacity-50">
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>
      </div>

      {loading && !liveData && (
        <div className="card border-slate-200 bg-slate-50 text-slate-600 flex items-center gap-3 px-4 py-4">
          <RefreshCw size={18} className="animate-spin" />
          <p className="text-sm">Loading live Instagram audience data…</p>
        </div>
      )}

      {error && (
        <div className="card border-orange-100 bg-orange-50 text-orange-700 px-4 py-4">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Instagram live data could not be loaded.</p>
              <p className="text-xs text-orange-700 mt-1">{error}. Showing demo audience values.</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <MetricCard label="New Followers" value={liveNewFollowersCount != null ? liveNewFollowersCount.toLocaleString() : '—'} subtext="Last 30 days" icon={<UserPlus size={18}/>} iconBg="bg-rose-100" iconColor="text-rose-600" />
        <MetricCard label="Followers" value={liveFollowersCount != null ? liveFollowersCount.toLocaleString() : platforms.instagram.followers.toLocaleString()} subtext="Account followers" icon={<Users size={18}/>} iconBg="bg-pink-100" iconColor="text-pink-600" />
        <MetricCard label="Views" value={liveViewsCount != null ? liveViewsCount.toLocaleString() : Math.round(platforms.instagram.reach * 0.15).toLocaleString()} subtext="Last 30 days" icon={<Eye size={18}/>} iconBg="bg-purple-100" iconColor="text-purple-600" />
        <MetricCard label="Profile Visits" value={liveProfileVisits != null ? liveProfileVisits.toLocaleString() : '—'} subtext="Last 30 days" icon={<TrendingUp size={18}/>} iconBg="bg-indigo-100" iconColor="text-indigo-600" />
        <MetricCard label="Engagement" value={liveEngagement != null ? liveEngagement.toLocaleString() : platforms.instagram.engagement.toLocaleString()} subtext="Last 30 days" icon={<Heart size={18}/>} iconBg="bg-fuchsia-100" iconColor="text-fuchsia-600" />
        <MetricCard label="Shares" value={liveShares != null ? liveShares.toLocaleString() : platforms.instagram.avgShares?.toLocaleString() || '—'} subtext="Avg per post" icon={<Share2 size={18}/>} iconBg="bg-orange-100" iconColor="text-orange-600" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <AgeBreakdown ageData={newFollowersAgeData} title="New Followers Age & Gender" hideTabs defaultPlatform="instagram" />
        <AgeBreakdown ageData={followersAgeData} title="Followers Age & Gender" hideTabs defaultPlatform="instagram" />
        <AgeBreakdown ageData={viewersAgeData} title="Viewers Age & Gender" hideTabs defaultPlatform="instagram" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <GeoBreakdown
          geoData={{ all: newFollowersGeo }}
          title="New Followers Geographic Reach"
          hideTabs
        />
        <GeoBreakdown
          geoData={{ all: followersGeo }}
          title="Followers Geographic Reach"
          hideTabs
        />
        <GeoBreakdown
          geoData={{ all: viewersGeo }}
          title="Viewers Geographic Reach"
          hideTabs
        />
      </div>
    </div>
  );
}
