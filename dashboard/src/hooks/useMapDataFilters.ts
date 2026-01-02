import { useMemo } from 'react';
import type { Property, Listing, RentalListing, RentalStats } from '@/types/property';
import { QUARTER_MONTHS } from '@/lib/map-constants';
import { getDistanceContext } from '@/lib/distance-calculator';

interface UseMapDataFiltersProps {
  properties: Property[];
  listings: Listing[];
  rentals: RentalListing[];
  areaFilter: string | null;
  rentalAvailabilityFilter: 'active' | 'all';
  selectedYear: number | null;
  selectedQuarter: number | null;
  selectedMonth: number | null;
  recentFilter: '6m' | '12m' | null;
  differenceFilter: number | null;
  bedsFilter: number | null;
  propertyTypeFilter: string | null;
  selectedPropertyTypes: string[];
  selectedDistanceBands: string[];
  minPrice: number | null;
  maxPrice: number | null;
  minArea: number | null;
  maxArea: number | null;
  yieldFilter: number | null;
  dataSources: { sold: boolean; forSale: boolean; rentals: boolean; savedOnly: boolean };
  user: any;
  isSaved: (address: string, type: string) => boolean;
}

// Custom hook for data filtering logic
export const useMapDataFilters = ({
  properties,
  listings,
  rentals,
  areaFilter,
  rentalAvailabilityFilter,
  selectedYear,
  selectedQuarter,
  selectedMonth,
  recentFilter,
  differenceFilter,
  bedsFilter,
  propertyTypeFilter,
  selectedPropertyTypes,
  selectedDistanceBands,
  minPrice,
  maxPrice,
  minArea,
  maxArea,
  yieldFilter,
  dataSources,
  user,
  isSaved,
}: UseMapDataFiltersProps) => {

  const availableYears = useMemo(() => {
    const years = new Set<number>();

    // Include years from properties (sold dates)
    properties.forEach(item => {
      if (item.soldDate) {
        years.add(new Date(item.soldDate).getFullYear());
      }
    });

    // For now, we'll only use sold dates from properties
    // Listings and rentals use scrapedAt which isn't meaningful for year filtering

    return Array.from(years).sort((a, b) => b - a); // Most recent first
  }, [properties]);

  // Filter properties based on difference, time, and area filters
  const filteredProperties = useMemo(() => {
    let filtered = properties;

    // Apply area filter first (by Dublin postcode)
    if (areaFilter) {
      filtered = filtered.filter(p => p.dublinPostcode === areaFilter);
    }

    // Apply recent filter (takes priority)
    if (recentFilter) {
      const now = new Date();
      filtered = filtered.filter(p => {
        if (!p.soldDate) return false;
        const soldDate = new Date(p.soldDate);

        if (recentFilter === '6m') {
          const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
          return soldDate >= sixMonthsAgo;
        } else if (recentFilter === '12m') {
          const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
          return soldDate >= oneYearAgo;
        }
        return true;
      });
    }
    // Apply hierarchical year/quarter/month filter
    else if (selectedYear !== null) {
      filtered = filtered.filter(p => {
        if (!p.soldDate) return false;
        const soldDate = new Date(p.soldDate);
        const year = soldDate.getFullYear();
        const month = soldDate.getMonth();

        // Year must match
        if (year !== selectedYear) return false;

        // If quarter is selected, filter by quarter
        if (selectedQuarter !== null) {
          const quarterMonths = QUARTER_MONTHS[selectedQuarter];
          if (!quarterMonths.includes(month)) return false;

          // If month is selected, filter by specific month
          if (selectedMonth !== null && month !== selectedMonth) return false;
        }

        return true;
      });
    }

    // Apply difference filter
    if (differenceFilter !== null) {
      filtered = filtered.filter(p => {
        if (!p.askingPrice || p.askingPrice === 0) return false;
        const percentDiff = ((p.soldPrice - p.askingPrice) / p.askingPrice) * 100;
        return percentDiff >= differenceFilter;
      });
    }

    // Apply bedroom filter
    if (bedsFilter !== null) {
      filtered = filtered.filter(p => {
        if (bedsFilter === 5) return (p.beds || 0) >= 5; // 5+ beds
        return p.beds === bedsFilter;
      });
    }

    // Apply property type filter
    if (selectedPropertyTypes.length > 0) {
      filtered = filtered.filter(p =>
        selectedPropertyTypes.some(type => p.propertyType?.toLowerCase().includes(type.toLowerCase()))
      );
    } else if (propertyTypeFilter !== null) {
      filtered = filtered.filter(p =>
        p.propertyType?.toLowerCase().includes(propertyTypeFilter.toLowerCase())
      );
    }

    // Distance band filter
    if (selectedDistanceBands.length > 0) {
      filtered = filtered.filter(p => {
        if (!p.latitude || !p.longitude) return false;
        const distanceContext = getDistanceContext(p.latitude, p.longitude);
        return selectedDistanceBands.includes(distanceContext.band);
      });
    }

    // Apply price range filter
    if (minPrice !== null) {
      filtered = filtered.filter(p => p.soldPrice >= minPrice);
    }
    if (maxPrice !== null) {
      filtered = filtered.filter(p => p.soldPrice <= maxPrice);
    }

    // Apply area filter
    if (minArea !== null) {
      filtered = filtered.filter(p => (p.areaSqm || 0) >= minArea);
    }
    if (maxArea !== null) {
      filtered = filtered.filter(p => (p.areaSqm || 0) <= maxArea);
    }

    // Apply yield filter
    if (yieldFilter !== null) {
      filtered = filtered.filter(p => {
        const y = p.yieldEstimate?.grossYield;
        return y !== undefined && y !== null && y >= yieldFilter;
      });
    }

    // Apply saved only filter
    if (dataSources.savedOnly && user?.tier === 'premium') {
      filtered = filtered.filter(p => isSaved(p.address, 'listing'));
    }

    return filtered;
  }, [properties, areaFilter, recentFilter, selectedYear, selectedQuarter, selectedMonth, differenceFilter, bedsFilter, propertyTypeFilter, selectedPropertyTypes, selectedDistanceBands, minPrice, maxPrice, minArea, maxArea, yieldFilter, dataSources, user, isSaved]);

  // Filter listings based on area and property type filters
  const filteredListings = useMemo(() => {
    let filtered = listings;

    // Apply area filter (by Dublin postcode)
    if (areaFilter) {
      filtered = filtered.filter(l => l.dublinPostcode === areaFilter);
    }

    // Apply bedroom filter
    if (bedsFilter !== null) {
      filtered = filtered.filter(l => {
        if (bedsFilter === 5) return (l.beds || 0) >= 5; // 5+ beds
        return l.beds === bedsFilter;
      });
    }

    // Apply property type filter
    if (selectedPropertyTypes.length > 0) {
      filtered = filtered.filter(l =>
        selectedPropertyTypes.some(type => l.propertyType?.toLowerCase().includes(type.toLowerCase()))
      );
    } else if (propertyTypeFilter !== null) {
      filtered = filtered.filter(l =>
        l.propertyType?.toLowerCase().includes(propertyTypeFilter.toLowerCase())
      );
    }

    return filtered;
  }, [listings, areaFilter, bedsFilter, propertyTypeFilter, selectedPropertyTypes]);

  // Filter rentals based on area, availability, and property type filters
  const filteredRentals = useMemo(() => {
    let filtered = rentals;

    // Apply area filter (by Dublin postcode)
    if (areaFilter) {
      filtered = filtered.filter(r => r.dublinPostcode === areaFilter);
    }

    // Apply rental availability filter
    if (rentalAvailabilityFilter === 'active') {
      filtered = filtered.filter(r => r.availabilityStatus === 'active');
    }

    // Apply bedroom filter
    if (bedsFilter !== null) {
      filtered = filtered.filter(r => {
        if (bedsFilter === 5) return (r.beds || 0) >= 5; // 5+ beds
        return r.beds === bedsFilter;
      });
    }

    // Apply property type filter
    if (selectedPropertyTypes.length > 0) {
      filtered = filtered.filter(r =>
        selectedPropertyTypes.some(type => r.propertyType?.toLowerCase().includes(type.toLowerCase()))
      );
    } else if (propertyTypeFilter !== null) {
      filtered = filtered.filter(r =>
        r.propertyType?.toLowerCase().includes(propertyTypeFilter.toLowerCase())
      );
    }

    return filtered;
  }, [rentals, areaFilter, rentalAvailabilityFilter, bedsFilter, propertyTypeFilter, selectedPropertyTypes]);

  return {
    availableYears,
    filteredProperties,
    filteredListings,
    filteredRentals,
  };
};
