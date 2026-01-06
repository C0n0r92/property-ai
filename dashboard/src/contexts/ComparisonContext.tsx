import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Property, Listing, RentalListing } from '@/types/property';

// Union type for all property types
export type ComparableProperty = (Property | Listing | RentalListing) & {
  _comparisonId: string; // Unique ID for comparison list
  _type: 'sold' | 'listing' | 'rental';
  _addedAt: number; // Timestamp when added
};

interface ComparisonContextType {
  // State
  comparedProperties: ComparableProperty[];
  maxProperties: number;

  // Actions
  addToComparison: (property: Property | Listing | RentalListing, type: 'sold' | 'listing' | 'rental') => boolean;
  removeFromComparison: (comparisonId: string) => void;
  clearComparison: () => void;
  isInComparison: (propertyAddress: string) => boolean;
  getComparisonId: (propertyAddress: string) => string | null;

  // Utilities
  isFull: boolean;
  count: number;
  canAdd: boolean;
}

const ComparisonContext = createContext<ComparisonContextType | undefined>(undefined);

export function ComparisonProvider({ children }: { children: ReactNode }) {
  const MAX_PROPERTIES = 5;
  const STORAGE_KEY = 'property-comparison';

  // Initialize from localStorage
  const [comparedProperties, setComparedProperties] = useState<ComparableProperty[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Persist to localStorage on change
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(comparedProperties));
    } catch (error) {
      console.error('Failed to save comparison to localStorage:', error);
    }
  }, [comparedProperties]);

  const addToComparison = (
    property: Property | Listing | RentalListing,
    type: 'sold' | 'listing' | 'rental'
  ): boolean => {
    // Check if already at max
    if (comparedProperties.length >= MAX_PROPERTIES) {
      return false;
    }

    // Check if already in comparison
    const address = property.address;
    if (comparedProperties.some(p => p.address === address)) {
      return false; // Already added
    }

    // Create comparable property with metadata
    const comparableProperty: ComparableProperty = {
      ...property,
      _comparisonId: `${type}-${address}-${Date.now()}`,
      _type: type,
      _addedAt: Date.now(),
    };

    setComparedProperties(prev => [...prev, comparableProperty]);
    return true;
  };

  const removeFromComparison = (comparisonId: string) => {
    setComparedProperties(prev => prev.filter(p => p._comparisonId !== comparisonId));
  };

  const clearComparison = () => {
    setComparedProperties([]);
  };

  const isInComparison = (propertyAddress: string): boolean => {
    return comparedProperties.some(p => p.address === propertyAddress);
  };

  const getComparisonId = (propertyAddress: string): string | null => {
    const property = comparedProperties.find(p => p.address === propertyAddress);
    return property?._comparisonId || null;
  };

  const value: ComparisonContextType = {
    comparedProperties,
    maxProperties: MAX_PROPERTIES,
    addToComparison,
    removeFromComparison,
    clearComparison,
    isInComparison,
    getComparisonId,
    isFull: comparedProperties.length >= MAX_PROPERTIES,
    count: comparedProperties.length,
    canAdd: comparedProperties.length < MAX_PROPERTIES,
  };

  return (
    <ComparisonContext.Provider value={value}>
      {children}
    </ComparisonContext.Provider>
  );
}

export function useComparison() {
  const context = useContext(ComparisonContext);
  if (!context) {
    throw new Error('useComparison must be used within ComparisonProvider');
  }
  return context;
}

