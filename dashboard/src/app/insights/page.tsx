'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { loadStripe } from '@stripe/stripe-js';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { formatFullPrice } from '@/lib/format';
import { analytics } from '@/lib/analytics';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface Stats {
  totalProperties: number;
  medianPrice: number;
  avgPricePerSqm: number;
  pctOverAsking: number;
  priceChange: number;
}

interface AreaStat {
  name: string;
  count: number;
  medianPrice: number;
  avgPricePerSqm: number;
  pctOverAsking: number;
  change6m: number;
}

interface PropertyType {
  name: string;
  count: number;
}

interface MonthlyTrend {
  month: string;
  median: number;
  count: number;
}

// Payment Modal Component
function PaymentModal({ onDismiss }: { onDismiss: () => void }) {
  const [selectedPlan, setSelectedPlan] = useState<'one-time' | 'monthly'>('one-time');
  const [loading, setLoading] = useState(false);

  // Track modal view on mount
  useEffect(() => {
    analytics.paymentModalViewed();
  }, []);

  const handlePlanChange = (plan: 'one-time' | 'monthly') => {
    setSelectedPlan(plan);
    analytics.paymentPlanSelected(plan);
  };

  const handleDismiss = () => {
    analytics.paymentModalDismissed();
    onDismiss();
  };

  const handleCheckout = async () => {
    const amount = selectedPlan === 'one-time' ? 20 : 5;
    analytics.paymentCheckoutStarted(selectedPlan, amount);
    
    // Re-enabled Stripe checkout with Supabase integration
    setLoading(true);
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: selectedPlan }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create checkout session');
      }

      const { url } = await response.json();
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert(error instanceof Error ? error.message : 'Failed to start checkout. Please try again.');
      setLoading(false);
    }
  };
  
  const features = [
    {
      icon: '',
      title: 'AI Price Predictions',
      desc: 'Get ML-powered fair value estimates for any Dublin property based on 40,000+ sales'
    },
    {
      icon: '',
      title: 'Hidden Deal Finder',
      desc: 'Instantly identify underpriced properties before they get snapped up'
    },
    {
      icon: '',
      title: 'Area Trend Forecasts',
      desc: '6-month price predictions for every Dublin neighbourhood with confidence scores'
    },
    {
      icon: '',
      title: 'Bidding War Predictor',
      desc: 'Know which properties will likely go over asking price and by how much'
    },
    {
      icon: '',
      title: 'Investment Scoring',
      desc: 'Rental yield estimates, price appreciation potential, and risk ratings'
    },
    {
      icon: '',
      title: 'Save & Track Properties',
      desc: 'Save your favorite properties, add personal notes, and track them over time with organized collections'
    },
    {
      icon: '',
      title: 'Market Timing Alerts',
      desc: 'Get notified when market conditions favour buyers or sellers in your target area'
    },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      
      {/* Modal */}
      <div className="relative bg-[#0D1117] border border-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        {/* Header */}
        <div className="relative p-8 pb-0">
          <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-emerald-500/10 to-transparent rounded-t-2xl" />
          
          <div className="relative text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 text-amber-400 rounded-full text-sm font-medium mb-4">
              <span>Limited Time Offer</span>
            </div>
            
            <h2 className="text-3xl font-bold text-white mb-2">
              Unlock <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Pro Insights</span>
            </h2>
            <p className="text-gray-400 max-w-md mx-auto">
              Make smarter property decisions with AI-powered analytics trained on every Dublin sale since 2020
            </p>
          </div>
        </div>
        
        {/* Features Grid */}
        <div className="p-8 pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {features.map((feature, i) => (
              <div 
                key={i}
                className="p-4 rounded-xl bg-gray-800/50 border border-gray-700/50 hover:border-emerald-500/30 transition-colors"
              >
                <div className="text-2xl mb-2">{feature.icon}</div>
                <h3 className="font-semibold text-white mb-1">{feature.title}</h3>
                <p className="text-sm text-gray-400">{feature.desc}</p>
              </div>
            ))}
          </div>
          
          {/* Pricing Toggle */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex rounded-xl bg-gray-800 p-1">
              <button
                onClick={() => handlePlanChange('one-time')}
                className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  selectedPlan === 'one-time'
                    ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                One-Time
              </button>
              <button
                onClick={() => handlePlanChange('monthly')}
                className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  selectedPlan === 'monthly'
                    ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Monthly
              </button>
            </div>
          </div>
          
          {/* Price Display */}
          <div className="text-center mb-8">
            {selectedPlan === 'one-time' ? (
              <div>
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-5xl font-bold text-white">€20</span>
                  <span className="text-gray-500 line-through">€49</span>
                </div>
                <p className="text-emerald-400 text-sm mt-1">Lifetime access • One-time payment</p>
                <p className="text-gray-500 text-xs mt-1">No subscriptions, no recurring fees</p>
              </div>
            ) : (
              <div>
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-5xl font-bold text-white">€5</span>
                  <span className="text-gray-400">/month</span>
                </div>
                <p className="text-emerald-400 text-sm mt-1">Cancel anytime • Full access</p>
                <p className="text-gray-500 text-xs mt-1">First month free for early adopters</p>
              </div>
            )}
          </div>
          
          {/* CTA Button */}
          <button
            onClick={handleCheckout}
            disabled={loading}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold text-lg hover:from-emerald-400 hover:to-cyan-400 transition-all shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : 'Get Pro Access Now'}
          </button>
          
          {/* Trust Badges */}
          <div className="flex items-center justify-center gap-6 mt-6 text-gray-500 text-sm">
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span>Secure Payment</span>
            </div>
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>30-Day Guarantee</span>
            </div>
          </div>
          
          {/* Close link */}
          <div className="text-center mt-6">
            <button 
              onClick={handleDismiss}
              className="text-gray-500 hover:text-gray-300 text-sm underline transition-colors"
            >
              Maybe later, back to map
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InsightsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<{
    stats: Stats;
    areaStats: AreaStat[];
    propertyTypes: PropertyType[];
    monthlyTrend: MonthlyTrend[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'count' | 'medianPrice' | 'change6m'>('count');

  // Check if user has premium tier
  const hasPaid = user?.tier === 'premium';

  useEffect(() => {
    // Only fetch data if user has premium tier
    if (hasPaid) {
      fetch('/api/stats')
        .then(res => res.json())
        .then(setData)
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [hasPaid]);

  // Show loading while auth is being checked
  if (authLoading) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    router.push('/login');
    return (
      <div className="min-h-[calc(100vh-64px)] bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-white">Redirecting to login...</div>
      </div>
    );
  }

  // Show payment modal if user doesn't have premium tier
  if (!hasPaid) {
    return (
      <div className="min-h-[calc(100vh-64px)] bg-[#0a0a0a]">
        <PaymentModal onDismiss={() => router.push('/map')} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-8">
          <div className="h-8 bg-[var(--muted)] rounded w-48"></div>
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="card h-24"></div>
            ))}
          </div>
          <div className="card h-80"></div>
        </div>
      </div>
    );
  }
  
  if (!data) return null;
  
  const sortedAreas = [...data.areaStats].sort((a, b) => {
    switch (sortBy) {
      case 'medianPrice': return b.medianPrice - a.medianPrice;
      case 'change6m': return b.change6m - a.change6m;
      default: return b.count - a.count;
    }
  });
  
  // Format chart data
  const chartData = data.monthlyTrend.map(d => ({
    ...d,
    month: d.month.substring(5), // Just MM
    label: new Date(d.month + '-01').toLocaleDateString('en-IE', { month: 'short', year: '2-digit' }),
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Market Insights</h1>
      <p className="text-[var(--muted-foreground)] mb-8">
        Dublin property market analytics and trends
      </p>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="card">
          <div className="stat-label">Total Properties</div>
          <div className="stat-value mt-2">{data.stats.totalProperties.toLocaleString()}</div>
        </div>
        <div className="card">
          <div className="stat-label">Median Price</div>
          <div className="stat-value mt-2">{formatFullPrice(data.stats.medianPrice)}</div>
        </div>
        <div className="card">
          <div className="stat-label">Avg €/sqm</div>
          <div className="stat-value mt-2">€{data.stats.avgPricePerSqm.toLocaleString()}</div>
        </div>
        <div className="card">
          <div className="stat-label">Over Asking</div>
          <div className={`stat-value mt-2 ${data.stats.pctOverAsking > 50 ? 'price-positive' : ''}`}>
            {data.stats.pctOverAsking}%
          </div>
        </div>
      </div>
      
      {/* Price Trend Chart */}
      <div className="card mb-8">
        <h2 className="font-semibold mb-6">Median Price Trend</h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="label" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6B7280', fontSize: 12 }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6B7280', fontSize: 12 }}
                tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--card)', 
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => [formatFullPrice(value), 'Median Price']}
                labelFormatter={(label) => label}
              />
              <Area 
                type="monotone" 
                dataKey="median" 
                stroke="#2563EB" 
                strokeWidth={2}
                fill="url(#colorPrice)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* Property Types Chart */}
      <div className="grid md:grid-cols-2 gap-8 mb-8">
        <div className="card">
          <h2 className="font-semibold mb-6">Property Types</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.propertyTypes.slice(0, 6)} layout="vertical">
                <XAxis type="number" hide />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6B7280', fontSize: 12 }}
                  width={80}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--card)', 
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [value.toLocaleString(), 'Properties']}
                />
                <Bar dataKey="count" fill="#2563EB" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="card">
          <h2 className="font-semibold mb-6">Sales Volume</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.slice(-12)}>
                <XAxis 
                  dataKey="label" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6B7280', fontSize: 10 }}
                />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--card)', 
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [value.toLocaleString(), 'Sales']}
                />
                <Bar dataKey="count" fill="#059669" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      {/* Area Rankings */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-semibold">Area Rankings</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setSortBy('count')}
              className={`px-3 py-1 text-sm rounded ${sortBy === 'count' ? 'bg-[var(--primary)] text-white' : 'bg-[var(--muted)]'}`}
            >
              By Volume
            </button>
            <button
              onClick={() => setSortBy('medianPrice')}
              className={`px-3 py-1 text-sm rounded ${sortBy === 'medianPrice' ? 'bg-[var(--primary)] text-white' : 'bg-[var(--muted)]'}`}
            >
              By Price
            </button>
            <button
              onClick={() => setSortBy('change6m')}
              className={`px-3 py-1 text-sm rounded ${sortBy === 'change6m' ? 'bg-[var(--primary)] text-white' : 'bg-[var(--muted)]'}`}
            >
              By Growth
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-[var(--muted-foreground)] text-sm">
                <th className="pb-3 font-medium">#</th>
                <th className="pb-3 font-medium">Area</th>
                <th className="pb-3 font-medium text-right">Median Price</th>
                <th className="pb-3 font-medium text-right">€/sqm</th>
                <th className="pb-3 font-medium text-right">% Over Asking</th>
                <th className="pb-3 font-medium text-right">6mo Change</th>
                <th className="pb-3 font-medium text-right">Sales</th>
              </tr>
            </thead>
            <tbody>
              {sortedAreas.slice(0, 20).map((area, i) => (
                <tr 
                  key={area.name} 
                  className="border-b border-[var(--border)] hover:bg-[var(--muted)] transition-colors"
                >
                  <td className="py-3 text-[var(--muted-foreground)]">{i + 1}</td>
                  <td className="py-3 font-medium">{area.name}</td>
                  <td className="py-3 text-right font-mono">{formatFullPrice(area.medianPrice)}</td>
                  <td className="py-3 text-right font-mono text-[var(--muted-foreground)]">
                    €{area.avgPricePerSqm.toLocaleString()}
                  </td>
                  <td className={`py-3 text-right font-mono ${area.pctOverAsking > 60 ? 'price-positive' : ''}`}>
                    {area.pctOverAsking}%
                  </td>
                  <td className={`py-3 text-right font-mono ${area.change6m >= 0 ? 'price-positive' : 'price-negative'}`}>
                    {area.change6m >= 0 ? '+' : ''}{area.change6m}%
                  </td>
                  <td className="py-3 text-right text-[var(--muted-foreground)]">{area.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

