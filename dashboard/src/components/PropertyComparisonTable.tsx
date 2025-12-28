'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useComparison } from '@/contexts/ComparisonContext';
import { useAuth } from '@/components/auth/AuthProvider';
import { useSavedProperties } from '@/hooks/useSavedProperties';
import { formatFullPrice } from '@/lib/format';

type ExpandedSections = {
  price: boolean;
  details: boolean;
  mortgage: boolean;
  location: boolean;
  planning: boolean;
  investment: boolean;
};

interface PropertyComparisonTableProps {
  properties: any[]; // Enriched properties from API
  expandedSections?: ExpandedSections;
  onToggleSection?: (section: keyof ExpandedSections) => void;
}

interface SectionState {
  price: boolean;
  details: boolean;
  mortgage: boolean;
  location: boolean;
  planning: boolean;
  investment: boolean;
}

interface PropertyCardProps {
  property: any;
  index: number;
  expandedSections: SectionState;
  onRemove: () => void;
  onViewOnMap: (property: any) => void;
  onSaveProperty: (property: any) => void;
  isSaved: boolean;
}

// Helper functions
const formatPropertyType = (type?: string) => {
  if (!type) return 'Unknown';
  return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
};

const getDaysOnMarket = (property: any) => {
  if (property._type === 'sold') {
    // For sold properties, calculate from scraped_at or first_seen_date
    const date = property.scrapedAt || property.first_seen_date;
    if (date) {
      const days = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
      return days > 0 ? `${days} days` : 'Recent';
    }
  } else if (property._type === 'listing') {
    // For listings, use first_seen_date
    const date = property.first_seen_date;
    if (date) {
      const days = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
      return days > 0 ? `${days} days` : 'New';
    }
  } else if (property._type === 'rental') {
    return 'N/A';
  }
  return 'Unknown';
};

export function PropertyComparisonTable({ properties, expandedSections: externalExpandedSections, onToggleSection }: PropertyComparisonTableProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { isSaved, saveProperty, unsaveProperty } = useSavedProperties();
  const { removeFromComparison } = useComparison();

  const handleViewOnMap = (property: any) => {
    // Navigate to map page
    router.push('/map');
    // Note: In a full implementation, you might want to pass coordinates or property ID
    // to highlight the specific property on the map
  };

  const handleSaveProperty = async (property: any) => {
    if (!user) {
      // Redirect to login or show login modal
      router.push('/login');
      return;
    }

    const propertyId = property.address; // Use address as unique ID
    const propertyType = property._type === 'sold' ? 'sold' : property._type === 'listing' ? 'listing' : 'rental';
    const alreadySaved = isSaved(propertyId, propertyType);

    try {
      if (alreadySaved) {
        const result = await unsaveProperty(propertyId, propertyType);
        if (!result.success) {
          console.error('Error unsaving property:', result.error);
        }
      } else {
        const result = await saveProperty(propertyId, propertyType, property);
        if (!result.success) {
          console.error('Error saving property:', result.error);
        }
      }
    } catch (error) {
      console.error('Error saving/unsaving property:', error);
      // In a real app, you'd show a toast notification here
    }
  };

  // Use external state if provided, otherwise use internal state
  const [internalExpandedSections, setInternalExpandedSections] = useState<SectionState>({
    price: true,
    details: true,
    mortgage: true,
    location: true,
    planning: false,
    investment: false
  });

  const expandedSections = externalExpandedSections || internalExpandedSections;
  const toggleSection = onToggleSection || ((section: keyof SectionState) => {
    setInternalExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  });

  // Helper to get status badge
  const getStatusBadge = (property: any) => {
    if (property._type === 'sold') {
      return { text: 'SOLD', color: 'bg-green-100 text-green-800' };
    } else if (property._type === 'listing') {
      return { text: 'FOR SALE', color: 'bg-blue-100 text-blue-800' };
    } else {
      return { text: 'RENTAL', color: 'bg-purple-100 text-purple-800' };
    }
  };

  // Helper to get competition indicator
  const getCompetitionIndicator = (level: string) => {
    switch (level) {
      case 'high': return '🔥🔥🔥';
      case 'medium': return '🔥🔥';
      case 'low': return '🔥';
      default: return '❓';
    }
  };

  // Helper to get market position indicator
  const getMarketPositionIndicator = (position: string, percentage: number) => {
    switch (position) {
      case 'below':
        return { text: `${Math.abs(percentage).toFixed(1)}% below`, color: 'text-green-600', bgColor: 'bg-green-50' };
      case 'above':
        return { text: `${percentage.toFixed(1)}% above`, color: 'text-red-600', bgColor: 'bg-red-50' };
      default:
        return { text: 'At market', color: 'text-slate-600', bgColor: 'bg-slate-50' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Property Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 items-stretch">
        {properties.map((property, index) => (
          <PropertyCard
            key={property._comparisonId}
            property={property}
            index={index}
            expandedSections={expandedSections}
            onRemove={() => removeFromComparison(property._comparisonId)}
            onViewOnMap={handleViewOnMap}
            onSaveProperty={handleSaveProperty}
            isSaved={isSaved(property.address, property._type === 'sold' ? 'sold' : property._type === 'listing' ? 'listing' : 'rental')}
          />
        ))}
      </div>

      {/* Comparison Insights */}
      <ComparisonInsights properties={properties} />
    </div>
  );
}
function PropertyCard({ property, index, expandedSections, onRemove, onViewOnMap, onSaveProperty, isSaved }: PropertyCardProps) {
  const [amenitiesExpanded, setAmenitiesExpanded] = useState(false);

  // Debug: log property data
  console.log('PropertyCard received:', {
    type: property._type,
    askingPrice: property.askingPrice,
    soldPrice: property.soldPrice,
    monthlyRent: property.monthlyRent,
    price: property.price,
    enrichment: property.enrichment ? {
      estimatedRent: property.enrichment.estimatedRent,
      areaOverAskingPct: property.enrichment.areaOverAskingPct
    } : null
  });
  const [planningExpanded, setPlanningExpanded] = useState(false);

  const getStatusBadge = (prop: any) => {
    if (prop._type === 'sold') {
      return { text: 'Sold', color: 'bg-green-900/30 text-green-300 border border-green-700/30' };
    } else if (prop._type === 'listing') {
      return { text: 'For Sale', color: 'bg-blue-900/30 text-blue-300 border border-blue-700/30' };
    } else {
      return { text: 'For Rent', color: 'bg-purple-900/30 text-purple-300 border border-purple-700/30' };
    }
  };

  const getMarketPositionIndicator = (position: string, percentage: number) => {
    if (position === 'below') {
      return { text: `${Math.abs(percentage).toFixed(1)}% below market`, color: 'text-green-400', bgColor: 'bg-green-900/20' };
    } else if (position === 'above') {
      return { text: `${Math.abs(percentage).toFixed(1)}% above market`, color: 'text-red-400', bgColor: 'bg-red-900/20' };
    } else {
      return { text: 'At market value', color: 'text-blue-400', bgColor: 'bg-blue-900/20' };
    }
  };

  const status = getStatusBadge(property);
  const daysOnMarket = getDaysOnMarket(property);
  const marketPos = getMarketPositionIndicator(property.enrichment?.marketPosition, property.enrichment?.marketPositionPct);

  // Show type-specific market position with context
  const getEnhancedMarketPosition = (property: any) => {
    const typeSpecific = getMarketPositionIndicator(property.enrichment?.marketPosition, property.enrichment?.marketPositionPct);
    const overall = getMarketPositionIndicator(property.enrichment?.overallMarketPosition, property.enrichment?.overallMarketPositionPct);

    return {
      primary: typeSpecific,
      typeGroup: property.enrichment?.propertyTypeGroup?.replace('_', ' ') || 'similar properties',
      overall: overall
    };
  };

  const enhancedMarketPos = getEnhancedMarketPosition(property);

  const calculateEstimatedSellingPrice = (property: any) => {
    // Use asking price for listings, sold price for sold properties as base
    const basePrice = property.askingPrice || property.soldPrice;
    if (!basePrice) return 'N/A';

    // Use area-specific over-asking percentage for more accurate estimates
    const areaOverAskingPct = property.enrichment?.areaOverAskingPct || 5; // Default 5% if no data

    let estimatedPrice = basePrice; // Default fallback

    if (property._type === 'listing') {
      // For listings: base selling price = asking price + typical over-asking percentage for the area
      estimatedPrice = basePrice * (1 + areaOverAskingPct / 100);

      // Adjust based on property's market position relative to area median
      const marketPos = property.enrichment?.marketPosition;
      const marketPosPct = property.enrichment?.marketPositionPct || 0;

      if (marketPos === 'above') {
        // Properties priced above market might sell closer to asking with less over-asking
        const adjustment = Math.min(marketPosPct / 200, 0.05); // Reduce over-asking by up to 5%
        estimatedPrice = estimatedPrice * (1 - adjustment);
      } else if (marketPos === 'below') {
        // Properties priced below market might sell above asking price
        const adjustment = Math.min(Math.abs(marketPosPct) / 100, 0.10); // Increase by up to 10%
        estimatedPrice = estimatedPrice * (1 + adjustment);
      }
      // Properties at market value use the area average over-asking percentage
    } else if (property._type === 'sold') {
      // For sold properties: show what it could sell for today based on current market
      // Use the sold price as base and adjust by current over-asking rate
      estimatedPrice = basePrice * (1 + areaOverAskingPct / 100);
    }

    return `€${Math.round(estimatedPrice).toLocaleString()}`;
  };

  return (
    <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] overflow-hidden shadow-lg hover:shadow-xl transition-shadow h-full flex flex-col">
      {/* Header */}
      <div className="relative">
        {/* Property Image/Map */}
        <div className="aspect-video bg-[var(--muted)] relative overflow-hidden">
          <img
            src={property.mapImageUrl}
            alt={`Map of ${property.address}`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          {/* Overlay with property number and remove button */}
          <div className="absolute top-3 right-3 flex items-center gap-2">
            <div className="bg-[var(--background)]/80 backdrop-blur-sm px-2 py-1 rounded text-sm font-medium text-[var(--foreground)]">
              #{index + 1}
            </div>
            <button
              onClick={onRemove}
              className="bg-red-600/80 hover:bg-red-600 text-white p-1.5 rounded transition-colors"
              title="Remove from comparison"
            >
              ×
            </button>
          </div>
        </div>

        {/* Status Badge */}
        <div className="absolute top-3 left-3">
          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
            {status.text}
          </span>
        </div>
      </div>

      {/* Property Info */}
      <div className="p-4 flex-1 flex flex-col">
        {/* Address */}
        <div className="mb-3 min-h-[3.5rem] flex flex-col justify-between">
          <h3 className="text-lg font-semibold text-[var(--foreground)] leading-tight">
            {property.address.split(',')[0]}
          </h3>
          <div>
            <p className="text-sm text-[var(--foreground-secondary)]">
              {property.dublinPostcode || 'TBC'}
            </p>
            <p className="text-xs text-[var(--foreground-muted)] mt-1">
              {daysOnMarket} days on market
            </p>
          </div>
        </div>

        {/* Price Section */}
        {expandedSections.price && (
          <div className="mb-4 p-3 bg-[var(--background)] rounded-lg">
            <h4 className="text-sm font-semibold text-[var(--foreground)] mb-2">Price & Value</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-[var(--foreground-secondary)]">
                  {property._type === 'listing' ? 'Asking Price' : property._type === 'sold' ? 'Sold Price' : 'Estimated Rent'}
                </span>
                <span className="text-lg font-bold text-[var(--foreground)]">
                  {property._type === 'rental'
                    ? `${formatFullPrice(
                        property.enrichment?.estimatedRent ||
                        property.monthlyRent
                      )}/mo`
                    : formatFullPrice(property.askingPrice || property.soldPrice || property.price)
                  }
                </span>
              </div>

              {property.enrichment?.areaMedian && property._type !== 'rental' && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[var(--foreground-secondary)]">vs {enhancedMarketPos.typeGroup}</span>
                    <span className={`text-sm px-2 py-1 rounded ${enhancedMarketPos.primary.bgColor} ${enhancedMarketPos.primary.color}`}>
                      {enhancedMarketPos.primary.text}
                    </span>
                  </div>
                  {enhancedMarketPos.primary.text !== enhancedMarketPos.overall.text && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[var(--foreground-secondary)] text-xs">vs all area properties</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${enhancedMarketPos.overall.bgColor} ${enhancedMarketPos.overall.color}`}>
                        {enhancedMarketPos.overall.text}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {property.pricePerSqm && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[var(--foreground-secondary)]">Price/m²</span>
                  <span className="text-sm font-medium text-[var(--foreground)]">
                    €{property.pricePerSqm.toLocaleString()}
                  </span>
                </div>
              )}

              {/* Estimated Selling Price for For Sale Properties */}
              {(property._type === 'listing' || property._type === 'sold' || property.enrichment?.marketPosition) && (property.askingPrice || property.soldPrice || property.price) && (
                <div className="pt-2 border-t border-[var(--border)] space-y-2">
                  {/* Show asking price for sold properties if available */}
                  {property._type === 'sold' && property.askingPrice && property.askingPrice !== property.soldPrice && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[var(--foreground-secondary)]">Originally listed for</span>
                      <span className="text-sm font-medium text-[var(--foreground)]">
                        {formatFullPrice(property.askingPrice)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[var(--foreground-secondary)]">
                      {property._type === 'listing' ? 'Likely to sell for' : 'Could sell for today'}
                    </span>
                    <span className="text-sm font-semibold text-green-400">
                      {calculateEstimatedSellingPrice(property)}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--foreground-muted)]">
                    Based on {property.enrichment?.areaOverAskingPct || 5}% typical over-asking in area
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Property Details */}
        {expandedSections.details && (
          <div className="mb-4 p-3 bg-[var(--background)] rounded-lg">
            <h4 className="text-sm font-semibold text-[var(--foreground)] mb-2">Property Details</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex justify-between">
                <span className="text-sm text-[var(--foreground-secondary)]">Type</span>
                <span className="text-sm font-medium text-[var(--foreground)]">
                  {formatPropertyType(property.propertyType)}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-sm text-[var(--foreground-secondary)]">Size</span>
                <span className="text-sm font-medium text-[var(--foreground)]">
                  {property.areaSqm ? `${property.areaSqm}m²` : 'N/A'}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-sm text-[var(--foreground-secondary)]">Beds</span>
                <span className="text-sm font-medium text-[var(--foreground)]">
                  {property.beds || 'N/A'}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-sm text-[var(--foreground-secondary)]">Baths</span>
                <span className="text-sm font-medium text-[var(--foreground)]">
                  {property.baths || 'N/A'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Mortgage Section */}
        {expandedSections.mortgage && property.enrichment?.mortgage && (
          <div className="mb-4 p-3 bg-[var(--background)] rounded-lg">
            <h4 className="text-sm font-semibold text-[var(--foreground)] mb-2">Mortgage Estimate</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-[var(--foreground-secondary)]">Monthly Payment</span>
                <span className="text-sm font-bold text-blue-400">
                  €{property.enrichment.mortgage.monthly.toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-[var(--foreground-secondary)]">Down Payment</span>
                <span className="text-sm font-medium text-[var(--foreground)]">
                  €{property.enrichment.mortgage.downPayment.toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-[var(--foreground-secondary)]">Total Interest</span>
                <span className="text-sm font-medium text-[var(--foreground)]">
                  €{property.enrichment.mortgage.totalInterest.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Location & Walkability */}
        {expandedSections.location && property.enrichment?.walkability && (
          <div className="mb-4 p-3 bg-[var(--background)] rounded-lg">
            <h4 className="text-sm font-semibold text-[var(--foreground)] mb-2">Location & Walkability</h4>

            <div className="space-y-3">
              {/* Walkability Score */}
              <div className="flex justify-between items-center">
                <span className="text-sm text-[var(--foreground-secondary)]">Walkability</span>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-2 bg-[var(--border)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-400 to-blue-400"
                      style={{ width: `${property.enrichment.walkability.score}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-[var(--foreground)]">
                    {property.enrichment.walkability.score}/10
                  </span>
                </div>
              </div>

              {/* Nearest Transport */}
              {property.enrichment.walkability.nearestDartLuas && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[var(--foreground-secondary)]">Nearest Transport</span>
                  <span className="text-sm font-medium text-[var(--foreground)]">
                    {property.enrichment.walkability.nearestDartLuas.name}
                  </span>
                </div>
              )}

              {/* Amenities Breakdown */}
              <div className="pt-2 border-t border-[var(--border)]">
                <div
                  className="flex justify-between items-center cursor-pointer hover:bg-[var(--surface-hover)] -m-3 p-3 rounded-lg transition-colors"
                  onClick={() => setAmenitiesExpanded(!amenitiesExpanded)}
                >
                  <div className="text-xs text-[var(--foreground-secondary)]">Amenities nearby:</div>
                  <div className="text-xs text-[var(--foreground-secondary)]">
                    {amenitiesExpanded ? '▼' : '▶'}
                  </div>
                </div>

                {/* Collapsed view - scores only */}
                {!amenitiesExpanded && (
                  <div className="grid grid-cols-3 gap-2 text-xs mt-2">
                    <div className="text-center">
                      <div className="font-medium text-[var(--foreground)]">{property.enrichment.walkability.breakdown.transport}/10</div>
                      <div className="text-[var(--foreground-muted)]">Transport</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-[var(--foreground)]">{property.enrichment.walkability.breakdown.shopping}/10</div>
                      <div className="text-[var(--foreground-muted)]">Shopping</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-[var(--foreground)]">{property.enrichment.walkability.breakdown.education}/10</div>
                      <div className="text-[var(--foreground-muted)]">Education</div>
                    </div>
                  </div>
                )}

                {/* Expanded view - detailed amenities */}
                {amenitiesExpanded && property.enrichment.walkability.nearbyAmenities && (
                  <div className="mt-3 space-y-3">
                    {/* Transport */}
                    {property.enrichment.walkability.nearbyAmenities.transport.length > 0 && (
                      <div>
                        <div className="text-xs font-medium text-[var(--foreground)] mb-1">
                          Transport ({property.enrichment.walkability.breakdown.transport}/10)
                        </div>
                        <div className="space-y-1">
                          {property.enrichment.walkability.nearbyAmenities.transport.map((amenity: {name: string, type: string, distance: string}, idx: number) => (
                            <div key={idx} className="text-xs text-[var(--foreground-secondary)] flex justify-between">
                              <span>{amenity.name}</span>
                              <span>{amenity.distance}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Shopping */}
                    {property.enrichment.walkability.nearbyAmenities.shopping.length > 0 && (
                      <div>
                        <div className="text-xs font-medium text-[var(--foreground)] mb-1">
                          Shopping ({property.enrichment.walkability.breakdown.shopping}/10)
                        </div>
                        <div className="space-y-1">
                          {property.enrichment.walkability.nearbyAmenities.shopping.map((amenity: {name: string, type: string, distance: string}, idx: number) => (
                            <div key={idx} className="text-xs text-[var(--foreground-secondary)] flex justify-between">
                              <span>{amenity.name}</span>
                              <span>{amenity.distance}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Education */}
                    {property.enrichment.walkability.nearbyAmenities.education.length > 0 && (
                      <div>
                        <div className="text-xs font-medium text-[var(--foreground)] mb-1">
                          Education ({property.enrichment.walkability.breakdown.education}/10)
                        </div>
                        <div className="space-y-1">
                          {property.enrichment.walkability.nearbyAmenities.education.map((amenity: {name: string, type: string, distance: string}, idx: number) => (
                            <div key={idx} className="text-xs text-[var(--foreground-secondary)] flex justify-between">
                              <span>{amenity.name}</span>
                              <span>{amenity.distance}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Healthcare */}
                    {property.enrichment.walkability.nearbyAmenities.healthcare.length > 0 && (
                      <div>
                        <div className="text-xs font-medium text-[var(--foreground)] mb-1">
                          Healthcare ({property.enrichment.walkability.breakdown.healthcare}/10)
                        </div>
                        <div className="space-y-1">
                          {property.enrichment.walkability.nearbyAmenities.healthcare.map((amenity: {name: string, type: string, distance: string}, idx: number) => (
                            <div key={idx} className="text-xs text-[var(--foreground-secondary)] flex justify-between">
                              <span>{amenity.name}</span>
                              <span>{amenity.distance}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Leisure */}
                    {property.enrichment.walkability.nearbyAmenities.leisure.length > 0 && (
                      <div>
                        <div className="text-xs font-medium text-[var(--foreground)] mb-1">
                          Leisure ({property.enrichment.walkability.breakdown.leisure}/10)
                        </div>
                        <div className="space-y-1">
                          {property.enrichment.walkability.nearbyAmenities.leisure.map((amenity: {name: string, type: string, distance: string}, idx: number) => (
                            <div key={idx} className="text-xs text-[var(--foreground-secondary)] flex justify-between">
                              <span>{amenity.name}</span>
                              <span>{amenity.distance}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Services */}
                    {property.enrichment.walkability.nearbyAmenities.services.length > 0 && (
                      <div>
                        <div className="text-xs font-medium text-[var(--foreground)] mb-1">
                          Services ({property.enrichment.walkability.breakdown.services}/10)
                        </div>
                        <div className="space-y-1">
                          {property.enrichment.walkability.nearbyAmenities.services.map((amenity: {name: string, type: string, distance: string}, idx: number) => (
                            <div key={idx} className="text-xs text-[var(--foreground-secondary)] flex justify-between">
                              <span>{amenity.name}</span>
                              <span>{amenity.distance}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Planning & Development */}
        {expandedSections.planning && property.enrichment?.planning && property.enrichment.planning.nearbyCount > 0 && (
          <div className="mb-4 p-3 bg-[var(--background)] rounded-lg">
            <div
              className="flex justify-between items-center cursor-pointer hover:bg-[var(--surface-hover)] -m-3 p-3 rounded-lg transition-colors"
              onClick={() => setPlanningExpanded(!planningExpanded)}
            >
              <h4 className="text-sm font-semibold text-[var(--foreground)]">Planning & Development</h4>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[var(--foreground)]">
                  {property.enrichment.planning.nearbyCount} application{property.enrichment.planning.nearbyCount !== 1 ? 's' : ''}
                </span>
                <span className="text-xs text-[var(--foreground-secondary)]">
                  {planningExpanded ? '▼' : '▶'}
                </span>
              </div>
            </div>

            {planningExpanded && property.enrichment.planning.applications && (
              <div className="mt-3 space-y-3">
                {property.enrichment.planning.applications.map((app: any, appIndex: number) => (
                  <div key={appIndex} className="border border-[var(--border)] rounded-lg p-3 bg-[var(--surface)]">
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-xs font-medium text-[var(--foreground)]">
                        {app.applicationNumber}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          app.status === 'Granted' ? 'bg-green-900/30 text-green-300' :
                          app.status === 'Under Consideration' ? 'bg-yellow-900/30 text-yellow-300' :
                          app.status === 'Rejected' ? 'bg-red-900/30 text-red-300' :
                          'bg-slate-900/30 text-slate-300'
                        }`}>
                          {app.status}
                        </span>
                        <span className="text-xs text-[var(--foreground-secondary)]">
                          {app.distance}m away
                        </span>
                      </div>
                    </div>

                    <div className="text-xs text-[var(--foreground)] mb-1">
                      {app.description}
                    </div>

                    <div className="text-xs text-[var(--foreground-secondary)]">
                      Type: {app.type} • Confidence: {app.confidence}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Investment Metrics */}
        {expandedSections.investment && property.enrichment && (
          <div className="mb-4 p-3 bg-[var(--background)] rounded-lg">
            <h4 className="text-sm font-semibold text-[var(--foreground)] mb-2">Investment Metrics</h4>

            <div className="space-y-2">
              {property.enrichment.competitionLevel && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[var(--foreground-secondary)]">Competition</span>
                  <span className={`text-sm px-2 py-1 rounded capitalize ${
                    property.enrichment.competitionLevel === 'high' ? 'bg-red-900/30 text-red-300' :
                    property.enrichment.competitionLevel === 'medium' ? 'bg-yellow-900/30 text-yellow-300' :
                    'bg-green-900/30 text-green-300'
                  }`}>
                    {property.enrichment.competitionLevel}
                  </span>
                </div>
              )}

              {property.enrichment.areaOverAskingPct !== undefined && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[var(--foreground-secondary)]">Area Over-asking</span>
                  <span className="text-sm font-medium text-[var(--foreground)]">
                    {property.enrichment.areaOverAskingPct.toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t border-[var(--border)] mt-auto">
          <button
            onClick={() => onViewOnMap(property)}
            className="flex-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 hover:text-blue-200 py-2 px-3 rounded-lg text-sm font-medium transition-colors"
          >
            View on Map
          </button>
          <button
            onClick={() => onSaveProperty(property)}
            className="flex-1 bg-green-600/20 hover:bg-green-600/30 text-green-300 hover:text-green-200 py-2 px-3 rounded-lg text-sm font-medium transition-colors"
          >
            {isSaved ? 'Saved' : 'Save Property'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Comparison Insights Component (simplified version)
function ComparisonInsights({ properties }: { properties: any[] }) {
  if (!properties || properties.length === 0) return null;

  // Simple insights calculation
  const avgPrice = properties.reduce((sum, p) => sum + (p.soldPrice || p.askingPrice || 0), 0) / properties.length;
  const priceRange = Math.max(...properties.map(p => p.soldPrice || p.askingPrice || 0)) - Math.min(...properties.map(p => p.soldPrice || p.askingPrice || 0));

  return (
    <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-6">
      <h3 className="text-lg font-semibold text-[var(--foreground)] mb-4">Comparison Summary</h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-center p-4 bg-[var(--background)] rounded-lg">
          <div className="text-2xl font-bold text-blue-400">{properties.length}</div>
          <div className="text-sm text-[var(--foreground-secondary)]">Properties Compared</div>
        </div>

        <div className="text-center p-4 bg-[var(--background)] rounded-lg">
          <div className="text-2xl font-bold text-green-400">€{avgPrice.toLocaleString()}</div>
          <div className="text-sm text-[var(--foreground-secondary)]">Average Price</div>
        </div>

        <div className="text-center p-4 bg-[var(--background)] rounded-lg">
          <div className="text-2xl font-bold text-purple-400">€{priceRange.toLocaleString()}</div>
          <div className="text-sm text-[var(--foreground-secondary)]">Price Range</div>
        </div>
      </div>
    </div>
  );
}
