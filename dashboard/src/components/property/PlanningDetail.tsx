'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { PlanningTrendsChart } from '@/components/charts/PlanningTrendsChart';

interface PlanningDetailProps {
  coordinates: { lat: number; lng: number };
  address: string;
}

interface PlanningApplication {
  application: {
    ApplicationNumber: string;
    DevelopmentDescription: string;
    ApplicationStatus: string;
    Decision?: string;
    ReceivedDate: number;
    ApplicationType?: string;
  };
  distance: number;
  confidence: number;
}

interface PlanningData {
  applications: PlanningApplication[];
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

export function PlanningDetail({ coordinates, address }: PlanningDetailProps) {
  const [data, setData] = useState<PlanningData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [radiusFilter, setRadiusFilter] = useState<string>('150');

  useEffect(() => {
    const fetchPlanningData = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          lat: coordinates.lat.toString(),
          lng: coordinates.lng.toString(),
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

    fetchPlanningData();
  }, [coordinates, address, statusFilter, yearFilter, radiusFilter]);

  // Filter applications based on local filters (for demo - in real app this would be server-side)
  const filteredApplications = useMemo(() => {
    if (!data?.applications) return [];

    return data.applications.filter(app => {
      // Status filter
      if (statusFilter !== 'all') {
        const status = normalizeStatus(app.application.ApplicationStatus || app.application.Decision || '');
        if (status !== statusFilter) return false;
      }

      // Year filter
      if (yearFilter !== 'all') {
        const year = new Date(app.application.ReceivedDate).getFullYear();
        if (year.toString() !== yearFilter) return false;
      }

      return true;
    });
  }, [data, statusFilter, yearFilter]);

  const normalizeStatus = (status: string): string => {
    const normalized = status.toLowerCase().trim();
    if (normalized.includes('grant') || normalized.includes('approved')) return 'granted';
    if (normalized.includes('refus') || normalized.includes('reject')) return 'rejected';
    if (normalized.includes('under consideration') || normalized.includes('pending')) return 'pending';
    return 'unknown';
  };

  const getStatusColor = (status: string) => {
    const normalized = normalizeStatus(status);
    switch (normalized) {
      case 'granted': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
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
      {data?.statistics && (
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
      {data?.statistics?.byYear && data.statistics.byYear.length > 1 && (
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

      {/* Applications List */}
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6">
        <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">
          Planning Applications ({filteredApplications.length})
        </h3>

        {filteredApplications.length === 0 ? (
          <div className="text-center py-8 text-[var(--foreground-secondary)]">
            No planning applications found with current filters.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredApplications.map((app, index) => (
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
                      {formatDate(app.application.ReceivedDate)} • {app.application.ApplicationType || 'Unknown Type'} • {app.distance}m away
                    </div>
                  </div>

                  <div className="text-right ml-4">
                    <div className="text-xs text-[var(--foreground-muted)]">
                      Confidence: {app.confidence}%
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
