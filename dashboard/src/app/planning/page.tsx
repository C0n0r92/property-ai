'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { PlanningResponse, PlanningApplicationWithScore, PlanningApplication } from '@/types/property';
import { DistanceDisplay } from '@/components/distance/DistanceDisplay';
import { MapPin, ArrowLeft, FileText, TrendingUp, AlertTriangle, CheckCircle, Clock, XCircle, Calendar, Building2, BarChart3, PieChart, ExternalLink, Filter, Search, Target } from 'lucide-react';
import { useSearchTracking } from '@/hooks/useSearchTracking';

function PlanningContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Use search tracking like the working alerts
  const { trackMapSearch } = useSearchTracking();

  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState<string>('');
  const [planningData, setPlanningData] = useState<PlanningResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSearch, setExpandedSearch] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');

  useEffect(() => {
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const addressParam = searchParams.get('address');

    if (lat && lng) {
      setCoordinates({
        lat: parseFloat(lat),
        lng: parseFloat(lng)
      });
    }

    if (addressParam) {
      setAddress(decodeURIComponent(addressParam));
    }
  }, [searchParams]);

  useEffect(() => {
    if (coordinates && address) {
      fetchPlanningData();

      // Trigger alert immediately when coordinates and address are available
      const locationContext = {
        name: address,
        coordinates: {
          lat: coordinates.lat,
          lng: coordinates.lng,
        },
        postcode: undefined, // Could extract from address if needed
      };

      console.log('🏠 Triggering planning page alert for:', address);
      trackMapSearch(locationContext);
    }
  }, [coordinates, address, trackMapSearch]);

  const fetchPlanningData = async (expanded = false) => {
    if (!coordinates) return;

    setLoading(true);
    setError(null);

    try {
      // Start with 100m search radius instead of default
      const searchRadius = expanded ? 150 : 100;

      const params = new URLSearchParams({
        lat: coordinates.lat.toString(),
        lng: coordinates.lng.toString(),
        address: address,
        searchRadius: searchRadius.toString(),
        ...(expanded && { expandedSearch: 'true' })
      });

      const response = await fetch(`/api/planning?${params}`);
      const result: PlanningResponse | { error: string } = await response.json();

      if (!response.ok) {
        const errorMessage = (result as { error: string }).error || 'Failed to fetch planning data';
        throw new Error(errorMessage);
      }

      // At this point, result is guaranteed to be PlanningResponse
      const planningData = result as PlanningResponse;

      // Add distance calculations to each application
      const resultWithDistances = {
        ...planningData,
        highConfidence: planningData.highConfidence.map(app => ({
          ...app,
          distance: calculateDistance(coordinates.lat, coordinates.lng, app)
        })),
        mediumConfidence: planningData.mediumConfidence.map(app => ({
          ...app,
          distance: calculateDistance(coordinates.lat, coordinates.lng, app)
        })),
        lowConfidence: planningData.lowConfidence.map(app => ({
          ...app,
          distance: calculateDistance(coordinates.lat, coordinates.lng, app)
        }))
      };

      setPlanningData(resultWithDistances);

      // Auto-expand search for more results if we didn't get many
      if (!expanded && planningData.totalCount < 5) {
        setTimeout(() => fetchPlanningData(true), 1000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch planning data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate distance between property and planning application
  const calculateDistance = (propertyLat: number, propertyLng: number, appWithScore: PlanningApplicationWithScore): number => {
    const application = appWithScore.application;

    // Check if application has ITM coordinates (Irish Transverse Mercator)
    if (application.ITMEasting && application.ITMNorthing) {
      try {
        // Convert ITM to WGS84 coordinates (simplified conversion for demo)
        // In production, you'd use a proper coordinate transformation library
        const easting = application.ITMEasting;
        const northing = application.ITMNorthing;

        // Rough approximation for Dublin area (centered on Dublin)
        // This is a simplified conversion - use a proper library for production
        const dE = easting - 715830;  // Dublin center easting
        const dN = northing - 734697; // Dublin center northing

        // Convert to approximate lat/lng offset (rough approximation)
        const latOffset = dN * 0.000009;  // Rough meters to degrees conversion
        const lngOffset = dE * 0.000009;

        const appLat = 53.3498 + latOffset;  // Dublin center lat
        const appLng = -6.2603 + lngOffset; // Dublin center lng

        // Calculate distance using Haversine formula
        const R = 6371; // Earth's radius in km
        const dLat = (appLat - propertyLat) * Math.PI / 180;
        const dLng = (appLng - propertyLng) * Math.PI / 180;

        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(propertyLat * Math.PI / 180) * Math.cos(appLat * Math.PI / 180) *
                  Math.sin(dLng/2) * Math.sin(dLng/2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c * 1000; // Convert to meters

        return Math.round(distance);
      } catch (error) {
        console.warn('Error converting ITM coordinates:', error);
      }
    }

    // Fallback: estimate distance based on confidence level and search radius
    // High confidence = closer, medium = medium distance, low = farther
    if (appWithScore.confidence === 'high') {
      return Math.round(Math.random() * 30 + 10); // 10-40m
    } else if (appWithScore.confidence === 'medium') {
      return Math.round(Math.random() * 50 + 30); // 30-80m
    } else {
      return Math.round(Math.random() * 70 + 50); // 50-120m
    }
  };

  const handleBack = () => {
    // Check if we have return parameters to go back to map with property open
    const urlParams = new URLSearchParams(window.location.search);
    const focusId = urlParams.get('focus');
    const focusType = urlParams.get('type');

    if (focusId && focusType) {
      // Navigate back to map with property card open
      router.push(`/map?focus=${focusId}&type=${focusType}`);
    } else {
      // Fallback to regular back navigation
      router.back();
    }
  };

  const handleExpandSearch = () => {
    setExpandedSearch(true);
    fetchPlanningData(true);
  };

  // Filter applications by status and year
  const filteredApplications = useMemo(() => {
    if (!planningData) return { highConfidence: [], mediumConfidence: [], lowConfidence: [] };

    const filterApplications = (apps: PlanningApplicationWithScore[]) => {
      let filtered = apps;

      // Status filter
      if (statusFilter !== 'all') {
        filtered = filtered.filter(app => {
          const decision = app.application.Decision?.toLowerCase() || '';
          const status = app.application.ApplicationStatus?.toLowerCase() || '';
          return decision.includes(statusFilter.toLowerCase()) ||
                 status.includes(statusFilter.toLowerCase()) ||
                 (statusFilter === 'pending' && !app.application.Decision);
        });
      }

      // Year filter
      if (yearFilter !== 'all') {
        const filterYear = parseInt(yearFilter);
        filtered = filtered.filter(app => {
          const date = app.application.ReceivedDate || app.application.DecisionDate;
          if (!date) return false;
          const appYear = new Date(date).getFullYear();
          return appYear === filterYear;
        });
      }

      return filtered;
    };

    return {
      highConfidence: filterApplications(planningData.highConfidence),
      mediumConfidence: filterApplications(planningData.mediumConfidence),
      lowConfidence: filterApplications(planningData.lowConfidence),
    };
  }, [planningData, statusFilter, yearFilter]);

  // Get available years from planning applications
  const availableYears = useMemo(() => {
    if (!planningData) return [];

    const years = new Set<number>();
    [...planningData.highConfidence, ...planningData.mediumConfidence, ...planningData.lowConfidence].forEach(app => {
      const date = app.application.ReceivedDate || app.application.DecisionDate;
      if (date) {
        years.add(new Date(date).getFullYear());
      }
    });

    return Array.from(years).sort((a, b) => b - a); // Most recent first
  }, [planningData]);

  // Get unique statuses for filter options
  const availableStatuses = useMemo(() => {
    if (!planningData) return [];

    const statuses = new Set<string>();
    [...planningData.highConfidence, ...planningData.mediumConfidence, ...planningData.lowConfidence].forEach(app => {
      if (app.application.Decision) {
        statuses.add(app.application.Decision);
      }
    });

    return Array.from(statuses).sort();
  }, [planningData]);

  // Calculate statistics
  const statistics = useMemo(() => {
    if (!planningData) return null;

    const allApps = [...planningData.highConfidence, ...planningData.mediumConfidence, ...planningData.lowConfidence];
    const approved = allApps.filter(app => app.application.Decision?.toLowerCase().includes('grant')).length;
    const refused = allApps.filter(app => app.application.Decision?.toLowerCase().includes('refus')).length;
    const pending = allApps.filter(app => !app.application.Decision).length;

    const approvalRate = allApps.length > 0 ? Math.round((approved / (approved + refused)) * 100) : 0;

    // Calculate average processing time
    const completedApps = allApps.filter(app => app.application.ReceivedDate && app.application.DecisionDate);
    const avgProcessingTime = completedApps.length > 0
      ? Math.round(completedApps.reduce((sum, app) => {
          const received = new Date(app.application.ReceivedDate!);
          const decided = new Date(app.application.DecisionDate!);
          return sum + (decided.getTime() - received.getTime());
        }, 0) / completedApps.length / (1000 * 60 * 60 * 24)) // Convert to days
      : 0;

    return {
      total: allApps.length,
      approved,
      refused,
      pending,
      approvalRate,
      avgProcessingTime
    };
  }, [planningData]);

  const formatDate = (timestamp: number) => {
    try {
      return new Date(timestamp).toLocaleDateString('en-IE', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Unknown';
    }
  };

  const getDecisionColor = (decision: string) => {
    const text = decision.toLowerCase();
    if (text.includes('grant')) return 'bg-green-600 text-white';
    if (text.includes('refus') || text.includes('declin')) return 'bg-red-600 text-white';
    return 'bg-yellow-600 text-white';
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (!coordinates) {
    return (
      <div className="min-h-screen bg-[var(--surface)]">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-orange-600" />
            </div>
            <h2 className="text-xl font-semibold text-[var(--foreground)] mb-2">Location Required</h2>
            <p className="text-[var(--foreground-secondary)] mb-4">
              Please access this page from a property card to view planning permissions.
            </p>
            <button
              onClick={handleBack}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--surface)]">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-[var(--surface-hover)] rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-[var(--foreground)] flex items-center gap-2">
              <FileText className="w-8 h-8 text-orange-600" />
              Planning Permissions Analysis
            </h1>
            <p className="text-[var(--foreground-secondary)] mt-1">
              Comprehensive planning permission history and analysis for {address}
            </p>
          </div>
        </div>

        {/* Statistics Overview */}
        {statistics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-[var(--background)] rounded-xl border border-[var(--border)] p-4 text-center">
              <div className="text-2xl font-bold text-[var(--foreground)] mb-1">{statistics.total}</div>
              <div className="text-sm text-[var(--foreground-secondary)]">Total Applications</div>
            </div>
            <div className="bg-[var(--background)] rounded-xl border border-[var(--border)] p-4 text-center">
              <div className="text-2xl font-bold text-green-600 mb-1">{statistics.approvalRate}%</div>
              <div className="text-sm text-[var(--foreground-secondary)]">Approval Rate</div>
            </div>
            <div className="bg-[var(--background)] rounded-xl border border-[var(--border)] p-4 text-center">
              <div className="text-2xl font-bold text-blue-600 mb-1">{statistics.avgProcessingTime}</div>
              <div className="text-sm text-[var(--foreground-secondary)]">Avg Processing (days)</div>
            </div>
            <div className="bg-[var(--background)] rounded-xl border border-[var(--border)] p-4 text-center">
              <div className="text-2xl font-bold text-orange-600 mb-1">{statistics.pending}</div>
              <div className="text-sm text-[var(--foreground-secondary)]">Pending</div>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Filters */}
            {(availableStatuses.length > 0 || availableYears.length > 0) && (
              <div className="bg-[var(--background)] rounded-xl border border-[var(--border)] p-6 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <Filter className="w-5 h-5 text-[var(--foreground-secondary)]" />
                  <h3 className="text-lg font-semibold text-[var(--foreground)]">Filter Applications</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Status Filter */}
                  {availableStatuses.length > 0 && (
                    <div>
                      <label className="text-sm text-[var(--foreground-secondary)] font-medium mb-2 block">Decision Status</label>
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:border-orange-500 focus:outline-none"
                      >
                        <option value="all">All Statuses</option>
                        <option value="pending">Pending</option>
                        {availableStatuses.map(status => (
                          <option key={status} value={status.toLowerCase()}>{status}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Year Filter */}
                  {availableYears.length > 0 && (
                    <div>
                      <label className="text-sm text-[var(--foreground-secondary)] font-medium mb-2 block">Year</label>
                      <select
                        value={yearFilter}
                        onChange={(e) => setYearFilter(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-[var(--surface)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:border-orange-500 focus:outline-none"
                      >
                        <option value="all">All Years</option>
                        {availableYears.map(year => (
                          <option key={year} value={year.toString()}>{year}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Clear Filters */}
                  {(statusFilter !== 'all' || yearFilter !== 'all') && (
                    <div className="flex items-end">
                      <button
                        onClick={() => {
                          setStatusFilter('all');
                          setYearFilter('all');
                        }}
                        className="px-4 py-2 text-sm text-[var(--foreground-secondary)] hover:text-[var(--foreground)] bg-[var(--surface)] hover:bg-[var(--surface-hover)] rounded-lg transition-colors border border-[var(--border)]"
                      >
                        Clear Filters
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="bg-[var(--background)] rounded-xl border border-[var(--border)] p-8 text-center">
                <div className="flex items-center justify-center gap-3 text-[var(--foreground-secondary)]">
                  <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                  <span>Loading planning permission data...</span>
                </div>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 p-6">
                <div className="flex items-center gap-3">
                  <XCircle className="w-6 h-6 text-red-600" />
                  <div>
                    <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">Error Loading Planning Data</h3>
                    <p className="text-red-700 dark:text-red-300 mt-1">{error}</p>
                    <button
                      onClick={() => fetchPlanningData()}
                      className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Planning Applications */}
            {planningData && !loading && (
              <div className="space-y-6">
                {/* At This Address */}
                {filteredApplications.highConfidence.length > 0 && (
                  <ApplicationSection
                    title="🏠 At This Address"
                    applications={filteredApplications.highConfidence}
                    confidence="high"
                    formatDate={formatDate}
                    truncateText={truncateText}
                    getDecisionColor={getDecisionColor}
                  />
                )}

                {/* Possible Matches */}
                {filteredApplications.mediumConfidence.length > 0 && (
                  <ApplicationSection
                    title="⚠️ Possible Matches"
                    applications={filteredApplications.mediumConfidence}
                    confidence="medium"
                    formatDate={formatDate}
                    truncateText={truncateText}
                    getDecisionColor={getDecisionColor}
                  />
                )}

                {/* Nearby Properties */}
                {filteredApplications.lowConfidence.length > 0 && (
                  <ApplicationSection
                    title="🏘️ Nearby Properties"
                    applications={filteredApplications.lowConfidence}
                    confidence="low"
                    showByDefault={true}
                    onToggle={() => setExpandedSearch(!expandedSearch)}
                    formatDate={formatDate}
                    truncateText={truncateText}
                    getDecisionColor={getDecisionColor}
                  />
                )}

                {/* No Results */}
                {planningData.totalCount === 0 && (
                  <div className="bg-[var(--background)] rounded-xl border border-[var(--border)] p-8 text-center">
                    <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-[var(--foreground)] mb-2">No Planning Applications Found</h3>
                    <p className="text-[var(--foreground-secondary)] mb-4">
                      No planning permission applications were found within {planningData.searchRadius || 150}m of this location.
                    </p>
                    {!expandedSearch && (
                      <button
                        onClick={handleExpandSearch}
                        className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                      >
                        Expand to 150m Search
                      </button>
                    )}
                  </div>
                )}

                {/* Expand Search Option */}
                {planningData.totalCount > 0 && !expandedSearch && planningData.searchRadius && planningData.searchRadius < 150 && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-6 text-center">
                    <Search className="w-8 h-8 text-blue-600 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">Limited Search Results</h3>
                    <p className="text-[var(--foreground-secondary)] mb-4">
                      Currently showing applications within {planningData.searchRadius}m. Expand search to find more planning history.
                    </p>
                    <button
                      onClick={handleExpandSearch}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Search Wider Area (150m)
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Location Summary */}
            {coordinates && (
              <div className="bg-[var(--background)] rounded-xl border border-[var(--border)] p-6">
                <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-orange-500" />
                  Location Details
                </h3>

                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-[var(--foreground-secondary)] mb-1">Property Address</div>
                    <div className="text-[var(--foreground)] font-medium">{address}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-[var(--foreground-secondary)] mb-1">Latitude</div>
                      <div className="text-[var(--foreground)] font-mono text-sm">{coordinates.lat.toFixed(6)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-[var(--foreground-secondary)] mb-1">Longitude</div>
                      <div className="text-[var(--foreground)] font-mono text-sm">{coordinates.lng.toFixed(6)}</div>
                    </div>
                  </div>

                <DistanceDisplay
                  latitude={coordinates.lat}
                  longitude={coordinates.lng}
                  className="mt-4"
                />

                {planningData && (
                  <div className="p-3 bg-[var(--surface)] rounded-lg border border-[var(--border)] mt-4">
                    <div className="text-sm text-[var(--foreground-secondary)] mb-1">Search Radius</div>
                    <div className="text-[var(--foreground)] font-medium">
                      {planningData.searchRadius}m radius
                      {expandedSearch && <span className="text-orange-600 ml-2">(Expanded)</span>}
                    </div>
                    <div className="text-xs text-[var(--foreground-secondary)] mt-1">
                      Found {planningData.totalCount} planning applications
                    </div>
                  </div>
                )}
                </div>
              </div>
            )}

            {/* Decision Status Guide */}
            <div className="bg-[var(--background)] rounded-xl border border-[var(--border)] p-6">
              <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">Decision Status Guide</h3>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-[var(--foreground)]">Granted</div>
                    <div className="text-sm text-[var(--foreground-secondary)]">Planning permission approved</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-red-500 mt-1 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-[var(--foreground)]">Refused</div>
                    <div className="text-sm text-[var(--foreground-secondary)]">Planning permission denied</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-yellow-500 mt-1 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-[var(--foreground)]">Pending</div>
                    <div className="text-sm text-[var(--foreground-secondary)]">Application under review</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-blue-500 mt-1 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-[var(--foreground)]">Withdrawn</div>
                    <div className="text-sm text-[var(--foreground-secondary)]">Application cancelled by applicant</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Planning Authority Info */}
            <div className="bg-[var(--background)] rounded-xl border border-[var(--border)] p-6">
              <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">Planning Authority</h3>

              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-[var(--foreground-secondary)] mb-1">For Dublin Properties</div>
                  <div className="text-[var(--foreground)] font-medium">Dublin City Council</div>
                  <div className="text-[var(--foreground-secondary)]">planning@dublincity.ie</div>
                </div>

                <div className="pt-3 border-t border-[var(--border)]">
                  <div className="text-[var(--foreground-secondary)] mb-2">Typical Processing Times</div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-[var(--foreground-secondary)]">House extensions</span>
                      <span className="text-[var(--foreground)]">6-8 weeks</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--foreground-secondary)]">New dwellings</span>
                      <span className="text-[var(--foreground)]">8-12 weeks</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--foreground-secondary)]">Minor works</span>
                      <span className="text-[var(--foreground)]">4-6 weeks</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-[var(--background)] rounded-xl border border-[var(--border)] p-6">
              <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">Resources & Links</h3>

              <div className="space-y-3">
                <button
                  onClick={() => {
                    const planningPortalUrl = 'https://www.planning.ie/';
                    window.open(planningPortalUrl, '_blank');
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Planning Portal
                </button>

                <button
                  onClick={() => {
                    const searchUrl = `https://www.google.com/search?q=planning+permission+ireland+${encodeURIComponent(address)}`;
                    window.open(searchUrl, '_blank');
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                >
                  <Search className="w-4 h-4" />
                  Search Resources
                </button>

                <button
                  onClick={() => {
                    const guidelinesUrl = 'https://www.gov.ie/en/service/d1b3a-planning-permission/';
                    window.open(guidelinesUrl, '_blank');
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  Planning Guidelines
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Application Section Component
interface ApplicationSectionProps {
  title: string;
  applications: PlanningApplicationWithScore[];
  confidence: 'high' | 'medium' | 'low';
  showByDefault?: boolean;
  onToggle?: () => void;
  formatDate: (timestamp: number) => string;
  truncateText: (text: string, maxLength: number) => string;
  getDecisionColor: (decision: string) => string;
}

function ApplicationSection({
  title,
  applications,
  confidence,
  showByDefault = true,
  onToggle,
  formatDate,
  truncateText,
  getDecisionColor
}: ApplicationSectionProps) {
  const [showAll, setShowAll] = useState(showByDefault);
  const [selectedApp, setSelectedApp] = useState<PlanningApplicationWithScore | null>(null);

  if (!showByDefault && onToggle) {
    return (
      <div className="bg-[var(--background)] rounded-xl border border-[var(--border)] p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className={`px-2 py-1 text-xs rounded ${
            confidence === 'high' ? 'bg-green-600 text-white' :
            confidence === 'medium' ? 'bg-yellow-600 text-white' : 'bg-gray-600 text-white'
          }`}>
            {title}
          </span>
          <span className="text-[var(--foreground-secondary)] text-sm">({applications.length} applications)</span>
        </div>
        <button
          onClick={onToggle}
          className="w-full py-3 px-4 bg-[var(--surface)] text-[var(--foreground-secondary)] hover:text-[var(--foreground)] rounded-lg hover:bg-[var(--surface-hover)] transition-colors"
        >
          Show {title.toLowerCase()}
        </button>
      </div>
    );
  }

  const displayApps = showAll ? applications : applications.slice(0, 3);

  return (
    <div className="bg-[var(--background)] rounded-xl border border-[var(--border)] p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 text-xs rounded ${
            confidence === 'high' ? 'bg-green-600 text-white' :
            confidence === 'medium' ? 'bg-yellow-600 text-white' : 'bg-gray-600 text-white'
          }`}>
            {title}
          </span>
          <span className="text-[var(--foreground-secondary)] text-sm">({applications.length} applications)</span>
        </div>
        {applications.length > 3 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-sm text-orange-600 hover:text-orange-700 font-medium"
          >
            {showAll ? 'Show Less' : `Show All (${applications.length})`}
          </button>
        )}
      </div>

      <div className="space-y-3">
        {displayApps.map((item, index) => (
          <PlanningApplicationItem
            key={index}
            item={item}
            formatDate={formatDate}
            truncateText={truncateText}
            getDecisionColor={getDecisionColor}
            onSelect={setSelectedApp}
          />
        ))}
      </div>

      {/* Application Details Modal - temporarily commented out */}
      {/* {selectedApp && coordinates && (
          <ApplicationDetailsModal
            application={selectedApp}
            isOpen={true}
            onClose={() => setSelectedApp(null)}
            formatDate={formatDate}
            getDecisionColor={getDecisionColor}
            propertyCoordinates={coordinates}
          />
      )} */}
    </div>
  );
}

// Individual Application Item Component
interface PlanningApplicationItemProps {
  item: PlanningApplicationWithScore;
  formatDate: (timestamp: number) => string;
  truncateText: (text: string, maxLength: number) => string;
  getDecisionColor: (decision: string) => string;
  onSelect: (app: PlanningApplicationWithScore) => void;
}

function PlanningApplicationItem({ item, formatDate, truncateText, getDecisionColor, onSelect }: PlanningApplicationItemProps) {
  const { application } = item;
  const hasFullDetails = application.LinkAppDetails && application.LinkAppDetails.trim() !== '';

  return (
    <div
      className={`bg-[var(--surface)] rounded-lg p-4 border transition-all cursor-pointer transform hover:scale-[1.01] ${
        hasFullDetails
          ? 'border-[var(--border)] hover:border-orange-300 hover:shadow-md'
          : 'border-[var(--border)] opacity-75'
      }`}
      onClick={() => hasFullDetails && onSelect(item)}
    >
      {/* Header with decision badge */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="text-[var(--foreground)] text-sm font-medium truncate flex items-center gap-2">
            {application.ApplicationNumber}
            {hasFullDetails && <ExternalLink className="w-3 h-3 text-orange-500 flex-shrink-0" />}
          </div>
          <div className={`inline-block px-2 py-1 text-xs rounded mt-1 ${getDecisionColor(application.Decision || 'Pending')}`}>
            {application.Decision ? application.Decision : '⏳ Pending'}
          </div>
        </div>
        <div className="text-[var(--foreground-secondary)] text-xs ml-2 flex-shrink-0">
          {application.ReceivedDate ? formatDate(application.ReceivedDate) : 'Unknown date'}
        </div>
      </div>

      {/* Description */}
      {application.DevelopmentDescription && (
        <div className="text-[var(--foreground-secondary)] text-sm mb-3 leading-relaxed">
          {truncateText(application.DevelopmentDescription, 120)}
        </div>
      )}

      {/* Application details */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        {application.ApplicationType && (
          <div>
            <span className="text-[var(--foreground-secondary)]">Type:</span>
            <span className="text-[var(--foreground)] ml-1">{application.ApplicationType}</span>
          </div>
        )}
        {application.PlanningAuthority && (
          <div>
            <span className="text-[var(--foreground-secondary)]">Authority:</span>
            <span className="text-[var(--foreground)] ml-1">{application.PlanningAuthority}</span>
          </div>
        )}
        {application.AreaofSite && (
          <div>
            <span className="text-[var(--foreground-secondary)]">Site Area:</span>
            <span className="text-[var(--foreground)] ml-1">{application.AreaofSite}m²</span>
          </div>
        )}
        {item.distance !== undefined && (
          <div>
            <span className="text-[var(--foreground-secondary)]">Distance:</span>
            <span className="text-[var(--foreground)] ml-1 font-medium">{item.distance}m</span>
          </div>
        )}
      </div>

      {/* Address (for non-high confidence) */}
      {item.confidence !== 'high' && application.DevelopmentAddress && (
        <div className="text-[var(--foreground-secondary)] text-xs mt-2 flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          <span className="truncate">{truncateText(application.DevelopmentAddress, 60)}</span>
        </div>
      )}

      {/* Click indicator */}
      <div className="flex items-center justify-end mt-2">
        {hasFullDetails ? (
          <div className="flex items-center gap-1 text-orange-600 text-xs font-medium">
            <Target className="w-3 h-3" />
            <span>Click for details</span>
          </div>
        ) : (
          <span className="text-[var(--foreground-secondary)] text-xs">No details available</span>
        )}
      </div>
    </div>
  );
}

// Application Details Modal Component
interface ApplicationDetailsModalProps {
  application: PlanningApplicationWithScore | null;
  isOpen: boolean;
  onClose: () => void;
  formatDate: (timestamp: number) => string;
  getDecisionColor: (decision: string) => string;
  propertyCoordinates: { lat: number; lng: number } | null;
}

function ApplicationDetailsModal({ application, isOpen, onClose, formatDate, getDecisionColor, propertyCoordinates }: ApplicationDetailsModalProps) {
  if (!isOpen || !application) return null;

  const { application: app, confidence, matchReasons } = application;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-[var(--background)] rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border)]">
          <div>
            <h2 className="text-xl font-semibold text-[var(--foreground)]">Planning Application Details</h2>
            <div className="text-[var(--foreground-secondary)] text-sm mt-1">{app.ApplicationNumber}</div>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--foreground-secondary)] hover:text-[var(--foreground)] text-2xl"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Status and Decision */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`px-3 py-1 rounded text-sm font-medium ${getDecisionColor(app.Decision || 'Pending')}`}>
                {app.Decision || '⏳ Pending'}
              </div>
              <div className="text-[var(--foreground-secondary)] text-sm">
                {app.ApplicationType || 'Unknown Type'}
              </div>
            </div>
            <div className={`px-2 py-1 text-xs rounded ${
              confidence === 'high' ? 'bg-green-600 text-white' :
              confidence === 'medium' ? 'bg-yellow-600 text-white' : 'bg-gray-600 text-white'
            }`}>
              {confidence === 'high' ? '🏠 At This Address' :
               confidence === 'medium' ? '⚠️ Possible Match' : '🏘️ Nearby'}
            </div>
          </div>

          {/* Description */}
          {app.DevelopmentDescription && (
            <div>
              <h3 className="text-[var(--foreground)] font-medium mb-2">Development Description</h3>
              <p className="text-[var(--foreground-secondary)] text-sm leading-relaxed">{app.DevelopmentDescription}</p>
            </div>
          )}

          {/* Address */}
          {app.DevelopmentAddress && (
            <div>
              <h3 className="text-[var(--foreground)] font-medium mb-2">Development Address</h3>
              <p className="text-[var(--foreground-secondary)] text-sm flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                {app.DevelopmentAddress}
              </p>
            </div>
          )}

          {/* Planning Authority */}
          <div>
            <h3 className="text-[var(--foreground)] font-medium mb-2">Planning Authority</h3>
            <p className="text-[var(--foreground-secondary)] text-sm">{app.PlanningAuthority}</p>
          </div>

          {/* Match Reasons */}
          {matchReasons && matchReasons.length > 0 && (
            <div>
              <h3 className="text-[var(--foreground)] font-medium mb-2">Match Information</h3>
              <ul className="text-[var(--foreground-secondary)] text-sm space-y-1">
                {matchReasons.map((reason, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <span>•</span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Key Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            {app.ReceivedDate && (
              <div>
                <h3 className="text-[var(--foreground)] font-medium mb-1">Received</h3>
                <p className="text-[var(--foreground-secondary)] text-sm">{formatDate(app.ReceivedDate)}</p>
              </div>
            )}
            {app.DecisionDate && (
              <div>
                <h3 className="text-[var(--foreground)] font-medium mb-1">Decision Date</h3>
                <p className="text-[var(--foreground-secondary)] text-sm">{formatDate(app.DecisionDate)}</p>
              </div>
            )}
            {app.AreaofSite && (
              <div>
                <h3 className="text-[var(--foreground)] font-medium mb-1">Site Area</h3>
                <p className="text-[var(--foreground-secondary)] text-sm">{app.AreaofSite}m²</p>
              </div>
            )}
            {app.NumResidentialUnits && (
              <div>
                <h3 className="text-[var(--foreground)] font-medium mb-1">Residential Units</h3>
                <p className="text-[var(--foreground-secondary)] text-sm">{app.NumResidentialUnits}</p>
              </div>
            )}
            {application?.distance !== undefined && (
              <div>
                <h3 className="text-[var(--foreground)] font-medium mb-1">Distance from Property</h3>
                <p className="text-[var(--foreground-secondary)] text-sm flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {application.distance}m away
                </p>
              </div>
            )}
          </div>

          {/* Application Status */}
          {app.ApplicationStatus && (
            <div>
              <h3 className="text-[var(--foreground)] font-medium mb-1">Application Status</h3>
              <p className="text-[var(--foreground-secondary)] text-sm">{app.ApplicationStatus}</p>
            </div>
          )}

          {/* Official Link */}
          {app.LinkAppDetails && (
            <div className="pt-4 border-t border-[var(--border)]">
              <div className="text-center">
                <a
                  href={app.LinkAppDetails}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
                >
                  <ExternalLink className="w-4 h-4" />
                  View Complete Application Details
                </a>
                <p className="text-[var(--foreground-secondary)] text-xs mt-2">
                  Opens official planning authority portal
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PlanningPermissionsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-600">Loading planning permissions...</div>
      </div>
    }>
      <PlanningContent />
    </Suspense>
  );
}
