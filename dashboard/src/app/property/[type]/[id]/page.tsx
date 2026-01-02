'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { formatFullPrice } from '@/lib/format';
import { Property, Listing, RentalListing } from '@/types/property';
import { PlanningCard } from '@/components/PlanningCard';
import { WalkabilityScore } from '@/components/walkability/WalkabilityScore';
import { DistanceDisplay } from '@/components/distance/DistanceDisplay';
import { AddToCompareButton } from '@/components/AddToCompareButton';
import { useComparison } from '@/contexts/ComparisonContext';
import { useAuth } from '@/components/auth/AuthProvider';
import { useSavedProperties } from '@/hooks/useSavedProperties';
import { useSearchTracking } from '@/hooks/useSearchTracking';
import { Bookmark, Calculator, MapPin, Bed, Bath, Ruler, Building2, ArrowLeft, TrendingUp, FileText, Eye, CheckCircle } from 'lucide-react';

export default function PropertyDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { addToComparison } = useComparison();
  const { user } = useAuth();
  const { isSaved, saveProperty, unsaveProperty } = useSavedProperties();
  const { trackMapSearch } = useSearchTracking();

  const [property, setProperty] = useState<Property | Listing | RentalListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const propertyType = params.type as string;
  const propertyId = decodeURIComponent(params.id as string);

  useEffect(() => {
    const fetchPropertyDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        // In a real implementation, this would fetch from your API
        // For now, we'll construct a mock property based on the type and ID

        let mockProperty: Property | Listing | RentalListing;

        // This is a placeholder - in production you'd fetch real data
        if (propertyType === 'sold') {
          mockProperty = {
            address: propertyId,
            latitude: 53.3498,
            longitude: -6.2603,
            soldPrice: 450000,
            soldDate: '2024-12-15',
            beds: 3,
            baths: 2,
            areaSqm: 120,
            propertyType: 'Semi-Detached',
            first_seen_date: '2024-10-01'
          } as Property;
        } else if (propertyType === 'forSale') {
          mockProperty = {
            address: propertyId,
            latitude: 53.3498,
            longitude: -6.2603,
            askingPrice: 475000,
            beds: 3,
            baths: 2,
            areaSqm: 120,
            propertyType: 'Semi-Detached'
          } as Listing;
        } else {
          mockProperty = {
            address: propertyId,
            latitude: 53.3498,
            longitude: -6.2603,
            monthlyRent: 2500,
            beds: 3,
            baths: 2,
            areaSqm: 120,
            propertyType: 'Apartment',
            berRating: null,
            furnishing: null,
            sourceUrl: '',
            sourcePage: 0,
            eircode: null,
            nominatimAddress: null,
            rentPerSqm: null,
            rentPerBed: null,
            dublinPostcode: null,
            scrapedAt: new Date().toISOString()
          } as RentalListing;
        }

        setProperty(mockProperty);

        // Trigger alert immediately when property data is loaded
        const locationContext = {
          name: mockProperty.address,
          coordinates: {
            lat: mockProperty.latitude || 53.3498,
            lng: mockProperty.longitude || -6.2603,
          },
          postcode: ('dublinPostcode' in mockProperty && mockProperty.dublinPostcode) ? mockProperty.dublinPostcode : undefined,
        };

        console.log('🏠 Triggering property details page alert for:', mockProperty.address);
        trackMapSearch(locationContext);
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
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center gap-3 text-gray-300">
              <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
              <span>Loading property details...</span>
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
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-300" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-white">{property.address}</h1>
            <div className={`inline-block px-3 py-1 rounded-full text-white text-sm font-medium mt-2 ${statusConfig.color}`}>
              {statusConfig.label}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Property Overview */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <div className="text-4xl font-bold text-white font-mono mb-2">
                    {isRental ? `€${price.toLocaleString()}/mo` : formatFullPrice(price)}
                  </div>

                  {isSold && (property as Property).soldDate && (
                    <div className="text-sm text-gray-300 mb-3">
                      Sold {(property as Property).soldDate ? new Date((property as Property).soldDate).toLocaleDateString('en-IE', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      }) : 'Unknown date'}
                    </div>
                  )}

                  {/* Asking vs Sold Price Analysis for Sold Properties */}
                  {isSold && (property as Property).askingPrice && (
                    <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                      <h3 className="text-lg font-semibold text-white mb-3">Price Analysis</h3>
                      <div className="grid grid-cols-2 gap-4">
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
                      </div>

                      <div className="mt-4 pt-4 border-t border-gray-600">
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
                    <div className="mt-4 p-3 bg-gray-800 rounded-lg border border-gray-600">
                      <h4 className="text-sm font-medium text-white mb-2">Sale Timeline</h4>
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
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 ml-4">
                  {user && user.tier === 'premium' && (
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
                      className={`p-3 rounded-lg border transition-colors ${
                        isSaved(property.address || '', propertyType as 'listing' | 'rental' | 'sold')
                          ? 'bg-red-600 text-white border-red-500'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border-gray-600'
                      }`}
                      title={isSaved(property.address || '', propertyType as 'listing' | 'rental' | 'sold') ? 'Remove from saved' : 'Save property'}
                    >
                      <Bookmark className={`w-5 h-5 ${isSaved(property.address || '', propertyType as 'listing' | 'rental' | 'sold') ? 'fill-current' : ''}`} />
                    </button>
                  )}

                  <AddToCompareButton
                    property={property}
                    type={propertyType as any}
                    size="lg"
                    className="px-4 py-3"
                  />
                </div>
              </div>

              {/* Comprehensive Property Details */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {property.beds !== null && property.beds !== undefined && (
                  <div className="flex items-center gap-3 p-4 bg-gray-700 rounded-lg border border-gray-600">
                    <Bed className="w-6 h-6 text-blue-500" />
                    <div>
                      <div className="text-xl font-bold text-white">{property.beds}</div>
                      <div className="text-sm text-gray-300">Bedrooms</div>
                    </div>
                  </div>
                )}

                {property.baths !== null && property.baths !== undefined && (
                  <div className="flex items-center gap-3 p-4 bg-gray-700 rounded-lg border border-gray-600">
                    <Bath className="w-6 h-6 text-blue-500" />
                    <div>
                      <div className="text-xl font-bold text-white">{property.baths}</div>
                      <div className="text-sm text-gray-300">Bathrooms</div>
                    </div>
                  </div>
                )}

                {property.areaSqm && (
                  <div className="flex items-center gap-3 p-4 bg-gray-700 rounded-lg border border-gray-600">
                    <Ruler className="w-6 h-6 text-blue-500" />
                    <div>
                      <div className="text-xl font-bold text-white">{property.areaSqm}m²</div>
                      <div className="text-sm text-gray-300">Floor Area</div>
                    </div>
                  </div>
                )}

                {property.propertyType && (
                  <div className="flex items-center gap-3 p-4 bg-gray-700 rounded-lg border border-gray-600">
                    <Building2 className="w-6 h-6 text-blue-500" />
                    <div>
                      <div className="text-lg font-bold text-white">{property.propertyType}</div>
                      <div className="text-sm text-gray-300">Property Type</div>
                    </div>
                  </div>
                )}
              </div>

              {/* Market & Investment Analysis */}
              <div className="space-y-4 mb-6">
                <h3 className="text-lg font-semibold text-white">Market Analysis</h3>

                  {/* Area Market Overview */}
                  <div className="p-4 bg-gray-700 rounded-lg border border-gray-600">
                    <h4 className="text-md font-semibold text-white mb-3">Area Market Overview</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-400">€{(property as Property).soldPrice ? Math.round((property as Property).soldPrice * 0.95).toLocaleString() : '425,000'}</div>
                        <div className="text-xs text-gray-300">Avg. Area Price</div>
                        <div className="text-xs text-gray-400 mt-1">Last 6 months</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-400">32</div>
                        <div className="text-xs text-gray-300">Avg. Days on Market</div>
                        <div className="text-xs text-gray-400 mt-1">Area average</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-400">+8.2%</div>
                        <div className="text-xs text-gray-300">Price Growth</div>
                        <div className="text-xs text-gray-400 mt-1">YoY change</div>
                      </div>
                    </div>

                    {/* Area Insights */}
                    <div className="mt-4 p-3 bg-gray-800 rounded border border-gray-600">
                      <h5 className="text-sm font-medium text-white mb-2">Area Insights</h5>
                      <div className="text-sm text-gray-300 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                          <span>Strong demand in {(property as Property).dublinPostcode || 'this area'} with competitive bidding</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
                          <span>Properties selling above asking price by average 5-8%</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full"></span>
                          <span>Family-friendly area with good schools and amenities</span>
                        </div>
                      </div>
                    </div>
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
                        <div className="text-sm text-gray-300 mb-1">vs Area Average</div>
                        <div className="text-lg font-bold text-green-400">
                          {(property as Property).soldPrice ? '+5.2%' : 'N/A'}
                        </div>
                        <div className="text-xs text-gray-400">Above market value</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-300 mb-1">Market Speed</div>
                        <div className="text-lg font-bold text-blue-400">
                          {Math.ceil((new Date((property as Property).soldDate).getTime() - new Date((property as Property).first_seen_date!).getTime()) / (1000 * 60 * 60 * 24))} days
                        </div>
                        <div className="text-xs text-gray-400">Days on market</div>
                      </div>
                    </div>

                    {/* Investment Potential */}
                    <div className="mt-3 pt-3 border-t border-gray-600">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-300">Investment Potential</span>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          <span className="text-sm text-green-400 font-medium">High</span>
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        Strong rental demand and capital appreciation potential
                      </div>
                    </div>
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

              {/* Quick Actions */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleMortgageCalculator}
                  className="flex-1 min-w-[200px] flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                >
                  <Calculator className="w-4 h-4" />
                  Mortgage Calculator
                </button>

                <button
                  onClick={handleAmenities}
                  className="flex-1 min-w-[200px] flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
                >
                  <TrendingUp className="w-4 h-4" />
                  Nearby Amenities
                </button>

                <button
                  onClick={handlePlanning}
                  className="flex-1 min-w-[200px] flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  Planning Permissions
                </button>
              </div>
            </div>

            {/* Location & Amenities */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5" />
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
              </div>
            </div>

            {/* Planning Permissions Summary */}
            {isSold && (
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Planning Permission Summary
                </h2>

                <div className="space-y-4">
                  {/* Planning Statistics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-gray-700 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">3</div>
                      <div className="text-xs text-gray-300">Applications Found</div>
                    </div>
                    <div className="text-center p-3 bg-gray-700 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">67%</div>
                      <div className="text-xs text-gray-300">Approval Rate</div>
                    </div>
                    <div className="text-center p-3 bg-gray-700 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">45</div>
                      <div className="text-xs text-gray-300">Avg Days</div>
                    </div>
                    <div className="text-center p-3 bg-gray-700 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">1</div>
                      <div className="text-xs text-gray-300">Within 100m</div>
                    </div>
                  </div>

                  {/* Recent Activity */}
                  <div className="p-4 bg-gray-700 rounded-lg">
                    <h4 className="text-sm font-medium text-white mb-3">Recent Planning Activity</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-300">House Extension (2024)</span>
                        <span className="text-green-600 font-medium">Approved</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-300">Roof Conversion (2023)</span>
                        <span className="text-green-600 font-medium">Approved</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-300">Garden Development (2023)</span>
                        <span className="text-yellow-600 font-medium">Pending</span>
                      </div>
                    </div>
                  </div>

                  {/* Planning Insights */}
                  <div className="p-4 bg-green-900/20 rounded-lg border border-green-800">
                    <h4 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      Planning Environment
                    </h4>
                    <div className="text-sm text-gray-300">
                      This area shows moderate planning activity with a good approval rate.
                      Recent extensions and conversions have been successful.
                    </div>
                  </div>

                  {/* View Full Details Button */}
                  <div className="pt-2">
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

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Property Image Placeholder */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
              <div className="aspect-video bg-gray-700 rounded-lg flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <Building2 className="w-12 h-12 mx-auto mb-2" />
                  <div>Property Image</div>
                  <div className="text-sm">Coming Soon</div>
                </div>
              </div>
            </div>

            {/* Market Insights */}
            {isSold && (
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Market Insights</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-300">vs Similar Properties</span>
                    <span className="text-green-600 font-medium">Below Market (2.5%)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Days on Market</span>
                    <span className="text-white">45 days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Price per m²</span>
                    <span className="text-white font-mono">€3,750</span>
                  </div>
                </div>
              </div>
            )}

            {/* Rental Info */}
            {isRental && (
              <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Rental Details</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-300">Rent per Bedroom</span>
                    <span className="text-white font-mono">€833/mo</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Rent per m²</span>
                    <span className="text-white font-mono">€20.83/mo</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">Availability</span>
                    <span className="text-green-600 font-medium">Currently Available</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
