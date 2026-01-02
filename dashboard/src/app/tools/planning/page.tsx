'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AddressSearchBar } from '@/components/tools/AddressSearchBar';
import { ResultsHeader } from '@/components/tools/ResultsHeader';
import { PlanningAnalysisContent } from '@/components/tools/PlanningAnalysisContent';

import { PlanningAnalysisContent } from '@/components/tools/PlanningAnalysisContent';

export default function PlanningToolPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Check if we have coordinates (results mode) or not (search mode)
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  const address = searchParams.get('address') || '';

  const hasCoordinates = lat && lng;

  const handleLocationFound = (newLat: number, newLng: number, newAddress: string) => {
    // Navigate to results mode
    router.push(`/tools/planning?lat=${newLat}&lng=${newLng}&address=${encodeURIComponent(newAddress)}`);
  };

  const handleNewSearch = () => {
    // Navigate back to search mode
    router.push('/tools/planning');
  };

  if (hasCoordinates) {
    // Results mode - show planning analysis
    return (
      <div className="min-h-screen bg-[var(--background)]">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <ResultsHeader
            address={address}
            coordinates={{ lat: parseFloat(lat), lng: parseFloat(lng) }}
            onNewSearch={handleNewSearch}
            toolName="planning"
            toolTitle="Planning Permission Analysis"
          />

          <PlanningAnalysisContent
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
          <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>

          <h1 className="text-4xl font-bold text-[var(--foreground)] mb-4">
            Planning Permission Analysis
          </h1>

          <p className="text-xl text-[var(--foreground-secondary)] mb-8 max-w-2xl mx-auto">
            Discover planning applications and development activity near any Dublin address.
            Get insights into recent approvals, trends, and what it means for property values.
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-12">
          <AddressSearchBar
            onLocationFound={handleLocationFound}
            placeholder="Enter a Dublin address to analyze planning permissions..."
            className="max-w-2xl mx-auto"
          />
        </div>

        {/* Features Section */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="text-center">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
              Approval Rates
            </h3>
            <p className="text-[var(--foreground-secondary)]">
              See historical approval rates and trends for planning applications in the area.
            </p>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 4v10m0 0l-2-2m2 2l2-2m6-6v6m0 0l2 2m-2-2l-2 2" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
              Development Timeline
            </h3>
            <p className="text-[var(--foreground-secondary)]">
              Interactive timeline showing when planning applications were submitted and decided.
            </p>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
              Area Insights
            </h3>
            <p className="text-[var(--foreground-secondary)]">
              Understand how planning activity affects property values and market trends.
            </p>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center">
          <p className="text-[var(--foreground-secondary)] mb-4">
            Want to analyze a specific property's planning history?
          </p>
          <p className="text-sm text-[var(--foreground-muted)]">
            Try searching for addresses like "123 Main Street, Dublin 4" or "45 Grafton Street, Dublin 2"
          </p>
        </div>
      </div>
    </div>
  );
}
