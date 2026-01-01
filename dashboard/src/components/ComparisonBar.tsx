'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useComparison } from '@/contexts/ComparisonContext';
import { formatFullPrice } from '@/lib/format';

interface ComparisonBarProps {
  selectedProperty?: any; // Property that was clicked but not yet added to comparison
  inlineOnMobile?: boolean; // Whether to render inline on mobile instead of as overlay
  onClearSelection?: () => void; // Callback to clear property selection
  isPropertyCardMinimized?: boolean; // Whether the property card is minimized
}

export function ComparisonBar({ selectedProperty, inlineOnMobile = false, onClearSelection, isPropertyCardMinimized = false }: ComparisonBarProps = {}) {
  const router = useRouter();
  const { comparedProperties, count, maxProperties, removeFromComparison, clearComparison, addToComparison, isInComparison } = useComparison();

  // Start collapsed on mobile, expanded on desktop
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768; // Collapsed on mobile, expanded on desktop
    }
    return true; // Default to collapsed for SSR
  });



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
  if (count === 0) return null;

  // Inline mobile rendering
  if (inlineOnMobile) {
    return (
      <button
        onClick={handleCompareClick}
        title="Click to compare multiple properties with AI-powered analysis and insights"
        className="px-3 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-1.5 bg-blue-600 text-white hover:bg-blue-700 md:hidden"
      >
        {count > 1 ? `Compare (${count})` : 'Add to compare'}
      </button>
    );
  }

  // Hide overlay on mobile when inlineOnMobile is false
  if (typeof window !== 'undefined' && window.innerWidth < 768) {
    return null;
  }

  // Only show when property card is minimized
  if (!isPropertyCardMinimized) {
    return null;
  }

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

  // Position for minimized state - under/below the property card
  const hasPropertyOpen = !!selectedProperty;
  const mobilePosition = 'sm:bottom-20'; // Position above the minimized card (which is at bottom-4)

  if (isCollapsed) {
    return (
      <div className={`absolute z-60
                      lg:top-4 lg:right-4
                      md:top-4 md:right-4
                      ${isPropertyCardMinimized ? 'sm:bottom-24 sm:left-4 sm:right-4' : `${mobilePosition} sm:right-4`}`}>

        <button
          onClick={count > 0 ? handleCompareClick : () => setIsCollapsed(false)}
          title={count > 0 ? "Click to compare multiple properties with AI-powered analysis and insights" : "Click to expand comparison panel"}
          className="bg-blue-600 text-white px-3 py-2 rounded-lg shadow-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-semibold
                     lg:px-3 lg:py-2
                     sm:px-3 sm:py-2 sm:text-sm sm:font-bold"
        >
          {count > 1 ? `Compare Now (${count})` : count === 1 ? 'Add another to compare' : 'Add to Comparison'}
          <span className="ml-1 lg:inline sm:hidden">→</span>
        </button>
      </div>
    );
  }

  return (
    <div className={`absolute z-60 bg-white border border-slate-200 rounded-lg shadow-xl overflow-y-auto
                    lg:top-4 lg:right-4 lg:w-80 lg:max-h-[calc(100vh-120px)]
                    md:top-4 md:right-4 md:w-72 md:max-h-[calc(100vh-120px)]
                    ${isPropertyCardMinimized ? 'sm:bottom-24 sm:left-4 sm:right-4 sm:w-auto sm:max-w-sm sm:max-h-32' : hasPropertyOpen ? 'sm:top-20' : 'sm:top-4 sm:left-4 sm:right-4 sm:w-auto sm:max-w-sm sm:max-h-32'}`}>
      <div className={`${hasPropertyOpen ? 'sm:p-2' : 'p-4'} md:p-4`}>
        {/* Header */}
        <div className={`flex items-center justify-between ${hasPropertyOpen ? 'sm:mb-1' : 'mb-3'}`}>
          <h3 className={`${hasPropertyOpen ? 'sm:text-xs' : 'text-sm'} font-bold text-slate-900`}>
            {count > 0 ? `Comparing ${count} of ${maxProperties}` : 'Add to Comparison'}
          </h3>
          <button
            onClick={() => setIsCollapsed(true)}
            className="text-slate-400 hover:text-slate-600 text-sm"
            title="Minimize"
          >
            ←
          </button>
        </div>

        {/* Selected Property (if any) */}
        {selectedProperty && (
          <div className={`${hasPropertyOpen ? 'sm:mb-2 sm:p-2' : 'mb-4 p-3'} border rounded-lg ${isSelectedPropertyInComparison ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}`}>
            <div className="flex items-start gap-3">
              <div className={`${hasPropertyOpen ? 'sm:w-8 sm:h-8' : 'w-12 h-12'} rounded flex items-center justify-center flex-shrink-0 ${isSelectedPropertyInComparison ? 'bg-green-200' : 'bg-slate-200'}`}>
                🏠
              </div>
              <div className="flex-1 min-w-0">
                <h4 className={`${hasPropertyOpen ? 'sm:text-xs' : 'text-sm'} font-semibold text-slate-900 truncate`}>
                  {selectedProperty.address.split(',')[0]}
                </h4>
                <p className={`${hasPropertyOpen ? 'sm:text-[10px]' : 'text-xs'} text-slate-600`}>
                  {getPropertyInfo(selectedProperty).area}
                </p>
                <p className={`${hasPropertyOpen ? 'sm:text-xs' : 'text-sm'} font-medium ${isSelectedPropertyInComparison ? 'text-green-600' : 'text-blue-600'}`}>
                  {getPropertyInfo(selectedProperty).price}
                </p>
                {isSelectedPropertyInComparison ? (
                  <div className={`mt-2 w-full bg-green-600 text-white ${hasPropertyOpen ? 'sm:text-[10px] sm:py-1 sm:px-2' : 'text-xs py-1.5 px-3'} rounded text-center`}>
                    Already in Comparison
                  </div>
                ) : (
                  <button
                    onClick={handleAddSelectedProperty}
                    disabled={count >= maxProperties}
                    className={`mt-2 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white ${hasPropertyOpen ? 'sm:text-[10px] sm:py-1 sm:px-2' : 'text-xs py-1.5 px-3'} rounded transition-colors`}
                  >
                    {count >= maxProperties ? 'Max Properties Reached' : 'Add to Comparison'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Property List */}
        <div className={`space-y-2 ${hasPropertyOpen ? 'sm:max-h-16' : 'max-h-48'} overflow-y-auto`}>
          {comparedProperties.map((property) => {
            const info = getPropertyInfo(property);
            return (
              <div
                key={property._comparisonId}
                className="flex items-center gap-3 bg-slate-50 rounded-lg p-2 border border-slate-200 hover:border-blue-400 transition-colors group"
              >
                <div className="w-10 h-10 bg-slate-200 rounded flex items-center justify-center text-sm flex-shrink-0">
                  🏠
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-slate-900 truncate" title={property.address}>
                    {property.address.split(',')[0]}
                  </div>
                  <div className="text-xs text-blue-600 font-medium">
                    {info.price}
                  </div>
                </div>

                <button
                  onClick={() => removeFromComparison(property._comparisonId)}
                  className="text-red-600 hover:text-red-700 text-sm opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  title="Remove from comparison"
                >
Remove
                </button>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className={`${hasPropertyOpen ? 'sm:mt-2 sm:pt-2' : 'mt-4 pt-3'} border-t border-slate-200 space-y-2`}>
          {count > 0 && (
            <button
              onClick={handleCompareClick}
              title="Click to compare multiple properties with AI-powered analysis and insights"
              className={`w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white ${hasPropertyOpen ? 'sm:text-xs sm:py-1.5 sm:px-2' : 'text-sm py-2.5 px-3'} rounded-lg font-semibold transition-all duration-200 shadow-md hover:shadow-lg`}
            >
              {count > 1 ? `Compare Now (${count} properties)` : 'Add another property to compare'}
            </button>
          )}

          <div className={`flex items-center gap-2 ${hasPropertyOpen ? 'sm:hidden' : ''}`}>
            <button
              onClick={clearComparison}
              className={`${hasPropertyOpen ? 'sm:text-[10px]' : 'text-xs'} text-red-600 hover:text-red-700 hover:underline`}
            >
              Clear All
            </button>
            <span className="text-slate-300">•</span>
            <button
              onClick={() => router.push('/map')}
              className={`${hasPropertyOpen ? 'sm:text-[10px]' : 'text-xs'} text-blue-600 hover:text-blue-700 hover:underline`}
            >
              Add More
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
