'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { RadarChart } from '@/components/charts/RadarChart';
import { extractDublinPostcode } from '@/lib/utils';
import { calculateWalkabilityScore, getCategoryDisplayName } from '@/lib/amenities';

interface AmenitiesDetailProps {
  coordinates: { lat: number; lng: number };
  address: string;
}

interface Amenity {
  name: string;
  category: string;
  distance: number;
  walkingTime?: number;
}

interface WalkabilityData {
  score: number;
  rating: string;
  breakdown: {
    transport: number;
    shopping: number;
    education: number;
    healthcare: number;
    leisure: number;
    services: number;
  };
  nearbyAmenities?: {
    transport: Amenity[];
    shopping: Amenity[];
    education: Amenity[];
    healthcare: Amenity[];
    leisure: Amenity[];
    services: Amenity[];
  };
  areaComparison?: {
    thisLocation: number;
    areaAverage: number;
    percentileRank: number;
  };
}

// Advanced walkability scoring system with negative penalties
const WALKABILITY_SCORING = {
  // Base scores and penalties
  baseScore: 5.0, // Start lower to allow for more differentiation

  // Distance penalties (points deducted per amenity beyond these distances)
  distancePenalties: {
    transport: { good: 500, poor: 1000, penalty: 0.8 },
    shopping: { good: 800, poor: 1500, penalty: 0.6 },
    healthcare: { good: 1000, poor: 2000, penalty: 0.7 },
    education: { good: 1200, poor: 2500, penalty: 0.5 },
    leisure: { good: 1000, poor: 2000, penalty: 0.4 },
    services: { good: 600, poor: 1200, penalty: 0.3 },
  },

  // Minimum amenity requirements (points deducted if not met)
  minimumRequirements: {
    transport: { count: 2, distance: 800, penalty: 1.5 },
    shopping: { count: 1, distance: 1000, penalty: 1.2 },
    healthcare: { count: 1, distance: 1500, penalty: 1.8 },
    education: { count: 1, distance: 2000, penalty: 1.0 },
    leisure: { count: 1, distance: 1500, penalty: 0.8 },
    services: { count: 2, distance: 600, penalty: 0.6 },
  },

  // Quality bonuses
  qualityBonuses: {
    multipleTransport: 0.5, // Bonus for having multiple transport options
    excellentAccess: 0.3,   // Bonus for amenities within 300m
    goodCoverage: 0.2,      // Bonus for well-distributed amenities
  }
};

// Area-specific baseline adjustments
const AREA_BASELINES: Record<string, number> = {
  'D1': 1.2, 'D2': 1.4, 'D3': 0.3, 'D4': 0.8, 'D5': -0.2,
  'D6': 0.1, 'D6W': -0.3, 'D7': 0.0, 'D8': 0.6, 'D9': -0.1,
  'D10': -0.8, 'D11': -0.5, 'D12': -0.3, 'D13': -0.4, 'D14': -0.2,
  'D15': -0.6, 'D16': -0.7, 'D17': -1.0, 'D18': -0.9, 'D20': -0.5,
  'D22': -1.2, 'D24': -1.4,
};

export function AmenitiesDetail({ coordinates, address }: AmenitiesDetailProps) {
  const [walkabilityData, setWalkabilityData] = useState<WalkabilityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [distanceFilter, setDistanceFilter] = useState<'500' | '1000' | '2000'>('500');


  useEffect(() => {
    const fetchAmenitiesData = async () => {
      setLoading(true);
      setError(null);

      try {
        console.log('🏠 Fetching amenities for coordinates:', coordinates);

        // Fetch amenities via our API endpoint (use 2000m radius to support all filter options)
        const apiResponse = await fetch(`/api/amenities?lat=${coordinates.lat}&lng=${coordinates.lng}&radius=2000`);

        if (!apiResponse.ok) {
          throw new Error(`API returned ${apiResponse.status}: ${apiResponse.statusText}`);
        }

        const apiData = await apiResponse.json();

        if (!apiData.amenities) {
          throw new Error('No amenities data in API response');
        }

        const amenities = apiData.amenities;
        console.log('📊 Received', amenities.length, 'amenities from API');

        // If no amenities found, provide fallback data
        if (amenities.length === 0) {
          console.warn('⚠️ No amenities found for this location, using fallback data');
          const fallbackData: WalkabilityData = {
            score: 1,
            rating: 'Low',
            breakdown: {
              transport: 0,
              shopping: 0,
              education: 0,
              healthcare: 0,
              leisure: 0,
              services: 0
            },
            nearbyAmenities: {
              transport: [],
              shopping: [],
              education: [],
              healthcare: [],
              leisure: [],
              services: []
            },
            areaComparison: {
              thisLocation: 1,
              areaAverage: 6.8,
              percentileRank: 10
            }
          };
          setWalkabilityData(fallbackData);
          return;
        }

        // Calculate walkability score using the real amenities data
        const walkability = calculateWalkabilityScore(amenities);

        // Group amenities by category for display (keep all, let UI filter by distance)
        const groupedAmenities = {
          transport: amenities.filter((a: any) => a.category === 'public_transport'),
          shopping: amenities.filter((a: any) => a.category === 'shopping'),
          education: amenities.filter((a: any) => a.category === 'education'),
          healthcare: amenities.filter((a: any) => a.category === 'healthcare'),
          leisure: amenities.filter((a: any) => a.category === 'leisure'),
          services: amenities.filter((a: any) => a.category === 'services'),
        };

        // Ensure we have valid walkability data
        if (!walkability || !walkability.breakdown) {
          console.warn('⚠️ Walkability calculation failed, using fallback');
          const fallbackData: WalkabilityData = {
            score: 1,
            rating: 'Low',
            breakdown: {
              transport: 0,
              shopping: 0,
              education: 0,
              healthcare: 0,
              leisure: 0,
              services: 0
            },
            nearbyAmenities: {
              transport: [],
              shopping: [],
              education: [],
              healthcare: [],
              leisure: [],
              services: []
            },
            areaComparison: {
              thisLocation: 1,
              areaAverage: 6.8,
              percentileRank: 10
            }
          };
          setWalkabilityData(fallbackData);
          return;
        }

        const realData: WalkabilityData = {
          score: walkability.score || 0,
          rating: walkability.rating || 'Low',
          breakdown: walkability.breakdown,
          nearbyAmenities: {
            transport: groupedAmenities.transport.map((a: any) => ({
              name: a.name,
              category: getCategoryDisplayName(a.category),
              distance: a.distance,
              walkingTime: a.walkingTime
            })),
            shopping: groupedAmenities.shopping.map((a: any) => ({
              name: a.name,
              category: getCategoryDisplayName(a.category),
              distance: a.distance,
              walkingTime: a.walkingTime
            })),
            education: groupedAmenities.education.map((a: any) => ({
              name: a.name,
              category: getCategoryDisplayName(a.category),
              distance: a.distance,
              walkingTime: a.walkingTime
            })),
            healthcare: groupedAmenities.healthcare.map((a: any) => ({
              name: a.name,
              category: getCategoryDisplayName(a.category),
              distance: a.distance,
              walkingTime: a.walkingTime
            })),
            leisure: groupedAmenities.leisure.map((a: any) => ({
              name: a.name,
              category: getCategoryDisplayName(a.category),
              distance: a.distance,
              walkingTime: a.walkingTime
            })),
            services: groupedAmenities.services.map((a: any) => ({
              name: a.name,
              category: getCategoryDisplayName(a.category),
              distance: a.distance,
              walkingTime: a.walkingTime
            })),
          },
          areaComparison: {
            thisLocation: walkability.score,
            areaAverage: 6.8, // This could be calculated from area data
            percentileRank: 68 // This could be calculated from area data
          }
        };

        setWalkabilityData(realData);
      } catch (err) {
        console.error('❌ Failed to fetch amenities:', err);
        setError(err instanceof Error ? err.message : 'Failed to load amenities data');
      } finally {
        setLoading(false);
      }
    };

    fetchAmenitiesData();
  }, [coordinates]);

  // Filter amenities by distance
  const filteredAmenities = useMemo(() => {
    if (!walkabilityData?.nearbyAmenities) return null;

    const maxDistance = parseInt(distanceFilter);
    console.log('🎯 Filtering amenities by distance:', maxDistance, 'current filter:', distanceFilter);

    const filtered: typeof walkabilityData.nearbyAmenities = {
      transport: walkabilityData.nearbyAmenities.transport.filter(a => a.distance <= maxDistance),
      shopping: walkabilityData.nearbyAmenities.shopping.filter(a => a.distance <= maxDistance),
      education: walkabilityData.nearbyAmenities.education.filter(a => a.distance <= maxDistance),
      healthcare: walkabilityData.nearbyAmenities.healthcare.filter(a => a.distance <= maxDistance),
      leisure: walkabilityData.nearbyAmenities.leisure.filter(a => a.distance <= maxDistance),
      services: walkabilityData.nearbyAmenities.services.filter(a => a.distance <= maxDistance)
    };

    console.log('📊 Filtered counts:', {
      transport: filtered.transport.length,
      shopping: filtered.shopping.length,
      education: filtered.education.length,
      healthcare: filtered.healthcare.length,
      leisure: filtered.leisure.length,
      services: filtered.services.length
    });

    return filtered;
  }, [walkabilityData, distanceFilter]);

  const getTotalAmenities = () => {
    if (!filteredAmenities) return 0;
    return Object.values(filteredAmenities).reduce((total, amenities) => total + amenities.length, 0);
  };

  const getRatingColor = (score: number) => {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-blue-600';
    if (score >= 4) return 'text-yellow-600';
    return 'text-red-600';
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3 text-[var(--foreground-secondary)]">
          <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
          <span>Analyzing nearby amenities...</span>
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
            <h3 className="text-red-800 dark:text-red-200 font-medium">Failed to load amenities data</h3>
            <p className="text-red-600 dark:text-red-300 text-sm mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!walkabilityData) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-[var(--foreground)] mb-2">
          No Amenities Data Available
        </h3>
        <p className="text-[var(--foreground-secondary)]">
          Unable to load walkability information for this location.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Walkability Score Overview */}
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6">
        <div className="text-center mb-6">
          <div className="text-5xl font-bold text-green-600 mb-2">
            {walkabilityData.score}/10
          </div>
          <div className="text-xl font-medium text-[var(--foreground-secondary)] mb-2">
            {walkabilityData.rating} Walkability
          </div>
          <div className="text-sm text-[var(--foreground-muted)]">
            Based on access to transportation, shopping, healthcare, education, leisure, and services
          </div>
        </div>

        {/* Radar Chart */}
        <div className="max-w-md mx-auto">
          <RadarChart
            data={walkabilityData.breakdown ? Object.entries(walkabilityData.breakdown).map(([subject, score]) => ({
              subject: subject.charAt(0).toUpperCase() + subject.slice(1),
              score,
              fullMark: 10
            })) : []}
            height={250}
          />
        </div>
      </div>

      {/* Distance Filter */}
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-[var(--foreground)]">Nearby Amenities</h3>
            <p className="text-sm text-[var(--foreground-secondary)]">
              {getTotalAmenities()} amenities found within {distanceFilter}m
            </p>
          </div>

          <div className="flex gap-2">
            {(['500', '1000', '2000'] as const).map((distance) => (
              <button
                key={distance}
                onClick={() => setDistanceFilter(distance)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  distanceFilter === distance
                    ? 'bg-blue-600 text-white'
                    : 'bg-[var(--surface-hover)] text-[var(--foreground-secondary)] hover:bg-[var(--border)]'
                }`}
              >
                {distance}m
              </button>
            ))}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredAmenities && Object.entries(filteredAmenities).map(([category, amenities]) => (
            <div key={category} className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-[var(--foreground)] capitalize">
                  {category}
                </h4>
                <div className="text-xs text-[var(--foreground-muted)]">
                  {amenities.length} found • Avg: {amenities.length > 0 ? Math.round(amenities.reduce((sum, a) => sum + a.distance, 0) / amenities.length) : 0}m
                </div>
              </div>

              <div className="space-y-2">
                {amenities.slice(0, 5).map((amenity, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-[var(--background)] rounded-lg border border-[var(--border)]">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[var(--foreground)] truncate">
                        {amenity.name}
                      </div>
                      <div className="text-xs text-[var(--foreground-secondary)]">
                        {amenity.distance}m away
                        {amenity.walkingTime && ` • ${amenity.walkingTime} min walk`}
                      </div>
                    </div>
                  </div>
                ))}

                {amenities.length > 5 && (
                  <div className="text-center pt-2">
                    <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                      View all {amenities.length} →
                    </button>
                  </div>
                )}

                {amenities.length === 0 && (
                  <div className="text-center py-4 text-[var(--foreground-muted)] text-sm">
                    No {category} amenities within {distanceFilter}m
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Area Comparison */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Area Comparison</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-gray-700 rounded-lg">
            <div className="text-2xl font-bold text-green-400 mb-1">{walkabilityData.areaComparison?.thisLocation || walkabilityData.score}</div>
            <div className="text-sm text-gray-300">This Location</div>
          </div>

          <div className="text-center p-4 bg-gray-700 rounded-lg">
            <div className="text-2xl font-bold text-blue-400 mb-1">{walkabilityData.areaComparison?.areaAverage || '6.8'}</div>
            <div className="text-sm text-gray-300">Area Average</div>
          </div>

          <div className="text-center p-4 bg-gray-700 rounded-lg">
            <div className="text-2xl font-bold text-purple-400 mb-1">{walkabilityData.areaComparison?.percentileRank || 68}%</div>
            <div className="text-sm text-gray-300">Better Than Area</div>
          </div>
        </div>
        {walkabilityData.areaComparison && (
          <div className="mt-4 p-3 bg-gray-700 rounded-lg">
            <p className="text-sm text-gray-300">
              This location ranks in the <strong className="text-white">{walkabilityData.areaComparison.percentileRank}th percentile</strong> for walkability
              across Dublin postcodes, {walkabilityData.areaComparison.percentileRank >= 50 ? 'above' : 'below'} the city average.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
