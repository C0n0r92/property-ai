'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useRouter } from 'next/navigation';
import {
  LogOut,
  TrendingUp,
  TrendingDown,
  Clock,
  Zap,
  BarChart3,
  MapPin,
  FileText,
  Eye,
  Users,
  Search,
  Bookmark,
  ArrowRight,
  Home,
  Target,
  Loader2,
} from 'lucide-react';
import type { UserPlan } from '@/lib/billing';
import { formatPriceCompact } from '@/lib/format';

interface MarketPulse {
  totalSoldLast6Months: number;
  medianPrice: number;
  avgOverAsking: number;
  avgDaysOnMarket: number;
  activeListings: number;
  priceChange30Days: number;
  hotAreas: { area: string; salesCount: number; avgPrice: number }[];
}

function DashboardContent() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [marketPulse, setMarketPulse] = useState<MarketPulse | null>(null);
  const [loadingPulse, setLoadingPulse] = useState(true);
  const [userPlan, setUserPlan] = useState<UserPlan | null>(null);
  const [savedCount, setSavedCount] = useState(0);

  useEffect(() => {
    async function loadMarketPulse() {
      try {
        const { getMarketPulse } = await import('@/lib/agent-analytics');
        const pulse = await getMarketPulse();
        setMarketPulse(pulse);
      } catch (err) {
        console.error('Failed to load market pulse:', err);
      } finally {
        setLoadingPulse(false);
      }
    }

    async function loadUserStats() {
      if (!user) return;

      try {
        // Load user plan
        const { getUserPlan } = await import('@/lib/billing');
        const plan = await getUserPlan(user.id);
        setUserPlan(plan);

        // Load saved properties count
        const { getSavedPropertiesCount } = await import('@/lib/saved-properties');
        const count = await getSavedPropertiesCount(user.id);
        setSavedCount(count);
      } catch (err) {
        console.error('Failed to load user stats:', err);
      }
    }

    loadMarketPulse();
    loadUserStats();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  // Quick actions for the dashboard
  const quickActions = [
    {
      title: 'Property Valuation',
      description: 'Search any property and get instant comparables and deal assessment',
      icon: <Zap size={24} />,
      href: '/dashboard/valuation',
      color: 'var(--accent)',
      primary: true,
    },
    {
      title: 'Area Intelligence',
      description: 'Get comprehensive market statistics for any Dublin area',
      icon: <MapPin size={24} />,
      href: '/dashboard/areas',
      color: 'var(--positive)',
    },
    {
      title: 'Market Reports',
      description: 'Generate branded reports for clients and vendors',
      icon: <FileText size={24} />,
      href: '/dashboard/reports',
      color: 'var(--warning)',
    },
    {
      title: 'Competitor Monitoring',
      description: 'Track listings and price changes in your areas',
      icon: <Eye size={24} />,
      href: '/dashboard/monitoring',
      color: 'var(--negative)',
    },
  ];

  return (
    <>
      {/* Navigation */}
      <nav className="sticky top-0 z-50 backdrop-blur" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center font-bold" style={{ background: 'var(--gradient-primary)', color: 'white' }}>
              G
            </div>
            <div>
              <h1 className="text-xl font-bold">Gaff Intel</h1>
              <span className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>for Agents</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm hidden sm:block" style={{ color: 'var(--foreground-secondary)' }}>{user?.email}</span>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 text-sm transition"
              style={{ color: 'var(--foreground-secondary)' }}
            >
              <LogOut size={18} />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Welcome back</h2>
          <p style={{ color: 'var(--foreground-secondary)' }}>
            Your market intelligence dashboard - everything you need to win instructions
          </p>
        </div>

        {/* Usage Stats & Plan */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="stat-card">
            <p className="stat-label flex items-center gap-1">
              <Search size={14} /> Searches This Month
            </p>
            <p className="stat-value">{userPlan?.searchesUsedThisMonth ?? '...'}</p>
            <div className="mt-2">
              {/* Progress bar */}
              {userPlan && (
                <>
                  <div
                    className="h-2 rounded-full overflow-hidden"
                    style={{ background: 'var(--surface-hover)' }}
                  >
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min((userPlan.searchesUsedThisMonth / userPlan.monthlySearchLimit) * 100, 100)}%`,
                        background: userPlan.searchesUsedThisMonth >= userPlan.monthlySearchLimit
                          ? 'var(--negative)'
                          : userPlan.searchesUsedThisMonth >= userPlan.monthlySearchLimit * 0.8
                          ? 'var(--warning)'
                          : 'var(--accent)',
                      }}
                    />
                  </div>
                  <p className="text-sm mt-1" style={{ color: 'var(--foreground-secondary)' }}>
                    {userPlan.monthlySearchLimit - userPlan.searchesUsedThisMonth} remaining ({userPlan.tier} plan)
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="stat-card">
            <p className="stat-label flex items-center gap-1">
              <Users size={14} /> Plan Status
            </p>
            <p className="stat-value" style={{ fontSize: '1.5rem', textTransform: 'capitalize' }}>
              {userPlan?.tier ?? '...'}
            </p>
            {userPlan && userPlan.tier !== 'agency' && (
              <button
                onClick={() => router.push('/')}
                className="text-sm mt-1 hover:underline"
                style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                {userPlan.tier === 'free' ? 'Upgrade to Professional' : 'Upgrade to Agency'}
              </button>
            )}
          </div>

          <div className="stat-card">
            <p className="stat-label flex items-center gap-1">
              <Bookmark size={14} /> Saved Properties
            </p>
            <p className="stat-value">{savedCount}</p>
            <button
              onClick={() => router.push('/dashboard/properties')}
              className="text-sm mt-1 hover:underline"
              style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              {savedCount > 0 ? 'View saved' : 'Save from valuations'}
            </button>
          </div>
        </div>

        {/* Market Pulse */}
        <div className="card mb-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <BarChart3 size={20} style={{ color: 'var(--accent)' }} />
              Dublin Market Pulse
            </h3>
            <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'var(--positive-bg)', color: 'var(--positive)' }}>
              Live Data
            </span>
          </div>

          {loadingPulse ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--accent)' }} />
            </div>
          ) : marketPulse ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="stat-card">
                  <p className="stat-label flex items-center gap-1">
                    <Home size={14} /> Median Price
                  </p>
                  <p className="stat-value" style={{ color: 'var(--accent)', fontSize: '1.5rem' }}>
                    {formatPriceCompact(marketPulse.medianPrice)}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    {marketPulse.priceChange30Days > 0 ? (
                      <TrendingUp size={14} style={{ color: 'var(--positive)' }} />
                    ) : marketPulse.priceChange30Days < 0 ? (
                      <TrendingDown size={14} style={{ color: 'var(--negative)' }} />
                    ) : null}
                    <span className="text-xs" style={{ color: marketPulse.priceChange30Days >= 0 ? 'var(--positive)' : 'var(--negative)' }}>
                      {marketPulse.priceChange30Days > 0 ? '+' : ''}{marketPulse.priceChange30Days}% (30d)
                    </span>
                  </div>
                </div>

                <div className="stat-card">
                  <p className="stat-label flex items-center gap-1">
                    <Target size={14} /> vs Asking
                  </p>
                  <p className="stat-value" style={{ color: marketPulse.avgOverAsking >= 0 ? 'var(--positive)' : 'var(--negative)', fontSize: '1.5rem' }}>
                    {marketPulse.avgOverAsking > 0 ? '+' : ''}{marketPulse.avgOverAsking}%
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--foreground-secondary)' }}>
                    Average premium
                  </p>
                </div>

                <div className="stat-card">
                  <p className="stat-label flex items-center gap-1">
                    <Clock size={14} /> Days to Sell
                  </p>
                  <p className="stat-value" style={{ fontSize: '1.5rem' }}>
                    {marketPulse.avgDaysOnMarket}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--foreground-secondary)' }}>
                    Average
                  </p>
                </div>

                <div className="stat-card">
                  <p className="stat-label flex items-center gap-1">
                    <BarChart3 size={14} /> Sold (6mo)
                  </p>
                  <p className="stat-value" style={{ fontSize: '1.5rem' }}>
                    {marketPulse.totalSoldLast6Months.toLocaleString()}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--foreground-secondary)' }}>
                    Properties
                  </p>
                </div>
              </div>

              {/* Hot Areas */}
              {marketPulse.hotAreas && marketPulse.hotAreas.length > 0 && (
                <div className="pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                  <p className="text-sm font-medium mb-3" style={{ color: 'var(--foreground-secondary)' }}>
                    Most Active Areas (6 months)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {marketPulse.hotAreas.slice(0, 5).map((area, idx) => (
                      <button
                        key={idx}
                        onClick={() => router.push('/dashboard/areas')}
                        className="chip flex items-center gap-2"
                      >
                        <span className="font-medium">{area.area}</span>
                        <span className="text-xs" style={{ color: 'var(--foreground-muted)' }}>
                          {area.salesCount} sales
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p style={{ color: 'var(--foreground-secondary)' }}>
              Unable to load market data. Please try again later.
            </p>
          )}
        </div>

        {/* Quick Actions Grid */}
        <h3 className="text-xl font-bold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {quickActions.map((action, idx) => (
            <div
              key={idx}
              onClick={() => router.push(action.href)}
              className={`card cursor-pointer transition hover:border-[var(--accent)] ${action.primary ? 'md:col-span-2' : ''}`}
              style={action.primary ? { borderLeft: `4px solid ${action.color}` } : undefined}
            >
              <div className="flex items-start gap-4">
                <div
                  className="p-3 rounded-lg flex-shrink-0"
                  style={{ background: `${action.color}20`, color: action.color }}
                >
                  {action.icon}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold mb-1">{action.title}</h4>
                  <p className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                    {action.description}
                  </p>
                </div>
                <ArrowRight size={20} style={{ color: 'var(--foreground-muted)' }} />
              </div>
            </div>
          ))}
        </div>

        {/* Recent Searches */}
        <div className="card mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={20} style={{ color: 'var(--accent)' }} />
            <h3 className="text-xl font-bold">Recent Searches</h3>
          </div>
          <p style={{ color: 'var(--foreground-secondary)' }}>
            No recent searches yet. Start by searching for a property to analyze.
          </p>
          <button
            onClick={() => router.push('/dashboard/valuation')}
            className="btn-primary mt-4"
          >
            Start Your First Search
          </button>
        </div>

        {/* How It Works */}
        <div className="card">
          <h3 className="text-xl font-bold mb-6">How It Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-4 font-bold text-white" style={{ background: 'var(--gradient-primary)' }}>
                1
              </div>
              <h4 className="font-semibold mb-2">Enter Address</h4>
              <p className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                Search any Dublin property by address or Eircode
              </p>
            </div>
            <div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-4 font-bold text-white" style={{ background: 'var(--gradient-primary)' }}>
                2
              </div>
              <h4 className="font-semibold mb-2">Get Intelligence</h4>
              <p className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                See comparables, market stats, and deal assessment instantly
              </p>
            </div>
            <div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center mb-4 font-bold text-white" style={{ background: 'var(--gradient-primary)' }}>
                3
              </div>
              <h4 className="font-semibold mb-2">Win Instructions</h4>
              <p className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                Download PDF reports to impress vendors with data
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
