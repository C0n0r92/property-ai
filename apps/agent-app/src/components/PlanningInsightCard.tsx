'use client';

import { FileText, CheckCircle2, Clock, AlertTriangle, TrendingUp, TrendingDown, Minus, Loader2, ExternalLink } from 'lucide-react';
import type { PlanningInsight, PropertyPlanningHistory } from '@/types/planning';
import { generatePlanningPortalUrl } from '@/lib/planning';

export interface PlanningInsightCardProps {
  insight: PlanningInsight;
  propertyHistory: PropertyPlanningHistory;
  isLoading?: boolean;
}

const trendConfig = {
  increasing: { icon: TrendingUp, label: 'Increasing Activity', color: 'var(--warning)' },
  stable: { icon: Minus, label: 'Stable', color: 'var(--foreground-muted)' },
  decreasing: { icon: TrendingDown, label: 'Decreasing', color: 'var(--positive)' },
};

const workTypeLabels: Record<string, string> = {
  extension: 'Extension',
  attic_conversion: 'Attic Conversion',
  garage_conversion: 'Garage Conversion',
  conservatory: 'Conservatory',
  renovation: 'Renovation',
  new_build: 'New Build',
  garden_room: 'Garden Room',
  change_of_use: 'Change of Use',
  other: 'Other Works',
};

export function PlanningInsightCard({
  insight,
  propertyHistory,
  isLoading = false,
}: PlanningInsightCardProps) {
  if (isLoading) {
    return (
      <div className="card h-full flex items-center justify-center">
        <Loader2 className="animate-spin" size={24} style={{ color: 'var(--foreground-muted)' }} />
        <span className="ml-2" style={{ color: 'var(--foreground-muted)' }}>Loading planning data...</span>
      </div>
    );
  }

  const trend = trendConfig[insight.developmentTrend];
  const TrendIcon = trend.icon;

  return (
    <div className="card h-full" role="region" aria-label="Planning and development insights">
      <div className="flex items-center gap-2 mb-4">
        <FileText size={20} style={{ color: 'var(--accent)' }} aria-hidden="true" />
        <h3 className="text-lg font-bold">Planning & Development</h3>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <CheckCircle2 size={16} style={{ color: 'var(--positive)' }} />
          </div>
          <p
            className="text-2xl font-bold"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {insight.recentApprovals}
          </p>
          <p className="text-xs" style={{ color: 'var(--foreground-muted)' }}>
            Recent Approvals
          </p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Clock size={16} style={{ color: 'var(--warning)' }} />
          </div>
          <p
            className="text-2xl font-bold"
            style={{ fontFamily: 'var(--font-mono)' }}
          >
            {insight.pendingApplications}
          </p>
          <p className="text-xs" style={{ color: 'var(--foreground-muted)' }}>
            Pending
          </p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <TrendIcon size={16} style={{ color: trend.color }} />
          </div>
          <p className="text-sm font-semibold" style={{ color: trend.color }}>
            {trend.label}
          </p>
          <p className="text-xs" style={{ color: 'var(--foreground-muted)' }}>
            Trend
          </p>
        </div>
      </div>

      {/* Large Development Warning */}
      {insight.largeDevNearby && (
        <div
          className="flex items-center gap-3 p-3 rounded-lg mb-4"
          style={{
            background: 'var(--warning-bg)',
            border: '1px solid var(--warning)',
          }}
        >
          <AlertTriangle size={20} style={{ color: 'var(--warning)' }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--warning)' }}>
              Large Development Nearby
            </p>
            <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>
              Planning application for 10+ residential units within 150m
            </p>
          </div>
        </div>
      )}

      {/* Property Planning History */}
      {propertyHistory.hasApprovedWork && (
        <div
          className="pt-4"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <p className="stat-label mb-2">THIS PROPERTY</p>
          <div
            className="p-3 rounded-lg"
            style={{ background: 'var(--positive-bg)', border: '1px solid var(--positive)' }}
          >
            <div className="flex items-start gap-2">
              <CheckCircle2 size={16} style={{ color: 'var(--positive)' }} className="flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--positive)' }}>
                  Planning Permission Granted
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {propertyHistory.workTypes.map(type => (
                    <span
                      key={type}
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: 'var(--surface)', color: 'var(--foreground-secondary)' }}
                    >
                      {workTypeLabels[type] || type}
                    </span>
                  ))}
                </div>
                {propertyHistory.mostRecentApproval && (
                  <div className="mt-2">
                    <p className="text-xs" style={{ color: 'var(--foreground-muted)' }}>
                      {propertyHistory.mostRecentApproval.ApplicationNumber}
                      {propertyHistory.mostRecentApproval.GrantDate && (
                        <> • Granted {new Date(propertyHistory.mostRecentApproval.GrantDate).toLocaleDateString()}</>
                      )}
                    </p>
                    {propertyHistory.mostRecentApproval.PlanningAuthority && (
                      <a
                        href={generatePlanningPortalUrl(
                          propertyHistory.mostRecentApproval.PlanningAuthority,
                          propertyHistory.mostRecentApproval.ApplicationNumber
                        ) || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs mt-1 hover:underline"
                        style={{ color: 'var(--accent)' }}
                      >
                        View on planning portal <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* No Property History */}
      {!propertyHistory.hasApprovedWork && (
        <div
          className="pt-4"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <p className="stat-label mb-2">THIS PROPERTY</p>
          <p className="text-sm" style={{ color: 'var(--foreground-muted)' }}>
            No planning permissions found for this address in recent records.
          </p>
        </div>
      )}

      {/* Context Note */}
      <p
        className="text-xs mt-4 pt-4"
        style={{ borderTop: '1px solid var(--border)', color: 'var(--foreground-muted)' }}
      >
        Based on planning applications within 150m over the last 2 years.
      </p>
    </div>
  );
}
