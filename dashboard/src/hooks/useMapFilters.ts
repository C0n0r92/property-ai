import { useState } from 'react';
import type { DataSourceSelection } from '@/lib/map-constants';
import type { AmenitiesFilter } from '@/types/property';

// Custom hook for managing filter state
export const useMapFilters = () => {
  // Area filter for filtering by Dublin postcode (D2, D7, etc.)
  const [areaFilter, setAreaFilter] = useState<string | null>(null);

  // Rental availability filter (active only vs include historical)
  const [rentalAvailabilityFilter, setRentalAvailabilityFilter] = useState<'active' | 'all'>('active');

  // Data source toggle: allows any combination of sold, forSale, rentals
  const [dataSources, setDataSources] = useState<DataSourceSelection>({
    sold: true,
    forSale: true,
    rentals: true,
    savedOnly: false
  });

  // Hierarchical time filter state (only for sold properties)
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedQuarter, setSelectedQuarter] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [recentFilter, setRecentFilter] = useState<'6m' | '12m' | null>(null);
  const [timeFilter, setTimeFilter] = useState<'today' | 'thisWeek' | 'thisMonth' | 'lastWeek' | 'lastMonth' | null>(null);

  // Property filters
  const [bedsFilter, setBedsFilter] = useState<number | null>(null);
  const [propertyTypeFilter, setPropertyTypeFilter] = useState<string | null>(null);
  const [selectedPropertyTypes, setSelectedPropertyTypes] = useState<string[]>([]);

  // Additional filters
  const [selectedDistanceBands, setSelectedDistanceBands] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState<number | null>(null);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [minArea, setMinArea] = useState<number | null>(null);
  const [maxArea, setMaxArea] = useState<number | null>(null);
  const [yieldFilter, setYieldFilter] = useState<number | null>(null);

  // UI state for filters
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Special filter toggles
  const [priceReducedFilter, setPriceReducedFilter] = useState<boolean>(false);
  const [bestValueFilter, setBestValueFilter] = useState<boolean>(false);

  // Function to clear all filters
  const clearFilters = () => {
    setAreaFilter(null);
    setRentalAvailabilityFilter('active');
    setDataSources({ sold: true, forSale: true, rentals: true, savedOnly: false });
    setSelectedYear(null);
    setSelectedQuarter(null);
    setSelectedMonth(null);
    setRecentFilter(null);
    setTimeFilter(null);
    setBedsFilter(null);
    setPropertyTypeFilter(null);
    setSelectedPropertyTypes([]);
    setSelectedDistanceBands([]);
    setMinPrice(null);
    setMaxPrice(null);
    setMinArea(null);
    setMaxArea(null);
    setYieldFilter(null);
    setPriceReducedFilter(false);
    setBestValueFilter(false);
  };

  return {
    areaFilter,
    setAreaFilter,
    rentalAvailabilityFilter,
    setRentalAvailabilityFilter,
    dataSources,
    setDataSources,
    selectedYear,
    setSelectedYear,
    selectedQuarter,
    setSelectedQuarter,
    selectedMonth,
    setSelectedMonth,
    recentFilter,
    setRecentFilter,
    timeFilter,
    setTimeFilter,
    bedsFilter,
    setBedsFilter,
    propertyTypeFilter,
    setPropertyTypeFilter,
    selectedPropertyTypes,
    setSelectedPropertyTypes,
    selectedDistanceBands,
    setSelectedDistanceBands,
    minPrice,
    setMinPrice,
    maxPrice,
    setMaxPrice,
    minArea,
    setMinArea,
    maxArea,
    setMaxArea,
    yieldFilter,
    setYieldFilter,
    showAdvancedFilters,
    setShowAdvancedFilters,
    priceReducedFilter,
    setPriceReducedFilter,
    bestValueFilter,
    setBestValueFilter,
    clearFilters,
  };
};
