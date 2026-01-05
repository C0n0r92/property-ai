'use client';

import React, { useState, useEffect } from 'react';
import { formatFullPrice } from '@/lib/format';
import { useRouter } from 'next/navigation';
import { useComparison } from '@/contexts/ComparisonContext';
import { useAuth } from '@/components/auth/AuthProvider';
import { useSavedProperties } from '@/hooks/useSavedProperties';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { useAlertModal } from '@/contexts/AlertModalContext';
import { LoginModal } from '@/components/auth/LoginModal';
import { UpgradeModal } from '@/components/UpgradeModal';
import { ComparisonSuggestionsModal } from '@/components/ComparisonSuggestionsModal';
import { Property, Listing, RentalListing } from '@/types/property';
import { MapPin, Bed, Bath, Ruler, Building2, TrendingUp, Calculator, Eye, FileText, CheckCircle, X, Plus, Bookmark, Bell, Share2 } from 'lucide-react';
import { analytics } from '@/lib/analytics';

interface PropertyCardProps {
  property?: Property;
  listing?: Listing;
  rental?: RentalListing;
  onClose?: () => void;
}

export function PropertyCard({ property, listing, rental, onClose }: PropertyCardProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { isSaved, saveProperty, unsaveProperty } = useSavedProperties();
  const { addRecentlyViewed } = useRecentlyViewed();
  const { addToComparison, isInComparison, comparedProperties, count, maxProperties, removeFromComparison, clearComparison } = useComparison();
  const { showAlertModal } = useAlertModal();
  const [activeTab, setActiveTab] = useState<'details' | 'compare'>('details');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showComparisonSuggestions, setShowComparisonSuggestions] = useState(false);
  const [loginModalMessage, setLoginModalMessage] = useState<string>('');
  const [showAlertTooltip, setShowAlertTooltip] = useState(false);

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

  // Track property view for recently viewed feature
  useEffect(() => {
    if (data?.address && price > 0) {
      const propertyType = isSold ? 'sold' : isForSale ? 'listing' : 'rental';
      addRecentlyViewed({
        address: data.address,
        propertyType: propertyType as 'sold' | 'listing' | 'rental',
        price: price,
        latitude: data.latitude ?? undefined,
        longitude: data.longitude ?? undefined,
      });
    }
  }, [data?.address, price, isSold, isForSale, addRecentlyViewed]);

  // Show alert tooltip for 3 seconds when property card opens
  useEffect(() => {
    if (data?.address) {
      setShowAlertTooltip(true);
      const timer = setTimeout(() => {
        setShowAlertTooltip(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [data?.address]);

  // Check if property is new (scraped within last 3 days)
  const isNewProperty = data?.scrapedAt ? (() => {
    const scrapedDate = new Date(data.scrapedAt);
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    return scrapedDate > threeDaysAgo;
  })() : false;

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

  // Handle adding any property to comparison (for suggestions modal)
  const handleAddAnyToComparison = (prop: Property | Listing | RentalListing, type: 'sold' | 'listing' | 'rental') => {
    addToComparison(prop, type);
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
    if (!user) {
      analytics.registrationStarted('direct');
      setLoginModalMessage('Please sign up to access amenity analysis and neighborhood insights');
      setShowLoginModal(true);
      return;
    }

    const lat = data.latitude || 53.3498;
    const lng = data.longitude || -6.2603;
    // Include return parameters to reopen property card on back navigation
    const propertyId = encodeURIComponent(address);
    const propertyType = isSold ? 'sold' : isForSale ? 'listing' : 'rental';
    const returnParams = `&focus=${propertyId}&type=${propertyType}`;
    router.push(`/amenities?lat=${lat}&lng=${lng}&address=${encodeURIComponent(address)}${returnParams}`);
  };

  const handleMortgageCalculator = () => {
    if (!user) {
      analytics.registrationStarted('direct');
      setLoginModalMessage('Please sign up to access mortgage calculators and affordability tools');
      setShowLoginModal(true);
      return;
    }

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
    if (!user) {
      analytics.registrationStarted('direct');
      setLoginModalMessage('Please sign up to access planning permissions and development potential insights');
      setShowLoginModal(true);
      return;
    }

    const lat = data.latitude || 53.3498;
    const lng = data.longitude || -6.2603;
    router.push(`/planning?lat=${lat}&lng=${lng}&address=${encodeURIComponent(address)}`);
  };

  const handleAlerts = () => {
    // Create location context for the property
    const propertyLocation = {
      name: address.split(',')[0] || address, // Use first part of address as location name
      coordinates: {
        lat: data.latitude || 53.3498,
        lng: data.longitude || -6.2603,
      },
      postcode: address.match(/Dublin\s+\d+/i)?.[0] || undefined,
      defaultAlertConfig: {
        monitor_sale: isForSale,
        monitor_rental: isRental,
        monitor_sold: isSold,
        sale_alert_on_new: true,
        sale_alert_on_price_drops: true,
        rental_alert_on_new: true,
        sold_alert_on_over_asking: true,
        sold_alert_on_under_asking: true,
      },
    };

    // Hide tooltip when user clicks the button
    setShowAlertTooltip(false);

    // Show alert modal
    showAlertModal(propertyLocation, true); // Bypass dismissal for explicit user action
  };

  // Handle save property with login gate and upgrade prompt
  const handleSaveProperty = async () => {
    if (!user) {
      analytics.registrationStarted('save_prompt');
      setShowLoginModal(true);
      return;
    }

    const propType = isSold ? 'sold' : isForSale ? 'listing' : 'rental';
    const alreadySaved = isSaved(address, propType as 'listing' | 'rental' | 'sold');

    if (alreadySaved) {
      await unsaveProperty(address, propType as 'listing' | 'rental' | 'sold');
    } else {
      const result = await saveProperty(address, propType as 'listing' | 'rental' | 'sold', data);
      
      // Show upgrade modal if save limit reached
      if (result.requiresUpgrade) {
        setShowUpgradeModal(true);
      }
    }
  };

  // Check if current property is saved
  const propTypeForSave = isSold ? 'sold' : isForSale ? 'listing' : 'rental';
  const isPropertySaved = isSaved(address, propTypeForSave as 'listing' | 'rental' | 'sold');

  // Handle share property
  const handleShareProperty = async () => {
    const propertyType = isSold ? 'sold' : isForSale ? 'forSale' : 'rental';
    const propertyId = encodeURIComponent(address);
    const shareUrl = `${window.location.origin}/property/${propertyType}/${propertyId}`;

    try {
      if (navigator.share) {
        // Use native share API if available (mobile)
        await navigator.share({
          title: `${address} - Property Details`,
          text: `Check out this ${isSold ? 'sold' : isForSale ? 'property for sale' : 'rental'} property: ${address}`,
          url: shareUrl,
        });
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(shareUrl);
        // Could show a toast notification here, but for now just copy silently
      }
    } catch (error) {
      console.error('Share failed:', error);
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(shareUrl);
      } catch (clipboardError) {
        console.error('Clipboard fallback failed:', clipboardError);
      }
    }
  };

  return (
    <div className={`bg-gray-900/95 backdrop-blur-xl rounded-xl shadow-2xl border ${statusConfig.borderColor} z-50 transition-all duration-300 ${isAlreadyInComparison ? 'ring-2 ring-green-500/50' : ''}`}>
      {/* Header with save and close buttons */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
        <div className="flex items-center gap-2">
          <div className={`px-3 py-1 rounded-full text-white text-sm font-medium ${statusConfig.color} flex items-center gap-2`}>
            <Building2 className="w-4 h-4" />
            {statusConfig.label}
            {isAlreadyInComparison && (
              <span className="ml-1 text-green-300 text-xs">✓</span>
            )}
          </div>
          {isNewProperty && (
            <div className="px-2 py-1 rounded-full bg-emerald-500 text-white text-xs font-semibold shadow-md">
              NEW
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Share button */}
          <button
            onClick={handleShareProperty}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
            title="Share property"
          >
            <Share2 className="w-4 h-4" />
          </button>
          {/* Save button */}
          <button
            onClick={handleSaveProperty}
            className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
              isPropertySaved
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white'
            }`}
            title={isPropertySaved ? 'Remove from saved' : 'Save property'}
          >
            <Bookmark className={`w-4 h-4 ${isPropertySaved ? 'fill-current' : ''}`} />
          </button>
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
      </div>

      {/* Main content */}
      <div className="p-4">
        {/* Address */}
        <div className="mb-4">
          <div className="flex items-center justify-center gap-2 mb-1">
            <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="text-gray-400 text-sm">Location</span>
          </div>
          <h3 className="font-semibold text-white text-lg leading-tight text-center">
            {address}
          </h3>
          {isSold && property && (
            <div className="flex items-center justify-center gap-4 mt-2 text-xs text-gray-400">
              {property.soldDate && (
                <span>Sold: {new Date(property.soldDate).toLocaleDateString('en-IE')}</span>
              )}
              {property.pricePerSqm && (
                <span>€{Math.round(property.pricePerSqm)}/m²</span>
              )}
            </div>
          )}
        </div>

        {/* Key metrics */}
        <div className="flex items-center justify-center gap-6 mb-6">
          {beds && (
            <div className="flex items-center gap-1 text-gray-300">
              <Bed className="w-4 h-4" />
              <span className="text-sm">{beds}</span>
            </div>
          )}
          {baths && (
            <div className="flex items-center gap-1 text-gray-300">
              <Bath className="w-4 h-4" />
              <span className="text-sm">{baths}</span>
            </div>
          )}
          {areaSqm && (
            <div className="flex items-center gap-1 text-gray-300">
              <Ruler className="w-4 h-4" />
              <span className="text-sm">{areaSqm}m²</span>
            </div>
          )}
          {propertyType && (
            <div className="flex items-center gap-1 text-gray-300">
              <Building2 className="w-4 h-4" />
              <span className="text-sm">{propertyType}</span>
            </div>
          )}
        </div>

        {/* Price */}
        <div className="mb-4">
          {/* Primary Price Display */}
          {isSold && property.askingPrice ? (
            /* Sold properties with asking price comparison */
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-gray-300 text-sm">Asking:</span>
                <span className="text-gray-300 font-mono text-sm">{formatFullPrice(property.askingPrice)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white text-sm">Sold:</span>
                <span className="text-white font-mono text-sm font-medium">{formatFullPrice(price)}</span>
              </div>
              {priceDifference !== null && (
                <div className="flex items-center justify-between">
                  <span className={`font-medium text-sm ${priceDifference >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {priceDifference >= 0 ? 'Sold +' : 'Sold '}
                    {formatFullPrice(Math.abs(priceDifference))}
                  </span>
                  <span className={`font-bold text-sm ${priceDifferencePercent && priceDifferencePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ({priceDifferencePercent && priceDifferencePercent >= 0 ? '+' : ''}{priceDifferencePercent}%)
                  </span>
                </div>
              )}
            </div>
          ) : (
            /* For sale or rental properties - single price display */
            <div className="flex items-center justify-between">
              <span className="text-gray-300 text-sm">
                {isForSale ? 'Asking:' : 'Rent:'}
              </span>
              <span className="text-white font-mono text-sm font-medium">
                {isRental ? `€${price.toLocaleString()}/mo` : formatFullPrice(price)}
              </span>
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

              {/* Alerts Button with Tooltip */}
              <div className="relative mt-3">
                <button
                  onClick={handleAlerts}
                  className="w-full flex items-center justify-center gap-2 px-3 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white rounded-lg font-medium text-sm transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  <Bell className="w-4 h-4" />
                  Set Up Alerts
                </button>

                {/* Tooltip */}
                {showAlertTooltip && (
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg shadow-lg border border-gray-600 z-50 max-w-xs text-center">
                    Set up 3 alerts for free
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-800"></div>
                  </div>
                )}
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

              {/* Compare Similar Button */}
              <button
                onClick={() => setShowComparisonSuggestions(true)}
                className="w-full bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-semibold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Compare Similar Properties
              </button>

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

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => {
          setShowLoginModal(false);
          setLoginModalMessage('');
        }}
        message={loginModalMessage}
      />

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        trigger="save_limit"
        limit={5}
      />

      {/* Comparison Suggestions Modal */}
      <ComparisonSuggestionsModal
        isOpen={showComparisonSuggestions}
        onClose={() => setShowComparisonSuggestions(false)}
        currentProperty={data}
        onAddToComparison={handleAddAnyToComparison}
        onCompare={() => router.push('/tools/compare')}
      />
    </div>
  );
}
