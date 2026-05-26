import { useState, useEffect, useCallback } from 'react';
import { fetchInstagramData, invalidateInstagramCache } from '../lib/igDataCache';
import { Users, UserPlus, Eye, TrendingUp, RefreshCw, AlertCircle, Lock } from 'lucide-react';
import AgeBreakdown from './AgeBreakdown';
import GeoBreakdown from './GeoBreakdown';

const IG_PINK = '#E1306C';

function fmtBig(n) {
  if (!n && n !== 0) return '—';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString();
}

function StatCard({ label, value, subtext, icon, iconBg, iconColor, locked }) {
  return (
    <div className={`card card-hover ${locked ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between">
        <div className={`${iconBg} ${iconColor} w-10 h-10 rounded-xl flex items-center justify-center`}>{icon}</div>
        {locked && <Lock size={14} className="text-slate-300 mt-1" />}
      </div>
      <div className="mt-3">
        <div className="text-2xl font-bold text-slate-900 tabular-nums">{value}</div>
        <div className="text-slate-500 text-sm font-medium mt-0.5">{label}</div>
        {subtext && <div className="text-slate-400 text-xs mt-1">{subtext}</div>}
      </div>
    </div>
  );
}

function AppReviewEmptyState({ label }) {
  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <Lock size={16} className="text-slate-300" />
        <h3 className="font-bold text-slate-900 text-base">{label}</h3>
      </div>
      <div className="flex flex-col items-center justify-center h-48 rounded-xl border border-dashed border-slate-200 gap-2">
        <Lock size={20} className="text-slate-300" />
        <p className="text-slate-400 text-sm font-medium">Available after Meta App Review</p>
        <p className="text-slate-400 text-xs text-center max-w-xs">This data requires additional API permissions that unlock once the app is published.</p>
      </div>
    </div>
  );
}

export default function InstagramAudience() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const fetchData = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      if (forceRefresh) invalidateInstagramCache();
      setData(await fetchInstagramData());
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const account             = data?.account || {};
  const insights            = data?.insights || {};
  const demographics        = data?.demographics || [];
  const geo                 = data?.geo || {};
  const reachedDemographics = data?.reachedDemographics || [];
  const reachedGeo          = data?.reachedGeo || {};

  const followersCount  = account.followersCount || 0;
  const newFollowers    = insights.newFollowers   || 0;
  const profileVisits   = insights.profileViews   || 0;
  const growthRate      = followersCount > 0
    ? ((newFollowers / followersCount) * 100).toFixed(2)
    : '0.00';

  const hasFollowerDemo = demographics.length > 0;
  const hasFollowerGeo  = (geo.cities?.length > 0) || (geo.countries?.length > 0);
  const hasReachedDemo  = reachedDemographics.length > 0;
  const hasReachedGeo   = (reachedGeo.cities?.length > 0) || (reachedGeo.countries?.length > 0);

  if (loading && !data) return (
    <div className="card flex items-center justify-center py-20">
      <div className="text-center">
        <RefreshCw size={28} className="animate-spin mx-auto mb-3" style={{ color: IG_PINK }} />
        <p className="text-slate-500 text-sm">Loading audience data…</p>
      </div>
    </div>
  );

  if (error && !data) return (
    <div className="card border-red-100 bg-red-50">
      <div className="flex items-start gap-3">
        <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-red-700 text-sm">Failed to load audience data</p>
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

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
          </div>
          <div>
            <h2 className="font-bold text-slate-900 text-lg leading-tight">Instagram Audience</h2>
            <p className="text-slate-400 text-xs">
              @{account.username || 'lpconnect'} · Follower &amp; reach demographics
              {data?.fetchedAt && ` · Updated ${new Date(data.fetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
            </p>
          </div>
        </div>
        <button onClick={() => fetchData(true)} disabled={loading}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition-all disabled:opacity-50">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* ── KPI Cards ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Followers" value={fmtBig(followersCount)} subtext="All time"
          icon={<Users size={20}/>} iconBg="bg-pink-100" iconColor="text-pink-600"
        />
        <StatCard
          label="New Followers" value={fmtBig(newFollowers)} subtext="Last 30 days"
          icon={<UserPlus size={20}/>} iconBg="bg-rose-100" iconColor="text-rose-600"
        />
        <StatCard
          label="Profile Visits"
          value={profileVisits > 0 ? fmtBig(profileVisits) : '—'}
          subtext={profileVisits > 0 ? 'Last 30 days' : 'Requires App Review'}
          icon={<Eye size={20}/>} iconBg="bg-purple-100" iconColor="text-purple-600"
          locked={profileVisits === 0}
        />
        <StatCard
          label="Follower Growth Rate" value={`${growthRate}%`} subtext="New ÷ total followers"
          icon={<TrendingUp size={20}/>} iconBg="bg-indigo-100" iconColor="text-indigo-600"
        />
      </div>

      {/* ── Follower Demographics ─────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Follower Demographics</p>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {hasFollowerDemo
            ? <AgeBreakdown ageData={{ all: demographics }} title="Followers Age &amp; Gender" hideTabs defaultPlatform="all" />
            : <AppReviewEmptyState label="Followers Age & Gender" />
          }
          {hasFollowerGeo
            ? <GeoBreakdown geoData={{ all: geo }} title="Followers Geographic Reach" hideTabs />
            : <AppReviewEmptyState label="Followers Geographic Reach" />
          }
        </div>
      </div>

      {/* ── Reached Audience Demographics ─────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Reached Audience Demographics</p>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {hasReachedDemo
            ? <AgeBreakdown ageData={{ all: reachedDemographics }} title="Reached Audience Age &amp; Gender" hideTabs defaultPlatform="all" />
            : <AppReviewEmptyState label="Reached Audience Age & Gender" />
          }
          {hasReachedGeo
            ? <GeoBreakdown geoData={{ all: reachedGeo }} title="Reached Audience Geographic Reach" hideTabs />
            : <AppReviewEmptyState label="Reached Audience Geographic Reach" />
          }
        </div>
      </div>

    </div>
  );
}
