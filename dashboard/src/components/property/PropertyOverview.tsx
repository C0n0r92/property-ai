'use client';

import React, { useState, useEffect } from 'react';
import { formatFullPrice } from '@/lib/format';

interface PropertyOverviewProps {
  coordinates: { lat: number; lng: number };
  address: string;
  type: string;
  onTabChange: (tab: string) => void;
}

interface PropertyData {
  address: string;
  soldPrice?: number;
  askingPrice?: number;
  beds?: number;
  baths?: number;
  areaSqm?: number;
  propertyType?: string;
  enrichment?: {
    marketPosition?: string;
    marketPositionPct?: number;
    walkability?: {
      score: number;
    };
    planning?: {
      nearbyCount: number;
    };
    mortgage?: {
      monthly: number;
      downPayment: number;
    };
  };
  mapImageUrl?: string;
}

export function PropertyOverview({ coordinates, address, type, onTabChange }: PropertyOverviewProps) {
  const [propertyData, setPropertyData] = useState<PropertyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPropertyData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Create a mock property for demo - in real implementation this would call /api/comparison
        const mockProperty: PropertyData = {
          address: address || '123 Main Street, Dublin 4',
          soldPrice: type === 'sold' ? 450000 : undefined,
          askingPrice: type === 'listing' ? 475000 : undefined,
          beds: 3,
          baths: 2,
          areaSqm: 120,
          propertyType: 'Semi-Detached',
          enrichment: {
            marketPosition: 'below',
            marketPositionPct: 2.5,
            walkability: {
              score: 7.5
            },
            planning: {
              nearbyCount: 5
            },
            mortgage: {
              monthly: 1850,
              downPayment: 90000
            }
          },
          mapImageUrl: `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${coordinates.lng},${coordinates.lat},15,0/400x200?access_token=pk.eyJ1IjoiY29ub3JtY2xvdWdobGluIiwiYSI6ImNtNHY3Z2p6ZjBpd3AycXB1dWozbzN3Z3QifQ.9fQwGmJ8YxH2Yv8K0W0Z0Q`
        };

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        setPropertyData(mockProperty);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load property data');
      } finally {
        setLoading(false);
      }
    };

    fetchPropertyData();
  }, [coordinates, address, type]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3 text-[var(--foreground-secondary)]">
          <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
          <span>Loading property details...</span>
        </div>
      </div>
    );
  }

  if (error || !propertyData) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-[var(--foreground)] mb-2">Failed to Load Property</h2>
        <p className="text-[var(--foreground-secondary)]">{error}</p>
      </div>
    );
  }

  const price = propertyData.soldPrice || propertyData.askingPrice || 0;
  const priceLabel = type === 'sold' ? 'Sold Price' : type === 'listing' ? 'Asking Price' : 'Monthly Rent';

  return (
    <div className="space-y-8">
      {/* Property Header */}
      <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          {/* Property Info */}
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-[var(--foreground)] mb-2">
              {propertyData.address}
            </h1>

            <div className="flex items-center gap-3 mb-4">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                type === 'sold' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                type === 'listing' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
              }`}>
                {type === 'sold' ? 'Sold' : type === 'listing' ? 'For Sale' : 'For Rent'}
              </span>

              <span className="text-sm text-[var(--foreground-secondary)]">
                {propertyData.propertyType}
              </span>
            </div>

            {/* Price */}
            <div className="mb-4">
              <div className="text-3xl font-bold text-[var(--foreground)] mb-1">
                {formatFullPrice(price)}
              </div>
              <div className="text-sm text-[var(--foreground-secondary)]">{priceLabel}</div>
            </div>
          </div>

          {/* Property Image */}
          <div className="lg:w-80">
            <img
              src={propertyData.mapImageUrl}
              alt={`Map view of ${propertyData.address}`}
              className="w-full h-48 object-cover rounded-lg border border-[var(--border)]"
            />
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4 text-center">
          <div className="text-2xl font-bold text-[var(--foreground)] mb-1">
            {propertyData.beds || 'N/A'}
          </div>
          <div className="text-sm text-[var(--foreground-secondary)]">Bedrooms</div>
        </div>

        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4 text-center">
          <div className="text-2xl font-bold text-[var(--foreground)] mb-1">
            {propertyData.baths || 'N/A'}
          </div>
          <div className="text-sm text-[var(--foreground-secondary)]">Bathrooms</div>
        </div>

        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4 text-center">
          <div className="text-2xl font-bold text-[var(--foreground)] mb-1">
            {propertyData.areaSqm ? `${propertyData.areaSqm}m²` : 'N/A'}
          </div>
          <div className="text-sm text-[var(--foreground-secondary)]">Size</div>
        </div>

        <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4 text-center">
          <div className="text-2xl font-bold text-[var(--foreground)] mb-1">
            {propertyData.enrichment?.walkability?.score || 'N/A'}
          </div>
          <div className="text-sm text-[var(--foreground-secondary)]">Walkability</div>
        </div>
      </div>

      {/* Market Position & Mortgage */}
      <div className="grid lg:grid-cols-2 gap-6">
        {propertyData.enrichment?.marketPosition && (
          <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6">
            <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">Market Position</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[var(--foreground-secondary)]">vs Similar Properties</span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  propertyData.enrichment.marketPosition === 'below'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                    : propertyData.enrichment.marketPosition === 'above'
                    ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                }`}>
                  {propertyData.enrichment.marketPosition === 'below' ? 'Below Market' :
                   propertyData.enrichment.marketPosition === 'above' ? 'Above Market' : 'At Market'}
                  {propertyData.enrichment.marketPositionPct &&
                    ` (${Math.abs(propertyData.enrichment.marketPositionPct)}%)`}
                </span>
              </div>
            </div>
          </div>
        )}

        {propertyData.enrichment?.mortgage && (
          <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6">
            <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">Mortgage Estimate</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[var(--foreground-secondary)]">Monthly Payment</span>
                <span className="text-lg font-bold text-[var(--foreground)]">
                  €{propertyData.enrichment.mortgage.monthly.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[var(--foreground-secondary)]">Down Payment (20%)</span>
                <span className="text-sm font-medium text-[var(--foreground)]">
                  €{propertyData.enrichment.mortgage.downPayment.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Quick Access Cards */}
      <div className="grid lg:grid-cols-2 gap-6">
        {propertyData.enrichment?.planning?.nearbyCount > 0 && (
          <div
            className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6 cursor-pointer hover:bg-[var(--surface-hover)] transition-colors"
            onClick={() => onTabChange('planning')}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
                  🏗️ Planning Applications
                </h3>
                <p className="text-[var(--foreground-secondary)]">
                  {propertyData.enrichment.planning.nearbyCount} planning application{propertyData.enrichment.planning.nearbyCount !== 1 ? 's' : ''} nearby
                </p>
              </div>
              <div className="text-2xl">→</div>
            </div>
          </div>
        )}

        {propertyData.enrichment?.walkability && (
          <div
            className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6 cursor-pointer hover:bg-[var(--surface-hover)] transition-colors"
            onClick={() => onTabChange('amenities')}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
                  🚶 Nearby Amenities
                </h3>
                <p className="text-[var(--foreground-secondary)]">
                  Walkability score: {propertyData.enrichment.walkability.score}/10
                </p>
              </div>
              <div className="text-2xl">→</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
