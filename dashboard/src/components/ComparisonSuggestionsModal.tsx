'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Bed, Bath, Ruler, Plus, Check } from 'lucide-react';
import { formatFullPrice } from '@/lib/format';
import type { Property, Listing, RentalListing } from '@/types/property';

interface ComparisonSuggestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProperty: Property | Listing | RentalListing | null;
  onAddToComparison: (property: Property | Listing | RentalListing, type: 'sold' | 'listing' | 'rental') => void;
  onCompare: () => void;
}

interface SuggestedProperty {
  property: Property | Listing | RentalListing;
  type: 'sold' | 'listing' | 'rental';
  matchScore: number;
  reasons: string[];
}

export function ComparisonSuggestionsModal({
  isOpen,
  onClose,
  currentProperty,
  onAddToComparison,
  onCompare
}: ComparisonSuggestionsModalProps) {
  const [suggestedProperties, setSuggestedProperties] = useState<SuggestedProperty[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProperties, setSelectedProperties] = useState<Set<string>>(new Set());

  // Find similar properties when modal opens
  useEffect(() => {
    if (isOpen && currentProperty) {
      findSimilarProperties();
    }
  }, [isOpen, currentProperty]);

  const findSimilarProperties = async () => {
    if (!currentProperty) return;

    setLoading(true);
    try {
      // Get all properties data
      const [soldRes, listingsRes, rentalsRes] = await Promise.all([
        fetch('/api/properties?type=sold&limit=100'),
        fetch('/api/properties?type=listing&limit=100'),
        fetch('/api/properties?type=rental&limit=100')
      ]);

      const [soldData, listingsData, rentalsData] = await Promise.all([
        soldRes.json(),
        listingsRes.json(),
        rentalsRes.json()
      ]);

      const allProperties: Array<{property: any, type: 'sold' | 'listing' | 'rental'}> = [
        ...soldData.properties.map((p: any) => ({ property: p, type: 'sold' as const })),
        ...listingsData.properties.map((p: any) => ({ property: p, type: 'listing' as const })),
        ...rentalsData.properties.map((p: any) => ({ property: p, type: 'rental' as const }))
      ];

      // Filter out current property and deduplicate by address
      const propertyKey = (p: any) => `${p.property.address?.toLowerCase().trim()}-${p.property.beds || 0}-${p.property.areaSqm || 0}`;

      // Remove current property and group by unique property keys
      const propertyMap = new Map<string, {property: any, type: 'sold' | 'listing' | 'rental'}>();

      allProperties.forEach(({ property, type }) => {
        const key = propertyKey({ property });
        const currentKey = propertyKey({ property: currentProperty });

        // Skip current property
        if (key === currentKey) return;

        // If we haven't seen this property before, or if this is a more current listing type
        if (!propertyMap.has(key)) {
          propertyMap.set(key, { property, type });
        } else {
          // Prefer more current types: listing > rental > sold
          const existing = propertyMap.get(key)!;
          const typePriority = { listing: 3, rental: 2, sold: 1 };
          if (typePriority[type] > typePriority[existing.type]) {
            propertyMap.set(key, { property, type });
          }
        }
      });

      const otherProperties = Array.from(propertyMap.values());

      // Score and rank similar properties
      const scored = otherProperties.map(({ property, type }) => {
        const score = calculateSimilarityScore(currentProperty, property);
        return {
          property,
          type,
          matchScore: score,
          reasons: getSimilarityReasons(currentProperty, property)
        };
      });

      // Sort by score and take top 4
      const topSuggestions = scored
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, 4);

      setSuggestedProperties(topSuggestions);
    } catch (error) {
      console.error('Failed to find similar properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateSimilarityScore = (prop1: any, prop2: any): number => {
    let score = 0;

    // Same postcode (highest weight)
    if (prop1.dublinPostcode === prop2.dublinPostcode) {
      score += 40;
    }

    // Similar price (±30%)
    const price1 = prop1.soldPrice || prop1.askingPrice || prop1.monthlyRent || 0;
    const price2 = prop2.soldPrice || prop2.askingPrice || prop2.monthlyRent || 0;
    if (price1 > 0 && price2 > 0) {
      const ratio = Math.min(price1, price2) / Math.max(price1, price2);
      if (ratio > 0.7) score += 25;
    }

    // Same bedroom count
    if (prop1.beds === prop2.beds) {
      score += 20;
    }

    // Same property type
    if (prop1.propertyType === prop2.propertyType) {
      score += 15;
    }

    return score;
  };

  const getSimilarityReasons = (prop1: any, prop2: any): string[] => {
    const reasons: string[] = [];

    if (prop1.dublinPostcode === prop2.dublinPostcode) {
      reasons.push('Same area');
    }

    const price1 = prop1.soldPrice || prop1.askingPrice || prop1.monthlyRent || 0;
    const price2 = prop2.soldPrice || prop2.askingPrice || prop2.monthlyRent || 0;
    if (price1 > 0 && price2 > 0) {
      const ratio = Math.min(price1, price2) / Math.max(price1, price2);
      if (ratio > 0.7) {
        reasons.push('Similar price');
      }
    }

    if (prop1.beds === prop2.beds) {
      reasons.push('Same bedrooms');
    }

    if (prop1.propertyType === prop2.propertyType) {
      reasons.push('Same type');
    }

    return reasons;
  };

  const togglePropertySelection = (propertyKey: string) => {
    const newSelected = new Set(selectedProperties);
    if (newSelected.has(propertyKey)) {
      newSelected.delete(propertyKey);
    } else {
      newSelected.add(propertyKey);
    }
    setSelectedProperties(newSelected);
  };

  const handleCompareSelected = () => {
    // Add selected properties to comparison
    selectedProperties.forEach(propertyKey => {
      const suggestion = suggestedProperties.find(s =>
        `${s.property.address}-${s.type}` === propertyKey
      );
      if (suggestion) {
        onAddToComparison(suggestion.property, suggestion.type);
      }
    });

    // Close modal and navigate to comparison
    onClose();
    onCompare();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ y: '20%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '20%', opacity: 0 }}
          className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-100">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Compare Similar Properties</h3>
              <p className="text-slate-600 text-sm mt-1">
                Find comparable properties in {currentProperty?.dublinPostcode || 'the same area'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="ml-3 text-slate-600">Finding similar properties...</span>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-sm text-slate-600 mb-4">
                  Select properties to compare with <strong>{currentProperty?.address.split(',')[0]}</strong>
                </div>

                {suggestedProperties.map((suggestion, index) => {
                  const propertyKey = `${suggestion.property.address}-${suggestion.type}`;
                  const isSelected = selectedProperties.has(propertyKey);

                  return (
                    <div
                      key={propertyKey}
                      className={`border rounded-lg p-4 transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => togglePropertySelection(propertyKey)}
                          className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-slate-900 truncate">
                                {suggestion.property.address.split(',')[0]}
                              </h4>
                              <div className="flex items-center gap-4 mt-1 text-sm text-slate-600">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  suggestion.type === 'sold' ? 'bg-blue-100 text-blue-800' :
                                  suggestion.type === 'listing' ? 'bg-rose-100 text-rose-800' :
                                  'bg-purple-100 text-purple-800'
                                }`}>
                                  {suggestion.type === 'sold' ? 'Sold' :
                                   suggestion.type === 'listing' ? 'For Sale' : 'For Rent'}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Bed className="w-3 h-3" />
                                  {suggestion.property.beds || 0}
                                </span>
                                {suggestion.property.areaSqm && (
                                  <span className="flex items-center gap-1">
                                    <Ruler className="w-3 h-3" />
                                    {suggestion.property.areaSqm}m²
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="text-right ml-4">
                              <div className="font-bold text-lg text-slate-900">
                                {formatFullPrice(
                                  (suggestion.property as any).soldPrice ||
                                  (suggestion.property as any).askingPrice ||
                                  (suggestion.property as any).monthlyRent || 0
                                )}
                                {suggestion.type === 'rental' && (suggestion.property as any).monthlyRent ? '/mo' : ''}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-slate-500">Why similar:</span>
                            {suggestion.reasons.map((reason, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded"
                              >
                                {reason}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {suggestedProperties.length === 0 && (
                  <div className="text-center py-12 text-slate-500">
                    <div className="text-sm">No similar properties found</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          {selectedProperties.size > 0 && (
            <div className="flex items-center justify-between p-6 border-t border-slate-100 bg-slate-50">
              <div className="text-sm text-slate-600">
                {selectedProperties.size} propert{selectedProperties.size === 1 ? 'y' : 'ies'} selected
              </div>
              <button
                onClick={handleCompareSelected}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <span>Compare Selected</span>
                <Check className="w-4 h-4" />
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
