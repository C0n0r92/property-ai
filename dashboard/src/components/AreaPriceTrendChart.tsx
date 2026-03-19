'use client';

import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceDot } from 'recharts';

interface TrendData {
  month: string;
  medianPrice: number;
  count: number;
}

interface TrendResponse {
  area: string;
  slug: string;
  trends: TrendData[];
  totalSales: number;
  message?: string;
}

interface AreaPriceTrendChartProps {
  slug: string;
}

export function AreaPriceTrendChart({ slug }: AreaPriceTrendChartProps) {
  const [data, setData] = useState<TrendResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTrends() {
      try {
        setLoading(true);
        const response = await fetch(`/api/areas/${slug}/trends`);

        if (!response.ok) {
          throw new Error('Failed to load trend data');
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error('Error loading trends:', err);
        setError('Failed to load price trend data');
      } finally {
        setLoading(false);
      }
    }

    fetchTrends();
  }, [slug]);

  if (loading) {
    return (
      <div className="bg-[var(--surface)] p-6 rounded-lg border border-[var(--border)] mb-8">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded w-48 mb-2"></div>
          <div className="h-4 bg-gray-700 rounded w-32 mb-6"></div>
          <div className="h-64 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-[var(--surface)] p-6 rounded-lg border border-[var(--border)] mb-8">
        <h2 className="text-2xl font-semibold mb-2 text-[var(--foreground)]">12-Month Price Trend</h2>
        <p className="text-sm text-red-400">{error || 'Unable to load price trend data'}</p>
      </div>
    );
  }

  // Check if we have sufficient data (at least 6 months with sales)
  const monthsWithData = data.trends.length;
  if (monthsWithData < 6) {
    return (
      <div className="bg-[var(--surface)] p-6 rounded-lg border border-[var(--border)] mb-8">
        <h2 className="text-2xl font-semibold mb-2 text-[var(--foreground)]">12-Month Price Trend</h2>
        <div className="flex items-center gap-3 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <svg className="w-5 h-5 text-yellow-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-yellow-400">Not enough data yet</p>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">
              We need at least 6 months of sales data to show a meaningful price trend. Currently have {monthsWithData} month{monthsWithData !== 1 ? 's' : ''}.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Transform data for chart display
  const chartData = data.trends.map(t => ({
    ...t,
    label: new Date(t.month + '-01').toLocaleDateString('en-IE', { month: 'short', year: '2-digit' }),
    sparse: t.count < 3 // Mark months with < 3 sales as sparse
  }));

  // Calculate price change from first to last month
  const firstPrice = chartData[0]?.medianPrice || 0;
  const lastPrice = chartData[chartData.length - 1]?.medianPrice || 0;
  const priceChange = firstPrice > 0 ? ((lastPrice - firstPrice) / firstPrice) * 100 : 0;

  return (
    <div className="bg-gradient-to-br from-blue-500/5 to-purple-500/5 p-6 rounded-lg border border-blue-500/20 mb-8">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-2xl font-semibold mb-2 flex items-center gap-2 text-[var(--foreground)]">
            📈 12-Month Price Trend
            <span className="text-xs font-normal text-blue-400 bg-blue-500/20 px-2 py-1 rounded-full">
              Updated daily
            </span>
          </h2>
          <p className="text-sm text-[var(--muted-foreground)]">
            Based on {data.totalSales} sales • {' '}
            <span className={priceChange >= 0 ? 'text-green-400' : 'text-red-400'}>
              {priceChange >= 0 ? '↗' : '↘'} {Math.abs(priceChange).toFixed(1)}% over 12 months
            </span>
          </p>
        </div>
      </div>

      <div className="h-80 min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.2}/>
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#9CA3AF', fontSize: 12 }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#9CA3AF', fontSize: 12 }}
              tickFormatter={(value) => {
                if (value >= 1000000) {
                  return `€${(value / 1000000).toFixed(1)}M`;
                }
                return `€${Math.round(value / 1000)}k`;
              }}
              domain={['dataMin - 50000', 'dataMax + 50000']}
              dx={-10}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1F2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#F9FAFB',
                padding: '12px',
                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.3)',
              }}
              labelStyle={{
                color: '#F9FAFB',
                fontWeight: '600',
                marginBottom: '8px',
              }}
              itemStyle={{
                color: '#F9FAFB',
              }}
              formatter={(value: number | undefined, name: string | undefined, props: any) => {
                if (value === undefined) return ['N/A', 'No data'];
                const formatted = `€${value.toLocaleString()}`;
                const count = props.payload.count;
                const label = count === 1 ? 'sale' : 'sales';
                return [formatted, `Median Price (${count} ${label})`];
              }}
            />
            <Line
              type="monotone"
              dataKey="medianPrice"
              stroke="#3B82F6"
              strokeWidth={3}
              dot={{ fill: '#3B82F6', r: 4, strokeWidth: 2, stroke: '#1F2937' }}
              activeDot={{ r: 6, strokeWidth: 2, stroke: '#1F2937' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
