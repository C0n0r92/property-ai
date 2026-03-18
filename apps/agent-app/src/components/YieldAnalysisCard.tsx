'use client';

import { Banknote, TrendingUp, TrendingDown, Minus, BarChart3, Info } from 'lucide-react';
import { formatPrice } from '@/lib/format';

export interface YieldAnalysisCardProps {
  estimatedMonthlyRent: number;
  grossYield: number;
  confidence: 'high' | 'medium' | 'low';
  areaMedianYield?: number | null;
  rentalDataPoints: number;
}

export function YieldAnalysisCard({
  estimatedMonthlyRent,
  grossYield,
  confidence,
  areaMedianYield,
  rentalDataPoints,
}: YieldAnalysisCardProps) {

  // Determine yield assessment
  const isHighYield = grossYield >= 6;
  const isLowYield = grossYield < 4;
  const yieldVsArea = areaMedianYield ? grossYield - areaMedianYield : null;

  const yieldConfig = isHighYield
    ? {
        color: 'var(--positive)',
        bg: 'var(--positive-bg)',
        label: 'Strong Yield',
        icon: <TrendingUp size={16} />,
      }
    : isLowYield
    ? {
        color: 'var(--warning)',
        bg: 'var(--warning-bg)',
        label: 'Below Average',
        icon: <TrendingDown size={16} />,
      }
    : {
        color: 'var(--accent)',
        bg: 'var(--accent-bg)',
        label: 'Average Yield',
        icon: <Minus size={16} />,
      };

  const confidenceConfig = {
    high: { color: 'var(--positive)', label: 'High' },
    medium: { color: 'var(--warning)', label: 'Medium' },
    low: { color: 'var(--foreground-muted)', label: 'Low' },
  };

  const annualRent = estimatedMonthlyRent * 12;

  return (
    <div className="card h-full" role="region" aria-label="Investment yield analysis">
      <div className="flex items-center gap-2 mb-4">
        <Banknote size={20} style={{ color: 'var(--accent)' }} aria-hidden="true" />
        <h3 className="text-lg font-bold">Investment Analysis</h3>
      </div>

      {/* Main Yield Display */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="stat-label">GROSS YIELD</p>
          <p
            className="text-4xl font-bold"
            style={{ color: yieldConfig.color, fontFamily: 'var(--font-mono)' }}
          >
            {grossYield.toFixed(2)}%
          </p>
          <div
            className="inline-flex items-center gap-1 px-2 py-1 rounded mt-2"
            style={{ background: yieldConfig.bg, color: yieldConfig.color }}
          >
            {yieldConfig.icon}
            <span className="text-xs font-medium">{yieldConfig.label}</span>
          </div>
        </div>

        <div className="text-right">
          <p className="stat-label">EST. MONTHLY RENT</p>
          <p
            className="text-2xl font-bold"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {formatPrice(estimatedMonthlyRent)}
          </p>
          <p className="text-xs" style={{ color: 'var(--foreground-muted)' }}>
            {formatPrice(annualRent)}/year
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div
        className="grid grid-cols-2 gap-4 pt-4"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        {/* Yield vs Area */}
        {yieldVsArea !== null && (
          <div>
            <p className="text-xs mb-1" style={{ color: 'var(--foreground-muted)' }}>
              Yield vs Area
            </p>
            <p
              className="text-sm font-semibold"
              style={{
                color: yieldVsArea > 0 ? 'var(--positive)' : yieldVsArea < 0 ? 'var(--warning)' : 'var(--foreground-secondary)',
              }}
            >
              {yieldVsArea > 0 ? '+' : ''}{yieldVsArea.toFixed(2)}%
              {yieldVsArea > 0.5 ? ' higher' : yieldVsArea < -0.5 ? ' lower' : ' similar'}
            </p>
          </div>
        )}

        {/* Data Points */}
        <div>
          <p className="text-xs mb-1" style={{ color: 'var(--foreground-muted)' }}>
            Rental Data
          </p>
          <div className="flex items-center gap-1">
            <BarChart3 size={14} style={{ color: 'var(--foreground-muted)' }} />
            <p className="text-sm font-semibold">
              {rentalDataPoints} properties
            </p>
          </div>
        </div>

        {/* Confidence */}
        <div>
          <p className="text-xs mb-1" style={{ color: 'var(--foreground-muted)' }}>
            Confidence
          </p>
          <div className="flex items-center gap-2" role="meter" aria-label={`Confidence level: ${confidenceConfig[confidence].label}`} aria-valuenow={confidence === 'high' ? 3 : confidence === 'medium' ? 2 : 1} aria-valuemin={1} aria-valuemax={3}>
            <div className="flex gap-1" aria-hidden="true">
              {['low', 'medium', 'high'].map((_, i) => (
                <div
                  key={i}
                  className="w-4 h-2 rounded-full"
                  style={{
                    background:
                      (confidence === 'high' && i <= 2) ||
                      (confidence === 'medium' && i <= 1) ||
                      (confidence === 'low' && i === 0)
                        ? confidenceConfig[confidence].color
                        : 'var(--border)',
                  }}
                />
              ))}
            </div>
            <span className="text-xs" style={{ color: confidenceConfig[confidence].color }}>
              {confidenceConfig[confidence].label}
            </span>
          </div>
        </div>
      </div>

      {/* Note */}
      <div
        className="flex items-start gap-2 mt-4 pt-4 text-xs"
        style={{ borderTop: '1px solid var(--border)', color: 'var(--foreground-muted)' }}
      >
        <Info size={14} className="flex-shrink-0 mt-0.5" />
        <p>
          Based on {rentalDataPoints} active rentals in this area. Actual returns may vary.
        </p>
      </div>
    </div>
  );
}
