'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AmenitiesDetail } from '@/components/property/AmenitiesDetail';
import { DistanceDisplay } from '@/components/distance/DistanceDisplay';
import { MapPin, ArrowLeft, TrendingUp, Navigation } from 'lucide-react';
import { useSearchTracking } from '@/hooks/useSearchTracking';

function AmenitiesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Use search tracking like the working alerts
  const { trackMapSearch } = useSearchTracking();

  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState<string>('');

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

  // Trigger alert when coordinates and address are available
  useEffect(() => {
    if (coordinates && address) {
      const locationContext = {
        name: address,
        coordinates: {
          lat: coordinates.lat,
          lng: coordinates.lng,
        },
        postcode: undefined, // Could extract from address if needed
      };

      console.log('🏠 Triggering amenities page alert for:', address);
      trackMapSearch(locationContext);
    }
  }, [coordinates, address, trackMapSearch]);

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

  const handleGetDirections = (amenityLat: number, amenityLng: number, amenityName: string) => {
    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${amenityLat},${amenityLng}&destination_place_id=${encodeURIComponent(amenityName)}`;
    window.open(googleMapsUrl, '_blank');
  };

  if (!coordinates) {
    return (
      <div className="min-h-screen bg-[var(--surface)]">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-[var(--foreground)] mb-2">Location Required</h2>
            <p className="text-[var(--foreground-secondary)] mb-4">
              Please access this page from a property card to view nearby amenities.
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
      <div className="max-w-6xl mx-auto px-4 py-8">
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
              <TrendingUp className="w-8 h-8 text-green-600" />
              Nearby Amenities Analysis
            </h1>
            <p className="text-[var(--foreground-secondary)] mt-1">
              Comprehensive walkability and amenity analysis for {address}
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <AmenitiesDetail
              coordinates={coordinates}
              address={address}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Location Summary */}
            <div className="bg-[var(--background)] rounded-xl border border-[var(--border)] p-6">
              <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-500" />
                Location Summary
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
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-[var(--background)] rounded-xl border border-[var(--border)] p-6">
              <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">Quick Actions</h3>

              <div className="space-y-3">
                <button
                  onClick={() => handleGetDirections(coordinates.lat, coordinates.lng, address)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  <Navigation className="w-4 h-4" />
                  Get Directions to Property
                </button>

                <button
                  onClick={() => {
                    const googleMapsUrl = `https://www.google.com/maps/@${coordinates.lat},${coordinates.lng},15z`;
                    window.open(googleMapsUrl, '_blank');
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                >
                  <MapPin className="w-4 h-4" />
                  View in Google Maps
                </button>
              </div>
            </div>

            {/* Walkability Guide */}
            <div className="bg-[var(--background)] rounded-xl border border-[var(--border)] p-6">
              <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">Walkability Guide</h3>

              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <div className="font-medium text-[var(--foreground)]">Excellent (9-10)</div>
                    <div className="text-[var(--foreground-secondary)]">World-class walkability, daily errands on foot</div>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <div className="font-medium text-[var(--foreground)]">Good (7-8)</div>
                    <div className="text-[var(--foreground-secondary)]">Most errands can be done on foot</div>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <div className="font-medium text-[var(--foreground)]">Fair (5-6)</div>
                    <div className="text-[var(--foreground-secondary)]">Some amenities within walking distance</div>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <div className="font-medium text-[var(--foreground)]">Poor (1-4)</div>
                    <div className="text-[var(--foreground-secondary)]">Car-dependent, few walkable amenities</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AmenitiesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-600">Loading amenities...</div>
      </div>
    }>
      <AmenitiesContent />
    </Suspense>
  );
}
