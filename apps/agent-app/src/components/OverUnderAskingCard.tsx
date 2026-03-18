'use client';

import { TrendingUp, TrendingDown, Minus, Target } from 'lucide-react';
import { formatPrice } from '@/lib/format';

export interface OverUnderAskingCardProps {
  soldPrice: number;
  askingPrice: number;
  overUnderPercent: number;
  areaAvgOverUnder?: number;
  areaPercentOverAsking?: number;
}

export function OverUnderAskingCard({
  soldPrice,
  askingPrice,
  overUnderPercent,
  areaAvgOverUnder,
  areaPercentOverAsking,
}: OverUnderAskingCardProps) {
  const isOver = overUnderPercent > 0;
  const isUnder = overUnderPercent < 0;
  const absoluteDiff = Math.abs(soldPrice - askingPrice);

  // Determine verdict vs area norm
  let verdict = 'Typical for area';
  let verdictColor = 'var(--foreground-secondary)';

  if (areaAvgOverUnder !== undefined) {
    const diff = overUnderPercent - areaAvgOverUnder;
    if (diff > 3) {
      verdict = 'Above area norm';
      verdictColor = 'var(--warning)';
    } else if (diff < -3) {
      verdict = 'Below area norm';
      verdictColor = 'var(--positive)';
    }
  }

  const badgeConfig = isOver
    ? {
        bg: 'var(--negative-bg)',
        border: 'var(--negative)',
        text: 'var(--negative)',
        label: `SOLD ${Math.abs(overUnderPercent).toFixed(1)}% OVER ASKING`,
        icon: <TrendingUp size={28} />,
      }
    : isUnder
    ? {
        bg: 'var(--positive-bg)',
        border: 'var(--positive)',
        text: 'var(--positive)',
        label: `SOLD ${Math.abs(overUnderPercent).toFixed(1)}% UNDER ASKING`,
        icon: <TrendingDown size={28} />,
      }
    : {
        bg: 'var(--accent-bg)',
        border: 'var(--accent)',
        text: 'var(--accent)',
        label: 'SOLD AT ASKING PRICE',
        icon: <Minus size={28} />,
      };

  return (
    <div
      className="card"
      role="region"
      aria-label={`Sale outcome: ${badgeConfig.label}`}
      style={{
        background: badgeConfig.bg,
        borderLeft: `4px solid ${badgeConfig.border}`,
      }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Main Badge */}
        <div className="flex items-center gap-4 flex-1">
          <div
            className="p-3 rounded-lg flex-shrink-0"
            style={{ background: badgeConfig.bg, color: badgeConfig.text }}
          >
            {badgeConfig.icon}
          </div>
          <div>
            <p className="stat-label mb-1">ASKING VS SOLD</p>
            <h3
              className="text-2xl font-bold"
              style={{ color: badgeConfig.text, fontFamily: 'var(--font-mono)' }}
            >
              {badgeConfig.label}
            </h3>
            <p className="text-sm mt-1" style={{ color: 'var(--foreground-secondary)' }}>
              {isOver ? (
                <>Sold for <span style={{ color: badgeConfig.text, fontWeight: 600 }}>{formatPrice(absoluteDiff)}</span> more than asking</>
              ) : isUnder ? (
                <>Sold for <span style={{ color: badgeConfig.text, fontWeight: 600 }}>{formatPrice(absoluteDiff)}</span> less than asking</>
              ) : (
                'Sold exactly at the asking price'
              )}
            </p>
          </div>
        </div>

        {/* Absolute Numbers */}
        <div
          className="flex flex-col items-end text-right"
          style={{ minWidth: '140px' }}
        >
          <div className="mb-2">
            <p className="text-xs" style={{ color: 'var(--foreground-muted)' }}>Asking</p>
            <p className="text-lg font-semibold" style={{ fontFamily: 'var(--font-mono)' }}>
              {formatPrice(askingPrice)}
            </p>
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--foreground-muted)' }}>Sold</p>
            <p
              className="text-lg font-bold"
              style={{ color: badgeConfig.text, fontFamily: 'var(--font-mono)' }}
            >
              {formatPrice(soldPrice)}
            </p>
          </div>
        </div>
      </div>

      {/* Area Context */}
      {(areaAvgOverUnder !== undefined || areaPercentOverAsking !== undefined) && (
        <div
          className="mt-4 pt-4 flex flex-wrap gap-4"
          style={{ borderTop: `1px solid ${badgeConfig.border}` }}
        >
          {areaPercentOverAsking !== undefined && (
            <div className="flex items-center gap-2">
              <Target size={16} style={{ color: 'var(--foreground-muted)' }} />
              <p className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                <span style={{ fontWeight: 600 }}>{areaPercentOverAsking.toFixed(0)}%</span> of sales in this area go over asking
              </p>
            </div>
          )}
          {areaAvgOverUnder !== undefined && (
            <div className="flex items-center gap-2">
              <TrendingUp size={16} style={{ color: 'var(--foreground-muted)' }} />
              <p className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                Avg premium: <span style={{ fontWeight: 600 }}>{areaAvgOverUnder > 0 ? '+' : ''}{areaAvgOverUnder.toFixed(1)}%</span>
              </p>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span
              className="px-2 py-1 rounded text-xs font-medium"
              style={{ background: badgeConfig.bg, color: verdictColor }}
            >
              {verdict}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
