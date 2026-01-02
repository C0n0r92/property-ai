'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { PropertyOverview } from '@/components/property/PropertyOverview';
import { PlanningDetail } from '@/components/property/PlanningDetail';
import { AmenitiesDetail } from '@/components/property/AmenitiesDetail';
import { useSearchTracking } from '@/hooks/useSearchTracking';

export default function PropertyPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { trackMapSearch } = useSearchTracking();

  // Read query params
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  const type = searchParams.get('type') || 'sold';
  const address = searchParams.get('address') || '';
  const currentTab = searchParams.get('tab') || 'overview';

  // Trigger alert when coordinates and address are available
  useEffect(() => {
    if (lat && lng && address) {
      const locationContext = {
        name: address,
        coordinates: {
          lat: parseFloat(lat),
          lng: parseFloat(lng),
        },
        postcode: undefined, // Could extract from address if needed
      };

      console.log('🏠 Triggering property page alert for:', address);
      trackMapSearch(locationContext);
    }
  }, [lat, lng, address, trackMapSearch]);

  // Validate required params
  if (!lat || !lng) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[var(--foreground)] mb-2">Invalid Property</h1>
          <p className="text-[var(--foreground-secondary)] mb-4">
            Property coordinates are required to view details.
          </p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const coordinates = { lat: parseFloat(lat), lng: parseFloat(lng) };

  const handleTabChange = (tab: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.push(`/property?${params.toString()}`);
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '🏠' },
    { id: 'planning', label: 'Planning', icon: '🏗️' },
    { id: 'amenities', label: 'Amenities', icon: '🚶' }
  ];

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <div className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 py-4">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-2 text-sm text-[var(--foreground-muted)] mb-4">
            <a href="/" className="hover:text-[var(--foreground)] transition-colors">Home</a>
            <span>/</span>
            <a href="/tools/compare" className="hover:text-[var(--foreground)] transition-colors">Property Comparison</a>
            <span>/</span>
            <span className="text-[var(--foreground)]">{address || 'Property Details'}</span>
            {currentTab !== 'overview' && (
              <>
                <span>/</span>
                <span className="text-[var(--foreground)] capitalize">{currentTab}</span>
              </>
            )}
          </nav>

          {/* Tab Navigation */}
          <div className="flex border-b border-[var(--border)]">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${
                  currentTab === tab.id
                    ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-900/20'
                    : 'text-[var(--foreground-secondary)] hover:text-[var(--foreground)]'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {currentTab === 'overview' && (
          <PropertyOverview
            coordinates={coordinates}
            address={address}
            type={type}
            onTabChange={handleTabChange}
          />
        )}

        {currentTab === 'planning' && (
          <PlanningDetail
            coordinates={coordinates}
            address={address}
          />
        )}

        {currentTab === 'amenities' && (
          <AmenitiesDetail
            coordinates={coordinates}
            address={address}
          />
        )}
      </div>
    </div>
  );
}
