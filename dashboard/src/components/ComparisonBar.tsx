'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useComparison } from '@/contexts/ComparisonContext';
import { formatFullPrice } from '@/lib/format';
import { X, BarChart3, Plus } from 'lucide-react';

interface ComparisonBarProps {
  selectedProperty?: any; // Property that was clicked but not yet added to comparison
  inlineOnMobile?: boolean; // Whether to render inline on mobile instead of as overlay
  onClearSelection?: () => void; // Callback to clear property selection
  isPropertyCardMinimized?: boolean; // Whether the property card is minimized
}

export function ComparisonBar({ selectedProperty, inlineOnMobile = false, onClearSelection, isPropertyCardMinimized = false }: ComparisonBarProps = {}) {
  const router = useRouter();
  const { comparedProperties, count, maxProperties, removeFromComparison, clearComparison, addToComparison, isInComparison } = useComparison();

  // Handle compare button click
  const handleCompareClick = () => {
    if (count < 2) {
      alert('Please add another property to compare. You need at least 2 properties for comparison.');
      return;
    }

    if (onClearSelection) {
      onClearSelection();
    }
    router.push('/tools/compare');
  };

  // Show bar only if we have compared properties (count > 0)
  if (count === 0 && !selectedProperty) return null;

  // Check if selected property is already in comparison
  const isSelectedPropertyInComparison = selectedProperty ? isInComparison(selectedProperty.address) : false;

  // Handle adding selected property to comparison
  const handleAddSelectedProperty = () => {
    if (selectedProperty && addToComparison) {
      const propertyType = selectedProperty._type === 'sold' ? 'sold' :
                          selectedProperty._type === 'listing' ? 'listing' : 'rental';
      const success = addToComparison(selectedProperty, propertyType);
      if (!success) {
        alert('Maximum 5 properties allowed. Remove one to add another.');
      }
    }
  };

  // Get property display info
  const getPropertyInfo = (property: any) => {
    const price = property.soldPrice || property.askingPrice || property.monthlyRent;
    const isRent = property._type === 'rental';
    return {
      price: price ? formatFullPrice(price) + (isRent ? '/mo' : '') : 'N/A',
      area: property.dublinPostcode || property.address?.split(',')[1]?.trim() || 'TBC',
      type: property._type
    };
  };

  // Simple, clean floating comparison panel
  return (
    <div className="fixed top-4 right-4 z-60 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 max-w-sm w-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Compare Properties ({count}/{maxProperties})
          </h3>
        </div>
        <button
          onClick={clearComparison}
          className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 p-1"
          title="Clear all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Selected Property (if any and not in comparison) */}
      {selectedProperty && !isSelectedPropertyInComparison && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-800 rounded-lg flex items-center justify-center text-blue-600">
              <Plus className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {selectedProperty.address.split(',')[0]}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {getPropertyInfo(selectedProperty).price}
              </p>
              <button
                onClick={handleAddSelectedProperty}
                disabled={count >= maxProperties}
                className="mt-2 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm py-2 px-3 rounded-lg transition-colors"
              >
                {count >= maxProperties ? 'Max Properties Reached' : 'Add to Comparison'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Compared Properties List */}
      <div className="max-h-64 overflow-y-auto">
        {comparedProperties.length === 0 ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            <p className="text-sm">No properties added yet</p>
            <p className="text-xs mt-1">Click on properties to add them</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {comparedProperties.map((property) => {
              const info = getPropertyInfo(property);
              return (
                <div key={property._comparisonId} className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-green-100 dark:bg-green-800 rounded-lg flex items-center justify-center text-green-600 flex-shrink-0">
                      ✓
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {property.address.split(',')[0]}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {info.price}
                      </p>
                    </div>
                    <button
                      onClick={() => removeFromComparison(property._comparisonId)}
                      className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1"
                      title="Remove from comparison"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Compare Button */}
      {count >= 2 && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleCompareClick}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
          >
            Compare {count} Properties
          </button>
        </div>
      )}
    </div>
  );
}
