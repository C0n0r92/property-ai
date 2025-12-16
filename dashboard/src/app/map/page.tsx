'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { formatFullPrice } from '@/lib/format';
import type { Property, Listing, RentalListing, RentalStats } from '@/types/property';
import { SpiderfyManager, SpiderFeature } from '@/lib/spiderfy';
import { analytics } from '@/lib/analytics';

// Mapbox access token
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
mapboxgl.accessToken = MAPBOX_TOKEN;

type DifferenceFilter = 'all' | 'over' | 'under' | 'exact';

// Data source selection - allows any combination
interface DataSourceSelection {
  sold: boolean;
  forSale: boolean;
  rentals: boolean;
}

// Month names for display
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const QUARTER_MONTHS: Record<number, number[]> = {
  1: [0, 1, 2],   // Q1: Jan, Feb, Mar
  2: [3, 4, 5],   // Q2: Apr, May, Jun
  3: [6, 7, 8],   // Q3: Jul, Aug, Sep
  4: [9, 10, 11], // Q4: Oct, Nov, Dec
};

// Common Dublin areas for quick access
const DUBLIN_AREAS = [
  { name: 'Dublin City Centre', coords: [-6.2603, 53.3498], zoom: 14 },
  { name: 'Dublin 1', coords: [-6.2603, 53.3528], zoom: 14 },
  { name: 'Dublin 2', coords: [-6.2550, 53.3380], zoom: 14 },
  { name: 'Dublin 4', coords: [-6.2280, 53.3280], zoom: 14 },
  { name: 'Dublin 6', coords: [-6.2650, 53.3200], zoom: 14 },
  { name: 'Dublin 8', coords: [-6.2900, 53.3380], zoom: 14 },
  { name: 'Rathmines', coords: [-6.2650, 53.3220], zoom: 15 },
  { name: 'Ranelagh', coords: [-6.2580, 53.3260], zoom: 15 },
  { name: 'Drumcondra', coords: [-6.2550, 53.3700], zoom: 15 },
  { name: 'Sandymount', coords: [-6.2180, 53.3320], zoom: 15 },
  { name: 'Clontarf', coords: [-6.1900, 53.3650], zoom: 15 },
  { name: 'Howth', coords: [-6.0650, 53.3870], zoom: 14 },
  { name: 'Dun Laoghaire', coords: [-6.1350, 53.2940], zoom: 14 },
  { name: 'Blackrock', coords: [-6.1780, 53.3020], zoom: 15 },
  { name: 'Stillorgan', coords: [-6.2000, 53.2880], zoom: 15 },
  { name: 'Dundrum', coords: [-6.2450, 53.2920], zoom: 15 },
  { name: 'Tallaght', coords: [-6.3740, 53.2870], zoom: 14 },
  { name: 'Blanchardstown', coords: [-6.3880, 53.3930], zoom: 14 },
  { name: 'Swords', coords: [-6.2180, 53.4600], zoom: 14 },
];

export default function MapPage() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const spiderfyManager = useRef<SpiderfyManager | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [rentals, setRentals] = useState<RentalListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [selectedRental, setSelectedRental] = useState<RentalListing | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(11); // Track zoom for legend display
  const [viewMode, setViewMode] = useState<'clusters' | 'price' | 'difference'>('clusters');
  const [differenceFilter, setDifferenceFilter] = useState<DifferenceFilter>('all');
  
  // Data source toggle: allows any combination of sold, forSale, rentals
  const [dataSources, setDataSources] = useState<DataSourceSelection>({ sold: true, forSale: false, rentals: false });
  
  // Hierarchical time filter state (only for sold properties)
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedQuarter, setSelectedQuarter] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [recentFilter, setRecentFilter] = useState<'6m' | '12m' | null>(null);
  
  const [stats, setStats] = useState({ total: 0, avgPrice: 0, avgPricePerSqm: 0, overAsking: 0, underAsking: 0 });
  const [listingStats, setListingStats] = useState({ totalListings: 0, medianPrice: 0, avgPricePerSqm: 0 });
  const [rentalStats, setRentalStats] = useState<RentalStats>({ totalRentals: 0, medianRent: 0, avgRentPerSqm: 0, rentRange: { min: 0, max: 0 } });
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ place_name: string; center: [number, number] }>>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  // Collapsible filter panel state
  const [showFilters, setShowFilters] = useState(true);
  
  // New filter states
  const [bedsFilter, setBedsFilter] = useState<number | null>(null);
  const [propertyTypeFilter, setPropertyTypeFilter] = useState<string | null>(null);
  const [minPrice, setMinPrice] = useState<number | null>(null);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [minArea, setMinArea] = useState<number | null>(null);
  const [maxArea, setMaxArea] = useState<number | null>(null);
  const [yieldFilter, setYieldFilter] = useState<'any' | 'high' | 'medium' | 'low' | null>(null);

  // Analytics-wrapped state setters
  const handleViewModeChange = (mode: 'clusters' | 'price' | 'difference') => {
    setViewMode(mode);
    analytics.mapViewModeChanged(mode);
  };

  const toggleDataSource = (source: keyof DataSourceSelection) => {
    setDataSources(prev => {
      const newSources = { ...prev, [source]: !prev[source] };
      // Ensure at least one source is selected
      if (!newSources.sold && !newSources.forSale && !newSources.rentals) {
        return prev; // Don't allow deselecting all
      }
      // If sold is being deselected and we're in difference view, switch to clusters
      if (source === 'sold' && prev.sold && !newSources.sold && viewMode === 'difference') {
        setViewMode('clusters');
      }
      return newSources;
    });
    analytics.mapDataSourceChanged(source);
    setSelectedProperty(null);
    setSelectedListing(null);
    setSelectedRental(null);
  };
  
  // Helper to check if only one source type is active
  const isSingleSource = (source: keyof DataSourceSelection) => {
    return dataSources[source] && 
      Object.entries(dataSources).filter(([_, v]) => v).length === 1;
  };
  
  // Helper to check active source count
  const activeSourceCount = Object.values(dataSources).filter(Boolean).length;

  const handleFilterChange = (filterType: string, value: string) => {
    analytics.mapFilterApplied(filterType, value);
  };

  const handleClearFilters = () => {
    setSelectedYear(null);
    setSelectedQuarter(null);
    setSelectedMonth(null);
    setRecentFilter(null);
    setBedsFilter(null);
    setPropertyTypeFilter(null);
    setMinPrice(null);
    setMaxPrice(null);
    setMinArea(null);
    setMaxArea(null);
    setYieldFilter(null);
    setDifferenceFilter('all');
    analytics.filtersCleared();
  };

  // Search for location using Mapbox Geocoding API
  const searchLocation = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    try {
      // Bias search towards Dublin
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?` +
        `access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''}&` +
        `country=IE&` +
        `bbox=-6.6,53.1,-5.9,53.6&` + // Dublin bounding box
        `limit=5`
      );
      const data = await response.json();
      setSearchResults(data.features || []);
      setShowSearchResults(true);
    } catch (error) {
      console.error('Search error:', error);
    }
    setIsSearching(false);
  };

  // Debounced search
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    searchTimeout.current = setTimeout(() => {
      searchLocation(value);
    }, 300);
  };

  // Fly to location
  const flyToLocation = (coords: [number, number], zoom: number = 14) => {
    if (map.current) {
      map.current.flyTo({
        center: coords,
        zoom: zoom,
        duration: 1500,
      });
    }
    setShowSearchResults(false);
    setSearchQuery('');
  };

  // Handle spider feature click (when user clicks on a spiderfied marker)
  const handleSpiderFeatureClick = useCallback((spiderFeature: SpiderFeature) => {
    const props = spiderFeature.properties;
    if (props?.isRental) {
      // Find the full rental object from the rentals array
      const fullRental = rentals.find(r => r.address === props?.address);
      if (fullRental) {
        setSelectedRental(fullRental);
        analytics.mapPropertyClicked('rental');
      }
      setSelectedProperty(null);
      setSelectedListing(null);
    } else if (props?.isListing) {
      // Find the full listing object from the listings array
      const fullListing = listings.find(l => l.address === props?.address);
      if (fullListing) {
        setSelectedListing(fullListing);
        analytics.mapPropertyClicked('forSale');
      }
      setSelectedProperty(null);
      setSelectedRental(null);
    } else {
      // Find the full property object from the properties array
      const fullProperty = properties.find(p => p.address === props?.address);
      if (fullProperty) {
        setSelectedProperty(fullProperty);
        analytics.mapPropertyClicked('sold');
      }
      setSelectedListing(null);
      setSelectedRental(null);
    }
  }, [rentals, listings, properties]);

  // Load properties data on mount
  useEffect(() => {
    // Fetch ALL sold properties for the map (clustering handles performance)
    fetch('/api/properties?limit=50000')
      .then(res => res.json())
      .then(data => {
        const propsWithCoords = data.properties.filter((p: Property) => p.latitude && p.longitude);
        
        // Calculate over/under asking from map data
        const withAsking = propsWithCoords.filter((p: Property) => p.askingPrice && p.askingPrice > 0);
        const overAsking = withAsking.filter((p: Property) => p.soldPrice > p.askingPrice!).length;
        const underAsking = withAsking.filter((p: Property) => p.soldPrice < p.askingPrice!).length;
        
        setProperties(propsWithCoords);
        
        // Set map-specific counts
        setStats(prev => ({
          ...prev,
          total: propsWithCoords.length,
          overAsking,
          underAsking,
        }));
        if (dataSources.sold) {
          setLoading(false);
        }
      });

    // Fetch true Dublin-wide stats from stats API
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => {
        setStats(prev => ({
          ...prev,
          avgPrice: data.stats.medianPrice,
          avgPricePerSqm: data.stats.avgPricePerSqm,
        }));
      });
      
    // Fetch listings for For Sale mode
    fetch('/api/listings?limit=50000')
      .then(res => res.json())
      .then(data => {
        const listingsWithCoords = (data.listings || []).filter((l: Listing) => l.latitude && l.longitude);
        setListings(listingsWithCoords);
        setListingStats({
          totalListings: listingsWithCoords.length,
          medianPrice: data.stats?.medianPrice || 0,
          avgPricePerSqm: data.stats?.avgPricePerSqm || 0,
        });
        if (dataSources.forSale) {
          setLoading(false);
        }
      })
      .catch(() => {
        // Listings file may not exist yet
        setListings([]);
        if (dataSources.forSale) {
          setLoading(false);
        }
      });
    
    // Fetch rentals for Rentals mode
    fetch('/api/rentals?limit=50000')
      .then(res => res.json())
      .then(data => {
        const rentalsWithCoords = (data.rentals || []).filter((r: RentalListing) => r.latitude && r.longitude);
        setRentals(rentalsWithCoords);
        setRentalStats(data.stats || { totalRentals: 0, medianRent: 0, avgRentPerSqm: 0, rentRange: { min: 0, max: 0 } });
        if (dataSources.rentals) {
          setLoading(false);
        }
      })
      .catch(() => {
        // Rentals file may not exist yet
        setRentals([]);
        if (dataSources.rentals) {
          setLoading(false);
        }
      });
  }, []);

  // Get available years from the data
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    properties.forEach(p => {
      if (p.soldDate) {
        years.add(new Date(p.soldDate).getFullYear());
      }
    });
    return Array.from(years).sort((a, b) => b - a); // Most recent first
  }, [properties]);

  // Filter properties based on difference and time filters
  const filteredProperties = useMemo(() => {
    let filtered = properties;
    
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
    if (differenceFilter !== 'all') {
      filtered = filtered.filter(p => {
        if (!p.askingPrice || p.askingPrice === 0) return false;
        const diff = p.soldPrice - p.askingPrice;
        
        switch (differenceFilter) {
          case 'over':
            return diff > 0; // Sold over asking (bidding wars)
          case 'under':
            return diff < 0; // Sold under asking (deals!)
          case 'exact':
            return diff === 0; // Sold at asking
          default:
            return true;
        }
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
    if (propertyTypeFilter !== null) {
      filtered = filtered.filter(p => 
        p.propertyType?.toLowerCase().includes(propertyTypeFilter.toLowerCase())
      );
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
    if (yieldFilter !== null && yieldFilter !== 'any') {
      filtered = filtered.filter(p => {
        const y = p.yieldEstimate?.grossYield;
        if (y === undefined || y === null) return false;
        switch (yieldFilter) {
          case 'high': return y >= 10;
          case 'medium': return y >= 5 && y < 10;
          case 'low': return y < 5;
          default: return true;
        }
      });
    }
    
    return filtered;
  }, [properties, differenceFilter, selectedYear, selectedQuarter, selectedMonth, recentFilter, bedsFilter, propertyTypeFilter, minPrice, maxPrice, minArea, maxArea, yieldFilter]);

  // Helper to clear time filters
  const clearTimeFilters = () => {
    setSelectedYear(null);
    setSelectedQuarter(null);
    setSelectedMonth(null);
    setRecentFilter(null);
  };

  // Filter listings based on time filters (using scrapedAt date)
  const filteredListings = useMemo(() => {
    let filtered = listings;
    
    // Apply recent filter
    if (recentFilter) {
      const now = new Date();
      filtered = filtered.filter(l => {
        if (!l.scrapedAt) return false;
        const scrapedDate = new Date(l.scrapedAt);
        
        if (recentFilter === '6m') {
          const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
          return scrapedDate >= sixMonthsAgo;
        } else if (recentFilter === '12m') {
          const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
          return scrapedDate >= oneYearAgo;
        }
        return true;
      });
    }
    // Apply year/quarter/month filter
    else if (selectedYear !== null) {
      filtered = filtered.filter(l => {
        if (!l.scrapedAt) return false;
        const scrapedDate = new Date(l.scrapedAt);
        const year = scrapedDate.getFullYear();
        const month = scrapedDate.getMonth();
        
        if (year !== selectedYear) return false;
        
        if (selectedQuarter !== null) {
          const quarterMonths = QUARTER_MONTHS[selectedQuarter];
          if (!quarterMonths.includes(month)) return false;
          
          if (selectedMonth !== null && month !== selectedMonth) return false;
        }
        
        return true;
      });
    }
    
    // Apply bedroom filter
    if (bedsFilter !== null) {
      filtered = filtered.filter(l => {
        if (bedsFilter === 5) return (l.beds || 0) >= 5; // 5+ beds
        return l.beds === bedsFilter;
      });
    }
    
    // Apply property type filter
    if (propertyTypeFilter !== null) {
      filtered = filtered.filter(l => 
        l.propertyType?.toLowerCase().includes(propertyTypeFilter.toLowerCase())
      );
    }
    
    // Apply price range filter
    if (minPrice !== null) {
      filtered = filtered.filter(l => l.askingPrice >= minPrice);
    }
    if (maxPrice !== null) {
      filtered = filtered.filter(l => l.askingPrice <= maxPrice);
    }
    
    // Apply area filter
    if (minArea !== null) {
      filtered = filtered.filter(l => (l.areaSqm || 0) >= minArea);
    }
    if (maxArea !== null) {
      filtered = filtered.filter(l => (l.areaSqm || 0) <= maxArea);
    }
    
    // Apply yield filter
    if (yieldFilter !== null && yieldFilter !== 'any') {
      filtered = filtered.filter(l => {
        const y = l.yieldEstimate?.grossYield;
        if (y === undefined || y === null) return false;
        switch (yieldFilter) {
          case 'high': return y >= 10;
          case 'medium': return y >= 5 && y < 10;
          case 'low': return y < 5;
          default: return true;
        }
      });
    }
    
    return filtered;
  }, [listings, recentFilter, selectedYear, selectedQuarter, selectedMonth, bedsFilter, propertyTypeFilter, minPrice, maxPrice, minArea, maxArea, yieldFilter]);

  // Filter rentals based on filters
  const filteredRentals = useMemo(() => {
    let filtered = rentals;
    
    // Apply bedroom filter
    if (bedsFilter !== null) {
      filtered = filtered.filter(r => {
        if (bedsFilter === 5) return (r.beds || 0) >= 5; // 5+ beds
        return r.beds === bedsFilter;
      });
    }
    
    // Apply property type filter
    if (propertyTypeFilter !== null) {
      filtered = filtered.filter(r => 
        r.propertyType?.toLowerCase().includes(propertyTypeFilter.toLowerCase())
      );
    }
    
    // Apply price range filter (monthly rent)
    if (minPrice !== null) {
      filtered = filtered.filter(r => r.monthlyRent >= minPrice);
    }
    if (maxPrice !== null) {
      filtered = filtered.filter(r => r.monthlyRent <= maxPrice);
    }
    
    // Apply area filter
    if (minArea !== null) {
      filtered = filtered.filter(r => (r.areaSqm || 0) >= minArea);
    }
    if (maxArea !== null) {
      filtered = filtered.filter(r => (r.areaSqm || 0) <= maxArea);
    }
    
    return filtered;
  }, [rentals, bedsFilter, propertyTypeFilter, minPrice, maxPrice, minArea, maxArea]);

  // Get active data based on selected data sources
  const activeData = useMemo(() => {
    const listingsData = filteredListings.map(l => ({
      ...l,
      // Normalize for map display
      price: l.askingPrice,
      soldPrice: 0, // Not applicable
      soldDate: l.scrapedAt, // Use scrapedAt for listings
      overUnderPercent: 0, // Not applicable
      isListing: true,
      isRental: false,
    }));
    
    const soldData = filteredProperties.map(p => ({
      ...p,
      price: p.soldPrice,
      isListing: false,
      isRental: false,
    }));
    
    const rentalsData = filteredRentals.map(r => ({
      ...r,
      // Normalize for map display
      price: r.monthlyRent,
      soldPrice: 0, // Not applicable
      soldDate: r.scrapedAt, // Use scrapedAt for rentals
      overUnderPercent: 0, // Not applicable
      askingPrice: r.monthlyRent, // Use monthly rent as the "price"
      pricePerSqm: r.areaSqm ? Math.round(r.monthlyRent / r.areaSqm) : 0,
      isListing: false,
      isRental: true,
    }));
    
    // Combine based on selected sources
    const result: typeof soldData = [];
    if (dataSources.sold) result.push(...soldData);
    if (dataSources.forSale) result.push(...listingsData);
    if (dataSources.rentals) result.push(...rentalsData);
    
    return result;
  }, [dataSources, filteredListings, filteredProperties, filteredRentals]);

  // Count active filters for badge display
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedYear !== null) count++;
    if (selectedQuarter !== null) count++;
    if (selectedMonth !== null) count++;
    if (recentFilter !== null) count++;
    if (differenceFilter !== 'all') count++;
    if (bedsFilter !== null) count++;
    if (propertyTypeFilter !== null) count++;
    if (minPrice !== null) count++;
    if (maxPrice !== null) count++;
    if (minArea !== null) count++;
    if (maxArea !== null) count++;
    if (yieldFilter !== null && yieldFilter !== 'any') count++;
    return count;
  }, [selectedYear, selectedQuarter, selectedMonth, recentFilter, differenceFilter, bedsFilter, propertyTypeFilter, minPrice, maxPrice, minArea, maxArea, yieldFilter]);

  // Calculate filtered stats for the selected time period (sold properties)
  const filteredStats = useMemo(() => {
    // Get properties with valid pricePerSqm for the filtered set
    const withPricePerSqm = filteredProperties.filter(p => p.pricePerSqm && p.pricePerSqm > 0);
    
    if (withPricePerSqm.length === 0) {
      return { avgPricePerSqm: 0, percentChange: null, isFiltered: false };
    }
    
    const filteredAvg = Math.round(
      withPricePerSqm.reduce((sum, p) => sum + (p.pricePerSqm || 0), 0) / withPricePerSqm.length
    );
    
    // Check if we have an active time filter
    const isFiltered = selectedYear !== null || recentFilter !== null;
    
    // Calculate percentage change vs overall average
    let percentChange: number | null = null;
    if (isFiltered && stats.avgPricePerSqm > 0) {
      percentChange = ((filteredAvg - stats.avgPricePerSqm) / stats.avgPricePerSqm) * 100;
    }
    
    return { avgPricePerSqm: filteredAvg, percentChange, isFiltered };
  }, [filteredProperties, selectedYear, recentFilter, stats.avgPricePerSqm]);

  // Calculate filtered stats for listings (for sale)
  const filteredListingStats = useMemo(() => {
    const withPricePerSqm = filteredListings.filter(l => l.pricePerSqm && l.pricePerSqm > 0);
    
    if (withPricePerSqm.length === 0) {
      return { avgPricePerSqm: 0, medianPrice: 0 };
    }
    
    const avgPricePerSqm = Math.round(
      withPricePerSqm.reduce((sum, l) => sum + (l.pricePerSqm || 0), 0) / withPricePerSqm.length
    );
    
    const prices = filteredListings.map(l => l.askingPrice).sort((a, b) => a - b);
    const medianPrice = prices[Math.floor(prices.length / 2)] || 0;
    
    return { avgPricePerSqm, medianPrice };
  }, [filteredListings]);

  // Helper to get current time filter description
  const getTimeFilterLabel = (): string => {
    if (recentFilter === '6m') return 'Last 6 months';
    if (recentFilter === '12m') return 'Last 12 months';
    if (selectedYear === null) return 'All Time';
    
    let label = selectedYear.toString();
    if (selectedQuarter !== null) {
      label += ` Q${selectedQuarter}`;
      if (selectedMonth !== null) {
        label = `${MONTH_NAMES[selectedMonth]} ${selectedYear}`;
      }
    }
    return label;
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-6.26, 53.35], // Dublin
      zoom: 11,
      pitch: 0,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    
    map.current.on('load', () => {
      // Initialize spiderfy manager
      if (map.current) {
        spiderfyManager.current = new SpiderfyManager(map.current, handleSpiderFeatureClick);
        spiderfyManager.current.initializeLayers();
      }
      setMapReady(true);
    });

    // Track zoom level for legend display
    map.current.on('zoom', () => {
      if (map.current) {
        setZoomLevel(map.current.getZoom());
      }
    });

    return () => {
      spiderfyManager.current?.cleanup();
      spiderfyManager.current = null;
      map.current?.remove();
      map.current = null;
    };
  }, [handleSpiderFeatureClick]);

  // Setup map layers based on view mode and data source
  useEffect(() => {
    if (!mapReady || !map.current || activeData.length === 0) return;

    // Helper function to setup layers - may need to retry if style not loaded
    const setupLayers = () => {
      if (!map.current || !map.current.isStyleLoaded()) {
        // Style not ready, retry in 100ms
        setTimeout(setupLayers, 100);
        return;
      }
      
      doSetupLayers();
    };
    
    const doSetupLayers = () => {
    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: activeData.map(item => {
        const isListing = item.isListing;
        const isRental = item.isRental;
        const soldPrice = (isListing || isRental) ? 0 : item.soldPrice;
        const askingPrice = item.askingPrice || 0;
        const priceDiff = (isListing || isRental) ? 0 : (askingPrice ? soldPrice - askingPrice : 0);
        const priceDiffPercent = (isListing || isRental) ? 0 : (askingPrice ? Math.round((priceDiff / askingPrice) * 100) : 0);
        
        return {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [item.longitude!, item.latitude!],
          },
          properties: {
            id: item.address,
            sourceUrl: item.sourceUrl,
            address: item.address,
            soldPrice: soldPrice,
            askingPrice: askingPrice,
            price: item.price, // Unified price field
            pricePerSqm: item.pricePerSqm || 0,
            priceDiff,
            priceDiffPercent,
            beds: item.beds,
            baths: item.baths,
            propertyType: item.propertyType,
            soldDate: (isListing || isRental) ? '' : item.soldDate,
            berRating: (isListing || isRental) ? (item as any).berRating : null,
            isListing: isListing,
            isRental: isRental,
            // Rental-specific properties
            monthlyRent: isRental ? (item as any).monthlyRent : null,
            furnishing: isRental ? (item as any).furnishing : null,
            dublinPostcode: isRental ? (item as any).dublinPostcode : null,
            rentPerSqm: isRental ? (item as any).rentPerSqm : null,
            rentPerBed: isRental ? (item as any).rentPerBed : null,
          },
        };
      }),
    };

    // Remove existing layers/sources
    // Collapse spider when view/data changes
    spiderfyManager.current?.collapse();
    
    if (!map.current) return;
    
    const layersToRemove = ['clusters', 'cluster-count', 'unclustered-point', 'properties-points'];
    layersToRemove.forEach(layer => {
      if (map.current?.getLayer(layer)) map.current?.removeLayer(layer);
    });
    if (map.current?.getSource('properties')) map.current?.removeSource('properties');
    if (map.current?.getSource('properties-clustered')) map.current?.removeSource('properties-clustered');

    if (viewMode === 'clusters') {
      // Add clustered source
      map.current.addSource('properties-clustered', {
        type: 'geojson',
        data: geojson,
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 60,
      });

      // Cluster circles - sized by count
      map.current.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'properties-clustered',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'step',
            ['get', 'point_count'],
            '#3B82F6',  // Blue for small clusters
            10, '#22C55E', // Green for medium
            50, '#FACC15', // Yellow for large
            100, '#F97316', // Orange for very large
            200, '#EF4444', // Red for huge
          ],
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            20,
            10, 25,
            50, 35,
            100, 45,
            200, 55,
          ],
          'circle-stroke-width': 3,
          'circle-stroke-color': 'rgba(255, 255, 255, 0.3)',
        },
      });

      // Cluster count label
      map.current.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'properties-clustered',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
          'text-size': 14,
        },
        paint: {
          'text-color': '#ffffff',
        },
      });

      // Individual unclustered points - different colors for sold vs for sale vs rentals
      map.current.addLayer({
        id: 'unclustered-point',
        type: 'circle',
        source: 'properties-clustered',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-radius': 8,
          'circle-color': activeSourceCount > 1 
            ? [
                'case',
                ['==', ['get', 'isRental'], true],
                '#A855F7', // Purple for rentals
                ['==', ['get', 'isListing'], true],
                '#F43F5E', // Rose/hot pink for listings (for sale)
                '#FFFFFF', // White for sold properties
              ]
            : dataSources.rentals
            ? '#A855F7' // Purple for rentals
            : dataSources.forSale
            ? '#F43F5E' // Rose/hot pink for listings
            : [
                // Price-based gradient for sold only
                'interpolate',
                ['linear'],
                ['get', 'pricePerSqm'],
                2000, '#22C55E',
                4000, '#3B82F6',
                6000, '#FACC15',
                8000, '#F97316',
                10000, '#EF4444',
              ],
          'circle-stroke-width': 2,
          'circle-stroke-color': activeSourceCount > 1 
            ? [
                'case',
                ['==', ['get', 'isRental'], true],
                '#ffffff',
                ['==', ['get', 'isListing'], true],
                '#ffffff',
                '#374151', // Dark gray stroke for white dots
              ]
            : '#ffffff',
        },
      });

      // Click on cluster to zoom
      map.current.on('click', 'clusters', (e) => {
        const features = map.current?.queryRenderedFeatures(e.point, { layers: ['clusters'] });
        if (!features?.length) return;
        const clusterId = features[0].properties?.cluster_id;
        const source = map.current?.getSource('properties-clustered') as mapboxgl.GeoJSONSource;
        source.getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err || !map.current) return;
          const geometry = features[0].geometry as GeoJSON.Point;
          map.current.easeTo({
            center: geometry.coordinates as [number, number],
            zoom: zoom || 14,
          });
        });
      });

      // Click on unclustered point - with spiderfy support
      map.current.on('click', 'unclustered-point', (e) => {
        if (!e.features || !e.features[0]) return;
        
        const clickedFeature = e.features[0];
        const clickedGeometry = clickedFeature.geometry as GeoJSON.Point;
        const clickedCoords = clickedGeometry.coordinates as [number, number];
        
        // If spider is expanded and user clicks the center point, collapse it
        if (spiderfyManager.current?.isAtCenter(clickedCoords)) {
          spiderfyManager.current.collapse();
          return;
        }
        
        // Query ALL features at this pixel location
        const allFeatures = map.current?.queryRenderedFeatures(e.point, {
          layers: ['unclustered-point']
        });
        
        // Find features with identical coordinates (within small tolerance)
        const tolerance = 0.000001;
        const overlappingRaw = allFeatures?.filter(f => {
          const geom = f.geometry as GeoJSON.Point;
          return Math.abs(geom.coordinates[0] - clickedCoords[0]) < tolerance &&
                 Math.abs(geom.coordinates[1] - clickedCoords[1]) < tolerance;
        }) || [];
        
        // Deduplicate by unique ID (Mapbox can return same feature multiple times from tile overlaps)
        const seenIds = new Set<string>();
        const overlapping = overlappingRaw.filter(f => {
          const id = f.properties?.id || f.properties?.address;
          if (seenIds.has(id)) return false;
          seenIds.add(id);
          return true;
        });
        
        if (overlapping.length > 1) {
          // Multiple properties at same location - trigger spiderfy
          spiderfyManager.current?.expand(clickedCoords, overlapping);
        } else {
          // Single property - show details as normal
          const props = clickedFeature.properties;
          if (props?.isRental) {
            // Find the full rental object
            const fullRental = rentals.find(r => r.address === props?.address);
            if (fullRental) {
              setSelectedRental(fullRental);
            }
            setSelectedProperty(null);
            setSelectedListing(null);
          } else if (props?.isListing) {
            // Find the full listing object
            const fullListing = listings.find(l => l.address === props?.address);
            if (fullListing) {
              setSelectedListing(fullListing);
            }
            setSelectedProperty(null);
            setSelectedRental(null);
          } else {
            // Find the full property object
            const fullProperty = properties.find(p => p.address === props?.address);
            if (fullProperty) {
              setSelectedProperty(fullProperty);
            }
            setSelectedListing(null);
            setSelectedRental(null);
          }
        }
      });
      
      // Click elsewhere on map to collapse spider
      map.current.on('click', (e) => {
        // Check if click was on spider markers - if so, don't collapse
        if (spiderfyManager.current?.isClickOnSpider(e.point)) return;
        
        // Check if click was on clusters or unclustered points
        const clickedFeatures = map.current?.queryRenderedFeatures(e.point, {
          layers: ['clusters', 'unclustered-point']
        });
        
        // Only collapse if clicking on empty map area
        if (!clickedFeatures?.length) {
          spiderfyManager.current?.collapse();
        }
      });

      // Cursor changes
      ['clusters', 'unclustered-point'].forEach(layer => {
        map.current?.on('mouseenter', layer, () => {
          if (map.current) map.current.getCanvas().style.cursor = 'pointer';
        });
        map.current?.on('mouseleave', layer, () => {
          if (map.current) map.current.getCanvas().style.cursor = '';
        });
      });

    } else if (viewMode === 'price') {
      // By sold price view
      map.current.addSource('properties', {
        type: 'geojson',
        data: geojson,
      });

      map.current.addLayer({
        id: 'properties-points',
        type: 'circle',
        source: 'properties',
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            9, 4,
            14, 10,
          ],
          'circle-color': [
            'interpolate',
            ['linear'],
            ['get', 'price'], // Use unified price field (soldPrice for sold, askingPrice for listings)
            200000, '#22C55E',
            400000, '#3B82F6',
            600000, '#FACC15',
            800000, '#F97316',
            1000000, '#EF4444',
          ],
          'circle-opacity': 0.85,
          'circle-stroke-width': 1,
          'circle-stroke-color': '#ffffff',
        },
      });

      setupPointClickHandler('properties-points');

    } else if (viewMode === 'difference') {
      // Difference view - color by over/under asking
      map.current.addSource('properties', {
        type: 'geojson',
        data: geojson,
      });

      map.current.addLayer({
        id: 'properties-points',
        type: 'circle',
        source: 'properties',
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            9, 5,
            14, 12,
          ],
          // Color by difference percentage: green = under asking, red = over asking
          'circle-color': [
            'interpolate',
            ['linear'],
            ['get', 'priceDiffPercent'],
            -20, '#22C55E',  // 20% under asking - bright green
            -10, '#4ADE80',  // 10% under - light green
            0, '#FACC15',    // At asking - yellow
            10, '#F97316',   // 10% over - orange
            20, '#EF4444',   // 20% over - red
          ],
          'circle-opacity': 0.9,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      });

      setupPointClickHandler('properties-points');
    }

    function setupPointClickHandler(layerId: string) {
      map.current?.on('click', layerId, (e) => {
        if (!e.features || !e.features[0]) return;
        
        // Check if layer still exists before processing
        if (!map.current?.getLayer(layerId)) return;
        
        const clickedFeature = e.features[0];
        const clickedGeometry = clickedFeature.geometry as GeoJSON.Point;
        const clickedCoords = clickedGeometry.coordinates as [number, number];
        
        // If spider is expanded and user clicks the center point, collapse it
        if (spiderfyManager.current?.isAtCenter(clickedCoords)) {
          spiderfyManager.current.collapse();
          return;
        }
        
        // Query ALL features at this pixel location
        const allFeatures = map.current?.queryRenderedFeatures(e.point, {
          layers: [layerId]
        });
        
        // Find features with identical coordinates
        const tolerance = 0.000001;
        const overlappingRaw = allFeatures?.filter(f => {
          const geom = f.geometry as GeoJSON.Point;
          return Math.abs(geom.coordinates[0] - clickedCoords[0]) < tolerance &&
                 Math.abs(geom.coordinates[1] - clickedCoords[1]) < tolerance;
        }) || [];
        
        // Deduplicate by unique ID (Mapbox can return same feature multiple times from tile overlaps)
        const seenIds = new Set<string>();
        const overlapping = overlappingRaw.filter(f => {
          const id = f.properties?.id || f.properties?.address;
          if (seenIds.has(id)) return false;
          seenIds.add(id);
          return true;
        });
        
        if (overlapping.length > 1) {
          // Multiple properties at same location - trigger spiderfy
          spiderfyManager.current?.expand(clickedCoords, overlapping);
        } else {
          // Single property - show details as normal
          const props = clickedFeature.properties;
          if (props?.isRental) {
            // Find the full rental object
            const fullRental = rentals.find(r => r.address === props?.address);
            if (fullRental) {
              setSelectedRental(fullRental);
            }
            setSelectedProperty(null);
            setSelectedListing(null);
          } else if (props?.isListing) {
            // Find the full listing object
            const fullListing = listings.find(l => l.address === props?.address);
            if (fullListing) {
              setSelectedListing(fullListing);
            }
            setSelectedProperty(null);
            setSelectedRental(null);
          } else {
            // Find the full property object
            const fullProperty = properties.find(p => p.address === props?.address);
            if (fullProperty) {
              setSelectedProperty(fullProperty);
            }
            setSelectedListing(null);
            setSelectedRental(null);
          }
        }
      });
      
      // Click elsewhere on map to collapse spider (for price/difference view modes)
      map.current?.on('click', (e) => {
        // Check if click was on spider markers - if so, don't collapse
        if (spiderfyManager.current?.isClickOnSpider(e.point)) return;
        
        // Check if layer still exists before querying
        if (!map.current?.getLayer(layerId)) return;
        
        // Check if click was on the layer
        const clickedFeatures = map.current?.queryRenderedFeatures(e.point, {
          layers: [layerId]
        });
        
        // Only collapse if clicking on empty map area
        if (!clickedFeatures?.length) {
          spiderfyManager.current?.collapse();
        }
      });

      map.current?.on('mouseenter', layerId, () => {
        if (map.current?.getLayer(layerId)) {
          map.current.getCanvas().style.cursor = 'pointer';
        }
      });
      map.current?.on('mouseleave', layerId, () => {
        if (map.current) map.current.getCanvas().style.cursor = '';
      });
    }
    }; // End of doSetupLayers
    
    // Start the setup process
    setupLayers();

  }, [mapReady, activeData, viewMode, dataSources, rentals, listings, properties]);

  // Resize map when filter panel is toggled
  useEffect(() => {
    if (map.current) {
      // Small delay to allow DOM to update
      setTimeout(() => {
        map.current?.resize();
      }, 250);
    }
  }, [showFilters]);

  // Format sold date for display
  const formatSoldDate = (dateStr: string | undefined): string => {
    if (!dateStr) return 'Unknown';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-IE', { 
        year: 'numeric', 
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  // Get month and year from date (e.g., "Mar 2022")
  const getSoldMonthYear = (dateStr: string | undefined): string => {
    if (!dateStr) return 'Unknown';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-IE', { 
        year: 'numeric', 
        month: 'short'
      });
    } catch {
      return 'Unknown';
    }
  };

  // Property types for filter dropdown
  const propertyTypes = ['House', 'Apartment', 'Duplex', 'Terrace', 'Semi-D', 'Detached', 'Bungalow'];

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col">
      {/* Main Control Bar - Single Row */}
      <div className="px-4 py-3 bg-[#111827] border-b border-gray-800 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Data Source Multi-Select */}
          <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1 border border-gray-700">
            <button
              onClick={() => toggleDataSource('sold')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                dataSources.sold 
                  ? 'bg-cyan-600 text-white shadow-sm' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
              title="Toggle sold properties"
            >
              🏠 Sold
            </button>
            <button
              onClick={() => toggleDataSource('forSale')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                dataSources.forSale 
                  ? 'bg-rose-500 text-white shadow-sm' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
              title="Toggle for sale listings"
            >
              🏷️ For Sale
            </button>
            <button
              onClick={() => toggleDataSource('rentals')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                dataSources.rentals 
                  ? 'bg-purple-500 text-white shadow-sm' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
              title="Toggle rental listings"
            >
              🏘️ Rentals
            </button>
          </div>
          
          {/* Count display - shows totals for all selected sources */}
          <span className="text-gray-400 text-sm font-medium">
            {loading ? 'Loading...' : (
              <>
                {activeData.length.toLocaleString()} total
                {activeSourceCount > 1 && (
                  <span className="text-gray-500 ml-1">
                    ({[
                      dataSources.sold && `${filteredProperties.length.toLocaleString()} sold`,
                      dataSources.forSale && `${filteredListings.length.toLocaleString()} for sale`,
                      dataSources.rentals && `${filteredRentals.length.toLocaleString()} rentals`
                    ].filter(Boolean).join(' · ')})
                  </span>
                )}
              </>
            )}
          </span>
          
          {/* Location Search */}
          <div className="relative">
            <div className="flex items-center">
              <span className="absolute left-3 text-gray-500">🔍</span>
              <input
                type="text"
                placeholder="Search location..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => setShowSearchResults(true)}
                className="w-48 md:w-56 pl-9 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 text-sm"
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>
            
            {/* Search Results Dropdown */}
            {showSearchResults && (searchResults.length > 0 || searchQuery === '') && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto">
                {searchQuery === '' && (
                  <div className="p-2 border-b border-gray-700">
                    <div className="text-xs text-gray-500 mb-2 px-2">Quick jump to:</div>
                    <div className="flex flex-wrap gap-1">
                      {DUBLIN_AREAS.slice(0, 8).map((area) => (
                        <button
                          key={area.name}
                          onClick={() => flyToLocation(area.coords as [number, number], area.zoom)}
                          className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
                        >
                          {area.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {searchResults.map((result, index) => (
                  <button
                    key={index}
                    onClick={() => flyToLocation(result.center, 15)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-700 text-white text-sm border-b border-gray-700 last:border-b-0 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-cyan-400">📍</span>
                      <span>{result.place_name}</span>
                    </div>
                  </button>
                ))}
                {searchQuery && searchResults.length === 0 && !isSearching && (
                  <div className="px-4 py-3 text-gray-500 text-sm">No results found</div>
                )}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex rounded-lg overflow-hidden border border-gray-700">
            <button
              onClick={() => handleViewModeChange('clusters')}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === 'clusters' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
              title="Group nearby properties into clusters"
            >
              📍 Clusters
            </button>
            <button
              onClick={() => handleViewModeChange('price')}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === 'price' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
              title="Color by price"
            >
              💶 By Price
            </button>
            {dataSources.sold && (
              <button
                onClick={() => handleViewModeChange('difference')}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  viewMode === 'difference' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
                title="Color by sold vs asking price difference"
              >
                📊 vs Asking
              </button>
            )}
          </div>
          
          {/* Filter Toggle Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
              showFilters || activeFilterCount > 0
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
            }`}
          >
            <span>⚙️ Filters</span>
            {activeFilterCount > 0 && (
              <span className="px-1.5 py-0.5 text-xs bg-white/20 rounded-full">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Collapsible Filter Panel */}
      {showFilters && (
        <div className="bg-[#0d1117] border-b border-gray-800 px-4 py-4 animate-in slide-in-from-top duration-200">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {/* VIEW MODE Section */}
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-2 block">View</label>
              <div className="flex flex-col gap-1">
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer hover:text-white">
                  <input type="radio" checked={viewMode === 'clusters'} onChange={() => handleViewModeChange('clusters')} className="accent-indigo-500" />
                  Clusters
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer hover:text-white">
                  <input type="radio" checked={viewMode === 'price'} onChange={() => handleViewModeChange('price')} className="accent-indigo-500" />
                  By Price
                </label>
                {dataSources.sold && (
                  <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer hover:text-white">
                    <input type="radio" checked={viewMode === 'difference'} onChange={() => handleViewModeChange('difference')} className="accent-indigo-500" />
                    Sold vs Asking
                  </label>
                )}
              </div>
            </div>

            {/* TIME PERIOD Section */}
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-2 block">Time Period</label>
              <div className="flex flex-col gap-1">
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer hover:text-white">
                  <input type="radio" checked={selectedYear === null && recentFilter === null} onChange={() => clearTimeFilters()} className="accent-indigo-500" />
                  All Time
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer hover:text-white">
                  <input type="radio" checked={recentFilter === '6m'} onChange={() => { setSelectedYear(null); setSelectedQuarter(null); setSelectedMonth(null); setRecentFilter('6m'); }} className="accent-indigo-500" />
                  Last 6 Months
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer hover:text-white">
                  <input type="radio" checked={recentFilter === '12m'} onChange={() => { setSelectedYear(null); setSelectedQuarter(null); setSelectedMonth(null); setRecentFilter('12m'); }} className="accent-indigo-500" />
                  Last 12 Months
                </label>
              </div>
              <div className="flex gap-2 mt-2">
                <select
                  value={selectedYear ?? ''}
                  onChange={(e) => { setSelectedYear(e.target.value ? parseInt(e.target.value) : null); setSelectedQuarter(null); setSelectedMonth(null); setRecentFilter(null); }}
                  className="flex-1 px-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded text-gray-300 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">Year</option>
                  {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                {selectedYear !== null && (
                  <select
                    value={selectedQuarter ?? ''}
                    onChange={(e) => { setSelectedQuarter(e.target.value ? parseInt(e.target.value) : null); setSelectedMonth(null); }}
                    className="flex-1 px-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded text-gray-300 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="">Quarter</option>
                    <option value="1">Q1</option>
                    <option value="2">Q2</option>
                    <option value="3">Q3</option>
                    <option value="4">Q4</option>
                  </select>
                )}
              </div>
            </div>

            {/* PROPERTY Section */}
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-2 block">Property</label>
              <select
                value={bedsFilter ?? ''}
                onChange={(e) => setBedsFilter(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full px-2 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded text-gray-300 focus:border-indigo-500 focus:outline-none mb-2"
              >
                <option value="">Any Beds</option>
                <option value="1">1 Bed</option>
                <option value="2">2 Beds</option>
                <option value="3">3 Beds</option>
                <option value="4">4 Beds</option>
                <option value="5">5+ Beds</option>
              </select>
              <select
                value={propertyTypeFilter ?? ''}
                onChange={(e) => setPropertyTypeFilter(e.target.value || null)}
                className="w-full px-2 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded text-gray-300 focus:border-indigo-500 focus:outline-none"
              >
                <option value="">Any Type</option>
                {propertyTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* PRICE Section */}
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-2 block">
                {dataSources.rentals ? 'Monthly Rent' : 'Price'}
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min €"
                  value={minPrice ?? ''}
                  onChange={(e) => setMinPrice(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-2 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded text-gray-300 focus:border-indigo-500 focus:outline-none placeholder-gray-600"
                />
                <input
                  type="number"
                  placeholder="Max €"
                  value={maxPrice ?? ''}
                  onChange={(e) => setMaxPrice(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-2 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded text-gray-300 focus:border-indigo-500 focus:outline-none placeholder-gray-600"
                />
              </div>
              <div className="flex gap-2 mt-2">
                <input
                  type="number"
                  placeholder="Min m²"
                  value={minArea ?? ''}
                  onChange={(e) => setMinArea(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-2 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded text-gray-300 focus:border-indigo-500 focus:outline-none placeholder-gray-600"
                />
                <input
                  type="number"
                  placeholder="Max m²"
                  value={maxArea ?? ''}
                  onChange={(e) => setMaxArea(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-2 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded text-gray-300 focus:border-indigo-500 focus:outline-none placeholder-gray-600"
                />
              </div>
            </div>

            {/* SALE TYPE Section - only for sold */}
            {dataSources.sold && (
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-2 block">Sale Type</label>
                <div className="flex flex-col gap-1">
                  <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer hover:text-white">
                    <input type="radio" checked={differenceFilter === 'all'} onChange={() => setDifferenceFilter('all')} className="accent-indigo-500" />
                    All Sales
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer hover:text-white">
                    <input type="radio" checked={differenceFilter === 'over'} onChange={() => setDifferenceFilter('over')} className="accent-red-500" />
                    🔥 Bidding Wars
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer hover:text-white">
                    <input type="radio" checked={differenceFilter === 'under'} onChange={() => setDifferenceFilter('under')} className="accent-green-500" />
                    💰 Deals
                  </label>
                </div>
              </div>
            )}

            {/* YIELD Section - only for sold and forSale */}
            {(dataSources.sold || dataSources.forSale) && (
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-2 block">Est. Yield</label>
                <div className="flex flex-col gap-1">
                  <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer hover:text-white">
                    <input type="radio" checked={yieldFilter === null || yieldFilter === 'any'} onChange={() => setYieldFilter(null)} className="accent-indigo-500" />
                    Any
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer hover:text-white">
                    <input type="radio" checked={yieldFilter === 'high'} onChange={() => setYieldFilter('high')} className="accent-green-500" />
                    High (10%+)
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer hover:text-white">
                    <input type="radio" checked={yieldFilter === 'medium'} onChange={() => setYieldFilter('medium')} className="accent-yellow-500" />
                    Medium (5-10%)
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer hover:text-white">
                    <input type="radio" checked={yieldFilter === 'low'} onChange={() => setYieldFilter('low')} className="accent-orange-500" />
                    Low (&lt;5%)
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Clear and Close */}
          <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-800">
            <div className="text-sm text-gray-500">
              {activeFilterCount > 0 ? `${activeFilterCount} filter${activeFilterCount > 1 ? 's' : ''} active` : 'No filters applied'}
            </div>
            <div className="flex gap-2">
              {activeFilterCount > 0 && (
                <button
                  onClick={handleClearFilters}
                  className="px-3 py-1.5 text-sm font-medium text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded transition-colors"
                >
                  Clear All
                </button>
              )}
              <button
                onClick={() => setShowFilters(false)}
                className="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Compact Legend Bar */}
      <div className="px-4 py-1.5 bg-[#0D1117] border-b border-gray-800 flex items-center gap-4 text-xs text-gray-400 overflow-x-auto">
        {/* Cluster view - show cluster colors when zoomed out, property colors when zoomed in */}
        {viewMode === 'clusters' && zoomLevel < 14 && (
          <>
            <span className="text-gray-500 font-medium shrink-0">Clusters:</span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> &lt;10</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> 10-50</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400"></span> 50-100</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> 200+</span>
            </div>
          </>
        )}
        {/* When zoomed in to individual properties in cluster mode */}
        {viewMode === 'clusters' && zoomLevel >= 14 && activeSourceCount === 1 && dataSources.sold && (
          <>
            <span className="text-gray-500 font-medium shrink-0">€/m²:</span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> €2k</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> €4k</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400"></span> €6k</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500"></span> €8k</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> €10k+</span>
            </div>
          </>
        )}
        {viewMode === 'clusters' && zoomLevel >= 14 && activeSourceCount === 1 && dataSources.forSale && (
          <>
            <span className="text-gray-500 font-medium shrink-0">For Sale:</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500"></span> All listings</span>
          </>
        )}
        {viewMode === 'clusters' && zoomLevel >= 14 && activeSourceCount === 1 && dataSources.rentals && (
          <>
            <span className="text-gray-500 font-medium shrink-0">Rentals:</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500"></span> All rentals</span>
          </>
        )}
        {viewMode === 'clusters' && zoomLevel >= 14 && activeSourceCount > 1 && (
          <>
            <span className="text-gray-500 font-medium shrink-0">Type:</span>
            <div className="flex items-center gap-3">
              {dataSources.sold && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-white border border-gray-500"></span> Sold</span>}
              {dataSources.forSale && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500"></span> For Sale</span>}
              {dataSources.rentals && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500"></span> Rental</span>}
            </div>
          </>
        )}
        {viewMode === 'price' && (dataSources.sold || dataSources.forSale) && (
          <>
            <span className="text-gray-500 font-medium shrink-0">Price:</span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> €200k</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> €400k</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400"></span> €600k</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500"></span> €800k</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> €1M+</span>
            </div>
          </>
        )}
        {viewMode === 'price' && dataSources.rentals && !dataSources.sold && !dataSources.forSale && (
          <>
            <span className="text-gray-500 font-medium shrink-0">Rent:</span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> €1k</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> €1.5k</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400"></span> €2k</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500"></span> €2.5k</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> €3k+</span>
            </div>
          </>
        )}
        {viewMode === 'difference' && dataSources.sold && (
          <>
            <span className="text-gray-500 font-medium shrink-0">vs Asking:</span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> -20%</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400"></span> At asking</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> +20%</span>
            </div>
          </>
        )}
        {/* Show type legend when multiple sources selected and zoomed out */}
        {activeSourceCount > 1 && zoomLevel < 14 && (
          <>
            <span className="mx-2 text-gray-700">|</span>
            <span className="text-gray-500 font-medium shrink-0">Type:</span>
            <div className="flex items-center gap-3">
              {dataSources.sold && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-white border border-gray-500"></span> Sold</span>}
              {dataSources.forSale && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500"></span> For Sale</span>}
              {dataSources.rentals && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500"></span> Rental</span>}
            </div>
          </>
        )}
        
        <div className="ml-auto flex items-center gap-3 text-gray-500 shrink-0">
          {activeFilterCount > 0 && (
            <span className="text-indigo-400 text-xs">{activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} active</span>
          )}
        </div>
      </div>
      
      {/* Map */}
      <div className="flex-1 relative" style={{ minHeight: '500px' }}>
        <div ref={mapContainer} className="absolute inset-0" style={{ width: '100%', height: '100%' }} />
        
        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 bg-gray-900/80 flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-400">Loading properties...</p>
            </div>
          </div>
        )}
        
        {/* Selected Property Panel */}
        {selectedProperty && (
          <div className="absolute bottom-4 left-4 right-4 md:left-4 md:right-auto md:w-[400px] bg-gray-900/95 backdrop-blur-xl rounded-xl p-5 shadow-2xl border border-gray-700">
            <button 
              onClick={() => setSelectedProperty(null)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white text-xl"
            >
              ✕
            </button>
            
            {/* Address */}
            <h3 className="font-semibold text-white pr-8 mb-3 text-lg leading-tight">
              {selectedProperty.address}
            </h3>
            
            {/* Price with year badge */}
            <div className="flex items-center gap-3 mb-4">
              <div className="text-3xl font-bold text-white font-mono">
                {formatFullPrice(selectedProperty.soldPrice)}
              </div>
              <div className="px-3 py-1 rounded-full bg-blue-600 text-white text-sm font-medium">
                Sold {getSoldMonthYear(selectedProperty.soldDate)}
              </div>
            </div>
            
            {/* Property details grid */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {selectedProperty.beds && (
                <div className="bg-gray-800 rounded-lg px-3 py-2">
                  <div className="text-gray-500 text-xs">Bedrooms</div>
                  <div className="text-white font-semibold">{selectedProperty.beds}</div>
                </div>
              )}
              {selectedProperty.baths && (
                <div className="bg-gray-800 rounded-lg px-3 py-2">
                  <div className="text-gray-500 text-xs">Bathrooms</div>
                  <div className="text-white font-semibold">{selectedProperty.baths}</div>
                </div>
              )}
              {selectedProperty.propertyType && (
                <div className="bg-gray-800 rounded-lg px-3 py-2">
                  <div className="text-gray-500 text-xs">Type</div>
                  <div className="text-white font-semibold">{selectedProperty.propertyType}</div>
                </div>
              )}
              {selectedProperty.areaSqm && (
                <div className="bg-gray-800 rounded-lg px-3 py-2">
                  <div className="text-gray-500 text-xs">Floor Area</div>
                  <div className="text-white font-semibold">{selectedProperty.areaSqm} m²</div>
                </div>
              )}
            </div>
            
            {/* Price analysis */}
            <div className="border-t border-gray-700 pt-4 space-y-2">
              {selectedProperty.askingPrice && selectedProperty.askingPrice > 0 && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 text-sm">Asking price</span>
                    <span className="text-gray-300 font-mono">{formatFullPrice(selectedProperty.askingPrice)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 text-sm">Difference</span>
                    <span className={`font-semibold text-lg ${
                      selectedProperty.soldPrice > selectedProperty.askingPrice 
                        ? 'text-red-400' 
                        : selectedProperty.soldPrice < selectedProperty.askingPrice
                          ? 'text-green-400'
                          : 'text-yellow-400'
                    }`}>
                      {selectedProperty.soldPrice > selectedProperty.askingPrice ? '+' : 
                       selectedProperty.soldPrice < selectedProperty.askingPrice ? '-' : ''}
                      €{Math.abs(selectedProperty.soldPrice - selectedProperty.askingPrice).toLocaleString()}
                      {' '}
                      ({selectedProperty.soldPrice > selectedProperty.askingPrice ? '+' : ''}
                      {Math.round((selectedProperty.soldPrice - selectedProperty.askingPrice) / selectedProperty.askingPrice * 100)}%)
                    </span>
                  </div>
                </>
              )}
              
              {selectedProperty.pricePerSqm && selectedProperty.pricePerSqm > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm">Price per m²</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-mono">€{selectedProperty.pricePerSqm.toLocaleString()}</span>
                    {selectedProperty.pricePerSqm < stats.avgPricePerSqm * 0.85 && (
                      <span className="px-2 py-0.5 rounded bg-green-600/20 text-green-400 text-xs font-medium">
                        Good value
                      </span>
                    )}
                    {selectedProperty.pricePerSqm > stats.avgPricePerSqm * 1.2 && (
                      <span className="px-2 py-0.5 rounded bg-red-600/20 text-red-400 text-xs font-medium">
                        Premium
                      </span>
                    )}
                  </div>
                </div>
              )}
              
              <div className="flex justify-between items-center">
                <span className="text-gray-500 text-sm">Sold date</span>
                <span className="text-gray-300">{formatSoldDate(selectedProperty.soldDate)}</span>
              </div>
              
              {/* Yield Estimate */}
              {selectedProperty.yieldEstimate && (
                <div className="mt-3 pt-3 border-t border-gray-700">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-500 text-sm">Est. Gross Yield</span>
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400 font-bold font-mono">
                        {selectedProperty.yieldEstimate.grossYield.toFixed(1)}%
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        selectedProperty.yieldEstimate.confidence === 'high' ? 'bg-green-600/20 text-green-400' :
                        selectedProperty.yieldEstimate.confidence === 'medium' ? 'bg-yellow-600/20 text-yellow-400' :
                        'bg-orange-600/20 text-orange-400'
                      }`} title="Confidence level based on available rental data">
                        {selectedProperty.yieldEstimate.confidence === 'very_low' ? '⚠️ limited data' : `${selectedProperty.yieldEstimate.confidence} confidence`}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">Est. Monthly Rent</span>
                    <span className="text-white font-mono">€{selectedProperty.yieldEstimate.monthlyRent.toLocaleString()}/mo</span>
                  </div>
                  <div className="flex justify-between items-center text-sm mt-1">
                    <span className="text-gray-500">Est. Annual Return</span>
                    <span className="text-white font-mono">€{(selectedProperty.yieldEstimate.monthlyRent * 12).toLocaleString()}/yr</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {selectedProperty.yieldEstimate.note}
                    <span className="text-gray-600"> • Based on sold price €{selectedProperty.soldPrice.toLocaleString()}</span>
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Selected Listing Panel (For Sale) */}
        {selectedListing && (
          <div className="absolute bottom-4 left-4 right-4 md:left-4 md:right-auto md:w-[400px] bg-gray-900/95 backdrop-blur-xl rounded-xl p-5 shadow-2xl border border-cyan-700">
            <button 
              onClick={() => setSelectedListing(null)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white text-xl"
            >
              ✕
            </button>
            
            {/* Address */}
            <h3 className="font-semibold text-white pr-8 mb-3 text-lg leading-tight">
              {selectedListing.address}
            </h3>
            
            {/* Price with For Sale badge */}
            <div className="flex items-center gap-3 mb-4">
              <div className="text-3xl font-bold text-white font-mono">
                {formatFullPrice(selectedListing.askingPrice)}
              </div>
              <div className="px-3 py-1 rounded-full bg-cyan-600 text-white text-sm font-medium">
                🏷️ For Sale
              </div>
            </div>
            
            {/* Property details grid */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {selectedListing.beds && (
                <div className="bg-gray-800 rounded-lg px-3 py-2">
                  <div className="text-gray-500 text-xs">Bedrooms</div>
                  <div className="text-white font-semibold">{selectedListing.beds}</div>
                </div>
              )}
              {selectedListing.baths && (
                <div className="bg-gray-800 rounded-lg px-3 py-2">
                  <div className="text-gray-500 text-xs">Bathrooms</div>
                  <div className="text-white font-semibold">{selectedListing.baths}</div>
                </div>
              )}
              {selectedListing.propertyType && (
                <div className="bg-gray-800 rounded-lg px-3 py-2">
                  <div className="text-gray-500 text-xs">Type</div>
                  <div className="text-white font-semibold">{selectedListing.propertyType}</div>
                </div>
              )}
              {selectedListing.berRating && (
                <div className="bg-gray-800 rounded-lg px-3 py-2">
                  <div className="text-gray-500 text-xs">BER Rating</div>
                  <div className="text-white font-semibold">{selectedListing.berRating}</div>
                </div>
              )}
            </div>
            
            {/* Price per sqm */}
            {selectedListing.pricePerSqm && selectedListing.pricePerSqm > 0 && (
              <div className="border-t border-gray-700 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm">Price per m²</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-mono">€{selectedListing.pricePerSqm.toLocaleString()}</span>
                    {listingStats.avgPricePerSqm > 0 && selectedListing.pricePerSqm < listingStats.avgPricePerSqm * 0.85 && (
                      <span className="px-2 py-0.5 rounded bg-green-600/20 text-green-400 text-xs font-medium">
                        Below avg
                      </span>
                    )}
                    {listingStats.avgPricePerSqm > 0 && selectedListing.pricePerSqm > listingStats.avgPricePerSqm * 1.2 && (
                      <span className="px-2 py-0.5 rounded bg-orange-600/20 text-orange-400 text-xs font-medium">
                        Above avg
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* Yield Estimate */}
            {selectedListing.yieldEstimate && (
              <div className="border-t border-gray-700 pt-4 mt-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-500 text-sm">Est. Gross Yield</span>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold font-mono">
                      {selectedListing.yieldEstimate.grossYield.toFixed(1)}%
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      selectedListing.yieldEstimate.confidence === 'high' ? 'bg-green-600/20 text-green-400' :
                      selectedListing.yieldEstimate.confidence === 'medium' ? 'bg-yellow-600/20 text-yellow-400' :
                      'bg-orange-600/20 text-orange-400'
                    }`} title="Confidence level based on available rental data">
                      {selectedListing.yieldEstimate.confidence === 'very_low' ? '⚠️ limited data' : `${selectedListing.yieldEstimate.confidence} confidence`}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Est. Monthly Rent</span>
                  <span className="text-white font-mono">€{selectedListing.yieldEstimate.monthlyRent.toLocaleString()}/mo</span>
                </div>
                <div className="flex justify-between items-center text-sm mt-1">
                  <span className="text-gray-500">Est. Annual Return</span>
                  <span className="text-white font-mono">€{(selectedListing.yieldEstimate.monthlyRent * 12).toLocaleString()}/yr</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {selectedListing.yieldEstimate.note}
                  <span className="text-gray-600"> • Based on asking price €{selectedListing.askingPrice.toLocaleString()}</span>
                </p>
              </div>
            )}
          </div>
        )}

        {/* Selected Rental Panel */}
        {selectedRental && (
          <div className="absolute bottom-4 left-4 right-4 md:left-4 md:right-auto md:w-[400px] bg-gray-900/95 backdrop-blur-xl rounded-xl p-5 shadow-2xl border border-purple-600">
            <button 
              onClick={() => setSelectedRental(null)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white text-xl"
            >
              ✕
            </button>
            
            {/* Address */}
            <h3 className="font-semibold text-white pr-8 mb-3 text-lg leading-tight">
              {selectedRental.address}
            </h3>
            
            {/* Rent with badge */}
            <div className="flex items-center gap-3 mb-4">
              <div className="text-3xl font-bold text-white font-mono">
                €{selectedRental.monthlyRent.toLocaleString()}/mo
              </div>
              <div className="px-3 py-1 rounded-full bg-purple-500 text-white text-sm font-medium">
                🏘️ Rental
              </div>
            </div>
            
            {/* Property details grid */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {selectedRental.beds && (
                <div className="bg-gray-800 rounded-lg px-3 py-2">
                  <div className="text-gray-500 text-xs">Bedrooms</div>
                  <div className="text-white font-semibold">{selectedRental.beds}</div>
                </div>
              )}
              {selectedRental.baths && (
                <div className="bg-gray-800 rounded-lg px-3 py-2">
                  <div className="text-gray-500 text-xs">Bathrooms</div>
                  <div className="text-white font-semibold">{selectedRental.baths}</div>
                </div>
              )}
              {selectedRental.propertyType && (
                <div className="bg-gray-800 rounded-lg px-3 py-2">
                  <div className="text-gray-500 text-xs">Type</div>
                  <div className="text-white font-semibold">{selectedRental.propertyType}</div>
                </div>
              )}
              {selectedRental.berRating && (
                <div className="bg-gray-800 rounded-lg px-3 py-2">
                  <div className="text-gray-500 text-xs">BER Rating</div>
                  <div className="text-white font-semibold">{selectedRental.berRating}</div>
                </div>
              )}
              {selectedRental.furnishing && (
                <div className="bg-gray-800 rounded-lg px-3 py-2">
                  <div className="text-gray-500 text-xs">Furnishing</div>
                  <div className="text-white font-semibold">{selectedRental.furnishing}</div>
                </div>
              )}
              {selectedRental.dublinPostcode && (
                <div className="bg-gray-800 rounded-lg px-3 py-2">
                  <div className="text-gray-500 text-xs">Postcode</div>
                  <div className="text-white font-semibold">{selectedRental.dublinPostcode}</div>
                </div>
              )}
            </div>
            
            {/* Rent per sqm/bed */}
            <div className="border-t border-gray-700 pt-4 space-y-2">
              {selectedRental.rentPerBed && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm">Rent per bedroom</span>
                  <span className="text-white font-mono">€{selectedRental.rentPerBed.toLocaleString()}/mo</span>
                </div>
              )}
              {selectedRental.rentPerSqm && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm">Rent per m²</span>
                  <span className="text-white font-mono">€{selectedRental.rentPerSqm.toFixed(2)}/mo</span>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Stats overlay - hidden when property/listing/rental panel is open */}
        {!selectedProperty && !selectedListing && !selectedRental && (
          <div className="absolute top-4 left-4 hidden md:block">
            <div className="bg-gray-900/90 backdrop-blur-xl rounded-lg p-4 border border-gray-700 min-w-[180px]">
              {dataSources.sold && (
              <>
                <div className="text-sm text-gray-500 mb-1">
                  {filteredStats.isFiltered ? `${getTimeFilterLabel()} Avg €/m²` : 'Dublin Avg €/m²'}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-white font-mono">
                    €{(filteredStats.isFiltered ? filteredStats.avgPricePerSqm : stats.avgPricePerSqm).toLocaleString()}
                  </span>
                  {filteredStats.isFiltered && filteredStats.percentChange !== null && (
                    <span className={`text-sm font-semibold px-1.5 py-0.5 rounded ${
                      filteredStats.percentChange > 0 
                        ? 'bg-green-500/20 text-green-400' 
                        : filteredStats.percentChange < 0 
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {filteredStats.percentChange > 0 ? '↑' : filteredStats.percentChange < 0 ? '↓' : ''}
                      {Math.abs(filteredStats.percentChange).toFixed(1)}%
                    </span>
                  )}
                </div>
                {filteredStats.isFiltered && (
                  <div className="text-xs text-gray-500 mt-1">
                    vs €{stats.avgPricePerSqm.toLocaleString()} overall
                  </div>
                )}
              </>
            )}
            {dataSources.forSale && (
              <>
                <div className="text-sm text-gray-500 mb-1">
                  {(selectedYear !== null || recentFilter !== null) ? `${getTimeFilterLabel()} Avg €/m²` : 'Asking Avg €/m²'}
                </div>
                <div className="text-2xl font-bold text-white font-mono">
                  €{filteredListingStats.avgPricePerSqm.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {filteredListings.length.toLocaleString()} listings
                  {filteredListings.length !== listings.length && ` (of ${listings.length})`}
                </div>
              </>
            )}
            {dataSources.rentals && (
              <>
                <div className="text-sm text-gray-500 mb-1">Dublin Median Rent</div>
                <div className="text-2xl font-bold text-white font-mono">
                  €{rentalStats.medianRent.toLocaleString()}/mo
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {filteredRentals.length.toLocaleString()} rentals
                </div>
                {rentalStats.avgRentPerSqm > 0 && (
                  <div className="text-xs text-gray-500 mt-1">
                    €{rentalStats.avgRentPerSqm.toFixed(2)}/m² avg
                  </div>
                )}
              </>
            )}
            {activeSourceCount > 1 && (
              <>
                <div className="text-sm text-gray-500 mb-2">
                  {(selectedYear !== null || recentFilter !== null) ? `${getTimeFilterLabel()} Avg €/m²` : 'Avg €/m² Comparison'}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-gray-200 text-sm">⚪ Sold</span>
                    <span className="text-lg font-bold text-white font-mono">
                      €{filteredStats.avgPricePerSqm.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-rose-400 text-sm">🔴 For Sale</span>
                    <span className="text-lg font-bold text-white font-mono">
                      €{filteredListingStats.avgPricePerSqm.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-purple-400 text-sm">🟣 Rentals</span>
                    <span className="text-lg font-bold text-white font-mono">
                      €{rentalStats.medianRent.toLocaleString()}/mo
                    </span>
                  </div>
                </div>
                {filteredListingStats.avgPricePerSqm > 0 && filteredStats.avgPricePerSqm > 0 && (
                  <div className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-700">
                    {filteredListingStats.avgPricePerSqm > filteredStats.avgPricePerSqm 
                      ? `Asking ${((filteredListingStats.avgPricePerSqm - filteredStats.avgPricePerSqm) / filteredStats.avgPricePerSqm * 100).toFixed(1)}% above sold`
                      : filteredListingStats.avgPricePerSqm < filteredStats.avgPricePerSqm
                        ? `Asking ${((filteredStats.avgPricePerSqm - filteredListingStats.avgPricePerSqm) / filteredStats.avgPricePerSqm * 100).toFixed(1)}% below sold`
                        : 'Asking prices match sold prices'
                    }
                  </div>
                )}
              </>
            )}
            </div>
          </div>
        )}
        
        {/* View mode tips */}
        <div className="absolute bottom-4 right-4 hidden md:block">
          <div className="bg-gray-900/90 backdrop-blur-xl rounded-lg px-4 py-3 border border-gray-700 text-sm text-gray-400 max-w-xs">
            {viewMode === 'clusters' && (dataSources.sold || dataSources.forSale || dataSources.rentals) && (
              <p>💡 Click clusters to zoom in. Click {dataSources.sold ? 'properties' : dataSources.rentals ? 'rentals' : 'listings'} for details.</p>
            )}
            {viewMode === 'clusters' && activeSourceCount > 1 && (
              <p>💡 <span className="text-white">White</span> = Sold, <span className="text-rose-400">Pink</span> = For Sale, <span className="text-purple-400">Purple</span> = Rental. Click for details.</p>
            )}
            {viewMode === 'price' && (dataSources.sold || dataSources.forSale) && (
              <p>💡 Colors show {dataSources.sold ? 'sold' : 'asking'} price. Green = under €400k, Red = over €1M.</p>
            )}
            {viewMode === 'price' && dataSources.rentals && (
              <p>💡 Colors show monthly rent. Green = under €1,500, Red = over €3,000.</p>
            )}
            {viewMode === 'difference' && dataSources.sold && (
              <p>💡 Green = deals (sold under asking), Red = bidding wars (sold over asking).</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
