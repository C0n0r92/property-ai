'use client';

import { CheckCircle, AlertTriangle, AlertCircle, TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';
import { formatPrice } from '@/lib/format';

export type DealVerdict = 'great_deal' | 'good_value' | 'fair_price' | 'above_market' | 'premium' | 'insufficient_data' | 'unknown';

export interface DealAssessmentProps {
  verdict: DealVerdict;
  assessment: string;
  percentDiff?: number;
  confidence?: 'high' | 'medium' | 'low';
  pricePerSqmDiff?: number;
  medianPrice?: number;
  propertyPrice?: number;
}

export function DealAssessment({
  verdict,
  assessment,
  percentDiff,
  confidence = 'medium',
  pricePerSqmDiff,
  medianPrice,
  propertyPrice,
}: DealAssessmentProps) {
  const getVerdictConfig = () => {
    switch (verdict) {
      case 'great_deal':
        return {
          bg: 'var(--positive-bg)',
          border: 'var(--positive)',
          text: 'var(--positive)',
          icon: <CheckCircle size={24} />,
          label: 'Great Deal',
          description: 'This property is priced significantly below market value.',
        };
      case 'good_value':
        return {
          bg: 'var(--positive-bg)',
          border: 'var(--positive)',
          text: 'var(--positive)',
          icon: <TrendingDown size={24} />,
          label: 'Good Value',
          description: 'This property offers good value compared to the market.',
        };
      case 'fair_price':
        return {
          bg: 'var(--accent-bg)',
          border: 'var(--accent)',
          text: 'var(--accent)',
          icon: <Minus size={24} />,
          label: 'Fair Price',
          description: 'This property is priced in line with market expectations.',
        };
      case 'above_market':
        return {
          bg: 'var(--warning-bg)',
          border: 'var(--warning)',
          text: 'var(--warning)',
          icon: <AlertTriangle size={24} />,
          label: 'Above Market',
          description: 'This property is priced above the market median.',
        };
      case 'premium':
        return {
          bg: 'var(--negative-bg)',
          border: 'var(--negative)',
          text: 'var(--negative)',
          icon: <TrendingUp size={24} />,
          label: 'Premium Price',
          description: 'This property commands a significant premium over market.',
        };
      case 'insufficient_data':
        return {
          bg: 'var(--surface-hover)',
          border: 'var(--border)',
          text: 'var(--foreground-secondary)',
          icon: <Info size={24} />,
          label: 'Limited Data',
          description: 'Not enough comparable sales to make a confident assessment.',
        };
      case 'unknown':
      default:
        return {
          bg: 'var(--surface-hover)',
          border: 'var(--border)',
          text: 'var(--foreground-secondary)',
          icon: <AlertCircle size={24} />,
          label: 'Unknown',
          description: 'Unable to determine deal quality.',
        };
    }
  };

  const config = getVerdictConfig();

  return (
    <div
      className="card"
      style={{
        background: config.bg,
        borderLeft: `4px solid ${config.border}`,
      }}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div
          className="p-3 rounded-lg flex-shrink-0"
          style={{ background: config.bg, color: config.text }}
        >
          {config.icon}
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
            <div>
              <p className="stat-label mb-1">DEAL ASSESSMENT</p>
              <h3 className="text-2xl font-bold" style={{ color: config.text }}>
                {config.label}
              </h3>
            </div>

            {percentDiff !== undefined && (
              <div
                className="px-4 py-2 rounded-lg text-center"
                style={{ background: config.bg }}
              >
                <p className="text-2xl font-bold" style={{ color: config.text, fontFamily: 'var(--font-mono)' }}>
                  {percentDiff > 0 ? '+' : ''}{percentDiff.toFixed(1)}%
                </p>
                <p className="text-xs" style={{ color: config.text }}>vs median</p>
              </div>
            )}
          </div>

          <p style={{ color: 'var(--foreground-secondary)' }}>{assessment}</p>

          {/* Additional Context */}
          {(medianPrice || pricePerSqmDiff) && (
            <div
              className="grid grid-cols-2 gap-4 mt-4 pt-4"
              style={{ borderTop: `1px solid ${config.border}`, opacity: 0.8 }}
            >
              {medianPrice && propertyPrice && (
                <div>
                  <p className="text-xs" style={{ color: 'var(--foreground-muted)' }}>Price Comparison</p>
                  <p className="text-sm">
                    <span style={{ color: config.text }}>{formatPrice(propertyPrice)}</span>
                    <span style={{ color: 'var(--foreground-secondary)' }}> vs {formatPrice(medianPrice)} median</span>
                  </p>
                </div>
              )}

              {pricePerSqmDiff !== undefined && (
                <div>
                  <p className="text-xs" style={{ color: 'var(--foreground-muted)' }}>Price/sqm vs Area</p>
                  <p className="text-sm" style={{ color: config.text }}>
                    {pricePerSqmDiff > 0 ? '+' : ''}{pricePerSqmDiff.toFixed(1)}% vs area average
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Confidence Indicator */}
          {confidence && verdict !== 'insufficient_data' && verdict !== 'unknown' && (
            <div className="flex items-center gap-2 mt-4">
              <p className="text-xs" style={{ color: 'var(--foreground-muted)' }}>
                Confidence:
              </p>
              <div className="flex gap-1">
                {['low', 'medium', 'high'].map((_, i) => (
                  <div
                    key={i}
                    className="w-6 h-2 rounded-full"
                    style={{
                      background:
                        (confidence === 'high' && i <= 2) ||
                        (confidence === 'medium' && i <= 1) ||
                        (confidence === 'low' && i === 0)
                          ? config.text
                          : 'var(--border)',
                    }}
                  />
                ))}
              </div>
              <p className="text-xs capitalize" style={{ color: 'var(--foreground-muted)' }}>
                {confidence}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
