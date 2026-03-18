'use client';

import { Train, MapPin, Loader2, Info } from 'lucide-react';
import { formatPrice } from '@/lib/format';

export interface LocationInsightCardProps {
  nearestStation: {
    name: string;
    distance: number;
    walkingTime: number;
    type: 'DART' | 'Luas';
    line?: string;
  } | null;
  transportPremium: {
    hasAccess: boolean;
    premiumPercent: number | null;
    nearRailMedian: number | null;
    farRailMedian: number | null;
    sampleSizeNear: number;
    sampleSizeFar: number;
    confidence: 'high' | 'medium' | 'low';
  };
  isLoading?: boolean;
}

export function LocationInsightCard({
  nearestStation,
  transportPremium,
  isLoading = false,
}: LocationInsightCardProps) {
  if (isLoading) {
    return (
      <div className="card h-full flex items-center justify-center">
        <Loader2 className="animate-spin" size={24} style={{ color: 'var(--foreground-muted)' }} />
        <span className="ml-2" style={{ color: 'var(--foreground-muted)' }}>Loading location data...</span>
      </div>
    );
  }

  const hasTransportPremiumData = transportPremium.premiumPercent !== null &&
    transportPremium.nearRailMedian !== null &&
    transportPremium.farRailMedian !== null;

  const stationTypeColor = nearestStation?.type === 'DART' ? '#00A859' : '#B80049'; // DART green, Luas purple

  return (
    <div className="card h-full" role="region" aria-label="Location insights">
      <div className="flex items-center gap-2 mb-4">
        <Train size={20} style={{ color: 'var(--accent)' }} aria-hidden="true" />
        <h3 className="text-lg font-bold">Location Insights</h3>
      </div>

      {/* Nearest Station */}
      {nearestStation && (
        <div className="mb-6">
          <div className="flex items-start gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: stationTypeColor }}
            >
              <Train size={20} className="text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{nearestStation.name}</span>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium text-white"
                  style={{ background: stationTypeColor }}
                >
                  {nearestStation.type}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-1 text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                <span className="flex items-center gap-1">
                  <MapPin size={14} />
                  {nearestStation.distance}m
                </span>
                <span>{nearestStation.walkingTime} min walk</span>
              </div>
              {nearestStation.line && (
                <p className="text-xs mt-1" style={{ color: 'var(--foreground-muted)' }}>
                  {nearestStation.line} Line
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Transport Access Badge */}
      <div className="mb-4">
        <div
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg"
          style={{
            background: transportPremium.hasAccess ? 'var(--positive-bg)' : 'var(--surface-hover)',
            border: `1px solid ${transportPremium.hasAccess ? 'var(--positive)' : 'var(--border)'}`,
          }}
        >
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: transportPremium.hasAccess ? 'var(--positive)' : 'var(--foreground-muted)' }}
          />
          <span className="text-sm font-medium">
            {transportPremium.hasAccess
              ? 'Excellent rail access (within 800m)'
              : nearestStation
                ? `${nearestStation.distance}m to nearest station`
                : 'No nearby rail stations'}
          </span>
        </div>
      </div>

      {/* Transport Premium Analysis */}
      {hasTransportPremiumData && (
        <div
          className="pt-4"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <p className="stat-label mb-2">AREA PRICE COMPARISON</p>
          <div className="grid grid-cols-2 gap-4 mb-3">
            <div>
              <p className="text-xs" style={{ color: 'var(--foreground-muted)' }}>Near Rail (&lt;800m)</p>
              <p className="font-semibold" style={{ fontFamily: 'var(--font-mono)' }}>
                {formatPrice(transportPremium.nearRailMedian!)}/sqm
              </p>
              <p className="text-xs" style={{ color: 'var(--foreground-muted)' }}>
                {transportPremium.sampleSizeNear} properties
              </p>
            </div>
            <div>
              <p className="text-xs" style={{ color: 'var(--foreground-muted)' }}>Further Away</p>
              <p className="font-semibold" style={{ fontFamily: 'var(--font-mono)' }}>
                {formatPrice(transportPremium.farRailMedian!)}/sqm
              </p>
              <p className="text-xs" style={{ color: 'var(--foreground-muted)' }}>
                {transportPremium.sampleSizeFar} properties
              </p>
            </div>
          </div>

          {transportPremium.premiumPercent !== null && (
            <div
              className="flex items-center gap-2 p-2 rounded"
              style={{
                background: transportPremium.premiumPercent > 0 ? 'var(--positive-bg)' : 'var(--surface-hover)',
              }}
            >
              <span
                className="text-lg font-bold"
                style={{
                  color: transportPremium.premiumPercent > 0 ? 'var(--positive)' : 'var(--foreground-secondary)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {transportPremium.premiumPercent > 0 ? '+' : ''}{transportPremium.premiumPercent.toFixed(1)}%
              </span>
              <span className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                {transportPremium.premiumPercent > 0 ? 'premium near rail' : 'difference'}
              </span>
            </div>
          )}

          {/* Confidence indicator */}
          <div className="flex items-center gap-2 mt-3">
            <span className="text-xs" style={{ color: 'var(--foreground-muted)' }}>Data confidence:</span>
            <div className="flex gap-1">
              {['low', 'medium', 'high'].map((level, i) => (
                <div
                  key={level}
                  className="w-3 h-2 rounded-full"
                  style={{
                    background:
                      (transportPremium.confidence === 'high') ||
                      (transportPremium.confidence === 'medium' && i <= 1) ||
                      (transportPremium.confidence === 'low' && i === 0)
                        ? 'var(--accent)'
                        : 'var(--border)',
                  }}
                />
              ))}
            </div>
            <span className="text-xs capitalize" style={{ color: 'var(--foreground-muted)' }}>
              {transportPremium.confidence}
            </span>
          </div>
        </div>
      )}

      {/* Note */}
      <div
        className="flex items-start gap-2 mt-4 pt-4 text-xs"
        style={{ borderTop: '1px solid var(--border)', color: 'var(--foreground-muted)' }}
      >
        <Info size={14} className="flex-shrink-0 mt-0.5" />
        <p>
          Price comparison uses similar properties (same postcode, type, beds) to control for other factors.
        </p>
      </div>
    </div>
  );
}
