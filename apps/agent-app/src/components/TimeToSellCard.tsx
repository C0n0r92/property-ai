'use client';

import { Clock, Zap, Hourglass } from 'lucide-react';

interface MonthStat {
  month: string;
  medianDays: number;
  salesCount: number;
}

export interface TimeToSellCardProps {
  monthlyStats: MonthStat[];
  fastestMonths: string[];
  slowestMonths: string[];
  avgDays: number;
  totalSalesAnalyzed: number;
}

export function TimeToSellCard({
  monthlyStats,
  fastestMonths,
  slowestMonths,
  avgDays,
  totalSalesAnalyzed,
}: TimeToSellCardProps) {
  // Get min/max for scaling
  const validStats = monthlyStats.filter((m) => m.salesCount >= 5);
  if (validStats.length < 4) return null;

  const days = validStats.map((m) => m.medianDays);
  const minDays = Math.min(...days);
  const maxDays = Math.max(...days);
  const daysRange = maxDays - minDays || 1;

  // Invert the bar height - faster (fewer days) should be taller
  const getBarHeight = (medianDays: number) => {
    const normalized = (maxDays - medianDays) / daysRange;
    return 30 + normalized * 50; // 30% to 80%
  };

  const isFastest = (month: string) => fastestMonths.includes(month);
  const isSlowest = (month: string) => slowestMonths.includes(month);

  return (
    <div className="card" role="region" aria-label="Time to sell trends">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock size={20} style={{ color: 'var(--accent)' }} aria-hidden="true" />
          <h3 className="text-lg font-bold">When Properties Sell Fastest</h3>
        </div>
        <span
          className="text-xs px-2 py-1 rounded-full"
          style={{ background: 'var(--surface-hover)', color: 'var(--foreground-muted)' }}
        >
          {totalSalesAnalyzed.toLocaleString()} sales
        </span>
      </div>

      {/* Monthly bar chart - taller = faster sale */}
      <div className="relative mb-4">
        <div
          className="flex items-end justify-between gap-1"
          style={{ height: '80px' }}
          role="img"
          aria-label="Monthly time to sell chart - taller bars mean faster sales"
        >
          {monthlyStats.map((stat) => {
            const hasData = stat.salesCount >= 5;
            return (
              <div
                key={stat.month}
                className="flex-1 flex flex-col items-center group relative"
              >
                {/* Tooltip */}
                <div
                  className="absolute bottom-full mb-2 px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                >
                  <p className="font-semibold">{stat.medianDays} days</p>
                  <p style={{ color: 'var(--foreground-muted)' }}>{stat.salesCount} sales</p>
                </div>
                {/* Bar */}
                <div
                  className="w-full rounded-t transition-all"
                  style={{
                    height: hasData ? `${getBarHeight(stat.medianDays)}%` : '20%',
                    background: isFastest(stat.month)
                      ? 'var(--positive)'
                      : isSlowest(stat.month)
                      ? 'var(--warning)'
                      : 'var(--border)',
                    minWidth: '6px',
                    opacity: hasData ? 1 : 0.3,
                  }}
                />
                {/* Month label */}
                <span
                  className="text-xs mt-1"
                  style={{
                    color: isFastest(stat.month)
                      ? 'var(--positive)'
                      : isSlowest(stat.month)
                      ? 'var(--warning)'
                      : 'var(--foreground-muted)',
                    fontWeight: isFastest(stat.month) || isSlowest(stat.month) ? 600 : 400,
                  }}
                >
                  {stat.month.slice(0, 1)}
                </span>
              </div>
            );
          })}
        </div>
        <p
          className="text-xs text-center mt-2"
          style={{ color: 'var(--foreground-muted)' }}
        >
          Taller bars = faster sales
        </p>
      </div>

      {/* Insights */}
      <div
        className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        {/* Fastest months */}
        <div className="p-3 rounded-lg" style={{ background: 'var(--positive-bg)' }}>
          <div className="flex items-center gap-2 mb-1">
            <Zap size={16} style={{ color: 'var(--positive)' }} />
            <p className="text-xs font-semibold" style={{ color: 'var(--positive)' }}>
              FASTEST SELLING
            </p>
          </div>
          <p className="font-bold" style={{ color: 'var(--positive)' }}>
            {fastestMonths.join(' & ')}
          </p>
          <p className="text-xs" style={{ color: 'var(--foreground-muted)' }}>
            Properties move quickest
          </p>
        </div>

        {/* Slowest months */}
        <div className="p-3 rounded-lg" style={{ background: 'var(--warning-bg)' }}>
          <div className="flex items-center gap-2 mb-1">
            <Hourglass size={16} style={{ color: 'var(--warning)' }} />
            <p className="text-xs font-semibold" style={{ color: 'var(--warning)' }}>
              SLOWEST SELLING
            </p>
          </div>
          <p className="font-bold" style={{ color: 'var(--warning)' }}>
            {slowestMonths.join(' & ')}
          </p>
          <p className="text-xs" style={{ color: 'var(--foreground-muted)' }}>
            More time to negotiate
          </p>
        </div>
      </div>

      {/* Average reference */}
      <div
        className="mt-4 p-3 rounded-lg text-sm"
        style={{ background: 'var(--surface-hover)', color: 'var(--foreground-secondary)' }}
      >
        <p>
          Properties in this area typically sell in <strong>{avgDays} days</strong> on average.
          {' '}Listing in {fastestMonths[0]} could mean a faster sale.
        </p>
      </div>
    </div>
  );
}
