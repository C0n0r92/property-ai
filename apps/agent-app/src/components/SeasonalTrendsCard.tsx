'use client';

import { Calendar, TrendingDown, TrendingUp, Percent } from 'lucide-react';
import { formatPriceCompact } from '@/lib/format';

interface MonthStat {
  month: string;
  medianPrice: number;
  medianOverUnder: number;
  salesCount: number;
}

export interface SeasonalTrendsCardProps {
  monthlyStats: MonthStat[];
  cheapestMonths: string[];
  expensiveMonths: string[];
  bestDealMonths: string[];
  avgPrice: number;
  totalSalesAnalyzed: number;
}

export function SeasonalTrendsCard({
  monthlyStats,
  cheapestMonths,
  expensiveMonths,
  bestDealMonths,
  avgPrice,
  totalSalesAnalyzed,
}: SeasonalTrendsCardProps) {
  // Get min/max for scaling bars
  const validStats = monthlyStats.filter((m) => m.salesCount >= 5);
  const prices = validStats.map((m) => m.medianPrice);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice || 1;

  const getBarHeight = (price: number) => {
    const normalized = (price - minPrice) / priceRange;
    return 30 + normalized * 50; // 30% to 80%
  };

  const isCheapest = (month: string) => cheapestMonths.includes(month);
  const isExpensive = (month: string) => expensiveMonths.includes(month);

  return (
    <div className="card" role="region" aria-label="Seasonal price trends">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar size={20} style={{ color: 'var(--accent)' }} aria-hidden="true" />
          <h3 className="text-lg font-bold">Best Time to Buy</h3>
        </div>
        <span
          className="text-xs px-2 py-1 rounded-full"
          style={{ background: 'var(--surface-hover)', color: 'var(--foreground-muted)' }}
        >
          {totalSalesAnalyzed.toLocaleString()} sales analyzed
        </span>
      </div>

      {/* Monthly bar chart */}
      <div className="relative mb-4">
        <div
          className="flex items-end justify-between gap-1"
          style={{ height: '100px' }}
          role="img"
          aria-label="Monthly price chart showing seasonal patterns"
        >
          {monthlyStats.map((stat) => (
            <div
              key={stat.month}
              className="flex-1 flex flex-col items-center group relative"
            >
              {/* Tooltip */}
              <div
                className="absolute bottom-full mb-2 px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <p className="font-semibold">{formatPriceCompact(stat.medianPrice)}</p>
                <p style={{ color: 'var(--foreground-muted)' }}>{stat.salesCount} sales</p>
              </div>
              {/* Bar */}
              <div
                className="w-full rounded-t transition-all"
                style={{
                  height: stat.salesCount >= 5 ? `${getBarHeight(stat.medianPrice)}%` : '20%',
                  background: isCheapest(stat.month)
                    ? 'var(--positive)'
                    : isExpensive(stat.month)
                    ? 'var(--negative)'
                    : 'var(--border)',
                  minWidth: '6px',
                  opacity: stat.salesCount >= 5 ? 1 : 0.3,
                }}
              />
              {/* Month label */}
              <span
                className="text-xs mt-1"
                style={{
                  color: isCheapest(stat.month)
                    ? 'var(--positive)'
                    : isExpensive(stat.month)
                    ? 'var(--negative)'
                    : 'var(--foreground-muted)',
                  fontWeight: isCheapest(stat.month) || isExpensive(stat.month) ? 600 : 400,
                }}
              >
                {stat.month.slice(0, 1)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Insights grid */}
      <div
        className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        {/* Cheapest months */}
        <div className="p-3 rounded-lg" style={{ background: 'var(--positive-bg)' }}>
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown size={16} style={{ color: 'var(--positive)' }} />
            <p className="text-xs font-semibold" style={{ color: 'var(--positive)' }}>
              CHEAPEST MONTHS
            </p>
          </div>
          <p className="font-bold" style={{ color: 'var(--positive)' }}>
            {cheapestMonths.join(' & ')}
          </p>
          <p className="text-xs" style={{ color: 'var(--foreground-muted)' }}>
            Lowest median prices
          </p>
        </div>

        {/* Best deal months */}
        <div className="p-3 rounded-lg" style={{ background: 'var(--accent-bg)' }}>
          <div className="flex items-center gap-2 mb-1">
            <Percent size={16} style={{ color: 'var(--accent)' }} />
            <p className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>
              BEST DEALS
            </p>
          </div>
          <p className="font-bold" style={{ color: 'var(--accent)' }}>
            {bestDealMonths.join(' & ')}
          </p>
          <p className="text-xs" style={{ color: 'var(--foreground-muted)' }}>
            Most under-asking sales
          </p>
        </div>

        {/* Most expensive months */}
        <div className="p-3 rounded-lg" style={{ background: 'var(--negative-bg)' }}>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={16} style={{ color: 'var(--negative)' }} />
            <p className="text-xs font-semibold" style={{ color: 'var(--negative)' }}>
              PEAK PRICES
            </p>
          </div>
          <p className="font-bold" style={{ color: 'var(--negative)' }}>
            {expensiveMonths.join(' & ')}
          </p>
          <p className="text-xs" style={{ color: 'var(--foreground-muted)' }}>
            Highest median prices
          </p>
        </div>
      </div>

      {/* Average price reference */}
      <p
        className="text-xs mt-3 text-center"
        style={{ color: 'var(--foreground-muted)' }}
      >
        Average monthly median: {formatPriceCompact(avgPrice)}
      </p>
    </div>
  );
}
