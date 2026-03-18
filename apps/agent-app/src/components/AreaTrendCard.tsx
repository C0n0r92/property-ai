'use client';

import { TrendingUp, TrendingDown, Minus, MapPin } from 'lucide-react';
import { formatPriceCompact } from '@/lib/format';

export interface AreaTrendCardProps {
  change6m: number;
  areaName: string;
  medianPrice?: number;
}

export function AreaTrendCard({
  change6m,
  areaName,
  medianPrice,
}: AreaTrendCardProps) {
  const isUp = change6m > 1;
  const isDown = change6m < -1;

  const trendConfig = isUp
    ? {
        color: 'var(--positive)',
        bg: 'var(--positive-bg)',
        icon: <TrendingUp size={24} />,
        label: 'Rising Market',
        description: 'Prices are trending upward in this area',
      }
    : isDown
    ? {
        color: 'var(--negative)',
        bg: 'var(--negative-bg)',
        icon: <TrendingDown size={24} />,
        label: 'Cooling Market',
        description: 'Prices have softened in this area',
      }
    : {
        color: 'var(--accent)',
        bg: 'var(--accent-bg)',
        icon: <Minus size={24} />,
        label: 'Stable Market',
        description: 'Prices are holding steady',
      };

  return (
    <div
      className="card"
      role="region"
      aria-label={`Area price trend for ${areaName}: ${change6m > 0 ? '+' : ''}${change6m.toFixed(1)}% over 6 months`}
      style={{
        background: trendConfig.bg,
        borderLeft: `4px solid ${trendConfig.color}`,
      }}
    >
      <div className="flex items-center gap-4">
        {/* Icon */}
        <div
          className="p-3 rounded-lg flex-shrink-0"
          style={{ background: trendConfig.bg, color: trendConfig.color }}
          aria-hidden="true"
        >
          {trendConfig.icon}
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <MapPin size={14} style={{ color: 'var(--foreground-muted)' }} aria-hidden="true" />
            <p className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
              {areaName}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <p className="stat-label mb-1">6-MONTH PRICE TREND</p>
              <h3 className="text-2xl font-bold" style={{ color: trendConfig.color }}>
                {trendConfig.label}
              </h3>
            </div>
            <div
              className="px-4 py-2 rounded-lg text-center"
              style={{ background: trendConfig.bg }}
            >
              <p
                className="text-3xl font-bold"
                style={{ color: trendConfig.color, fontFamily: 'var(--font-mono)' }}
              >
                {change6m > 0 ? '+' : ''}{change6m.toFixed(1)}%
              </p>
              <p className="text-xs" style={{ color: trendConfig.color }}>
                vs 6 months ago
              </p>
            </div>
          </div>
          <p className="text-sm mt-2" style={{ color: 'var(--foreground-secondary)' }}>
            {trendConfig.description}.
            {medianPrice && (
              <> Current median: <strong style={{ fontFamily: 'var(--font-mono)' }}>{formatPriceCompact(medianPrice)}</strong></>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
