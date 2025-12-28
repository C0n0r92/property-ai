'use client';

import { useComparison } from '@/contexts/ComparisonContext';
import type { Property, Listing, RentalListing } from '@/types/property';

interface AddToCompareButtonProps {
  property: Property | Listing | RentalListing;
  type: 'sold' | 'listing' | 'rental';
  variant?: 'button' | 'checkbox' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function AddToCompareButton({
  property,
  type,
  variant = 'button',
  size = 'md',
  className = ''
}: AddToCompareButtonProps) {
  const { addToComparison, isInComparison, removeFromComparison, getComparisonId, isFull, canAdd } = useComparison();

  const isAdded = isInComparison(property.address);
  const comparisonId = getComparisonId(property.address);

  const handleToggle = () => {
    if (isAdded && comparisonId) {
      removeFromComparison(comparisonId);
    } else {
      const success = addToComparison(property, type);
      if (!success && isFull) {
        alert('Maximum 5 properties. Remove one to add another.');
      }
    }
  };

  const baseClasses = {
    button: `
      inline-flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all duration-200
      ${size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm'}
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
      <button
        onClick={handleToggle}
        disabled={!isAdded && isFull}
        className={baseClasses.button}
        title={!isAdded && isFull ? 'Maximum 5 properties' : undefined}
      >
        {isAdded ? (
          <>
            <span className="text-blue-600">✓</span>
            Comparing
          </>
        ) : (
          <>
            <span>+</span>
            Compare
          </>
        )}
      </button>
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
          Compare
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
          <span className="hidden sm:inline">Comparing</span>
        </>
      ) : (
        <>
          <span className="font-bold text-lg leading-none">+</span>
          <span className="hidden sm:inline">Compare</span>
        </>
      )}
    </button>
  );
}
