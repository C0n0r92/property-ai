'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, MapPin, Building2, FileText, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { PlanningCard } from '@/components/PlanningCard';
import { formatFullPrice, calculateDaysOnMarket, getDaysOnMarketBadge } from '@/lib/format';
import { useSearchTracking } from '@/hooks/useSearchTracking';
import type { Property, Listing, RentalListing } from '@/types/property';

type PropertyType = Property | Listing | RentalListing;

export default function PlanningAnalysisPage() {
  const params = useParams();
  const router = useRouter();
  const [property, setProperty] = useState<PropertyType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const propertyId = params.propertyId as string;

  // Use search tracking like the working alerts
  const { trackMapSearch } = useSearchTracking();

  // Trigger alert immediately on page load, just like search alerts
  useEffect(() => {
    if (propertyId) {
      // Extract location from propertyId (format: "type_address")
      const parts = propertyId.split('_');
      if (parts.length >= 2) {
        const address = decodeURIComponent(parts.slice(1).join('_'));

        // Create a basic location context - we'll get real coordinates when property loads
        const locationContext = {
          name: address,
          coordinates: { lat: 53.3498, lng: -6.2603 }, // Default Dublin coordinates
          postcode: undefined,
        };

        console.log('🏠 Triggering planning page alert for:', address);
        trackMapSearch(locationContext);
      }
    }
  }, [propertyId, trackMapSearch]);

  useEffect(() => {
    const fetchPropertyData = async () => {
      try {
        setLoading(true);

        // Parse the propertyId to determine type and extract data
        const [type, address] = propertyId.split('_').slice(0, 2);
        const decodedAddress = decodeURIComponent(address);

        let endpoint = '';
        let propertyType: 'sold' | 'forSale' | 'rental' = 'sold';

        switch (type) {
          case 'sold':
            endpoint = `/api/properties?address=${encodeURIComponent(decodedAddress)}`;
            propertyType = 'sold';
            break;
          case 'listing':
            endpoint = `/api/listings?address=${encodeURIComponent(decodedAddress)}`;
            propertyType = 'forSale';
            break;
          case 'rental':
            endpoint = `/api/rentals?address=${encodeURIComponent(decodedAddress)}`;
            propertyType = 'rental';
            break;
          default:
            throw new Error('Invalid property type');
        }

        const response = await fetch(endpoint);
        if (!response.ok) {
          throw new Error('Failed to fetch property data');
        }

        const data = await response.json();

        // Handle different response formats
        let propertyData: PropertyType | null = null;
        if (Array.isArray(data)) {
          propertyData = data[0] || null;
        } else if (data.properties && Array.isArray(data.properties)) {
          propertyData = data.properties[0] || null;
        } else if (data.property) {
          propertyData = data.property;
        } else {
          propertyData = data;
        }

        if (!propertyData) {
          throw new Error('Property not found');
        }

        setProperty(propertyData);
      } catch (err) {
        console.error('Error fetching property:', err);
        setError(err instanceof Error ? err.message : 'Failed to load property data');
      } finally {
        setLoading(false);
      }
    };

    if (propertyId) {
      fetchPropertyData();
    }
  }, [propertyId]);


  const getPropertyTypeInfo = (property: PropertyType) => {
    if ('soldPrice' in property && property.soldPrice) {
      return {
        type: 'sold' as const,
        label: 'Sold Property',
        price: property.soldPrice,
        icon: CheckCircle,
        color: 'text-green-500',
        bgColor: 'bg-green-500/10',
        borderColor: 'border-green-500/20'
      };
    } else if ('askingPrice' in property && property.askingPrice) {
      return {
        type: 'forSale' as const,
        label: 'For Sale',
        price: property.askingPrice,
        icon: Building2,
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/20'
      };
    } else if ('rent' in property && property.rent) {
      return {
        type: 'rental' as const,
        label: 'Rental Property',
        price: property.rent,
        icon: Clock,
        color: 'text-orange-500',
        bgColor: 'bg-orange-500/10',
        borderColor: 'border-orange-500/20'
      };
    }
    return null;
  };

  const getDaysOnMarketInfo = (property: PropertyType) => {
    if ('first_seen_date' in property && property.first_seen_date) {
      const daysOnMarket = calculateDaysOnMarket(property.first_seen_date);
      const badge = getDaysOnMarketBadge(daysOnMarket);
      return { days: daysOnMarket, badge };
    }
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-slate-600">Loading planning analysis...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Map
            </button>
            <div className="bg-white rounded-lg shadow-sm border border-red-200 p-8 text-center">
              <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h1 className="text-xl font-semibold text-slate-900 mb-2">Error Loading Property</h1>
              <p className="text-slate-600 mb-4">{error || 'Property not found'}</p>
              <button
                onClick={() => router.back()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Return to Map
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const propertyInfo = getPropertyTypeInfo(property);
  const daysOnMarket = getDaysOnMarketInfo(property);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Map
            </button>

            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 mb-2">
                    🏗️ Planning Permission Analysis
                  </h1>
                  <p className="text-slate-600">
                    Comprehensive planning history and development potential analysis
                  </p>
                </div>
                {propertyInfo && (
                  <div className={`px-4 py-2 rounded-lg ${propertyInfo.bgColor} ${propertyInfo.borderColor} border`}>
                    <div className="flex items-center gap-2">
                      <propertyInfo.icon className={`w-4 h-4 ${propertyInfo.color}`} />
                      <span className={`text-sm font-medium ${propertyInfo.color}`}>
                        {propertyInfo.label}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Property Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                  <h2 className="text-lg font-semibold text-slate-900 mb-2">{property.address}</h2>
                  <div className="flex items-center gap-4 text-sm text-slate-600">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      <span>{property.propertyType || 'Property'}</span>
                    </div>
                    {property.beds && (
                      <span>{property.beds} bed{property.beds !== 1 ? 's' : ''}</span>
                    )}
                    {property.baths && (
                      <span>{property.baths} bath{property.baths !== 1 ? 's' : ''}</span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  {propertyInfo && (
                    <div className="text-2xl font-bold text-slate-900 mb-1">
                      {formatFullPrice(propertyInfo.price)}
                    </div>
                  )}
                  {daysOnMarket && daysOnMarket.badge && (
                    <div className="flex items-center justify-end gap-1">
                      <span className={`px-2 py-1 rounded text-xs ${daysOnMarket.badge.color}`}>
                        {daysOnMarket.badge.emoji} {daysOnMarket.days} days
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Planning Analysis */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-2">
                Planning Applications & Development History
              </h2>
              <p className="text-slate-600">
                Explore planning permissions, building approvals, and development activity for this property and surrounding area.
              </p>
            </div>

            <PlanningCard
              latitude={property.latitude || 0}
              longitude={property.longitude || 0}
              address={property.address}
              dublinPostcode={('dublinPostcode' in property && property.dublinPostcode) ? property.dublinPostcode : undefined}
              propertyType={propertyInfo?.type || 'sold'}
              forceLoad={true}
            />
          </div>

          {/* Additional Information */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                What This Analysis Shows
              </h3>
              <ul className="space-y-3 text-slate-600">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Complete planning application history for this exact address</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Related applications for nearby properties within 150m</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Decision outcomes and approval/rejection history</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Detailed development descriptions and planning conditions</span>
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                Understanding Planning Data
              </h3>
              <div className="space-y-3 text-slate-600 text-sm">
                <p>
                  <strong>Confidence Levels:</strong> Applications are categorized by location accuracy.
                  High confidence means the exact address; medium and low indicate nearby properties.
                </p>
                <p>
                  <strong>Data Source:</strong> Information comes from Ireland's planning application database,
                  covering applications from recent years with varying historical depth.
                </p>
                <p>
                  <strong>Decision Status:</strong> Track whether applications were granted, refused,
                  or are still pending decision.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
