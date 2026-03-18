'use client';

import { Ruler, TrendingUp, TrendingDown, Info } from 'lucide-react';
import { formatPrice } from '@/lib/format';

interface BracketStat {
  name: string;
  min: number;
  max: number;
  medianPricePerSqm: number | null;
  count: number;
}

export interface SizeValueCardProps {
  bracketStats: BracketStat[];
  overallMedianPricePerSqm: number;
  totalAnalyzed: number;
  postcode: string;
  propertyType: string;
  propertySqm?: number;
}

export function SizeValueCard({
  bracketStats,
  overallMedianPricePerSqm,
  totalAnalyzed,
  postcode,
  propertyType,
  propertySqm,
}: SizeValueCardProps) {
  const validBrackets = bracketStats.filter((b) => b.medianPricePerSqm !== null && b.count >= 3);
  if (validBrackets.length < 2) return null;

  // Find current property's bracket
  const currentBracket = propertySqm
    ? validBrackets.find((b) => propertySqm >= b.min && propertySqm < b.max)
    : null;

  // Get min/max for gradient coloring
  const pricesPerSqm = validBrackets.map((b) => b.medianPricePerSqm!);
  const minPricePerSqm = Math.min(...pricesPerSqm);
  const maxPricePerSqm = Math.max(...pricesPerSqm);

  const getValueIndicator = (pricePerSqm: number) => {
    const range = maxPricePerSqm - minPricePerSqm;
    if (range === 0) return 'neutral';
    const normalized = (pricePerSqm - minPricePerSqm) / range;
    if (normalized < 0.33) return 'high'; // Lower price/sqm = better value
    if (normalized > 0.66) return 'low';
    return 'neutral';
  };

  return (
    <div className="card" role="region" aria-label="Size value analysis">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Ruler size={20} style={{ color: 'var(--accent)' }} aria-hidden="true" />
          <h3 className="text-lg font-bold">Size vs Value</h3>
        </div>
        <span
          className="text-xs px-2 py-1 rounded-full"
          style={{ background: 'var(--surface-hover)', color: 'var(--foreground-muted)' }}
        >
          {postcode} {propertyType}s
        </span>
      </div>

      {/* Bracket comparison */}
      <div className="space-y-3 mb-4">
        {validBrackets.map((bracket) => {
          const isCurrentBracket = currentBracket?.name === bracket.name;
          const valueIndicator = getValueIndicator(bracket.medianPricePerSqm!);
          const diffFromOverall = ((bracket.medianPricePerSqm! - overallMedianPricePerSqm) / overallMedianPricePerSqm) * 100;

          return (
            <div
              key={bracket.name}
              className="p-3 rounded-lg"
              style={{
                background: isCurrentBracket ? 'var(--accent-bg)' : 'var(--surface-hover)',
                border: isCurrentBracket ? '2px solid var(--accent)' : 'none',
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="text-sm font-semibold"
                    style={{ color: isCurrentBracket ? 'var(--accent)' : 'var(--foreground)' }}
                  >
                    {bracket.name}
                  </span>
                  {isCurrentBracket && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: 'var(--accent)', color: 'white' }}
                    >
                      This property
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <p
                    className="font-bold"
                    style={{
                      fontFamily: 'var(--font-mono)',
                      color: isCurrentBracket ? 'var(--accent)' : 'var(--foreground)',
                    }}
                  >
                    {formatPrice(bracket.medianPricePerSqm!)}/sqm
                  </p>
                  <p
                    className="text-xs flex items-center justify-end gap-1"
                    style={{
                      color: valueIndicator === 'high'
                        ? 'var(--positive)'
                        : valueIndicator === 'low'
                        ? 'var(--negative)'
                        : 'var(--foreground-muted)',
                    }}
                  >
                    {valueIndicator === 'high' ? (
                      <>
                        <TrendingDown size={12} />
                        Best value
                      </>
                    ) : valueIndicator === 'low' ? (
                      <>
                        <TrendingUp size={12} />
                        Premium
                      </>
                    ) : (
                      <>Average</>
                    )}
                    <span style={{ color: 'var(--foreground-muted)' }}>
                      ({diffFromOverall > 0 ? '+' : ''}{diffFromOverall.toFixed(0)}%)
                    </span>
                  </p>
                </div>
              </div>
              {/* Progress bar showing relative price */}
              <div
                className="mt-2 h-2 rounded-full overflow-hidden"
                style={{ background: 'var(--background)' }}
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${((bracket.medianPricePerSqm! - minPricePerSqm) / (maxPricePerSqm - minPricePerSqm)) * 100}%`,
                    background: valueIndicator === 'high'
                      ? 'var(--positive)'
                      : valueIndicator === 'low'
                      ? 'var(--negative)'
                      : 'var(--accent)',
                    minWidth: '10%',
                  }}
                />
              </div>
              <p className="text-xs mt-1" style={{ color: 'var(--foreground-muted)' }}>
                Based on {bracket.count} sales
              </p>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div
        className="p-3 rounded-lg text-sm flex items-start gap-2"
        style={{ background: 'var(--surface-hover)', color: 'var(--foreground-secondary)' }}
      >
        <Info size={16} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--accent)' }} />
        <p>
          In {postcode}, smaller properties typically command a <strong>higher price per sqm</strong> than
          larger ones. The area median is <strong>{formatPrice(overallMedianPricePerSqm)}/sqm</strong> based
          on {totalAnalyzed} sales.
        </p>
      </div>
    </div>
  );
}
