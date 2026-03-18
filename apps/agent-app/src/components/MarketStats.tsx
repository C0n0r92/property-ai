'use client';

import { TrendingUp, TrendingDown, Minus, BarChart3, Clock, Target, Home } from 'lucide-react';
import { formatPriceCompact } from '@/lib/format';

export interface StatItem {
  label: string;
  value: string | number;
  subValue?: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  icon?: React.ReactNode;
}

export interface MarketStatsProps {
  stats: StatItem[];
  columns?: 2 | 3 | 4;
  title?: string;
}

export function MarketStats({ stats, columns = 4, title }: MarketStatsProps) {
  const getTrendIcon = (trend?: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp size={16} style={{ color: 'var(--positive)' }} />;
      case 'down':
        return <TrendingDown size={16} style={{ color: 'var(--negative)' }} />;
      case 'stable':
        return <Minus size={16} style={{ color: 'var(--foreground-secondary)' }} />;
      default:
        return null;
    }
  };

  const getTrendColor = (trend?: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return 'var(--positive)';
      case 'down':
        return 'var(--negative)';
      default:
        return 'var(--foreground-secondary)';
    }
  };

  const gridClass = columns === 2
    ? 'grid-cols-1 md:grid-cols-2'
    : columns === 3
    ? 'grid-cols-1 md:grid-cols-3'
    : 'grid-cols-2 md:grid-cols-4';

  return (
    <div className="card">
      {title && (
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <BarChart3 size={20} style={{ color: 'var(--accent)' }} />
          {title}
        </h3>
      )}

      <div className={`grid ${gridClass} gap-4`}>
        {stats.map((stat, index) => (
          <div key={index} className="stat-card">
            <p className="stat-label flex items-center gap-1">
              {stat.icon}
              {stat.label}
            </p>
            <p className="stat-value" style={{ fontSize: '1.5rem' }}>
              {stat.value}
            </p>
            {(stat.subValue || stat.trendValue) && (
              <div className="flex items-center gap-1 mt-1">
                {stat.trend && getTrendIcon(stat.trend)}
                <p className="text-xs" style={{ color: stat.trend ? getTrendColor(stat.trend) : 'var(--foreground-secondary)' }}>
                  {stat.trendValue || stat.subValue}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Preset stat configurations
export function createMarketStatsFromData(data: {
  medianPrice?: number;
  averagePrice?: number;
  medianPricePerSqm?: number;
  medianOverAskingPercent?: number;
  count?: number;
  avgDaysOnMarket?: number;
}): StatItem[] {
  const stats: StatItem[] = [];

  if (data.medianPrice) {
    stats.push({
      label: 'Median Price',
      value: formatPriceCompact(data.medianPrice),
      icon: <Home size={14} />,
    });
  }

  if (data.medianPricePerSqm) {
    stats.push({
      label: 'Price/sqm',
      value: `€${data.medianPricePerSqm.toLocaleString()}`,
      icon: <Target size={14} />,
    });
  }

  if (data.medianOverAskingPercent !== undefined) {
    const trend = data.medianOverAskingPercent > 0 ? 'up' : data.medianOverAskingPercent < 0 ? 'down' : 'stable';
    stats.push({
      label: 'vs Asking',
      value: `${data.medianOverAskingPercent > 0 ? '+' : ''}${data.medianOverAskingPercent.toFixed(1)}%`,
      trend,
      trendValue: data.medianOverAskingPercent > 0 ? 'Over asking' : 'Under asking',
      icon: <TrendingUp size={14} />,
    });
  }

  if (data.avgDaysOnMarket) {
    stats.push({
      label: 'Days on Market',
      value: data.avgDaysOnMarket,
      subValue: 'Average',
      icon: <Clock size={14} />,
    });
  }

  if (data.count) {
    stats.push({
      label: 'Comparables',
      value: data.count,
      subValue: 'Properties analyzed',
      icon: <BarChart3 size={14} />,
    });
  }

  return stats;
}
