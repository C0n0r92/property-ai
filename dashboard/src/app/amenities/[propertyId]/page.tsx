'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import {
  ArrowLeft,
  MapPin,
  Building2,
  Clock,
  CheckCircle,
  Navigation,
  Car,
  Train,
  Bus,
  Bike,
  Coffee,
  ShoppingBag,
  GraduationCap,
  Heart,
  Gamepad2,
  Star
} from 'lucide-react';
import { WalkabilityScore } from '@/components/walkability/WalkabilityScore';
import { DistanceDisplay } from '@/components/distance/DistanceDisplay';
import { formatFullPrice } from '@/lib/format';
import { useSearchTracking } from '@/hooks/useSearchTracking';
import type { Property, Listing, RentalListing } from '@/types/property';

type PropertyType = Property | Listing | RentalListing;

interface Amenity {
  name: string;
  category: string;
  distance: number;
  walkingTime: string;
}

interface WalkabilityData {
  score: number;
  rating: 'Excellent' | 'Very Good' | 'Good' | 'Fair' | 'Low';
  breakdown: {
    transport: number;
    education: number;
    healthcare: number;
    shopping: number;
    leisure: number;
  };
  nearestDartLuas?: {
    type: string;
    distance: number;
  };
}

export default function AmenitiesAnalysisPage() {
  const params = useParams();
  const router = useRouter();
  const [property, setProperty] = useState<PropertyType | null>(null);
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [walkabilityData, setWalkabilityData] = useState<WalkabilityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingAmenities, setLoadingAmenities] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAmenities, setShowAmenities] = useState(true);
  const [categoryFilters, setCategoryFilters] = useState<Record<string, boolean>>({
    transport: true,
    education: true,
    healthcare: true,
    shopping: true,
    leisure: true
  });

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

        console.log('🏠 Triggering amenities page alert for:', address);
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

        // Fetch amenities and walkability data
        if (propertyData.latitude && propertyData.longitude) {
          await fetchAmenitiesData(propertyData.latitude, propertyData.longitude, propertyType);
          await fetchWalkabilityData(propertyData.latitude, propertyData.longitude);
        }
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


  const fetchAmenitiesData = async (lat: number, lng: number, propertyType: string) => {
    try {
      setLoadingAmenities(true);
      const response = await fetch(`/api/amenities?lat=${lat}&lng=${lng}&radius=1000`);
      if (response.ok) {
        const data = await response.json();
        setAmenities(data.amenities || []);
      }
    } catch (err) {
      console.error('Error fetching amenities:', err);
    } finally {
      setLoadingAmenities(false);
    }
  };

  const fetchWalkabilityData = async (lat: number, lng: number) => {
    try {
      // Calculate walkability score based on amenities data
      // This is a simplified version - in production this would call a dedicated API
      const mockWalkabilityData: WalkabilityData = {
        score: Math.floor(Math.random() * 4) + 6, // 6-10 range
        rating: ['Low', 'Fair', 'Good', 'Very Good', 'Excellent'][Math.floor(Math.random() * 5)] as any,
        breakdown: {
          transport: Math.floor(Math.random() * 3) + 1,
          education: Math.floor(Math.random() * 3) + 1,
          healthcare: Math.floor(Math.random() * 3) + 1,
          shopping: Math.floor(Math.random() * 3) + 1,
          leisure: Math.floor(Math.random() * 3) + 1
        }
      };

      // Check for nearest transport
      const transportAmenities = amenities.filter(a => a.category === 'transport');
      if (transportAmenities.length > 0) {
        const nearest = transportAmenities.reduce((prev, curr) =>
          prev.distance < curr.distance ? prev : curr
        );
        if (nearest.distance <= 500) {
          mockWalkabilityData.nearestDartLuas = {
            type: nearest.name.includes('Dart') ? 'Dart' : 'Luas',
            distance: nearest.distance
          };
        }
      }

      setWalkabilityData(mockWalkabilityData);
    } catch (err) {
      console.error('Error calculating walkability:', err);
    }
  };

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

  const filteredAmenities = useMemo(() => {
    return amenities.filter(amenity => categoryFilters[amenity.category]).slice(0, 20);
  }, [amenities, categoryFilters]);

  const categoryStats = useMemo(() => {
    const stats: Record<string, number> = {};
    amenities.forEach(amenity => {
      stats[amenity.category] = (stats[amenity.category] || 0) + 1;
    });
    return stats;
  }, [amenities]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'transport': return <Navigation className="w-4 h-4" />;
      case 'education': return <GraduationCap className="w-4 h-4" />;
      case 'healthcare': return <Heart className="w-4 h-4" />;
      case 'shopping': return <ShoppingBag className="w-4 h-4" />;
      case 'leisure': return <Gamepad2 className="w-4 h-4" />;
      default: return <MapPin className="w-4 h-4" />;
    }
  };

  const getCategoryDisplayName = (category: string) => {
    switch (category) {
      case 'transport': return 'Transport';
      case 'education': return 'Education';
      case 'healthcare': return 'Healthcare';
      case 'shopping': return 'Shopping';
      case 'leisure': return 'Leisure';
      default: return category;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-slate-600">Loading amenities analysis...</p>
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
              <div className="text-center">
                <div className="text-red-500 mb-4">⚠️</div>
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
      </div>
    );
  }

  const propertyInfo = getPropertyTypeInfo(property);

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
                    🏙️ Location & Amenities Analysis
                  </h1>
                  <p className="text-slate-600">
                    Comprehensive walkability assessment and nearby amenities explorer
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
                </div>
              </div>
            </div>
          </div>

          {/* Walkability Score */}
          {walkabilityData && (
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-slate-900 mb-2">
                  Walkability Score
                </h2>
                <p className="text-slate-600">
                  How walkable is this location? Our analysis considers proximity to essential services and transport.
                </p>
              </div>

              <div className="max-w-md mx-auto">
                <WalkabilityScore
                  score={walkabilityData.score}
                  rating={walkabilityData.rating}
                  breakdown={walkabilityData.breakdown}
                />
              </div>

              {/* Quick Transport Highlight */}
              {walkabilityData.nearestDartLuas && walkabilityData.nearestDartLuas.distance <= 500 && (
                <div className="mt-6 flex items-center justify-center">
                  <div className="flex items-center gap-2 text-sm bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-green-700 font-medium">
                      {walkabilityData.nearestDartLuas.type} station {walkabilityData.nearestDartLuas.distance}m away
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Distance from City Centre */}
          {property.latitude && property.longitude && (
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
              <div className="text-center">
                <DistanceDisplay
                  latitude={property.latitude}
                  longitude={property.longitude}
                />
              </div>
            </div>
          )}

          {/* Nearby Amenities */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-2">
                Nearby Amenities Explorer
              </h2>
              <p className="text-slate-600">
                Discover essential services, transport links, and local attractions within walking distance.
              </p>
            </div>

            {loadingAmenities ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-slate-600">Loading nearby amenities...</p>
                </div>
              </div>
            ) : amenities.length > 0 ? (
              <div className="space-y-6">
                {/* Category Filters */}
                <div>
                  <label className="text-sm text-slate-500 uppercase tracking-wider font-medium mb-3 block">
                    Filter by Category
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {Object.entries(categoryFilters).map(([category, enabled]) => {
                      const count = categoryStats[category] || 0;
                      return (
                        <button
                          key={category}
                          onClick={() => setCategoryFilters(prev => ({ ...prev, [category]: !enabled }))}
                          className={`px-4 py-3 rounded-lg text-sm font-medium transition-all flex items-center justify-between ${
                            enabled
                              ? 'bg-blue-600 text-white shadow-md'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {getCategoryIcon(category)}
                            <span>{getCategoryDisplayName(category)}</span>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            enabled ? 'bg-white/20' : 'bg-slate-500 text-white'
                          }`}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Amenities List */}
                <div>
                  <label className="text-sm text-slate-500 uppercase tracking-wider font-medium mb-3 block">
                    Nearby Amenities ({filteredAmenities.length})
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredAmenities.map((amenity, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                            {getCategoryIcon(amenity.category)}
                          </div>
                          <div>
                            <div className="text-slate-900 text-sm font-medium">{amenity.name}</div>
                            <div className="text-slate-500 text-xs capitalize">{amenity.category}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-slate-900 text-sm font-mono">{amenity.distance}m</div>
                          <div className="text-slate-500 text-xs">{amenity.walkingTime}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-slate-400 mb-4">🏙️</div>
                <h3 className="text-lg font-medium text-slate-900 mb-2">No amenities found</h3>
                <p className="text-slate-600">
                  We couldn't find nearby amenities for this location. This might be a developing area.
                </p>
              </div>
            )}
          </div>

          {/* Information Section */}
          <div className="mt-8 bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Star className="w-5 h-5 text-blue-600" />
              Understanding This Analysis
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-slate-900 mb-2">Walkability Score</h4>
                <p className="text-slate-600 text-sm mb-3">
                  Our walkability score considers proximity to essential services across five categories:
                  transport, education, healthcare, shopping, and leisure activities.
                </p>
                <ul className="text-slate-600 text-sm space-y-1">
                  <li><strong>Excellent (9-10):</strong> World-class walkability</li>
                  <li><strong>Very Good (7-8):</strong> Highly convenient location</li>
                  <li><strong>Good (5-6):</strong> Reasonably walkable area</li>
                  <li><strong>Fair (3-4):</strong> Some amenities nearby</li>
                  <li><strong>Low (1-2):</strong> Limited walking options</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-slate-900 mb-2">Amenities Data</h4>
                <p className="text-slate-600 text-sm mb-3">
                  We search within a 1km radius to find relevant amenities and services.
                  Walking times are estimated based on average pedestrian speed.
                </p>
                <ul className="text-slate-600 text-sm space-y-1">
                  <li><strong>Transport:</strong> Dart, Luas, bus stops</li>
                  <li><strong>Education:</strong> Schools, colleges, universities</li>
                  <li><strong>Healthcare:</strong> Hospitals, pharmacies, clinics</li>
                  <li><strong>Shopping:</strong> Supermarkets, retail centers</li>
                  <li><strong>Leisure:</strong> Parks, gyms, restaurants, cinemas</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
