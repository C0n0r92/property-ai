'use client';

import { useState, useRef, useEffect } from 'react';
import { useComparison } from '@/contexts/ComparisonContext';
import type { Property, Listing, RentalListing } from '@/types/property';
import { formatFullPrice } from '@/lib/format';

interface AddToCompareButtonProps {
  property: Property | Listing | RentalListing;
  type: 'sold' | 'listing' | 'rental';
  variant?: 'button' | 'checkbox' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
}

export function AddToCompareButton({
  property,
  type,
  variant = 'button',
  size = 'md',
  className = '',
  onClick
}: AddToCompareButtonProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { addToComparison, isInComparison, removeFromComparison, getComparisonId, clearComparison, comparedProperties, isFull, canAdd } = useComparison();

  const isAdded = isInComparison(property.address);
  const comparisonId = getComparisonId(property.address);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const handleToggle = () => {
    if (isAdded && comparisonId) {
      removeFromComparison(comparisonId);
      // Call optional onClick callback when removing
      if (onClick) {
        onClick();
      }
    } else {
      const success = addToComparison(property, type);
      if (!success && isFull) {
        // Show dropdown to manage comparison instead of alert
        setShowDropdown(true);
        // Don't call onClick callback when showing dropdown
        return;
      } else {
        // Call optional onClick callback when successfully adding
        if (onClick) {
          onClick();
        }
      }
    }
  };

  const handleDropdownToggle = () => {
    console.log('Dropdown toggle clicked, current state:', showDropdown);
    setShowDropdown(!showDropdown);
  };

  const baseClasses = {
    button: `
      inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200
      ${size === 'sm' ? 'px-2 py-1.5 text-xs' : size === 'lg' ? 'px-4 py-3 text-base w-full' : 'px-3 py-2 text-sm'}
      ${isAdded
        ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-200'
        : isFull
        ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
        : 'bg-white border border-slate-300 text-slate-700 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50'
      }
      ${className}
    `,
    checkbox: `flex items-center gap-2 cursor-pointer ${className}`,
    icon: `
      rounded-lg transition-all duration-200 border font-medium
      ${isAdded
        ? 'bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200'
        : isFull
        ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200'
        : 'bg-white text-slate-700 border-slate-300 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 shadow-sm hover:shadow'
      }
      ${className}
    `
  };

  // Button variant
  if (variant === 'button') {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={comparedProperties.length > 0 ? handleDropdownToggle : handleToggle}
          disabled={!isAdded && isFull && comparedProperties.length === 0}
          className={`${baseClasses.button} ${comparedProperties.length > 0 ? 'cursor-pointer' : ''}`}
          title={comparedProperties.length > 0 ? 'Manage comparison' : (!isAdded && isFull ? 'Maximum 5 properties' : undefined)}
        >
          {isAdded ? (
            <>
              <span className="text-blue-600">✓</span>
              Comparing Property
              {comparedProperties.length > 1 && (
                <span className="ml-1 bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 rounded-full">
                  {comparedProperties.length}
                </span>
              )}
            </>
          ) : isFull ? (
            <>
              <span className="text-orange-600">⚠</span>
              Manage Comparison
              <span className="ml-1 bg-orange-100 text-orange-700 text-xs px-1.5 py-0.5 rounded-full">
                {comparedProperties.length}
              </span>
            </>
          ) : (
            <>
              <span>+</span>
              Compare Property
            </>
          )}
          {comparedProperties.length > 0 && (
            <svg
              className={`w-4 h-4 ml-1 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </button>

        {/* Dropdown for managing comparison */}
        {showDropdown && comparedProperties.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-red-500 rounded-lg shadow-xl z-[9999] max-h-64 overflow-y-auto"
               style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px' }}>
            <div className="p-3">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-slate-900">
                  Comparison ({comparedProperties.length}/5)
                </h4>
                <button
                  onClick={() => setShowDropdown(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  ×
                </button>
              </div>

              <div className="space-y-2 mb-3">
                {comparedProperties.map((prop) => {
                  let price: number | undefined;
                  let isRent = false;

                  if (prop._type === 'sold' && 'soldPrice' in prop) {
                    price = prop.soldPrice || prop.askingPrice;
                  } else if (prop._type === 'listing' && 'askingPrice' in prop) {
                    price = prop.askingPrice;
                  } else if (prop._type === 'rental' && 'monthlyRent' in prop) {
                    price = prop.monthlyRent;
                    isRent = true;
                  }

                  const formattedPrice = price ? formatFullPrice(price) + (isRent ? '/mo' : '') : 'N/A';

                  return (
                    <div key={prop._comparisonId} className="flex items-center justify-between p-2 bg-slate-50 rounded border">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-slate-900 truncate">
                          {prop.address.split(',')[0]}
                        </div>
                        <div className="text-xs text-slate-600">
                          {formattedPrice}
                        </div>
                      </div>
                      <button
                        onClick={() => removeFromComparison(prop._comparisonId)}
                        className="text-red-600 hover:text-red-700 ml-2 flex-shrink-0"
                        title="Remove from comparison"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={clearComparison}
                  className="flex-1 px-3 py-2 text-xs bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                >
                  Clear All
                </button>
                <button
                  onClick={() => {
                    setShowDropdown(false);
                    window.location.href = '/tools/compare';
                  }}
                  className="flex-1 px-3 py-2 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                >
                  Compare Now
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Checkbox variant
  if (variant === 'checkbox') {
    return (
      <label className={baseClasses.checkbox}>
        <input
          type="checkbox"
          checked={isAdded}
          onChange={handleToggle}
          disabled={!isAdded && isFull}
          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 focus:ring-2"
        />
        <span className={`text-sm ${isAdded ? 'text-blue-700' : 'text-slate-700'}`}>
          Compare Property
        </span>
      </label>
    );
  }

  // Icon variant
  return (
    <button
      onClick={handleToggle}
      disabled={!isAdded && isFull}
      className={`${baseClasses.icon} flex items-center gap-1.5 ${size === 'sm' ? 'px-2 py-1.5 text-xs' : 'px-3 py-2 text-sm'}`}
      title={isAdded ? 'Remove from comparison' : isFull ? 'Maximum 5 properties' : 'Add to comparison'}
    >
      {isAdded ? (
        <>
          <span className="text-blue-600 font-bold">✓</span>
          <span className="hidden sm:inline">Comparing Property</span>
        </>
      ) : (
        <>
          <span className="font-bold text-lg leading-none">+</span>
          <span className="hidden sm:inline">Compare Property</span>
        </>
      )}
    </button>
  );
}
