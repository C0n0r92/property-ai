'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlanningApplicationWithScore, PlanningResponse } from '@/types/property';
import { analytics } from '@/lib/analytics';

interface PlanningCardProps {
  latitude: number;
  longitude: number;
  address: string;
  dublinPostcode?: string;
  propertyType?: 'sold' | 'forSale' | 'rental';
  forceLoad?: boolean; // Force immediate loading on mobile
}

export function PlanningCard({ latitude, longitude, address, dublinPostcode, propertyType = 'sold', forceLoad = false }: PlanningCardProps) {
  const [isFlipped, setIsFlipped] = useState(forceLoad); // Start flipped if forceLoad is true
  const [data, setData] = useState<PlanningResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLowConfidence, setShowLowConfidence] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<PlanningApplicationWithScore | null>(null);
  const [fullDescription, setFullDescription] = useState<string | null>(null);
  const [loadingFullDesc, setLoadingFullDesc] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [attemptedLoad, setAttemptedLoad] = useState(false);

  // Force load data immediately on mobile
  useEffect(() => {
    if (forceLoad && !data && !error && !attemptedLoad) {
      fetchPlanningData();
      analytics.planningCardViewed(propertyType);
      setAttemptedLoad(true);
    }
  }, [forceLoad, data, error, attemptedLoad, propertyType]);

  const fetchPlanningData = async (expandedSearch = false) => {
    // Only set loading to true for the initial call
    if (!expandedSearch) {
      setLoading(true);
    }
    setError(null);

    try {
      const params = new URLSearchParams({
        lat: latitude.toString(),
        lng: longitude.toString(),
        address: address,
        ...(dublinPostcode && { dublinPostcode }),
        ...(expandedSearch && { expandedSearch: 'true' })
      });

      const response = await fetch(`/api/planning?${params}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch planning data');
      }

      setData(result);

      // Auto-expand search to show nearby planning permissions
      if (!expandedSearch) {
        // Automatically expand search for nearby results regardless of initial results
        setTimeout(() => fetchPlanningData(true), 500); // Small delay for better UX
        return; // Don't continue with tracking for the initial search
      }

      // Track data loading (only for expanded search)
      const totalCount = result.totalCount;
      let confidenceLevel: 'high' | 'medium' | 'low' | 'mixed' = 'low';
      if (result.highConfidence.length > 0) {
        confidenceLevel = result.mediumConfidence.length > 0 || result.lowConfidence.length > 0 ? 'mixed' : 'high';
      } else if (result.mediumConfidence.length > 0) {
        confidenceLevel = 'medium';
      }

      analytics.planningDataLoaded(totalCount, confidenceLevel, propertyType);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      // Only set loading to false after the expanded search completes
      if (expandedSearch) {
        setLoading(false);
      }
    }
  };

  const handleFlip = async () => {
    const newFlippedState = !isFlipped;

    if (newFlippedState && !data && !error) {
      // First time flipping to back - fetch data
      await fetchPlanningData();
      analytics.planningCardViewed(propertyType);
    }

    analytics.planningCardFlipped(newFlippedState ? 'back' : 'front', propertyType);
    setIsFlipped(newFlippedState);
  };

  const handleExpandSearch = async () => {
    await fetchPlanningData(true);
    analytics.planningExpandedSearch(propertyType);
  };

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

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;

    // Try to truncate at word boundary
    let truncated = text.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');

    if (lastSpace > maxLength * 0.7) { // Only use word boundary if it's not too far back
      truncated = truncated.substring(0, lastSpace);
    }

    return truncated + '...';
  };

  const getDecisionColor = (decision: string) => {
    const text = decision.toLowerCase();
    if (text.includes('grant')) return 'bg-green-600 text-white';
    if (text.includes('refus') || text.includes('declin')) return 'bg-red-600 text-white';
    return 'bg-yellow-600 text-white';
  };

  const getConfidenceBadgeColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'bg-green-600 text-white';
      case 'medium': return 'bg-yellow-600 text-white';
      case 'low': return 'bg-gray-600 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const handleApplicationSelect = (application: PlanningApplicationWithScore) => {
    setSelectedApplication(application);
    setFullDescription(null); // Reset full description when selecting new application
    setLoadingFullDesc(false); // Reset loading state
    setAttemptedLoad(false); // Reset attempted load state
    // Keep filters as they are - users might want to browse filtered results
    analytics.planningApplicationClicked(application.application.ApplicationNumber, propertyType);
  };

  // Get available years from planning applications
  const availableYears = useMemo(() => {
    if (!data) return [];

    const years = new Set<number>();
    [...data.highConfidence, ...data.mediumConfidence, ...data.lowConfidence].forEach(app => {
      const date = app.application.ReceivedDate || app.application.DecisionDate;
      if (date) {
        // ArcGIS dates are in milliseconds, not seconds
        years.add(new Date(date).getFullYear());
      }
    });

    return Array.from(years).sort((a, b) => b - a); // Most recent first
  }, [data]);

  // Filter applications by status and year
  const filteredApplications = useMemo(() => {
    if (!data) return { highConfidence: [], mediumConfidence: [], lowConfidence: [] };

    const filterApplications = (apps: PlanningApplicationWithScore[]) => {
      let filtered = apps;

      // Status filter
      if (statusFilter !== 'all') {
        filtered = filtered.filter(app =>
          app.application.Decision?.toLowerCase().includes(statusFilter.toLowerCase()) ||
          (statusFilter === 'pending' && !app.application.Decision)
        );
      }

      // Year filter
      if (yearFilter !== 'all') {
        const filterYear = parseInt(yearFilter);
        filtered = filtered.filter(app => {
          const date = app.application.ReceivedDate || app.application.DecisionDate;
          if (!date) return false;

          // ArcGIS dates are in milliseconds, not seconds
          const appYear = new Date(date).getFullYear();
          return appYear === filterYear;
        });
      }

      return filtered;
    };

    return {
      highConfidence: filterApplications(data.highConfidence),
      mediumConfidence: filterApplications(data.mediumConfidence),
      lowConfidence: filterApplications(data.lowConfidence),
    };
  }, [data, statusFilter, yearFilter]);

  // Get unique statuses for filter options
  const availableStatuses = useMemo(() => {
    if (!data) return [];

    const statuses = new Set<string>();
    [...data.highConfidence, ...data.mediumConfidence, ...data.lowConfidence].forEach(app => {
      if (app.application.Decision) {
        statuses.add(app.application.Decision);
      }
    });

    return Array.from(statuses).sort();
  }, [data]);

  const fetchFullDescription = async (objectId: number, originalDescription: string) => {
    setLoadingFullDesc(true);
    try {
      // Query the specific application by OBJECTID to get complete data
      const response = await fetch(
        `https://services.arcgis.com/NzlPQPKn5QF9v2US/arcgis/rest/services/IrishPlanningApplications/FeatureServer/0/query?where=OBJECTID=${objectId}&outFields=*&f=json`
      );
      const data = await response.json();

      if (data.features && data.features[0]) {
        const fullDesc = data.features[0].attributes.DevelopmentDescription;
        console.log(`Full description for OBJECTID ${objectId}:`, fullDesc);
        console.log(`Length: ${fullDesc?.length || 0} characters`);

        // Only show additional details if they're actually different from what's already displayed
        if (fullDesc && fullDesc.trim() && fullDesc.trim() !== originalDescription?.trim()) {
          setFullDescription(fullDesc);
        } else {
          setFullDescription(null); // Don't show additional details if they're the same
        }
      } else {
        setFullDescription(null);
      }
    } catch (error) {
      console.error('Error fetching full description:', error);
      setFullDescription('Error loading full description');
    } finally {
      setLoadingFullDesc(false);
      setAttemptedLoad(true);
    }
  };

  return (
    <div className="relative w-full">
      {/* Planning Details Modal */}
      <PlanningDetailsModal
        application={selectedApplication}
        isOpen={!!selectedApplication}
        onClose={() => setSelectedApplication(null)}
        formatDate={formatDate}
        getDecisionColor={getDecisionColor}
        fetchFullDescription={fetchFullDescription}
        fullDescription={fullDescription}
        loadingFullDesc={loadingFullDesc}
        attemptedLoad={attemptedLoad}
      />

      <AnimatePresence mode="wait">
        {!isFlipped ? (
          // Front Side
          <motion.div
            key="front"
            initial={{ opacity: 0, rotateY: -90 }}
            animate={{ opacity: 1, rotateY: 0 }}
            exit={{ opacity: 0, rotateY: 90 }}
            transition={{ duration: 0.3 }}
            className="bg-gray-900/95 md:bg-gray-900/95 backdrop-blur-xl rounded-lg md:rounded-xl p-3 md:p-5 shadow-xl md:shadow-2xl border border-gray-700 cursor-pointer hover:border-gray-600 transition-colors"
            onClick={handleFlip}
          >
            <div className="flex items-center gap-3 min-h-[48px] md:min-h-[120px]">
              {loading ? (
                <div className="w-5 h-5 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              )}
              <div className="flex-1 md:flex-initial md:text-center">
                <div className="text-white text-sm md:text-lg font-medium">Planning Permission History</div>
                <div className="text-gray-400 text-xs md:text-sm">
                  {loading ? 'Loading...' : 'Tap to view applications'}
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          // Back Side
          <motion.div
            key="back"
            initial={{ opacity: 0, rotateY: 90 }}
            animate={{ opacity: 1, rotateY: 0 }}
            exit={{ opacity: 0, rotateY: -90 }}
            transition={{ duration: 0.3 }}
            className="bg-gray-900/95 backdrop-blur-xl rounded-lg md:rounded-xl p-3 md:p-5 shadow-xl md:shadow-2xl border border-gray-700 max-h-[60vh] md:max-h-[70vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-white text-base md:text-lg font-semibold">🏗️ Planning Permission History</h3>
                <div className="text-gray-400 text-xs md:text-sm">
                  {loading ? 'Loading...' : `${data?.totalCount || 0} applications found`}
                </div>
              </div>
              <button
                onClick={() => setIsFlipped(false)}
                className="text-gray-400 hover:text-white transition-colors px-3 py-1 rounded hover:bg-gray-800"
              >
                ← Back
              </button>
            </div>

            {/* Filters */}
            {(availableStatuses.length > 0 || availableYears.length > 0) && (
              <div className="mb-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Status Filter */}
                  {availableStatuses.length > 0 && (
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-1 block">Status</label>
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded text-gray-300 focus:border-indigo-500 focus:outline-none"
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
                      <label className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-1 block">Year</label>
                      <select
                        value={yearFilter}
                        onChange={(e) => setYearFilter(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded text-gray-300 focus:border-indigo-500 focus:outline-none"
                      >
                        <option value="all">All Years</option>
                        {availableYears.map(year => (
                          <option key={year} value={year.toString()}>{year}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Clear Filters */}
                {(statusFilter !== 'all' || yearFilter !== 'all') && (
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={() => {
                        setStatusFilter('all');
                        setYearFilter('all');
                      }}
                      className="px-3 py-1 text-xs text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded transition-colors"
                    >
                      Clear Filters
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Content */}
            {error ? (
              <div className="text-center py-8">
                <div className="text-red-400 text-sm mb-2">Error loading planning data</div>
                <div className="text-gray-500 text-xs">{error}</div>
                <button
                  onClick={() => fetchPlanningData()}
                  className="mt-3 px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            ) : data ? (
              <div className="space-y-3">
                {/* High Confidence */}
                {filteredApplications.highConfidence.length > 0 && (
                  <ApplicationSection
                    title="✅ At This Address"
                    applications={filteredApplications.highConfidence}
                    confidence="high"
                    formatDate={formatDate}
                    truncateText={truncateText}
                    getDecisionColor={getDecisionColor}
                    onApplicationSelect={handleApplicationSelect}
                  />
                )}

                {/* Medium Confidence */}
                {filteredApplications.mediumConfidence.length > 0 && (
                  <ApplicationSection
                    title="⚠️ Possible Matches"
                    applications={filteredApplications.mediumConfidence}
                    confidence="medium"
                    formatDate={formatDate}
                    truncateText={truncateText}
                    getDecisionColor={getDecisionColor}
                    onApplicationSelect={handleApplicationSelect}
                  />
                )}

                {/* Low Confidence */}
                {filteredApplications.lowConfidence.length > 0 && (
                  <ApplicationSection
                    title="🏠 Nearby Properties"
                    applications={filteredApplications.lowConfidence}
                    confidence="low"
                    showByDefault={showLowConfidence}
                    onToggle={() => setShowLowConfidence(!showLowConfidence)}
                    formatDate={formatDate}
                    truncateText={truncateText}
                    getDecisionColor={getDecisionColor}
                    onApplicationSelect={handleApplicationSelect}
                  />
                )}

                {/* No Results */}
                {data.totalCount === 0 && (
                  <div className="text-center py-8">
                    {(!data.searchRadius || data.searchRadius < 150) ? (
                      // Auto-expanding to wider search
                      <div>
                        <div className="text-gray-400 text-sm mb-2">🔍 Searching nearby area...</div>
                        <div className="text-gray-500 text-xs mb-4">
                          No applications found at exact location, expanding search to 150m radius
                        </div>
                        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                      </div>
                    ) : (
                      // Already searched wide area, truly no results
                      <div>
                        <div className="text-gray-400 text-sm mb-2">🔍 No planning applications found</div>
                        <div className="text-gray-500 text-xs">
                          Searched within {data.searchRadius || '150'}m radius
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <div className="text-gray-400 text-sm mb-4">Loading planning data...</div>
                <div className="text-gray-500 text-xs mb-6">Searching for planning applications in this area</div>
                <div className="text-gray-500 text-xs">This may take a few seconds</div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface PlanningApplicationItemProps {
  item: PlanningApplicationWithScore;
  formatDate: (timestamp: number) => string;
  truncateText: (text: string, maxLength: number) => string;
  getDecisionColor: (decision: string) => string;
  onApplicationSelect: (application: PlanningApplicationWithScore) => void;
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
  onApplicationSelect: (application: PlanningApplicationWithScore) => void;
}

function ApplicationSection({
  title,
  applications,
  confidence,
  showByDefault = true,
  onToggle,
  formatDate,
  truncateText,
  getDecisionColor,
  onApplicationSelect
}: ApplicationSectionProps) {
  const getConfidenceBadgeColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'bg-green-600 text-white';
      case 'medium': return 'bg-yellow-600 text-white';
      case 'low': return 'bg-gray-600 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  if (!showByDefault && onToggle) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className={`px-2 py-1 text-xs rounded ${getConfidenceBadgeColor(confidence)}`}>
            {title}
          </span>
          <span className="text-gray-400 text-sm">({applications.length})</span>
        </div>
        <button
          onClick={onToggle}
          className="w-full py-2 px-3 bg-gray-800 text-gray-300 text-sm rounded hover:bg-gray-700 transition-colors"
        >
          Show {title.toLowerCase()}
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span className={`px-2 py-1 text-xs rounded ${getConfidenceBadgeColor(confidence)}`}>
          {title}
        </span>
        <span className="text-gray-400 text-sm">({applications.length})</span>
      </div>
      <div className="space-y-2">
        {applications.map((item, index) => (
          <PlanningApplicationItem
            key={index}
            item={item}
            formatDate={formatDate}
            truncateText={truncateText}
            getDecisionColor={getDecisionColor}
            onApplicationSelect={onApplicationSelect}
          />
        ))}
      </div>
    </div>
  );
}

// Modal for showing full planning application details
interface PlanningDetailsModalProps {
  application: PlanningApplicationWithScore | null;
  isOpen: boolean;
  onClose: () => void;
  formatDate: (timestamp: number) => string;
  getDecisionColor: (decision: string) => string;
  fetchFullDescription: (objectId: number, originalDescription: string) => void;
  fullDescription: string | null;
  loadingFullDesc: boolean;
  attemptedLoad: boolean;
}

function PlanningDetailsModal({ application, isOpen, onClose, formatDate, getDecisionColor, fetchFullDescription, fullDescription, loadingFullDesc, attemptedLoad }: PlanningDetailsModalProps) {
  if (!isOpen || !application) return null;

  const { application: app, confidence, matchReasons } = application;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-end sm:items-center justify-center p-2 sm:p-4 z-50">
      <div className="bg-gray-900 rounded-t-xl sm:rounded-xl max-w-2xl w-full max-h-[85vh] sm:max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-700">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-white">Planning Application Details</h2>
            <div className="text-gray-400 text-sm mt-1">{app.ApplicationNumber}</div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
          {/* Status and Decision */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`px-2 sm:px-3 py-1 rounded text-xs sm:text-sm font-medium ${getDecisionColor(app.Decision || 'Pending')}`}>
                {app.Decision || '⏳ Pending'}
              </div>
              <div className="text-gray-400 text-sm">
                {app.ApplicationType || 'Unknown Type'}
              </div>
            </div>
            <div className={`px-2 py-1 text-xs rounded ${
              confidence === 'high' ? 'bg-green-600 text-white' :
              confidence === 'medium' ? 'bg-yellow-600 text-white' : 'bg-gray-600 text-white'
            }`}>
              {confidence === 'high' ? '✅ At This Address' :
               confidence === 'medium' ? '⚠️ Possible Match' : '🏠 Nearby'}
            </div>
          </div>

          {/* Description */}
          {app.DevelopmentDescription && (
            <div>
              <h3 className="text-white font-medium mb-2">Development Description</h3>

              {/* Description display */}
              <div>
                <p className="text-gray-300 text-sm leading-relaxed mb-3">{app.DevelopmentDescription}</p>

                {/* Additional details option */}
                {!fullDescription && !loadingFullDesc && !attemptedLoad && (
                  <div className="bg-blue-900/20 border border-blue-600/30 rounded p-3">
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 text-sm">ℹ️</span>
                      <div className="flex-1">
                        <p className="text-blue-200 text-xs mb-2">
                          Need more details? Try loading additional information from our database.
                        </p>
                        <button
                          onClick={() => fetchFullDescription(app.OBJECTID, app.DevelopmentDescription)}
                          className="px-4 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 transition-colors w-full sm:w-auto min-h-[44px] flex items-center justify-center"
                        >
                          📖 Load More Details
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Show additional details if loaded and different */}
                {fullDescription && (
                  <div className="bg-gray-700/50 border border-gray-600 rounded p-3">
                    <p className="text-gray-300 text-xs mb-2 font-medium">📄 Additional Details from Database</p>
                    <p className="text-gray-300 text-sm leading-relaxed">{fullDescription}</p>
                    {app.LinkAppDetails && (
                      <div className="mt-3 pt-2 border-t border-gray-600">
                        <a
                          href={app.LinkAppDetails}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1"
                        >
                          🔗 View complete application on official portal →
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {loadingFullDesc && (
                  <div className="flex items-center gap-2 text-blue-200 text-xs">
                    <div className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                    Loading additional details...
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Address */}
          {app.DevelopmentAddress && (
            <div>
              <h3 className="text-white font-medium mb-2">Development Address</h3>
              <p className="text-gray-300 text-sm">📍 {app.DevelopmentAddress}</p>
            </div>
          )}

          {/* Planning Authority */}
          <div>
            <h3 className="text-white font-medium mb-2">Planning Authority</h3>
            <p className="text-gray-300 text-sm">{app.PlanningAuthority}</p>
          </div>

          {/* Match Reasons */}
          {matchReasons && matchReasons.length > 0 && (
            <div>
              <h3 className="text-white font-medium mb-2">Match Information</h3>
              <ul className="text-gray-300 text-sm space-y-1">
                {matchReasons.map((reason, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <span>•</span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            {app.ReceivedDate && (
              <div>
                <h3 className="text-white font-medium mb-1">Received</h3>
                <p className="text-gray-300 text-sm">{formatDate(app.ReceivedDate)}</p>
              </div>
            )}
            {app.DecisionDate && (
              <div>
                <h3 className="text-white font-medium mb-1">Decision Date</h3>
                <p className="text-gray-300 text-sm">{formatDate(app.DecisionDate)}</p>
              </div>
            )}
            {app.DecisionDueDate && (
              <div>
                <h3 className="text-white font-medium mb-1">Decision Due</h3>
                <p className="text-gray-300 text-sm">{formatDate(app.DecisionDueDate)}</p>
              </div>
            )}
          </div>

          {/* Additional Details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            {app.AreaofSite && (
              <div>
                <span className="text-gray-400">Site Area:</span>
                <span className="text-white ml-2">{app.AreaofSite}m²</span>
              </div>
            )}
            {app.FloorArea && (
              <div>
                <span className="text-gray-400">Floor Area:</span>
                <span className="text-white ml-2">{app.FloorArea}m²</span>
              </div>
            )}
            {app.NumResidentialUnits && (
              <div>
                <span className="text-gray-400">Residential Units:</span>
                <span className="text-white ml-2">{app.NumResidentialUnits}</span>
              </div>
            )}
          </div>

          {/* Application Status */}
          {app.ApplicationStatus && (
            <div>
              <h3 className="text-white font-medium mb-1">Application Status</h3>
              <p className="text-gray-300 text-sm">{app.ApplicationStatus}</p>
            </div>
          )}

          {/* Additional Resources */}
          {app.LinkAppDetails && (
            <div className="pt-3 sm:pt-4 border-t border-gray-700">
              <div className="text-center">
                <a
                  href={app.LinkAppDetails}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors font-medium w-full sm:w-auto justify-center"
                >
                  <span>🔗 View Complete Application Details</span>
                  <span className="text-xs">↗️</span>
                </a>
                <p className="text-gray-400 text-xs mt-2">
                  Includes full documents, maps, and current status
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PlanningApplicationItem({ item, formatDate, truncateText, getDecisionColor, onApplicationSelect }: PlanningApplicationItemProps) {
  const { application } = item;

  const handleClick = (e: React.MouseEvent) => {
    // Don't trigger if clicking on the link
    if ((e.target as HTMLElement).tagName === 'A') return;

    if (application.LinkAppDetails) {
      onApplicationSelect(item);
    }
  };

  const hasFullDetails = application.LinkAppDetails && application.LinkAppDetails.trim() !== '';

  return (
    <div
      className={`bg-gray-800 rounded-lg p-3 border transition-all cursor-pointer transform hover:scale-[1.02] ${
        hasFullDetails
          ? 'border-gray-700 hover:border-blue-500 hover:bg-gray-750 hover:shadow-lg hover:shadow-blue-500/10'
          : 'border-gray-700 opacity-75 cursor-not-allowed'
      }`}
      onClick={hasFullDetails ? handleClick : undefined}
    >
      {/* Header with decision badge */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <div className="text-white text-sm font-medium truncate flex items-center gap-2">
            {application.ApplicationNumber}
            {hasFullDetails && <span className="text-blue-400 text-xs">🔗</span>}
          </div>
          <div className={`inline-block px-2 py-1 text-xs rounded mt-1 ${getDecisionColor(application.Decision || 'Pending')}`}>
            {application.Decision ? application.Decision : '⏳ Pending'}
          </div>
        </div>
        <div className="text-gray-400 text-xs ml-2 flex-shrink-0">
          {application.ReceivedDate ? formatDate(application.ReceivedDate) : 'Unknown date'}
        </div>
      </div>

      {/* Description */}
      {application.DevelopmentDescription && (
        <div className="text-gray-300 text-sm mb-2 leading-relaxed">
          {truncateText(application.DevelopmentDescription, 150)}
        </div>
      )}

      {/* Address (for non-high confidence) */}
      {item.confidence !== 'high' && application.DevelopmentAddress && (
        <div className="text-gray-400 text-xs mb-2 flex items-center gap-1">
          <span>📍</span>
          <span className="truncate">{truncateText(application.DevelopmentAddress, 50)}</span>
        </div>
      )}

      {/* Application type and click indicator */}
      <div className="flex items-center justify-between">
        <span className="text-gray-500 text-xs">
          {application.ApplicationType || 'Unknown type'}
        </span>
        {hasFullDetails ? (
          <div className="flex items-center gap-1 text-blue-400 text-xs font-medium">
            <span>📋 Click to view details</span>
          </div>
        ) : (
          <span className="text-gray-500 text-xs">No details available</span>
        )}
      </div>
    </div>
  );
}


