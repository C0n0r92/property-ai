'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { RadarChart } from '@/components/charts/RadarChart';

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
  const [distanceFilter, setDistanceFilter] = useState<'500' | '1000' | '2000'>('1000');

  // Extract Dublin postcode from address
  const extractDublinPostcode = (address: string): string | null => {
    // Look for patterns like "Dublin 4", "D4", "Dublin 6W", etc.
    const dublinMatch = address.match(/Dublin\s+(\d+[A-Z]*)/i) || address.match(/D(\d+[A-Z]*)/i);
    if (dublinMatch) {
      const code = dublinMatch[1].toUpperCase();
      return code.startsWith('D') ? code : `D${code}`;
    }
    return null;
  };

  // Advanced walkability scoring algorithm
  const calculateWalkabilityScore = (amenities: any, postcode: string | null): number => {
    let score = WALKABILITY_SCORING.baseScore;

    // Apply area baseline adjustment
    if (postcode && AREA_BASELINES[postcode]) {
      score += AREA_BASELINES[postcode];
    }

    // Check minimum requirements and apply penalties
    Object.entries(WALKABILITY_SCORING.minimumRequirements).forEach(([category, req]) => {
      const categoryAmenities = amenities[category] || [];
      const nearbyCount = categoryAmenities.filter((a: any) => a.distance <= req.distance).length;

      if (nearbyCount < req.count) {
        score -= req.penalty * (req.count - nearbyCount);
      }
    });

    // Score based on distance and quality
    Object.entries(WALKABILITY_SCORING.distancePenalties).forEach(([category, config]) => {
      const categoryAmenities = amenities[category] || [];

      categoryAmenities.forEach((amenity: any) => {
        if (amenity.distance <= config.good) {
          // Excellent access - add points
          score += 0.3;
        } else if (amenity.distance <= config.poor) {
          // Acceptable access - small bonus
          score += 0.1;
        } else {
          // Poor access - penalty
          score -= config.penalty;
        }
      });

      // Bonus for multiple amenities in category
      if (categoryAmenities.length >= 3) {
        score += WALKABILITY_SCORING.qualityBonuses.multipleTransport;
      }
    });

    // Check for excellent overall access (< 300m for key amenities)
    const excellentAccess = ['transport', 'shopping', 'services'].every(category => {
      const categoryAmenities = amenities[category] || [];
      return categoryAmenities.some((a: any) => a.distance <= 300);
    });

    if (excellentAccess) {
      score += WALKABILITY_SCORING.qualityBonuses.excellentAccess;
    }

    // Ensure score stays within reasonable bounds
    return Math.max(1, Math.min(10, Math.round(score * 10) / 10));
  };

  useEffect(() => {
    const fetchAmenitiesData = async () => {
      setLoading(true);
      setError(null);

      try {
        const postcode = extractDublinPostcode(address);

        // Mock amenities data for scoring - varies based on location
        // In production, this would come from the actual API based on coordinates
        const mockAmenitiesData = {
          transport: [
            { name: 'Tara Street DART Station', category: 'Transport', distance: Math.random() * 800 + 200, walkingTime: 6 },
            { name: 'O\'Connell Street Bus Stop', category: 'Transport', distance: Math.random() * 600 + 100, walkingTime: 3 },
            { name: 'Abbey Street Luas Stop', category: 'Transport', distance: Math.random() * 700 + 150, walkingTime: 5 }
          ],
          shopping: [
            { name: 'Tesco Express', category: 'Shopping', distance: Math.random() * 1000 + 200, walkingTime: 4 },
            { name: 'Jervis Centre', category: 'Shopping', distance: Math.random() * 800 + 400, walkingTime: 8 }
          ],
          education: [
            { name: 'Dublin Institute of Technology', category: 'Education', distance: Math.random() * 2000 + 800, walkingTime: 15 },
            { name: 'St. Andrew\'s Resource Centre', category: 'Education', distance: Math.random() * 1500 + 300, walkingTime: 7 }
          ],
          healthcare: [
            { name: 'St. James\'s Hospital', category: 'Healthcare', distance: Math.random() * 2500 + 1000, walkingTime: 19 },
            { name: 'Tara Street Pharmacy', category: 'Healthcare', distance: Math.random() * 800 + 100, walkingTime: 3 }
          ],
          leisure: [
            { name: 'The Spire', category: 'Leisure', distance: Math.random() * 1200 + 200, walkingTime: 5 },
            { name: 'Dublin Castle', category: 'Leisure', distance: Math.random() * 1500 + 500, walkingTime: 12 }
          ],
          services: [
            { name: 'Central Bank', category: 'Services', distance: Math.random() * 1000 + 300, walkingTime: 8 },
            { name: 'Dublin City Council', category: 'Services', distance: Math.random() * 1200 + 400, walkingTime: 10 },
            { name: 'An Post', category: 'Services', distance: Math.random() * 600 + 100, walkingTime: 4 }
          ]
        };

        // Calculate dynamic walkability score using advanced algorithm
        const dynamicScore = calculateWalkabilityScore(mockAmenitiesData, postcode);

        // Calculate area comparison metrics using area baselines
        const areaAverage = postcode ? (WALKABILITY_SCORING.baseScore + (AREA_BASELINES[postcode] || 0)) : WALKABILITY_SCORING.baseScore;
        const allAreaScores = Object.values(AREA_BASELINES).map(baseline => WALKABILITY_SCORING.baseScore + baseline);
        const percentileRank = Math.round((allAreaScores.filter(score => score <= dynamicScore).length / allAreaScores.length) * 100);

        const mockData: WalkabilityData = {
          score: Math.round(dynamicScore * 10) / 10, // Round to 1 decimal
          rating: dynamicScore >= 8.0 ? 'Excellent' :
                  dynamicScore >= 7.0 ? 'Very Good' :
                  dynamicScore >= 6.0 ? 'Good' :
                  dynamicScore >= 4.5 ? 'Fair' :
                  dynamicScore >= 3.0 ? 'Poor' : 'Very Limited',
          breakdown: {
            transport: 8,
            shopping: 7,
            education: 6,
            healthcare: 8,
            leisure: 7,
            services: 9
          },
          nearbyAmenities: {
            transport: [
              { name: 'Tara Street DART Station', category: 'Transport', distance: 450, walkingTime: 6 },
              { name: 'O\'Connell Street Bus Stop', category: 'Transport', distance: 200, walkingTime: 3 },
              { name: 'Abbey Street Luas Stop', category: 'Transport', distance: 350, walkingTime: 5 }
            ],
            shopping: [
              { name: 'Tesco Express', category: 'Shopping', distance: 300, walkingTime: 4 },
              { name: 'Jervis Centre', category: 'Shopping', distance: 600, walkingTime: 8 },
              { name: 'Marks & Spencer', category: 'Shopping', distance: 800, walkingTime: 10 }
            ],
            education: [
              { name: 'Dublin Institute of Technology', category: 'Education', distance: 1200, walkingTime: 15 },
              { name: 'St. Andrew\'s Resource Centre', category: 'Education', distance: 500, walkingTime: 7 }
            ],
            healthcare: [
              { name: 'St. James\'s Hospital', category: 'Healthcare', distance: 1500, walkingTime: 19 },
              { name: 'Mater Misericordiae Hospital', category: 'Healthcare', distance: 1800, walkingTime: 23 },
              { name: 'Tara Street Pharmacy', category: 'Healthcare', distance: 250, walkingTime: 3 }
            ],
            leisure: [
              { name: 'The Spire', category: 'Leisure', distance: 400, walkingTime: 5 },
              { name: 'Dublin Castle', category: 'Leisure', distance: 900, walkingTime: 12 },
              { name: 'Phoenix Park', category: 'Leisure', distance: 2000, walkingTime: 25 }
            ],
            services: [
              { name: 'Central Bank', category: 'Services', distance: 600, walkingTime: 8 },
              { name: 'Dublin City Council', category: 'Services', distance: 800, walkingTime: 10 },
              { name: 'An Post', category: 'Services', distance: 300, walkingTime: 4 }
            ]
          },
          areaComparison: {
            thisLocation: Math.round(dynamicScore * 10) / 10,
            areaAverage: Math.round(areaAverage * 10) / 10,
            percentileRank
          }
        };

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        setWalkabilityData(mockData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load amenities data');
      } finally {
        setLoading(false);
      }
    };

    fetchAmenitiesData();
  }, [coordinates, address]);

  // Filter amenities by distance
  const filteredAmenities = useMemo(() => {
    if (!walkabilityData?.nearbyAmenities) return null;

    const maxDistance = parseInt(distanceFilter);
    const filtered: typeof walkabilityData.nearbyAmenities = {
      transport: walkabilityData.nearbyAmenities.transport.filter(a => a.distance <= maxDistance),
      shopping: walkabilityData.nearbyAmenities.shopping.filter(a => a.distance <= maxDistance),
      education: walkabilityData.nearbyAmenities.education.filter(a => a.distance <= maxDistance),
      healthcare: walkabilityData.nearbyAmenities.healthcare.filter(a => a.distance <= maxDistance),
      leisure: walkabilityData.nearbyAmenities.leisure.filter(a => a.distance <= maxDistance),
      services: walkabilityData.nearbyAmenities.services.filter(a => a.distance <= maxDistance)
    };

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
            data={Object.entries(walkabilityData.breakdown).map(([subject, score]) => ({
              subject: subject.charAt(0).toUpperCase() + subject.slice(1),
              score,
              fullMark: 10
            }))}
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
                  {category} ({amenities.length})
                </h4>
                <div className="flex items-center gap-2">
                  <div className={`text-sm font-medium ${getRatingColor(walkabilityData.breakdown[category as keyof typeof walkabilityData.breakdown])}`}>
                    {walkabilityData.breakdown[category as keyof typeof walkabilityData.breakdown]}/10
                  </div>
                  <div className="text-xs text-[var(--foreground-muted)]">
                    Avg: {amenities.length > 0 ? Math.round(amenities.reduce((sum, a) => sum + a.distance, 0) / amenities.length) : 0}m
                  </div>
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
