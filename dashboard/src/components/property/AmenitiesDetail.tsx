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
}

export function AmenitiesDetail({ coordinates, address }: AmenitiesDetailProps) {
  const [walkabilityData, setWalkabilityData] = useState<WalkabilityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [distanceFilter, setDistanceFilter] = useState<'500' | '1000' | '2000'>('1000');

  useEffect(() => {
    const fetchAmenitiesData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Mock data - in real implementation, this would call /api/map-data
        const mockData: WalkabilityData = {
          score: 7.5,
          rating: 'Very Good',
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
            data={walkabilityData.breakdown}
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
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6">
        <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">Area Comparison</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="text-2xl font-bold text-green-600 mb-1">{walkabilityData.score}</div>
            <div className="text-sm text-[var(--foreground-secondary)]">This Location</div>
          </div>

          <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="text-2xl font-bold text-blue-600 mb-1">6.2</div>
            <div className="text-sm text-[var(--foreground-secondary)]">Area Average</div>
          </div>

          <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <div className="text-2xl font-bold text-purple-600 mb-1">68%</div>
            <div className="text-sm text-[var(--foreground-secondary)]">Better Than Area</div>
          </div>
        </div>
      </div>
    </div>
  );
}
