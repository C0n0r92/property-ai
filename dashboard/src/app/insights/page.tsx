'use client';

import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { formatFullPrice } from '@/lib/format';

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

export default function InsightsPage() {
  const [data, setData] = useState<{
    stats: Stats;
    areaStats: AreaStat[];
    propertyTypes: PropertyType[];
    monthlyTrend: MonthlyTrend[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'count' | 'medianPrice' | 'change6m'>('count');
  
  useEffect(() => {
    fetch('/api/stats')
      .then(res => res.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);
  
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

