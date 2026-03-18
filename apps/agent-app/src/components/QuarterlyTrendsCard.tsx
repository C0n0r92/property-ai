'use client';

import { BarChart3, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatPriceCompact } from '@/lib/format';

interface QuarterStat {
  quarter: string;
  medianPrice: number;
  salesCount: number;
  change: number | null;
}

export interface QuarterlyTrendsCardProps {
  quarters: QuarterStat[];
  overallChange: number | null;
  periodStart: string;
  periodEnd: string;
  totalSalesAnalyzed: number;
}

export function QuarterlyTrendsCard({
  quarters,
  overallChange,
  periodStart,
  periodEnd,
  totalSalesAnalyzed,
}: QuarterlyTrendsCardProps) {
  // Get min/max for scaling
  const validQuarters = quarters.filter((q) => q.salesCount >= 5 && q.medianPrice > 0);
  if (validQuarters.length < 2) return null;

  const prices = validQuarters.map((q) => q.medianPrice);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice || 1;

  const getBarHeight = (price: number) => {
    const normalized = (price - minPrice) / priceRange;
    return 25 + normalized * 55; // 25% to 80%
  };

  const isUp = overallChange !== null && overallChange > 2;
  const isDown = overallChange !== null && overallChange < -2;

  const trendConfig = isUp
    ? {
        color: 'var(--positive)',
        bg: 'var(--positive-bg)',
        icon: <TrendingUp size={20} />,
        label: 'Rising',
      }
    : isDown
    ? {
        color: 'var(--negative)',
        bg: 'var(--negative-bg)',
        icon: <TrendingDown size={20} />,
        label: 'Falling',
      }
    : {
        color: 'var(--accent)',
        bg: 'var(--accent-bg)',
        icon: <Minus size={20} />,
        label: 'Stable',
      };

  return (
    <div className="card" role="region" aria-label="Quarterly price trends">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 size={20} style={{ color: 'var(--accent)' }} aria-hidden="true" />
          <h3 className="text-lg font-bold">Price History</h3>
        </div>
        <div
          className="flex items-center gap-2 px-3 py-1 rounded-full"
          style={{ background: trendConfig.bg, color: trendConfig.color }}
        >
          {trendConfig.icon}
          <span className="text-sm font-semibold">
            {overallChange !== null ? (
              <>
                {overallChange > 0 ? '+' : ''}{overallChange.toFixed(1)}%
              </>
            ) : (
              'N/A'
            )}
          </span>
        </div>
      </div>

      {/* Quarterly bar chart */}
      <div className="relative mb-2">
        <div
          className="flex items-end justify-between gap-2"
          style={{ height: '100px' }}
          role="img"
          aria-label={`Quarterly price chart from ${periodStart} to ${periodEnd}`}
        >
          {quarters.map((q, idx) => {
            const hasData = q.salesCount >= 5 && q.medianPrice > 0;
            const changeColor = q.change === null
              ? 'var(--foreground-muted)'
              : q.change > 0
              ? 'var(--positive)'
              : q.change < 0
              ? 'var(--negative)'
              : 'var(--foreground-muted)';

            return (
              <div
                key={q.quarter}
                className="flex-1 flex flex-col items-center group relative"
              >
                {/* Tooltip */}
                <div
                  className="absolute bottom-full mb-2 px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
                >
                  <p className="font-semibold">{formatPriceCompact(q.medianPrice)}</p>
                  {q.change !== null && (
                    <p style={{ color: changeColor }}>
                      {q.change > 0 ? '+' : ''}{q.change.toFixed(1)}% QoQ
                    </p>
                  )}
                  <p style={{ color: 'var(--foreground-muted)' }}>{q.salesCount} sales</p>
                </div>

                {/* Change indicator */}
                {hasData && q.change !== null && idx > 0 && (
                  <span
                    className="text-xs font-semibold mb-1"
                    style={{ color: changeColor }}
                  >
                    {q.change > 0 ? '+' : ''}{q.change.toFixed(0)}%
                  </span>
                )}

                {/* Bar */}
                <div
                  className="w-full rounded-t transition-all"
                  style={{
                    height: hasData ? `${getBarHeight(q.medianPrice)}%` : '15%',
                    background: hasData
                      ? idx === quarters.length - 1
                        ? 'var(--accent)'
                        : 'var(--border)'
                      : 'var(--border)',
                    opacity: hasData ? 1 : 0.2,
                    minWidth: '20px',
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* X-axis labels */}
        <div
          className="flex justify-between text-xs pt-2"
          style={{ borderTop: '1px solid var(--border)', color: 'var(--foreground-muted)' }}
        >
          {quarters.filter((_, idx) => idx % 2 === 0 || idx === quarters.length - 1).map((q) => (
            <span key={q.quarter}>{q.quarter.replace('20', "'")}</span>
          ))}
        </div>
      </div>

      {/* Summary stats */}
      <div
        className="grid grid-cols-3 gap-4 mt-4 pt-4"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <div>
          <p className="text-xs" style={{ color: 'var(--foreground-muted)' }}>
            Period
          </p>
          <p className="text-sm font-semibold">
            {periodStart.replace('20', "'")} - {periodEnd.replace('20', "'")}
          </p>
        </div>
        <div>
          <p className="text-xs" style={{ color: 'var(--foreground-muted)' }}>
            Overall Change
          </p>
          <p
            className="text-sm font-semibold"
            style={{ color: trendConfig.color, fontFamily: 'var(--font-mono)' }}
          >
            {overallChange !== null ? (
              <>{overallChange > 0 ? '+' : ''}{overallChange.toFixed(1)}%</>
            ) : (
              'N/A'
            )}
          </p>
        </div>
        <div>
          <p className="text-xs" style={{ color: 'var(--foreground-muted)' }}>
            Sales Analyzed
          </p>
          <p className="text-sm font-semibold">
            {totalSalesAnalyzed.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Insight */}
      <div
        className="mt-4 p-3 rounded-lg text-sm"
        style={{ background: trendConfig.bg, color: trendConfig.color }}
      >
        <p>
          {isUp ? (
            <>
              <strong>Rising market:</strong> Prices have increased {overallChange?.toFixed(1)}%
              since {periodStart}. Consider acting sooner rather than later.
            </>
          ) : isDown ? (
            <>
              <strong>Cooling market:</strong> Prices have softened {Math.abs(overallChange || 0).toFixed(1)}%
              since {periodStart}. More negotiation room may be available.
            </>
          ) : (
            <>
              <strong>Stable market:</strong> Prices have remained relatively steady
              over the past {quarters.length} quarters.
            </>
          )}
        </p>
      </div>
    </div>
  );
}
