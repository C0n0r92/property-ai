'use client';

import { Footprints, Loader2, Train, GraduationCap, Heart, ShoppingBag, TreePine, Building2 } from 'lucide-react';
import type { WalkabilityScore } from '@/types/amenities';

export interface WalkabilityCardProps {
  walkabilityScore: WalkabilityScore;
  areaAverage?: number | null;
  isLoading?: boolean;
}

const categoryConfig = {
  transport: { icon: Train, label: 'Transport', color: '#3B82F6' },
  education: { icon: GraduationCap, label: 'Education', color: '#8B5CF6' },
  healthcare: { icon: Heart, label: 'Healthcare', color: '#EF4444' },
  shopping: { icon: ShoppingBag, label: 'Shopping', color: '#F59E0B' },
  leisure: { icon: TreePine, label: 'Leisure', color: '#22C55E' },
  services: { icon: Building2, label: 'Services', color: '#6B7280' },
};

const ratingConfig = {
  'Excellent': { color: 'var(--positive)', bg: 'var(--positive-bg)' },
  'Very Good': { color: 'var(--positive)', bg: 'var(--positive-bg)' },
  'Good': { color: 'var(--accent)', bg: 'var(--accent-bg)' },
  'Fair': { color: 'var(--warning)', bg: 'var(--warning-bg)' },
  'Low': { color: 'var(--foreground-muted)', bg: 'var(--surface-hover)' },
};

export function WalkabilityCard({
  walkabilityScore,
  areaAverage,
  isLoading = false,
}: WalkabilityCardProps) {
  if (isLoading) {
    return (
      <div className="card h-full flex items-center justify-center">
        <Loader2 className="animate-spin" size={24} style={{ color: 'var(--foreground-muted)' }} />
        <span className="ml-2" style={{ color: 'var(--foreground-muted)' }}>Analyzing walkability...</span>
      </div>
    );
  }

  const rating = ratingConfig[walkabilityScore.rating];
  const vsArea = areaAverage ? walkabilityScore.score - areaAverage : null;

  return (
    <div className="card h-full" role="region" aria-label="Walkability score">
      <div className="flex items-center gap-2 mb-4">
        <Footprints size={20} style={{ color: 'var(--accent)' }} aria-hidden="true" />
        <h3 className="text-lg font-bold">Walkability Score</h3>
      </div>

      {/* Main Score Display */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-baseline gap-2">
            <span
              className="text-5xl font-bold"
              style={{ color: rating.color, fontFamily: 'var(--font-mono)' }}
            >
              {walkabilityScore.score}
            </span>
            <span className="text-xl" style={{ color: 'var(--foreground-muted)' }}>/10</span>
          </div>
          <div
            className="inline-flex items-center px-3 py-1 rounded-full mt-2"
            style={{ background: rating.bg }}
          >
            <span className="text-sm font-semibold" style={{ color: rating.color }}>
              {walkabilityScore.rating}
            </span>
          </div>
        </div>

        {vsArea !== null && (
          <div className="text-right">
            <p className="text-xs mb-1" style={{ color: 'var(--foreground-muted)' }}>vs Area Avg</p>
            <p
              className="text-xl font-bold"
              style={{
                color: vsArea > 0 ? 'var(--positive)' : vsArea < 0 ? 'var(--warning)' : 'var(--foreground-secondary)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {vsArea > 0 ? '+' : ''}{vsArea.toFixed(1)}
            </p>
            <p className="text-xs" style={{ color: 'var(--foreground-muted)' }}>
              Area avg: {areaAverage?.toFixed(1)}
            </p>
          </div>
        )}
      </div>

      {/* Category Breakdown */}
      <div
        className="pt-4"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <p className="stat-label mb-3">CATEGORY BREAKDOWN</p>
        <div className="grid grid-cols-2 gap-3">
          {(Object.entries(categoryConfig) as Array<[keyof typeof categoryConfig, typeof categoryConfig.transport]>).map(([key, config]) => {
            const score = walkabilityScore.breakdown[key as keyof typeof walkabilityScore.breakdown];
            const Icon = config.icon;
            const maxScore = key === 'transport' ? 3 : key === 'leisure' || key === 'services' ? 1 : 2;
            const percentage = (score / maxScore) * 100;

            return (
              <div key={key} className="flex items-center gap-2">
                <Icon size={14} style={{ color: config.color }} />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
                      {config.label}
                    </span>
                    <span className="text-xs font-medium" style={{ fontFamily: 'var(--font-mono)' }}>
                      {score.toFixed(1)}
                    </span>
                  </div>
                  <div
                    className="h-1.5 rounded-full overflow-hidden"
                    style={{ background: 'var(--border)' }}
                  >
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, percentage)}%`,
                        background: config.color,
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Nearest Heavy Rail */}
      {walkabilityScore.nearestDartLuas && (
        <div
          className="mt-4 pt-4"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <div className="flex items-center gap-2">
            <Train size={14} style={{ color: 'var(--accent)' }} />
            <span className="text-sm">
              <span className="font-medium">{walkabilityScore.nearestDartLuas.name}</span>
              {' '}
              <span style={{ color: 'var(--foreground-muted)' }}>
                ({walkabilityScore.nearestDartLuas.type}) - {walkabilityScore.nearestDartLuas.distance}m
              </span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
