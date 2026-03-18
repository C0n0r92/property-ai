'use client';

import { Home, Clock, TrendingUp, TrendingDown, Minus, Target, ArrowDown, AlertTriangle } from 'lucide-react';
import { formatPrice, formatPriceCompact } from '@/lib/format';

export interface MarketPositionCardProps {
  activeListingsCount: number;
  avgActiveAskingPrice: number;
  avgDaysOnMarket: number | null;
  priceVsActiveListings: number | null;
  propertyPrice?: number;
  priceDropPercent?: number | null;
  avgPriceReduction?: number | null;
  staleListingPercent?: number | null;
}

export function MarketPositionCard({
  activeListingsCount,
  avgActiveAskingPrice,
  avgDaysOnMarket,
  priceVsActiveListings,
  propertyPrice,
  priceDropPercent,
  avgPriceReduction,
  staleListingPercent,
}: MarketPositionCardProps) {

  // Determine price comparison config
  const priceConfig = priceVsActiveListings !== null
    ? priceVsActiveListings < -5
      ? {
          color: 'var(--positive)',
          bg: 'var(--positive-bg)',
          icon: <TrendingDown size={16} />,
          label: 'Below current asking prices',
        }
      : priceVsActiveListings > 5
      ? {
          color: 'var(--warning)',
          bg: 'var(--warning-bg)',
          icon: <TrendingUp size={16} />,
          label: 'Above current asking prices',
        }
      : {
          color: 'var(--accent)',
          bg: 'var(--accent-bg)',
          icon: <Minus size={16} />,
          label: 'In line with current market',
        }
    : null;

  return (
    <div className="card h-full" role="region" aria-label="Market position analysis">
      <div className="flex items-center gap-2 mb-4">
        <Target size={20} style={{ color: 'var(--accent)' }} aria-hidden="true" />
        <h3 className="text-lg font-bold">Market Position</h3>
      </div>

      {/* Main Stats */}
      <div className="space-y-4">
        {/* Active Listings */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Home size={18} style={{ color: 'var(--foreground-muted)' }} />
            <span className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
              Similar listings for sale
            </span>
          </div>
          <span className="text-xl font-bold" style={{ fontFamily: 'var(--font-mono)' }}>
            {activeListingsCount}
          </span>
        </div>

        {/* Avg Asking Price */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs" style={{ color: 'var(--foreground-muted)' }}>
              Avg asking price (active)
            </p>
          </div>
          <span className="text-lg font-semibold" style={{ fontFamily: 'var(--font-mono)' }}>
            {formatPrice(avgActiveAskingPrice)}
          </span>
        </div>

        {/* Days on Market */}
        {avgDaysOnMarket !== null && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock size={18} style={{ color: 'var(--foreground-muted)' }} />
              <span className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                Avg days on market
              </span>
            </div>
            <span className="text-xl font-bold" style={{ fontFamily: 'var(--font-mono)' }}>
              {avgDaysOnMarket} days
            </span>
          </div>
        )}

        {/* Price Drops */}
        {priceDropPercent !== null && priceDropPercent !== undefined && priceDropPercent > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowDown size={18} style={{ color: priceDropPercent > 30 ? 'var(--positive)' : 'var(--foreground-muted)' }} />
              <span className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                Listings with price drops
              </span>
            </div>
            <div className="text-right">
              <span
                className="text-xl font-bold"
                style={{
                  fontFamily: 'var(--font-mono)',
                  color: priceDropPercent > 30 ? 'var(--positive)' : 'var(--foreground)',
                }}
              >
                {priceDropPercent}%
              </span>
              {avgPriceReduction && avgPriceReduction > 0 && (
                <p className="text-xs" style={{ color: 'var(--foreground-muted)' }}>
                  avg -{avgPriceReduction}% off
                </p>
              )}
            </div>
          </div>
        )}

        {/* Stale Listings */}
        {staleListingPercent !== null && staleListingPercent !== undefined && staleListingPercent > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} style={{ color: staleListingPercent > 30 ? 'var(--warning)' : 'var(--foreground-muted)' }} />
              <span className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                Stale listings (&gt;90 days)
              </span>
            </div>
            <span
              className="text-xl font-bold"
              style={{
                fontFamily: 'var(--font-mono)',
                color: staleListingPercent > 30 ? 'var(--warning)' : 'var(--foreground)',
              }}
            >
              {staleListingPercent}%
            </span>
          </div>
        )}
      </div>

      {/* Price Comparison */}
      {priceConfig && priceVsActiveListings !== null && (
        <div
          className="mt-4 pt-4"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <div
            className="p-3 rounded-lg"
            style={{ background: priceConfig.bg }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span style={{ color: priceConfig.color }}>{priceConfig.icon}</span>
                <span className="text-sm" style={{ color: priceConfig.color }}>
                  {priceConfig.label}
                </span>
              </div>
              <span
                className="font-bold"
                style={{ color: priceConfig.color, fontFamily: 'var(--font-mono)' }}
              >
                {priceVsActiveListings > 0 ? '+' : ''}{priceVsActiveListings.toFixed(1)}%
              </span>
            </div>
            {propertyPrice && (
              <p className="text-xs mt-2" style={{ color: 'var(--foreground-secondary)' }}>
                This property ({formatPriceCompact(propertyPrice)}) vs avg asking ({formatPriceCompact(avgActiveAskingPrice)})
              </p>
            )}
          </div>
        </div>
      )}

      {/* Insight */}
      <div
        className="mt-4 pt-4 text-xs"
        style={{ borderTop: '1px solid var(--border)', color: 'var(--foreground-muted)' }}
      >
        <p>
          Based on {activeListingsCount} similar properties currently for sale within 3km.
        </p>
      </div>
    </div>
  );
}
