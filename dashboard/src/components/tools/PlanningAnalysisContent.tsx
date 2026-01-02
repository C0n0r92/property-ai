'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { PlanningApplicationWithScore } from '@/types/property';
import { PlanningTrendsChart } from '@/components/charts/PlanningTrendsChart';

interface PlanningAnalysisContentProps {
  latitude: number;
  longitude: number;
  address: string;
}

interface PlanningData {
  highConfidence: PlanningApplicationWithScore[];
  mediumConfidence: PlanningApplicationWithScore[];
  lowConfidence: PlanningApplicationWithScore[];
  totalCount: number;
  searchRadius: number | null;
  cached: boolean;
  statistics?: {
    total: number;
    granted: number;
    rejected: number;
    pending: number;
    byYear: Array<{ year: number; count: number; approvalRate: number }>;
    mostCommonType: string;
    recentCount: number;
  };
}

export function PlanningAnalysisContent({ latitude, longitude, address }: PlanningAnalysisContentProps) {
  const [data, setData] = useState<PlanningData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [radiusFilter, setRadiusFilter] = useState<string>('150');

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        lat: latitude.toString(),
        lng: longitude.toString(),
        address: address,
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(yearFilter !== 'all' && { yearFrom: yearFilter, yearTo: yearFilter }),
        ...(radiusFilter !== '150' && { radius: radiusFilter })
      });

      const response = await fetch(`/api/planning?${params}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch planning data');
      }

      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load planning data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [latitude, longitude, address, statusFilter, yearFilter, radiusFilter]);

  // Combine and sort all applications by date
  const allApplications = useMemo(() => {
    if (!data) return [];
    return [...data.highConfidence, ...data.mediumConfidence, ...data.lowConfidence]
      .sort((a, b) => b.application.ReceivedDate - a.application.ReceivedDate);
  }, [data]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    const normalized = status.toLowerCase();
    if (normalized.includes('grant') || normalized.includes('approved')) {
      return 'bg-green-100 text-green-800 border-green-200';
    }
    if (normalized.includes('refus') || normalized.includes('reject')) {
      return 'bg-red-100 text-red-800 border-red-200';
    }
    return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3 text-[var(--foreground-secondary)]">
          <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
          <span>Analyzing planning applications...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <div className="flex items-center gap-3">
          <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <div>
            <h3 className="text-red-800 dark:text-red-200 font-medium">Failed to load planning data</h3>
            <p className="text-red-600 dark:text-red-300 text-sm mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data || data.totalCount === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-[var(--foreground)] mb-2">
          No Planning Applications Found
        </h3>
        <p className="text-[var(--foreground-secondary)]">
          No planning applications were found within {data?.searchRadius || 150}m of this location.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Panel */}
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6">
        <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">Filter Applications</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--foreground-secondary)] mb-2">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="granted">Granted</option>
              <option value="rejected">Rejected</option>
              <option value="pending">Under Consideration</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--foreground-secondary)] mb-2">
              Year
            </label>
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Years</option>
              {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(year => (
                <option key={year} value={year.toString()}>{year}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--foreground-secondary)] mb-2">
              Search Radius
            </label>
            <select
              value={radiusFilter}
              onChange={(e) => setRadiusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="50">50m</option>
              <option value="100">100m</option>
              <option value="150">150m</option>
              <option value="200">200m</option>
            </select>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      {data.statistics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{data.statistics.total}</div>
            <div className="text-sm text-[var(--foreground-secondary)]">Total Applications</div>
          </div>

          <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{data.statistics.granted}</div>
            <div className="text-sm text-[var(--foreground-secondary)]">Granted</div>
            <div className="text-xs text-[var(--foreground-muted)]">
              {data.statistics.total > 0 ? Math.round((data.statistics.granted / data.statistics.total) * 100) : 0}% approval rate
            </div>
          </div>

          <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{data.statistics.rejected}</div>
            <div className="text-sm text-[var(--foreground-secondary)]">Rejected</div>
          </div>

          <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{data.statistics.recentCount}</div>
            <div className="text-sm text-[var(--foreground-secondary)]">Last 6 Months</div>
          </div>
        </div>
      )}

      {/* Historical Trends Chart */}
      {data.statistics && data.statistics.byYear.length > 1 && (
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6">
          <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">Planning Activity Trends</h3>
          <PlanningTrendsChart
            data={data.statistics.byYear.map(item => ({
              year: item.year,
              applications: item.count,
              approved: Math.round((item.count * item.approvalRate) / 100),
              approvalRate: item.approvalRate
            }))}
            height={300}
          />
        </div>
      )}

      {/* Applications Timeline */}
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6">
        <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">
          Planning Applications Timeline
        </h3>

        <div className="space-y-4">
          {allApplications.map((app, index) => (
            <div key={index} className="border border-[var(--border)] rounded-lg p-4 hover:bg-[var(--surface-hover)] transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-[var(--foreground)]">
                      {app.application.ApplicationNumber}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(app.application.ApplicationStatus || app.application.Decision || '')}`}>
                      {app.application.ApplicationStatus || app.application.Decision || 'Unknown'}
                    </span>
                  </div>
                  <div className="text-sm text-[var(--foreground-secondary)] mb-1">
                    {app.application.DevelopmentDescription}
                  </div>
                  <div className="text-xs text-[var(--foreground-muted)]">
                    {formatDate(app.application.ReceivedDate)} • {app.application.ApplicationType} • {app.distance}m away
                  </div>
                </div>

                <div className="text-right ml-4">
                  <div className="text-xs text-[var(--foreground-muted)]">
                    Confidence: {Math.round(app.score)}%
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}