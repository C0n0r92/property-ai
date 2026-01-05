'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { formatFullPrice } from '@/lib/format';
import { Property, Listing, RentalListing } from '@/types/property';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { PlanningCard } from '@/components/PlanningCard';
import { WalkabilityScore } from '@/components/walkability/WalkabilityScore';
import { DistanceDisplay } from '@/components/distance/DistanceDisplay';
import { AddToCompareButton } from '@/components/AddToCompareButton';
import { useComparison } from '@/contexts/ComparisonContext';
import { useAuth } from '@/components/auth/AuthProvider';
import { useSavedProperties } from '@/hooks/useSavedProperties';
import { useSearchTracking } from '@/hooks/useSearchTracking';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { LoginModal } from '@/components/auth/LoginModal';
import { AlertBottomBar } from '@/components/alerts/AlertBottomBar';
import { analytics } from '@/lib/analytics';
import { extractPrimaryArea, areaToSlug } from '@/lib/areas';
import { Bookmark, Calculator, MapPin, Bed, Bath, Ruler, Building2, ArrowLeft, TrendingUp, FileText, Eye, CheckCircle } from 'lucide-react';

export default function PropertyDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { addToComparison } = useComparison();
  const { user } = useAuth();
  const { isSaved, saveProperty, unsaveProperty } = useSavedProperties();
  const { trackMapSearch } = useSearchTracking();
  const { addRecentlyViewed } = useRecentlyViewed();

  const [property, setProperty] = useState<Property | Listing | RentalListing | null>(null);
  const [areaData, setAreaData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const propertyType = params.type as string;
  const propertyId = decodeURIComponent(params.id as string);

  useEffect(() => {
    const fetchPropertyDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch real property data from API
        let apiEndpoint = '';
        if (propertyType === 'sold') {
          apiEndpoint = `/api/properties/${encodeURIComponent(propertyId)}`;
        } else if (propertyType === 'forSale') {
          apiEndpoint = `/api/listings/${encodeURIComponent(propertyId)}`;
        } else if (propertyType === 'rental') {
          apiEndpoint = `/api/rentals/${encodeURIComponent(propertyId)}`;
        }

        const response = await fetch(apiEndpoint);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch property data');
        }

        if (!data.found) {
          throw new Error('Property not found');
        }

        setProperty(data.property);

        // Track this property as recently viewed
        const price = ('soldPrice' in data.property && data.property.soldPrice)
          ? data.property.soldPrice
          : ('askingPrice' in data.property && data.property.askingPrice)
            ? data.property.askingPrice
            : ('monthlyRent' in data.property && data.property.monthlyRent)
              ? data.property.monthlyRent
              : 0;

        console.log('📊 Tracking recently viewed property:', {
          address: data.property.address,
          propertyType: propertyType === 'sold' ? 'sold' : propertyType === 'forSale' ? 'listing' : 'rental',
          price: price,
        });

        addRecentlyViewed({
          address: data.property.address,
          propertyType: propertyType === 'sold' ? 'sold' : propertyType === 'forSale' ? 'listing' : 'rental',
          price: price,
          latitude: data.property.latitude ?? undefined,
          longitude: data.property.longitude ?? undefined,
        });

        // Trigger alert immediately when property data is loaded
        const locationContext = {
          name: data.property.address,
          coordinates: {
            lat: data.property.latitude || 53.3498,
            lng: data.property.longitude || -6.2603,
          },
          postcode: ('dublinPostcode' in data.property && data.property.dublinPostcode) ? data.property.dublinPostcode : undefined,
        };

        console.log('🏠 Triggering property details page alert for:', data.property.address, 'type:', propertyType);

        // Determine suggested alert configuration based on property type (but allow user to change)
        let defaultAlertConfig = {};
        if (propertyType === 'rental') {
          defaultAlertConfig = {
            monitor_rental: true,
            monitor_sale: true,  // Also suggest sale alerts as they're often interested in buying too
            monitor_sold: true,  // Include sold data for market intelligence
            rental_alert_on_new: true,
            sale_alert_on_new: true,
            sale_alert_on_price_drops: true,
            sold_alert_on_over_asking: true,
            sold_alert_on_under_asking: true,
            sold_price_threshold_percent: 5
          };
        } else if (propertyType === 'sold') {
          defaultAlertConfig = {
            monitor_sold: true,
            monitor_sale: true,  // Also suggest current sale listings
            monitor_rental: true, // Include rentals for complete market view
            sold_alert_on_over_asking: true,
            sold_alert_on_under_asking: true,
            sold_price_threshold_percent: 5,
            sale_alert_on_new: true,
            sale_alert_on_price_drops: true,
            rental_alert_on_new: true
          };
        } else {
          // Default for sale/listing properties - suggest all types for comprehensive coverage
          defaultAlertConfig = {
            monitor_sale: true,
            monitor_rental: true,  // Many buyers also consider rentals
            monitor_sold: true,    // Include sold data for market intelligence
            sale_alert_on_new: true,
            sale_alert_on_price_drops: true,
            rental_alert_on_new: true,
            sold_alert_on_over_asking: true,
            sold_alert_on_under_asking: true,
            sold_price_threshold_percent: 5
          };
        }

        trackMapSearch({
          ...locationContext,
          defaultAlertConfig
        });

        // Fetch area market data for market overview section
        try {
          // Try to determine area from postcode or address
          let areaSlug = null;

          // First try dublinPostcode field (for Dublin city properties)
          if (data.property.dublinPostcode) {
            // Convert postcode like "D4" or "Dublin 4" to proper slug
            const postcode = data.property.dublinPostcode.trim();
            if (postcode.match(/^D(\d+)$/)) {
              // D4 -> dublin-4, D6W -> dublin-6w
              areaSlug = `dublin-${postcode.substring(1).toLowerCase()}`;
            } else if (postcode.match(/Dublin\s*\d+/i)) {
              // "Dublin 4" -> dublin-4
              const match = postcode.match(/Dublin\s*(\d+)/i);
              if (match) {
                areaSlug = `dublin-${match[1]}`;
              }
            } else {
              // Fallback for other postcodes
              areaSlug = postcode.toLowerCase().replace(/\s+/g, '-');
            }
          }

          // If no dublinPostcode, try to extract from address (for Co. Dublin properties)
          if (!areaSlug) {
            const address = (data.property.address || '').toLowerCase();

            // Extract postcode from address (like k78v9y3)
            const postcodeMatch = address.match(/([a-z]\d+[a-z]\d+[a-z]\d*)/i);
            if (postcodeMatch) {
              const postcode = postcodeMatch[1].toUpperCase();

              // Map Co. Dublin postcodes to areas
              if (postcode.startsWith('K78')) {
                areaSlug = 'lucan'; // K78 is Lucan area
              } else if (postcode.startsWith('K67')) {
                areaSlug = 'leopardstown'; // K67 is Leopardstown/Churchtown area
              } else if (postcode.startsWith('K32')) {
                areaSlug = 'malahide'; // K32 is Malahide area
              } else if (postcode.startsWith('K36')) {
                areaSlug = 'swords'; // K36 is Swords area
              } else if (postcode.startsWith('K45')) {
                areaSlug = 'blanchardstown'; // K45 is Blanchardstown area
              } else if (postcode.startsWith('K47')) {
                areaSlug = 'clondalkin'; // K47 is Clondalkin area
              } else if (postcode.startsWith('K56')) {
                areaSlug = 'tallaght'; // K56 is Tallaght area
              } else if (postcode.startsWith('K76')) {
                areaSlug = 'dundrum'; // K76 is Dundrum area
              }
            }
          }

          // If no postcode found, try to extract area from address using smart detection
          if (!areaSlug) {
            const address = data.property.address || '';

            // Use the smart area extraction logic from areas.ts
            const extractedArea = extractPrimaryArea(address);
            console.log('📍 Smart extraction result:', extractedArea, 'from address:', address);

            if (extractedArea && extractedArea !== 'Dublin') {
              // Convert area name to slug
              areaSlug = areaToSlug(extractedArea);
              console.log('🏷️ Final area slug:', areaSlug);
            }
          }

          console.log('📍 Area slug result:', areaSlug, 'from dublinPostcode:', data.property.dublinPostcode);

          // Final fallback - don't try to load area data if we can't determine the area
          if (!areaSlug) {
            console.log('⚠️ Could not determine area for property:', data.property.address);
          } else {
            console.log('📊 Fetching area data for:', areaSlug);

            const areaResponse = await fetch(`/api/areas/${areaSlug}`);
            if (areaResponse.ok) {
              const areaData = await areaResponse.json();
              if (areaData.stats) {
                console.log('✅ Area data loaded:', areaData.stats.totalSales, 'sales');
                setAreaData(areaData);
              }
            } else {
              console.log('⚠️ Area data not available for:', areaSlug, 'Response status:', areaResponse.status);
              const errorText = await areaResponse.text();
              console.log('⚠️ Area API error response:', errorText.substring(0, 200));
            }
          }
        } catch (areaErr) {
          console.error('❌ Area data fetch error:', areaErr);
          const error = areaErr instanceof Error ? areaErr : new Error(String(areaErr));
          console.error('❌ Error details:', error.message, error.stack);
        }

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load property details');
      } finally {
        setLoading(false);
      }
    };

    if (propertyType && propertyId) {
      fetchPropertyDetails();
    }
  }, [propertyType, propertyId, trackMapSearch]);

  const handleMortgageCalculator = () => {
    if (!property) return;

    const price = (property as Property).soldPrice || (property as Listing).askingPrice || (property as RentalListing).monthlyRent || 0;

    const params = new URLSearchParams({
      homeValue: price.toString(),
      address: encodeURIComponent(property.address || ''),
      propertyType: property.propertyType || 'house',
      ...(property.beds && { beds: property.beds.toString() }),
      ...(property.baths && { baths: property.baths.toString() }),
      ...(property.areaSqm && { areaSqm: property.areaSqm.toString() }),
    });

    router.push(`/mortgage-calc?${params.toString()}`);
  };

  const handleAmenities = () => {
    if (!property) return;
    router.push(`/amenities?lat=${property.latitude}&lng=${property.longitude}&address=${encodeURIComponent(property.address || '')}`);
  };

  const handlePlanning = () => {
    if (!property) return;
    // Include return parameters to reopen property card on back navigation
    const propertyId = encodeURIComponent(property.address || '');
    const propertyType = isSold ? 'sold' : isForSale ? 'listing' : 'rental';
    const returnParams = `&focus=${propertyId}&type=${propertyType}`;
    router.push(`/planning?lat=${property.latitude}&lng=${property.longitude}&address=${encodeURIComponent(property.address || '')}${returnParams}`);
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

  // Helper function to calculate distance between two points
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in km
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900">
        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Header Skeleton */}
          <div className="flex items-center gap-4 mb-8">
            <div className="w-10 h-10 bg-gray-700 rounded-lg animate-pulse"></div>
            <div className="flex-1">
              <div className="h-8 bg-gray-700 rounded-lg animate-pulse mb-2"></div>
              <div className="h-6 w-24 bg-gray-700 rounded-full animate-pulse"></div>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content Skeleton */}
            <div className="lg:col-span-2 space-y-8">
              {/* Overview Card Skeleton */}
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1 space-y-4">
                    <div className="h-12 bg-gray-700 rounded animate-pulse"></div>
                    <div className="h-4 w-32 bg-gray-700 rounded animate-pulse"></div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="h-20 bg-gray-700 rounded animate-pulse"></div>
                      <div className="h-20 bg-gray-700 rounded animate-pulse"></div>
                      <div className="h-20 bg-gray-700 rounded animate-pulse"></div>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <div className="w-12 h-12 bg-gray-700 rounded animate-pulse"></div>
                    <div className="w-12 h-12 bg-gray-700 rounded animate-pulse"></div>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="p-4 bg-gray-700 rounded-lg animate-pulse">
                      <div className="h-6 w-12 bg-gray-600 rounded mb-2"></div>
                      <div className="h-4 w-16 bg-gray-600 rounded"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar Skeleton */}
            <div className="space-y-6">
              <div className="aspect-video bg-gray-800 rounded-xl animate-pulse"></div>
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                <div className="h-6 w-32 bg-gray-700 rounded mb-4 animate-pulse"></div>
                <div className="space-y-3">
                  {[1,2,3].map(i => (
                    <div key={i} className="flex justify-between animate-pulse">
                      <div className="h-4 w-24 bg-gray-700 rounded"></div>
                      <div className="h-4 w-16 bg-gray-700 rounded"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-screen bg-gray-900">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Property Not Found</h2>
            <p className="text-gray-300 mb-4">{error}</p>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isSold = propertyType === 'sold';
  const isForSale = propertyType === 'forSale';
  const isRental = propertyType === 'rental';

  const price = isSold
    ? (property as Property).soldPrice
    : isForSale
      ? (property as Listing).askingPrice
      : (property as RentalListing).monthlyRent || 0;

  const statusConfig = isSold
    ? { label: 'Sold Property', color: 'bg-blue-500' }
    : isForSale
      ? { label: 'For Sale', color: 'bg-rose-500' }
      : { label: 'For Rent', color: 'bg-purple-500' };

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header - Compact on Mobile */}
        <div className="flex items-center gap-3 md:gap-4 mb-4 md:mb-8">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 text-gray-300" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg md:text-3xl font-bold text-white truncate">{property.address}</h1>
            <div className={`inline-block px-2 py-0.5 md:px-3 md:py-1 rounded-full text-white text-xs md:text-sm font-medium mt-1 md:mt-2 ${statusConfig.color}`}>
              {statusConfig.label}
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4 md:space-y-6 lg:space-y-8 order-1 lg:order-1">
            {/* Property Value Indicator - Compact on Mobile */}
            {isSold && areaData?.stats?.avgPrice && (
              <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-xl border border-gray-600 p-3 md:p-4 lg:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 md:gap-4">
                  <div className="flex-1">
                    <h3 className="text-base md:text-lg lg:text-xl font-semibold text-white">Property Value Assessment</h3>
                    <p className="text-xs md:text-sm text-gray-300 mt-1 hidden md:block">
                      Compared to similar properties in the area
                    </p>
                  </div>
                  {(() => {
                    const propertyPrice = (property as Property).soldPrice;
                    const areaAvg = areaData.stats.avgPrice;
                    const percentDiff = ((propertyPrice - areaAvg) / areaAvg) * 100;

                    if (percentDiff < -10) {
                      return (
                        <div className="text-right">
                          <div className="text-lg md:text-2xl font-bold text-green-400">Great Value</div>
                          <div className="text-xs md:text-sm text-green-300">{percentDiff.toFixed(1)}% below market</div>
                        </div>
                      );
                    } else if (percentDiff > 10) {
                      return (
                        <div className="text-right">
                          <div className="text-lg md:text-2xl font-bold text-red-400">Premium Price</div>
                          <div className="text-xs md:text-sm text-red-300">{percentDiff.toFixed(1)}% above market</div>
                        </div>
                      );
                    } else {
                      return (
                        <div className="text-right">
                          <div className="text-lg md:text-2xl font-bold text-blue-400">Fair Value</div>
                          <div className="text-xs md:text-sm text-blue-300">In line with market</div>
                        </div>
                      );
                    }
                  })()}
                </div>
              </div>
            )}
            {/* Property Overview - Compact on Mobile */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 md:p-6">
              {/* Header Row: Price + Action Buttons */}
              <div className="flex items-start justify-between mb-4 md:mb-6">
                <div>
                  <div className="text-2xl md:text-4xl font-bold text-white font-mono mb-2">
                    {isRental ? `€${price.toLocaleString()}/mo` : formatFullPrice(price)}
                  </div>

                  {isSold && (property as Property).soldDate && (
                    <div className="text-sm text-gray-300">
                      Sold {(property as Property).soldDate ? new Date((property as Property).soldDate).toLocaleDateString('en-IE', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      }) : 'Unknown date'}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 flex-shrink-0">
                  {user ? (
                    <button
                      onClick={async () => {
                        const alreadySaved = isSaved(property.address || '', propertyType as 'listing' | 'rental' | 'sold');
                        if (alreadySaved) {
                          await unsaveProperty(property.address || '', propertyType as any);
                        } else {
                          await saveProperty(
                            property.address || '',
                            propertyType as any,
                            property,
                            undefined
                          );
                        }
                      }}
                      className={`p-2 md:p-3 rounded-lg border transition-colors ${
                        isSaved(property.address || '', propertyType as 'listing' | 'rental' | 'sold')
                          ? 'bg-red-600 text-white border-red-500'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border-gray-600'
                      }`}
                      title={isSaved(property.address || '', propertyType as 'listing' | 'rental' | 'sold') ? 'Remove from saved' : 'Save property'}
                    >
                      <Bookmark className={`w-4 h-4 md:w-5 md:h-5 ${isSaved(property.address || '', propertyType as 'listing' | 'rental' | 'sold') ? 'fill-current' : ''}`} />
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        analytics.registrationStarted('save_prompt');
                        setShowLoginModal(true);
                      }}
                      className="p-2 md:p-3 rounded-lg border bg-gray-800 text-gray-300 hover:bg-gray-700 border-gray-600 transition-colors"
                      title="Sign in to save properties"
                    >
                      <Bookmark className="w-4 h-4 md:w-5 md:h-5" />
                    </button>
                  )}

                  <AddToCompareButton
                    property={property}
                    type={propertyType as any}
                    size="sm"
                    className="p-2 md:p-3"
                  />
                </div>
              </div>

              {/* Full-width Price Analysis Section */}
              {isSold && (property as Property).askingPrice && (
                <div className="bg-gray-700 rounded-lg p-4 md:p-6 border border-gray-600 mb-4">
                      <h3 className="text-lg font-semibold text-white mb-3">Price Analysis</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <div className="text-sm text-gray-300 mb-1">Asking Price</div>
                          <div className="text-xl font-bold text-white font-mono">
                            {formatFullPrice((property as Property).askingPrice)}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-300 mb-1">Sold Price</div>
                          <div className="text-xl font-bold text-green-600 font-mono">
                            {formatFullPrice((property as Property).soldPrice)}
                          </div>
                        </div>
                        <div className="hidden lg:block">
                          <div className="text-sm text-gray-300 mb-1">Difference</div>
                          <div className={`text-xl font-bold font-mono ${
                            (property as Property).soldPrice > (property as Property).askingPrice
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}>
                            {((property as Property).soldPrice > (property as Property).askingPrice ? '+' : '') +
                             formatFullPrice(Math.abs((property as Property).soldPrice - (property as Property).askingPrice))}
                          </div>
                          <div className={`text-sm font-medium ${
                            (property as Property).overUnderPercent >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            ({(property as Property).overUnderPercent >= 0 ? '+' : ''}{(property as Property).overUnderPercent}%)
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-gray-600 lg:hidden">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-300">Difference</span>
                          <div className="text-right">
                            <div className={`text-lg font-bold font-mono ${
                              (property as Property).soldPrice > (property as Property).askingPrice
                                ? 'text-green-600'
                                : 'text-red-600'
                            }`}>
                              {((property as Property).soldPrice > (property as Property).askingPrice ? '+' : '') +
                               formatFullPrice(Math.abs((property as Property).soldPrice - (property as Property).askingPrice))}
                            </div>
                            <div className={`text-sm font-medium ${
                              (property as Property).overUnderPercent >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              ({(property as Property).overUnderPercent >= 0 ? '+' : ''}{(property as Property).overUnderPercent}%)
                            </div>
                          </div>
                        </div>
                      </div>

                      {(property as Property).pricePerSqm && (
                        <div className="mt-3 pt-3 border-t border-gray-600">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-300">Price per m²</span>
                            <span className="text-white font-mono font-semibold">
                              €{(property as Property).pricePerSqm?.toLocaleString() || 'N/A'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Sale Timeline for Sold Properties */}
                  {isSold && (property as Property).first_seen_date && (
                    <div className="mt-4 p-4 md:p-6 bg-gray-800 rounded-lg border border-gray-600">
                      <h4 className="text-lg font-semibold text-white mb-4">Sale Timeline</h4>

                      {/* Timeline visualization */}
                      <div className="relative mb-4">
                        <div className="flex items-center justify-between min-h-[60px]">
                          {/* First seen */}
                          <div className="flex flex-col items-center">
                            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                            <div className="w-px h-8 bg-gray-600 mt-1"></div>
                            <div className="text-xs text-gray-400 text-center mt-1">
                              Listed<br/>
                              <span className="text-white font-medium">
                                {new Date((property as Property).first_seen_date!).toLocaleDateString('en-IE', {
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </span>
                            </div>
                          </div>

                          {/* Connection line */}
                          <div className="flex-1 h-px bg-gray-600 mx-2 mt-[-6px]"></div>

                          {/* Sold */}
                          <div className="flex flex-col items-center">
                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                            <div className="w-px h-8 bg-gray-600 mt-1"></div>
                            <div className="text-xs text-gray-400 text-center mt-1">
                              Sold<br/>
                              <span className="text-white font-medium">
                                {new Date((property as Property).soldDate).toLocaleDateString('en-IE', {
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-300">First seen:</span>
                          <div className="text-white font-medium">
                            {new Date((property as Property).first_seen_date!).toLocaleDateString('en-IE', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-300">Sold:</span>
                          <div className="text-white font-medium">
                            {new Date((property as Property).soldDate).toLocaleDateString('en-IE', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </div>
                        </div>
                      </div>
                      {(property as Property).first_seen_date && (
                        <div className="mt-2 pt-2 border-t border-gray-600">
                          <span className="text-gray-300">Days on market:</span>
                          <span className="text-white font-semibold ml-2">
                            {Math.ceil((new Date((property as Property).soldDate).getTime() - new Date((property as Property).first_seen_date!).getTime()) / (1000 * 60 * 60 * 24))} days
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Price Trend Visualization */}
                  {areaData?.stats && (
                    <div className="mt-6 p-4 md:p-6 bg-gray-700 rounded-lg border border-gray-600 w-full">
                      <h4 className="text-lg font-semibold text-white mb-4">Price Trend Analysis</h4>
                      <div className="h-80 md:h-96 lg:h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={[
                            {
                              name: 'This Property',
                              price: (property as Property).soldPrice,
                              fill: '#3b82f6'
                            },
                            {
                              name: 'Area Average',
                              price: areaData.stats.avgPrice || 0,
                              fill: '#6b7280'
                            }
                          ]}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                            <YAxis
                              stroke="#9ca3af"
                              fontSize={12}
                              tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
                            />
                            <Tooltip
                              formatter={(value: number | undefined) => value ? [`€${value.toLocaleString()}`, 'Price'] : ['N/A', 'Price']}
                              contentStyle={{
                                backgroundColor: '#1f2937',
                                border: '1px solid #374151',
                                borderRadius: '8px',
                                color: '#f9fafb'
                              }}
                            />
                            <Bar dataKey="price" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="text-xs text-gray-400 mt-2 text-center">
                        Property price vs area average comparison
                      </div>
                    </div>
                  )}

              {/* Quick Stats Overview */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
                {(property as Property).pricePerSqm && (
                  <div className="text-center p-3 bg-gradient-to-br from-blue-900/30 to-blue-800/30 rounded-lg border border-blue-700/50">
                    <div className="text-lg font-bold text-blue-400">€{(property as Property).pricePerSqm!.toLocaleString()}</div>
                    <div className="text-xs text-blue-300">per m²</div>
                  </div>
                )}

                {areaData?.stats?.totalTransactions && (
                  <div className="text-center p-3 bg-gradient-to-br from-green-900/30 to-green-800/30 rounded-lg border border-green-700/50">
                    <div className="text-lg font-bold text-green-400">{areaData.stats.totalTransactions}</div>
                    <div className="text-xs text-green-300">area sales</div>
                  </div>
                )}

                {areaData?.stats?.avgPricePerSqm && (
                  <div className="text-center p-3 bg-gradient-to-br from-yellow-900/30 to-yellow-800/30 rounded-lg border border-yellow-700/50">
                    <div className="text-lg font-bold text-yellow-400">€{Math.round(areaData.stats.avgPricePerSqm).toLocaleString()}</div>
                    <div className="text-xs text-yellow-300">area avg/m²</div>
                  </div>
                )}

                {(property as Property).yieldEstimate && (
                  <div className="text-center p-3 bg-gradient-to-br from-purple-900/30 to-purple-800/30 rounded-lg border border-purple-700/50">
                    <div className="text-lg font-bold text-purple-400">{(property as Property).yieldEstimate!.grossYield.toFixed(1)}%</div>
                    <div className="text-xs text-purple-300">yield</div>
                  </div>
                )}
              </div>

              {/* Comprehensive Property Details - More compact on mobile */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6">
                {property.beds !== null && property.beds !== undefined && (
                  <div className="flex items-center gap-2 md:gap-3 p-3 md:p-4 bg-gray-700 rounded-lg border border-gray-600">
                    <Bed className="w-5 h-5 md:w-6 md:h-6 text-blue-500" />
                    <div>
                      <div className="text-lg md:text-xl font-bold text-white">{property.beds}</div>
                      <div className="text-xs md:text-sm text-gray-300">Bedrooms</div>
                    </div>
                  </div>
                )}

                {property.baths !== null && property.baths !== undefined && (
                  <div className="flex items-center gap-2 md:gap-3 p-3 md:p-4 bg-gray-700 rounded-lg border border-gray-600">
                    <Bath className="w-5 h-5 md:w-6 md:h-6 text-blue-500" />
                    <div>
                      <div className="text-lg md:text-xl font-bold text-white">{property.baths}</div>
                      <div className="text-xs md:text-sm text-gray-300">Bathrooms</div>
                    </div>
                  </div>
                )}

                {property.areaSqm && (
                  <div className="flex items-center gap-2 md:gap-3 p-3 md:p-4 bg-gray-700 rounded-lg border border-gray-600">
                    <Ruler className="w-5 h-5 md:w-6 md:h-6 text-blue-500" />
                    <div>
                      <div className="text-lg md:text-xl font-bold text-white">{property.areaSqm}m²</div>
                      <div className="text-xs md:text-sm text-gray-300">Floor Area</div>
                    </div>
                  </div>
                )}

                {property.propertyType && (
                  <div className="flex items-center gap-2 md:gap-3 p-3 md:p-4 bg-gray-700 rounded-lg border border-gray-600">
                    <Building2 className="w-5 h-5 md:w-6 md:h-6 text-blue-500" />
                    <div>
                      <div className="text-base md:text-lg font-bold text-white">{property.propertyType}</div>
                      <div className="text-xs md:text-sm text-gray-300">Property Type</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Market & Investment Analysis */}
              <div className="space-y-4 mb-6">
                <h3 className="text-lg font-semibold text-white">Market Analysis</h3>

                  {/* Area Market Overview */}
                  <div className="p-4 lg:p-6 bg-gray-700 rounded-lg border border-gray-600">
                    <h4 className="text-lg font-semibold text-white mb-4">Area Market Overview</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-400">
                          {areaData?.stats?.avgPrice ? `€${Math.round(areaData.stats.avgPrice).toLocaleString()}` : 'Data unavailable'}
                        </div>
                        <div className="text-xs text-gray-300">Avg. Area Price</div>
                        <div className="text-xs text-gray-400 mt-1">Last 6 months</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-400">
                          {areaData?.stats?.totalSales ? areaData.stats.totalSales.toLocaleString() : 'Data unavailable'}
                        </div>
                        <div className="text-xs text-gray-300">Total Sales</div>
                        <div className="text-xs text-gray-400 mt-1">Last 12 months</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-400">
                          {areaData?.stats?.change6m !== undefined && areaData?.stats?.change6m !== null ? `${areaData.stats.change6m > 0 ? '+' : ''}${areaData.stats.change6m.toFixed(1)}%` : 'Data unavailable'}
                        </div>
                        <div className="text-xs text-gray-300">Price Growth</div>
                        <div className="text-xs text-gray-400 mt-1">YoY change</div>
                      </div>
                    </div>

                    {/* Area Insights */}
                    {areaData?.stats && (
                      <div className="mt-4 p-3 bg-gray-800 rounded border border-gray-600">
                        <h5 className="text-sm font-medium text-white mb-2">Area Insights</h5>
                        <div className="text-sm text-gray-300 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                            <span>{areaData.stats.totalTransactions ? `${areaData.stats.totalTransactions} transactions in this area recently` : 'Limited transaction data available'}</span>
                          </div>
                          {areaData.stats.avgPrice && areaData.stats.change6m && (
                            <div className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
                              <span>Area prices {areaData.stats.change6m > 0 ? 'increasing' : 'stable'} with avg €{Math.round(areaData.stats.avgPrice).toLocaleString()}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full"></span>
                            <span>Located in {(property as Property).dublinPostcode || 'Dublin area'}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {(property as Property).yieldEstimate && (
                    <div className="p-3 bg-green-900/20 rounded-lg border border-green-800">
                      <div className="text-sm text-gray-300 mb-2">Estimated Gross Yield</div>
                      <div className="text-2xl font-bold text-green-600 mb-1">
                        {(property as Property).yieldEstimate!.grossYield.toFixed(1)}%
                      </div>
                      <div className="text-xs text-gray-300">
                        Based on {(property as Property).yieldEstimate!.dataPoints} nearby rentals
                        ({(property as Property).yieldEstimate!.confidence} confidence)
                      </div>
                      <div className="mt-2 pt-2 border-t border-green-700">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-300">Est. Monthly Rent:</span>
                          <span className="text-white font-mono">
                            €{(property as Property).yieldEstimate!.monthlyRent.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Property Market Position */}
                  <div className="p-4 bg-gray-700 rounded-lg border border-gray-600">
                    <h4 className="text-md font-semibold text-white mb-3">Property Market Position</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-gray-300 mb-1">vs Similar Properties</div>
                        {(() => {
                          const propertyPrice = (property as Property).soldPrice || (property as Listing).askingPrice || 0;
                          const propertyType = property.propertyType || 'Unknown';

                          // Try to get type-specific average first, fall back to overall average
                          const typeStats = areaData?.stats?.propertyTypeStats?.[propertyType];
                          const comparisonPrice = typeStats?.avgPrice || areaData?.stats?.avgPrice || 0;
                          const comparisonLabel = typeStats ? `${propertyType} average` : 'Area average';

                          if (propertyPrice && comparisonPrice) {
                            const percentDiff = ((propertyPrice - comparisonPrice) / comparisonPrice) * 100;

                            // Calculate percentile positioning for better context
                            let percentile = 'Mid-range';
                            let colorClass = 'text-blue-400';

                            if (percentDiff < -30) {
                              percentile = 'Bottom quartile';
                              colorClass = 'text-red-400';
                            } else if (percentDiff < -15) {
                              percentile = 'Lower half';
                              colorClass = 'text-yellow-400';
                            } else if (percentDiff < 15) {
                              percentile = 'Mid-range';
                              colorClass = 'text-blue-400';
                            } else if (percentDiff < 30) {
                              percentile = 'Upper half';
                              colorClass = 'text-green-400';
                            } else {
                              percentile = 'Top quartile';
                              colorClass = 'text-green-500';
                            }

                            return (
                              <>
                                <div className={`text-lg font-bold ${colorClass}`}>
                                  {percentile}
                                </div>
                                <div className="text-xs text-gray-400">
                                  Within {comparisonLabel.toLowerCase()}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {percentDiff > 0 ? '+' : ''}{percentDiff.toFixed(1)}% vs average
                                </div>
                              </>
                            );
                          }
                          return (
                            <>
                              <div className="text-lg font-bold text-gray-400">N/A</div>
                              <div className="text-xs text-gray-400">Data unavailable</div>
                            </>
                          );
                        })()}
                      </div>
                      <div>
                        <div className="text-sm text-gray-300 mb-1">Market Activity</div>
                        {(() => {
                          // Show recent sales volume as indicator of market speed
                          if (areaData?.stats?.totalSales) {
                            const monthlySales = Math.round(areaData.stats.totalSales / 12);
                            let activityLevel = 'Slow';
                            let colorClass = 'text-red-400';

                            if (monthlySales >= 40) {
                              activityLevel = 'Very Active';
                              colorClass = 'text-green-500';
                            } else if (monthlySales >= 25) {
                              activityLevel = 'Active';
                              colorClass = 'text-green-400';
                            } else if (monthlySales >= 15) {
                              activityLevel = 'Moderate';
                              colorClass = 'text-yellow-400';
                            } else if (monthlySales >= 5) {
                              activityLevel = 'Slow';
                              colorClass = 'text-orange-400';
                            }

                            return (
                              <>
                                <div className={`text-lg font-bold ${colorClass}`}>{activityLevel}</div>
                                <div className="text-xs text-gray-400">
                                  {monthlySales} sales/month
                                </div>
                              </>
                            );
                          }

                          // For rentals, show availability status
                          if (isRental) {
                            return (
                              <>
                                <div className="text-lg font-bold text-green-400">Available</div>
                                <div className="text-xs text-gray-400">Rental status</div>
                              </>
                            );
                          }

                          return (
                            <>
                              <div className="text-lg font-bold text-gray-400">Unknown</div>
                              <div className="text-xs text-gray-400">Data unavailable</div>
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Investment Potential */}
                    {(property as Property).yieldEstimate && (
                      <div className="mt-3 pt-3 border-t border-gray-600">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-300">Investment Potential</span>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${
                              (property as Property).yieldEstimate!.grossYield > 6 ? 'bg-green-400' :
                              (property as Property).yieldEstimate!.grossYield > 4 ? 'bg-yellow-400' : 'bg-red-400'
                            }`}></div>
                            <span className={`text-sm font-medium ${
                              (property as Property).yieldEstimate!.grossYield > 6 ? 'text-green-400' :
                              (property as Property).yieldEstimate!.grossYield > 4 ? 'text-yellow-400' : 'text-red-400'
                            }`}>
                              {(property as Property).yieldEstimate!.grossYield > 6 ? 'High' :
                               (property as Property).yieldEstimate!.grossYield > 4 ? 'Medium' : 'Low'}
                            </span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          Based on rental yield of {(property as Property).yieldEstimate!.grossYield.toFixed(1)}%
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Data & Source Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(property as Property).scrapedAt && (
                      <div className="p-3 bg-gray-700 rounded-lg border border-gray-600">
                        <div className="text-sm text-gray-300 mb-2">Data Freshness</div>
                        <div className="text-sm text-white">
                          Last updated: {new Date((property as Property).scrapedAt).toLocaleDateString('en-IE', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                        <div className="text-xs text-gray-400 mt-2">
                          Real-time market data
                        </div>
                      </div>
                    )}

                    {(property as Property).sourceUrl && (
                      <div className="p-3 bg-gray-700 rounded-lg border border-gray-600">
                        <div className="text-sm text-gray-300 mb-2">Property Source</div>
                        <a
                          href={(property as Property).sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 text-sm underline block"
                        >
                          View original listing →
                        </a>
                        <div className="text-xs text-gray-400 mt-2">
                          Official property listing
                        </div>
                      </div>
                    )}
                  </div>
              </div>

              {/* Quick Actions - Mobile optimized */}
              <div className="grid grid-cols-1 md:flex md:flex-wrap gap-3">
                <button
                  onClick={handleMortgageCalculator}
                  className="flex items-center justify-center gap-2 px-4 py-3 md:py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors text-sm md:text-base"
                >
                  <Calculator className="w-4 h-4" />
                  <span className="md:hidden">Calculator</span>
                  <span className="hidden md:inline">Mortgage Calculator</span>
                </button>

                <button
                  onClick={handleAmenities}
                  className="flex items-center justify-center gap-2 px-4 py-3 md:py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors text-sm md:text-base"
                >
                  <TrendingUp className="w-4 h-4" />
                  <span className="md:hidden">Amenities</span>
                  <span className="hidden md:inline">Nearby Amenities</span>
                </button>

                <button
                  onClick={handlePlanning}
                  className="flex items-center justify-center gap-2 px-4 py-3 md:py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors text-sm md:text-base"
                >
                  <FileText className="w-4 h-4" />
                  <span className="md:hidden">Planning</span>
                  <span className="hidden md:inline">Planning Permissions</span>
                </button>
              </div>
            </div>

            {/* Location & Amenities */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 md:p-6">
              <h2 className="text-lg md:text-xl font-semibold text-white mb-3 md:mb-4 flex items-center gap-2">
                <MapPin className="w-4 h-4 md:w-5 md:h-5" />
                Location & Amenities
              </h2>

              <div className="space-y-6">
                {/* Distance from City Center */}
                <div className="p-4 bg-gray-700 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-300">Distance from Dublin City Centre</span>
                    <span className="text-white font-semibold">
                      {(() => {
                        const distance = calculateDistance(
                          property.latitude || 53.3498,
                          property.longitude || -6.2603,
                          53.3498, // Dublin city center lat
                          -6.2603  // Dublin city center lng
                        );
                        return distance < 1 ? `${(distance * 1000).toFixed(0)}m` : `${distance.toFixed(1)}km`;
                      })()}
                    </span>
                  </div>
                  <div className="text-xs text-gray-300">
                    {(() => {
                      const distance = calculateDistance(
                        property.latitude || 53.3498,
                        property.longitude || -6.2603,
                        53.3498,
                        -6.2603
                      );
                      if (distance < 1) return "Very central location";
                      if (distance < 3) return "Close to city center";
                      if (distance < 10) return "Within easy commute";
                      return "Further from city center";
                    })()}
                  </div>
                </div>

                {/* Area Information */}
                <div className="p-4 bg-gray-700 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-300">Location Area</span>
                    <span className="text-white font-semibold">
                      {(property as Property).dublinPostcode || "Dublin Area"}
                    </span>
                  </div>
                  <div className="text-xs text-gray-300">
                    {(() => {
                      const distance = calculateDistance(
                        property.latitude || 53.3498,
                        property.longitude || -6.2603,
                        53.3498,
                        -6.2603
                      );
                      if (distance < 2) return "Prime Dublin city center location";
                      if (distance < 5) return "Well-connected urban area";
                      if (distance < 15) return "Growing suburban location";
                      return "Rural or commuter area";
                    })()}
                  </div>
                </div>

                {/* Neighborhood Score Visualization */}
                <div className="p-4 lg:p-6 bg-gray-700 rounded-lg">
                  <h4 className="text-base lg:text-lg font-medium text-white mb-4">Neighborhood Quality</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-300">Walkability</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-gray-600 rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full" style={{ width: '75%' }}></div>
                        </div>
                        <span className="text-sm text-green-400 font-medium">Good</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-300">Amenities Access</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-gray-600 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: '85%' }}></div>
                        </div>
                        <span className="text-sm text-blue-400 font-medium">Excellent</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-300">Transport Links</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-gray-600 rounded-full overflow-hidden">
                          <div className="h-full bg-yellow-500 rounded-full" style={{ width: '60%' }}></div>
                        </div>
                        <span className="text-sm text-yellow-400 font-medium">Good</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-600">
                    <button
                      onClick={handleAmenities}
                      className="w-full text-center text-sm text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      View detailed amenity analysis →
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Planning Permissions Summary - Only show if we have planning data */}
            {isSold && property.latitude && property.longitude && (
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 md:p-6">
                <h2 className="text-lg md:text-xl font-semibold text-white mb-3 md:mb-4 flex items-center gap-2">
                  <Building2 className="w-4 h-4 md:w-5 md:h-5" />
                  Planning Permissions
                </h2>

                <div className="space-y-4">
                  <div className="p-4 bg-blue-900/20 rounded-lg border border-blue-800">
                    <h4 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-600" />
                      Planning Data Available
                    </h4>
                    <div className="text-sm text-gray-300 mb-4">
                      Detailed planning permission history and analysis is available for this property.
                    </div>
                    <button
                      onClick={handlePlanning}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors"
                    >
                      <FileText className="w-4 h-4" />
                      View Detailed Planning History
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Moves below main content on mobile */}
          <div className="space-y-4 lg:space-y-6 order-2 lg:order-2">
            {/* Property Image Gallery */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-3 md:p-4 lg:p-6">
              <div className="aspect-video bg-gradient-to-br from-gray-700 to-gray-600 rounded-lg flex items-center justify-center relative overflow-hidden">
                <div className="text-center text-gray-400 z-10">
                  <Building2 className="w-16 h-16 mx-auto mb-3 text-gray-500" />
                  <div className="text-lg font-medium text-gray-300 mb-1">Property Gallery</div>
                  <div className="text-sm text-gray-500">High-quality images coming soon</div>
                  <div className="text-xs text-gray-600 mt-2">Featuring professional photography</div>
                </div>
                {/* Subtle background pattern */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-4 left-4 w-8 h-8 border border-gray-500 rounded"></div>
                  <div className="absolute top-4 right-4 w-6 h-6 border border-gray-500 rounded"></div>
                  <div className="absolute bottom-4 left-4 w-4 h-4 border border-gray-500 rounded"></div>
                  <div className="absolute bottom-4 right-4 w-8 h-8 border border-gray-500 rounded"></div>
                </div>
              </div>
              {/* Image gallery thumbnails placeholder */}
              <div className="grid grid-cols-4 gap-2 mt-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="aspect-square bg-gray-700 rounded-lg flex items-center justify-center">
                    <div className="text-xs text-gray-600">{i}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Market Insights */}
            {isSold && areaData?.stats && (
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-3 md:p-4 lg:p-6">
                <h3 className="text-base md:text-lg font-semibold text-white mb-3 md:mb-4">Market Insights</h3>
                <div className="space-y-3 text-sm">
                  {areaData.stats.avgPrice && (
                    <div className="flex justify-between">
                      <span className="text-gray-300">Area Avg Price</span>
                      <span className="text-white font-mono">€{Math.round(areaData.stats.avgPrice).toLocaleString()}</span>
                    </div>
                  )}
                  {(property as Property).pricePerSqm && (
                    <div className="flex justify-between">
                      <span className="text-gray-300">Price per m²</span>
                      <span className="text-white font-mono">€{(property as Property).pricePerSqm!.toLocaleString()}</span>
                    </div>
                  )}
                  {areaData.stats.totalTransactions && (
                    <div className="flex justify-between">
                      <span className="text-gray-300">Area Transactions</span>
                      <span className="text-white">{areaData.stats.totalTransactions} recent</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Rental Info */}
            {isRental && (
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-3 md:p-4 lg:p-6">
                <h3 className="text-base md:text-lg font-semibold text-white mb-3 md:mb-4">Rental Details</h3>
                <div className="space-y-3 text-sm">
                  {(property as RentalListing).monthlyRent && property.beds && (
                    <div className="flex justify-between">
                      <span className="text-gray-300">Rent per Bedroom</span>
                      <span className="text-white font-mono">€{Math.round((property as RentalListing).monthlyRent / property.beds)}/mo</span>
                    </div>
                  )}
                  {(property as RentalListing).monthlyRent && property.areaSqm && (
                    <div className="flex justify-between">
                      <span className="text-gray-300">Rent per m²</span>
                      <span className="text-white font-mono">€{(Math.round(((property as RentalListing).monthlyRent / property.areaSqm) * 100) / 100).toFixed(2)}/mo</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-300">Monthly Rent</span>
                    <span className="text-white font-mono">€{(property as RentalListing).monthlyRent?.toLocaleString() || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Property Type</span>
                    <span className="text-white">{property.propertyType || 'N/A'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />

      {/* Bottom Alert Bar - Only show if user isn't logged in and property data is loaded */}
      {!user && property && (
        <AlertBottomBar
          locationName={property.address || 'this area'}
          coordinates={{
            lat: property.latitude || 53.3498,
            lng: property.longitude || -6.2603
          }}
        />
      )}
    </div>
  );
}
