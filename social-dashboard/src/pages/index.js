import { useState } from 'react';
import Head from 'next/head';
import Header from '../components/Header';
import YouTubeAnalytics from '../components/YouTubeAnalytics';
import FacebookAnalytics from '../components/FacebookAnalytics';
import InstagramAnalytics from '../components/InstagramAnalytics';
import InstagramAudience from '../components/InstagramAudience';
import AllOverview from '../components/AllOverview';


const LIVE_TABS = [
  { id: 'overview-live',      label: 'Overview',            badge: 'LIVE' },
  { id: 'facebook-live',      label: 'Facebook',            badge: 'LIVE' },
  { id: 'instagram-live',     label: 'Instagram',           badge: 'LIVE' },
  { id: 'instagram-audience', label: 'Instagram Audience',  badge: ''     },
  { id: 'youtube-live',       label: 'YouTube',             badge: 'LIVE' },
];

function LiveTabIcon({ id }) {
  if (id === 'overview-live') return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  );
  if (id === 'facebook-live') return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#1877F2">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
  if (id === 'instagram-live' || id === 'instagram-audience') return (
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
  const [activeTab,   setActiveTab]   = useState('overview-live');
  const [mountedTabs, setMountedTabs] = useState(new Set(['overview-live']));

  const navigate = (tabId) => {
    setActiveTab(tabId);
    setMountedTabs(prev => new Set([...prev, tabId]));
  };

  return (
    <>
      <Head>
        <title>Lakepointe Social Dashboard</title>
        <meta name="description" content="Lakepointe Church Social Media Analytics" />
      </Head>

      <div className="min-h-screen bg-slate-50">
        <Header />

        <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 space-y-6">

          {/* Tab bar */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-1.5 flex gap-1 overflow-x-auto">
            {LIVE_TABS.map(tab => (
              <button key={tab.id} onClick={() => navigate(tab.id)}
                className={`flex items-center gap-2 flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150 ${
                  activeTab === tab.id ? 'tab-active' : 'tab-inactive'
                }`}>
                <LiveTabIcon id={tab.id} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Live views — lazy mount + keep-alive */}
          {LIVE_TABS.map(tab => mountedTabs.has(tab.id) && (
            <div key={tab.id} style={{ display: activeTab === tab.id ? 'block' : 'none' }}>
              {tab.id === 'overview-live'      && <AllOverview onNavigate={navigate} />}
              {tab.id === 'facebook-live'      && <FacebookAnalytics />}
              {tab.id === 'instagram-live'     && <InstagramAnalytics />}
              {tab.id === 'instagram-audience' && <InstagramAudience />}
              {tab.id === 'youtube-live'       && <YouTubeAnalytics />}
            </div>
          ))}

        </main>
      </div>

    </>
  );
}
