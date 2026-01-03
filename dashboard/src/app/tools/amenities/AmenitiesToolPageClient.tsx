'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AddressSearchBar } from '@/components/tools/AddressSearchBar';
import { ResultsHeader } from '@/components/tools/ResultsHeader';
import { AmenitiesAnalysisContent } from '@/components/tools/AmenitiesAnalysisContent';
import { useSearchTracking } from '@/hooks/useSearchTracking';

export default function AmenitiesToolPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { trackMapSearch } = useSearchTracking();

  // Check if we have coordinates (results mode) or not (search mode)
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  const address = searchParams.get('address') || '';

  const hasCoordinates = lat && lng;

  // Trigger alert when coordinates are available (results mode)
  useEffect(() => {
    if (hasCoordinates && lat && lng && address) {
      const locationContext = {
        name: address,
        coordinates: {
          lat: parseFloat(lat),
          lng: parseFloat(lng),
        },
        postcode: undefined, // Could extract from address if needed
      };

      console.log('🏠 Triggering amenities tool page alert for:', address);
      trackMapSearch(locationContext);
    }
  }, [hasCoordinates, lat, lng, address, trackMapSearch]);

  const handleLocationFound = (newLat: number, newLng: number, newAddress: string) => {
    // Navigate to results mode
    router.push(`/tools/amenities?lat=${newLat}&lng=${newLng}&address=${encodeURIComponent(newAddress)}`);
  };

  const handleLocationTracked = (lat: number, lng: number, address: string) => {
    // Track search for alert modal
    trackMapSearch({
      name: address,
      coordinates: { lat, lng },
    });
  };

  const handleNewSearch = () => {
    // Navigate back to search mode
    router.push('/tools/amenities');
  };

  if (hasCoordinates) {
    // Results mode - show amenities analysis
    return (
      <div className="min-h-screen bg-[var(--background)]">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <ResultsHeader
            address={address}
            coordinates={{ lat: parseFloat(lat), lng: parseFloat(lng) }}
            score={7.5} // Will be calculated from API later
            onNewSearch={handleNewSearch}
            toolName="amenities"
            toolTitle="Walkability & Amenities Analysis"
          />

          <AmenitiesAnalysisContent
            latitude={parseFloat(lat)}
            longitude={parseFloat(lng)}
            address={address}
          />
        </div>
      </div>
    );
  }

  // Search mode - show search interface
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="max-w-4xl mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>

          <h1 className="text-4xl font-bold text-[var(--foreground)] mb-4">
            Walkability & Amenities Analysis
          </h1>

          <p className="text-xl text-[var(--foreground-secondary)] mb-8 max-w-2xl mx-auto">
            Discover what's nearby any Dublin address. Get detailed insights into walkability,
            transportation, shopping, healthcare, education, and leisure facilities.
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-12">
          <AddressSearchBar
            onLocationFound={handleLocationFound}
            onLocationTracked={handleLocationTracked}
            placeholder="Enter a Dublin address to analyze nearby amenities..."
            className="max-w-2xl mx-auto"
          />
        </div>

        {/* Features Section */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
              Walkability Score
            </h3>
            <p className="text-[var(--foreground-secondary)]">
              Comprehensive score from 0-10 based on access to transportation, shopping, and services.
            </p>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
              Category Breakdown
            </h3>
            <p className="text-[var(--foreground-secondary)]">
              Detailed analysis across 6 categories: Transport, Education, Healthcare, Shopping, Leisure, Services.
            </p>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
              Interactive Map
            </h3>
            <p className="text-[var(--foreground-secondary)]">
              Visual map showing all nearby amenities with distance indicators and walking times.
            </p>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center">
          <p className="text-[var(--foreground-secondary)] mb-4">
            Want to know how walkable an area is before you visit?
          </p>
          <p className="text-sm text-[var(--foreground-muted)]">
            Try searching for addresses like "123 Main Street, Dublin 4" or "45 Grafton Street, Dublin 2"
          </p>
        </div>
      </div>
    </div>
  );
}
