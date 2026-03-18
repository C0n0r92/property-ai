'use client';

import { TrendingUp, TrendingDown, Minus, AlertCircle } from 'lucide-react';
import { formatPrice } from '@/lib/format';

export interface ValuationSummaryProps {
  estimatedValue: number;
  lowEstimate?: number;
  highEstimate?: number;
  confidence: 'high' | 'medium' | 'low';
  comparableCount: number;
  pricePerSqm?: number;
  areaMedian?: number;
}

export function ValuationSummary({
  estimatedValue,
  lowEstimate,
  highEstimate,
  confidence,
  comparableCount,
  pricePerSqm,
  areaMedian,
}: ValuationSummaryProps) {
  const getConfidenceColor = () => {
    switch (confidence) {
      case 'high':
        return 'var(--positive)';
      case 'medium':
        return 'var(--warning)';
      case 'low':
        return 'var(--negative)';
    }
  };

  const getConfidenceLabel = () => {
    switch (confidence) {
      case 'high':
        return 'High Confidence';
      case 'medium':
        return 'Medium Confidence';
      case 'low':
        return 'Low Confidence';
    }
  };

  const getConfidenceWidth = () => {
    switch (confidence) {
      case 'high':
        return '100%';
      case 'medium':
        return '66%';
      case 'low':
        return '33%';
    }
  };

  const comparedToMedian = areaMedian && areaMedian > 0
    ? ((estimatedValue - areaMedian) / areaMedian) * 100
    : null;

  return (
    <div className="card" style={{ borderLeft: `4px solid ${getConfidenceColor()}` }}>
      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-6">
        {/* Main Estimate */}
        <div>
          <p className="stat-label mb-2">ESTIMATED VALUE</p>
          <p className="text-4xl font-bold" style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
            {formatPrice(estimatedValue)}
          </p>
          {(lowEstimate && highEstimate) && (
            <p className="text-sm mt-2" style={{ color: 'var(--foreground-secondary)' }}>
              Range: {formatPrice(lowEstimate)} - {formatPrice(highEstimate)}
            </p>
          )}
        </div>

        {/* Confidence Indicator */}
        <div className="md:text-right">
          <p className="stat-label mb-2">CONFIDENCE</p>
          <div className="flex items-center gap-2 md:justify-end">
            <div
              className="w-24 h-2 rounded-full"
              style={{ background: 'var(--border)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: getConfidenceWidth(),
                  background: getConfidenceColor(),
                }}
              />
            </div>
            <span className="text-sm font-medium" style={{ color: getConfidenceColor() }}>
              {getConfidenceLabel()}
            </span>
          </div>
          <p className="text-sm mt-2" style={{ color: 'var(--foreground-secondary)' }}>
            Based on {comparableCount} comparable{comparableCount !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6 pt-6" style={{ borderTop: '1px solid var(--border)' }}>
        {pricePerSqm && (
          <div>
            <p className="stat-label">Price/sqm</p>
            <p className="font-bold text-lg" style={{ fontFamily: 'var(--font-mono)' }}>
              {formatPrice(pricePerSqm)}
            </p>
          </div>
        )}

        {areaMedian && (
          <div>
            <p className="stat-label">Area Median</p>
            <p className="font-bold text-lg" style={{ fontFamily: 'var(--font-mono)' }}>
              {formatPrice(areaMedian)}
            </p>
          </div>
        )}

        {comparedToMedian !== null && (
          <div>
            <p className="stat-label">vs Median</p>
            <div className="flex items-center gap-1">
              {comparedToMedian > 2 ? (
                <TrendingUp size={16} style={{ color: 'var(--positive)' }} />
              ) : comparedToMedian < -2 ? (
                <TrendingDown size={16} style={{ color: 'var(--negative)' }} />
              ) : (
                <Minus size={16} style={{ color: 'var(--foreground-secondary)' }} />
              )}
              <p
                className="font-bold text-lg"
                style={{
                  color: comparedToMedian > 2 ? 'var(--positive)' : comparedToMedian < -2 ? 'var(--negative)' : 'var(--foreground-secondary)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {comparedToMedian > 0 ? '+' : ''}{comparedToMedian.toFixed(1)}%
              </p>
            </div>
          </div>
        )}
      </div>

      {confidence === 'low' && (
        <div
          className="flex items-start gap-2 mt-4 p-3 rounded-lg"
          style={{ background: 'var(--warning-bg)' }}
        >
          <AlertCircle size={18} style={{ color: 'var(--warning)', flexShrink: 0, marginTop: 2 }} />
          <p className="text-sm" style={{ color: 'var(--warning)' }}>
            Limited comparable data available. Consider expanding search radius or adjusting property criteria for more accurate estimate.
          </p>
        </div>
      )}
    </div>
  );
}
