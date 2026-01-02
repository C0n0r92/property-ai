'use client';

import React, { useState } from 'react';
import { formatFullPrice } from '@/lib/format';
import { useRouter } from 'next/navigation';
import { useComparison } from '@/contexts/ComparisonContext';
import { Property, Listing, RentalListing } from '@/types/property';
import { MapPin, Bed, Bath, Ruler, Building2, TrendingUp, Calculator, Eye, FileText, CheckCircle, X, Plus } from 'lucide-react';

interface PropertyCardProps {
  property?: Property;
  listing?: Listing;
  rental?: RentalListing;
  onClose?: () => void;
}

export function PropertyCard({ property, listing, rental, onClose }: PropertyCardProps) {
  const router = useRouter();
  const { addToComparison, isInComparison, comparedProperties, count, maxProperties, removeFromComparison, clearComparison } = useComparison();
  const [activeTab, setActiveTab] = useState<'details' | 'compare'>('details');

  // Determine which property type we're dealing with
  const data = property || listing || rental;
  const isSold = !!property;
  const isForSale = !!listing;
  const isRental = !!rental;

  if (!data) return null;

  // Extract common fields
  const address = data.address;
  const beds = data.beds;
  const baths = data.baths;
  const areaSqm = data.areaSqm;
  const propertyType = data.propertyType;

  // Extract price/rent
  const price = isSold
    ? property.soldPrice
    : isForSale
      ? listing.askingPrice
      : rental?.monthlyRent ?? 0;

  // Calculate price difference for sold properties
  const priceDifference = isSold && property?.askingPrice
    ? property.soldPrice - property.askingPrice
    : null;
  const priceDifferencePercent = isSold && property?.overUnderPercent
    ? property.overUnderPercent
    : priceDifference && property?.askingPrice
      ? Math.round((priceDifference / property.askingPrice) * 100)
      : null;

  // Status and color scheme
  const statusConfig = isSold
    ? { label: 'Sold', color: 'bg-blue-500', borderColor: 'border-gray-700' }
    : isForSale
      ? { label: 'For Sale', color: 'bg-rose-500', borderColor: 'border-cyan-700' }
      : { label: 'For Rent', color: 'bg-purple-500', borderColor: 'border-purple-600' };

  // Check if property is already in comparison
  const isAlreadyInComparison = isInComparison(data?.address || '');

  // Handle adding this property to comparison
  const handleAddToComparison = () => {
    if (isAlreadyInComparison) return;

    if (isSold && property) {
      addToComparison(property, 'sold');
    } else if (isForSale && listing) {
      addToComparison(listing, 'listing');
    } else if (isRental && rental) {
      addToComparison(rental, 'rental');
    }
  };

  // CTA button handlers
  const handlePropertyDetails = () => {
    const propertyType = isSold ? 'sold' : isForSale ? 'forSale' : 'rental';
    const propertyId = encodeURIComponent(address);
    // Include return parameters to reopen property card on back navigation
    const returnParams = `?focus=${propertyId}&type=${isSold ? 'sold' : isForSale ? 'listing' : 'rental'}`;
    router.push(`/property/${propertyType}/${propertyId}${returnParams}`);
  };

  const handleAmenities = () => {
    const lat = data.latitude || 53.3498;
    const lng = data.longitude || -6.2603;
    // Include return parameters to reopen property card on back navigation
    const propertyId = encodeURIComponent(address);
    const propertyType = isSold ? 'sold' : isForSale ? 'listing' : 'rental';
    const returnParams = `&focus=${propertyId}&type=${propertyType}`;
    router.push(`/amenities?lat=${lat}&lng=${lng}&address=${encodeURIComponent(address)}${returnParams}`);
  };

  const handleMortgageCalculator = () => {
    const params = new URLSearchParams({
      price: price.toString(),
      address: encodeURIComponent(address),
      propertyType: propertyType || 'house',
      ...(beds && { beds: beds.toString() }),
      ...(baths && { baths: baths.toString() }),
      ...(areaSqm && { areaSqm: areaSqm.toString() }),
    });

    router.push(`/mortgage-calc?${params.toString()}`);
  };

  const handlePlanningPermissions = () => {
    const lat = data.latitude || 53.3498;
    const lng = data.longitude || -6.2603;
    router.push(`/planning?lat=${lat}&lng=${lng}&address=${encodeURIComponent(address)}`);
  };

  return (
    <div className={`bg-gray-900/95 backdrop-blur-xl rounded-xl shadow-2xl border ${statusConfig.borderColor} z-50 transition-all duration-300 ${isAlreadyInComparison ? 'ring-2 ring-green-500/50' : ''}`}>
      {/* Header with close button */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
        <div className={`px-3 py-1 rounded-full text-white text-sm font-medium ${statusConfig.color} flex items-center gap-2`}>
          <Building2 className="w-4 h-4" />
          {statusConfig.label}
          {isAlreadyInComparison && (
            <span className="ml-1 text-green-300 text-xs">✓</span>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
            title="Close property card"
          >
            ×
          </button>
        )}
      </div>

      {/* Main content */}
      <div className="p-4">
        {/* Address */}
        <div className="flex items-start gap-2 mb-3">
          <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
          <h3 className="font-semibold text-white text-lg leading-tight">
            {address}
          </h3>
        </div>

        {/* Price */}
        <div className="mb-4">
          <div className="text-2xl font-bold text-white font-mono">
            {isRental ? `€${price.toLocaleString()}/mo` : formatFullPrice(price)}
          </div>

          {/* Asking vs Sold Price for sold properties */}
          {isSold && property.askingPrice && priceDifference !== null && (
            <div className="mt-2 space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-300">Asking:</span>
                <span className="text-gray-300 font-mono">{formatFullPrice(property.askingPrice)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className={`font-medium ${priceDifference >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {priceDifference >= 0 ? 'Sold +' : 'Sold '}
                  {formatFullPrice(Math.abs(priceDifference))}
                </span>
                <span className={`font-bold ${priceDifferencePercent && priceDifferencePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  ({priceDifferencePercent && priceDifferencePercent >= 0 ? '+' : ''}{priceDifferencePercent}%)
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {beds && (
            <div className="flex items-center gap-2 text-gray-300">
              <Bed className="w-4 h-4" />
              <span className="text-sm">{beds} bed{beds !== 1 ? 's' : ''}</span>
            </div>
          )}
          {baths && (
            <div className="flex items-center gap-2 text-gray-300">
              <Bath className="w-4 h-4" />
              <span className="text-sm">{baths} bath{baths !== 1 ? 's' : ''}</span>
            </div>
          )}
          {areaSqm && (
            <div className="flex items-center gap-2 text-gray-300">
              <Ruler className="w-4 h-4" />
              <span className="text-sm">{areaSqm}m²</span>
            </div>
          )}
          {propertyType && (
            <div className="flex items-center gap-2 text-gray-300">
              <Building2 className="w-4 h-4" />
              <span className="text-sm">{propertyType}</span>
            </div>
          )}
        </div>

      </div>

      {/* Tabs */}
      <div className="border-t border-gray-700/50">
        <div className="flex">
          <button
            onClick={() => setActiveTab('details')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'details'
                ? 'text-white border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Property Details
          </button>
          <button
            onClick={() => setActiveTab('compare')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'compare'
                ? 'text-white border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Compare ({count}/{maxProperties})
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4">
          {activeTab === 'details' && (
            <div className="space-y-3">
              {/* Current Property Actions */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handlePropertyDetails}
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  Full Details
                </button>
                <button
                  onClick={handlePlanningPermissions}
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium text-sm transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  Planning
                </button>
                <button
                  onClick={handleAmenities}
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-sm transition-colors"
                >
                  <TrendingUp className="w-4 h-4" />
                  Amenities
                </button>
                <button
                  onClick={handleMortgageCalculator}
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium text-sm transition-colors"
                >
                  <Calculator className="w-4 h-4" />
                  Mortgage
                </button>
              </div>
            </div>
          )}

          {activeTab === 'compare' && (
            <div className="space-y-3">
              {/* Add to Comparison */}
              {!isAlreadyInComparison ? (
                <button
                  onClick={handleAddToComparison}
                  disabled={count >= maxProperties}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  {count >= maxProperties ? 'Max Properties Reached' : 'Add to Comparison'}
                </button>
              ) : (
                <div className="w-full bg-green-600 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Added to Comparison
                </div>
              )}

              {/* Compared Properties List */}
              {comparedProperties.length > 0 && (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  <h4 className="text-sm font-medium text-gray-300 mb-2">Compared Properties:</h4>
                  {comparedProperties.map((prop) => {
                    const propPrice = prop._type === 'sold' ? (prop as Property).soldPrice :
                                     prop._type === 'listing' ? (prop as Listing).askingPrice :
                                     (prop as RentalListing).monthlyRent;
                    const isRent = prop._type === 'rental';
                    return (
                      <div key={prop._comparisonId} className="flex items-center justify-between bg-gray-700/50 rounded-lg p-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white truncate">{prop.address.split(',')[0]}</p>
                          <p className="text-xs text-gray-400">
                            {propPrice ? formatFullPrice(propPrice) + (isRent ? '/mo' : '') : 'N/A'}
                          </p>
                        </div>
                        <button
                          onClick={() => removeFromComparison(prop._comparisonId)}
                          className="text-red-400 hover:text-red-300 p-1"
                          title="Remove from comparison"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Compare Button */}
              {count >= 2 && (
                <button
                  onClick={() => router.push('/tools/compare')}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  Compare {count} Properties
                </button>
              )}

              {/* Clear All Button */}
              {count > 0 && (
                <button
                  onClick={clearComparison}
                  className="w-full text-red-400 hover:text-red-300 text-sm py-1"
                >
                  Clear All
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
