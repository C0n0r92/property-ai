'use client';

import { Flame, TrendingUp, Trophy, BarChart3 } from 'lucide-react';

export interface BiddingWarsCardProps {
  percentOverAsking: number;
  avgPremium: number;
  highestPremium: number;
  totalSalesAnalyzed: number;
  areaName?: string;
}

export function BiddingWarsCard({
  percentOverAsking,
  avgPremium,
  highestPremium,
  totalSalesAnalyzed,
  areaName,
}: BiddingWarsCardProps) {
  // Determine how competitive the area is
  const isHighlyCompetitive = percentOverAsking > 70;
  const isModeratelyCompetitive = percentOverAsking > 50;

  const competitionConfig = isHighlyCompetitive
    ? {
        color: 'var(--negative)',
        bg: 'var(--negative-bg)',
        label: 'Highly Competitive',
        description: 'Most properties go over asking',
      }
    : isModeratelyCompetitive
    ? {
        color: 'var(--warning)',
        bg: 'var(--warning-bg)',
        label: 'Competitive',
        description: 'Many properties go over asking',
      }
    : {
        color: 'var(--positive)',
        bg: 'var(--positive-bg)',
        label: 'Less Competitive',
        description: 'More room for negotiation',
      };

  return (
    <div className="card" role="region" aria-label={`Bidding war analysis for ${areaName || 'this area'}: ${competitionConfig.label}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Flame size={20} style={{ color: competitionConfig.color }} aria-hidden="true" />
          <h3 className="text-lg font-bold">
            Bidding War Intelligence{areaName ? ` (${areaName})` : ''}
          </h3>
        </div>
        <div
          className="px-3 py-1 rounded-full text-xs font-semibold"
          style={{ background: competitionConfig.bg, color: competitionConfig.color }}
        >
          {competitionConfig.label}
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Percent Over Asking */}
        <div className="stat-card">
          <p className="stat-label flex items-center gap-1">
            <TrendingUp size={14} />
            GO OVER ASKING
          </p>
          <p
            className="stat-value"
            style={{ color: competitionConfig.color, fontSize: '1.75rem' }}
          >
            {percentOverAsking.toFixed(0)}%
          </p>
          <p className="text-xs" style={{ color: 'var(--foreground-muted)' }}>
            of sales
          </p>
        </div>

        {/* Average Premium */}
        <div className="stat-card">
          <p className="stat-label flex items-center gap-1">
            <BarChart3 size={14} />
            AVG PREMIUM
          </p>
          <p
            className="stat-value"
            style={{
              color: avgPremium > 0 ? 'var(--warning)' : 'var(--positive)',
              fontSize: '1.75rem'
            }}
          >
            {avgPremium > 0 ? '+' : ''}{avgPremium.toFixed(1)}%
          </p>
          <p className="text-xs" style={{ color: 'var(--foreground-muted)' }}>
            over asking
          </p>
        </div>

        {/* Highest Premium */}
        <div className="stat-card">
          <p className="stat-label flex items-center gap-1">
            <Trophy size={14} />
            HIGHEST PREMIUM
          </p>
          <p
            className="stat-value"
            style={{ color: highestPremium >= 0 ? 'var(--negative)' : 'var(--positive)', fontSize: '1.75rem' }}
          >
            {highestPremium >= 0 ? '+' : ''}{highestPremium.toFixed(1)}%
          </p>
          <p className="text-xs" style={{ color: 'var(--foreground-muted)' }}>
            recorded
          </p>
        </div>

        {/* Total Sales */}
        <div className="stat-card">
          <p className="stat-label flex items-center gap-1">
            <BarChart3 size={14} />
            SALES ANALYZED
          </p>
          <p className="stat-value" style={{ fontSize: '1.75rem' }}>
            {totalSalesAnalyzed}
          </p>
          <p className="text-xs" style={{ color: 'var(--foreground-muted)' }}>
            properties
          </p>
        </div>
      </div>

      {/* Insight Message */}
      <div
        className="mt-4 p-3 rounded-lg"
        style={{ background: competitionConfig.bg }}
      >
        <p className="text-sm" style={{ color: competitionConfig.color }}>
          <strong>{competitionConfig.description}.</strong>{' '}
          {isHighlyCompetitive ? (
            <>
              Based on {totalSalesAnalyzed} recent sales, {percentOverAsking.toFixed(0)}% went over asking
              with an average premium of {avgPremium.toFixed(1)}%. Expect competition.
            </>
          ) : isModeratelyCompetitive ? (
            <>
              {percentOverAsking.toFixed(0)}% of properties sell over asking in this area.
              The average premium is {avgPremium.toFixed(1)}%.
            </>
          ) : (
            <>
              Only {percentOverAsking.toFixed(0)}% of sales go over asking here.
              There may be more room for negotiation in this area.
            </>
          )}
        </p>
      </div>
    </div>
  );
}
