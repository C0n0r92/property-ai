'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { formatFullPrice } from '@/lib/format';
import type { Property, Listing, RentalListing, RentalStats, Amenity, WalkabilityScore, RouteInfo, AmenitiesFilter } from '@/types/property';
import { SpiderfyManager, SpiderFeature } from '@/lib/spiderfy';
import { analytics } from '@/lib/analytics';
import { fetchAmenities, calculateWalkabilityScore, getCategoryIcon, formatCategory, getCategoryDisplayName, calculateDistance } from '@/lib/amenities';
import { PropertySnapshot } from '@/components/PropertySnapshot';
import { usePropertyShare } from '@/hooks/usePropertyShare';

// Mapbox access token
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
mapboxgl.accessToken = MAPBOX_TOKEN;

type DifferenceFilter = number | null;

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
  const soldSnapshotRef = useRef<HTMLDivElement>(null);
  const listingSnapshotRef = useRef<HTMLDivElement>(null);
  const rentalSnapshotRef = useRef<HTMLDivElement>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [rentals, setRentals] = useState<RentalListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [selectedRental, setSelectedRental] = useState<RentalListing | null>(null);
  const isClosingRef = useRef(false);

  // Temporary: Auto-select first listing for testing selected property highlighting
  // DISABLED: This was causing cards to reopen immediately after closing
  // useEffect(() => {
  //   if (listings.length > 0 && !selectedListing && !selectedProperty && !selectedRental) {
  //     console.log('Auto-selecting first listing for testing:', listings[0].address);
  //     setSelectedListing(listings[0]);
  //   }
  // }, [listings, selectedListing, selectedProperty, selectedRental]);

  // Property card minimize states
  const [minimizeProperty, setMinimizeProperty] = useState(false);
  const [minimizeListing, setMinimizeListing] = useState(false);
  const [minimizeRental, setMinimizeRental] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(11); // Track zoom for legend display
  const [viewMode, setViewMode] = useState<'clusters' | 'price' | 'difference'>('clusters');
  const [differenceFilter, setDifferenceFilter] = useState<DifferenceFilter>(null);
  
  // Data source toggle: allows any combination of sold, forSale, rentals
  const [dataSources, setDataSources] = useState<DataSourceSelection>({ sold: true, forSale: true, rentals: false });
  
  // Hierarchical time filter state (only for sold properties)
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedQuarter, setSelectedQuarter] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [recentFilter, setRecentFilter] = useState<'6m' | '12m' | null>(null);
  const [timeFilter, setTimeFilter] = useState<'today' | 'thisWeek' | 'thisMonth' | 'lastWeek' | 'lastMonth' | null>(null);
  
  const [stats, setStats] = useState({ total: 0, avgPrice: 0, avgPricePerSqm: 0, overAsking: 0, underAsking: 0 });
  const [listingStats, setListingStats] = useState({ totalListings: 0, medianPrice: 0, avgPricePerSqm: 0 });
  const [rentalStats, setRentalStats] = useState<RentalStats>({ totalRentals: 0, medianRent: 0, avgRentPerSqm: 0, rentRange: { min: 0, max: 0 } });
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ place_name: string; center: [number, number] }>>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  // Collapsible filter panel state - hidden on mobile, open on desktop by default
  const [showFilters, setShowFilters] = useState(false);

  // Amenities layer state
  const [showAmenities, setShowAmenities] = useState(false);
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [amenitiesCache, setAmenitiesCache] = useState<Map<string, Amenity[]>>(new Map());
  const [walkabilityScore, setWalkabilityScore] = useState<WalkabilityScore | null>(null);

  // Category filtering
  const [categoryFilters, setCategoryFilters] = useState<AmenitiesFilter>({
    public_transport: true,
    education: true,
    healthcare: true,
    shopping: true,
    leisure: true,
    services: true,
  });

  // Route visualization
  const [selectedAmenity, setSelectedAmenity] = useState<Amenity | null>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [travelMode, setTravelMode] = useState<'walking' | 'cycling' | 'driving'>('walking');

  // Loading and error states
  const [loadingAmenities, setLoadingAmenities] = useState(false);
  const [amenitiesError, setAmenitiesError] = useState<string | null>(null);
  
  // Open filters on desktop by default
  useEffect(() => {
    const isDesktop = window.innerWidth >= 768; // md breakpoint
    if (isDesktop) {
      setShowFilters(true);
    }
  }, []);
  
  // New filter states
  const [bedsFilter, setBedsFilter] = useState<number | null>(null);
  const [propertyTypeFilter, setPropertyTypeFilter] = useState<string | null>(null);
  const [minPrice, setMinPrice] = useState<number | null>(null);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [minArea, setMinArea] = useState<number | null>(null);
  const [maxArea, setMaxArea] = useState<number | null>(null);
  const [yieldFilter, setYieldFilter] = useState<number | null>(null);

  // Property sharing hooks
  const soldShare = usePropertyShare(soldSnapshotRef, selectedProperty, 'sold');
  const listingShare = usePropertyShare(listingSnapshotRef, selectedListing, 'forSale');
  const rentalShare = usePropertyShare(rentalSnapshotRef, selectedRental, 'rental');

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
      
      // Auto-select appropriate view mode based on data sources
      // Only sold selected -> difference (over asking)
      if (newSources.sold && !newSources.forSale && !newSources.rentals) {
        setViewMode('difference');
      }
      // Sold + for sale (no rentals) -> price
      else if (newSources.sold && newSources.forSale && !newSources.rentals) {
        setViewMode('price');
      }
      // All 3 selected -> clusters
      else if (newSources.sold && newSources.forSale && newSources.rentals) {
        setViewMode('clusters');
      }
      // If sold is being deselected and we're in difference view, switch to clusters
      else if (!newSources.sold && viewMode === 'difference') {
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
    setDifferenceFilter(null);
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
    // Prevent reopening if we just closed a card
    if (isClosingRef.current) {
      console.log('Ignoring spider click - card is being closed');
      return;
    }
    
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

  // Load data for all Ireland based on selected data sources
  useEffect(() => {
    // Only fetch data for selected sources
    const sources = [];
    if (dataSources.sold) sources.push('sold');
    if (dataSources.forSale) sources.push('forSale');
    if (dataSources.rentals) sources.push('rentals');
    
    if (sources.length === 0) return;
    
    setLoading(true);
    
    // Load all Ireland bounds
    const irelandBounds = {
      north: 55.5,
      south: 51.4,
      east: -5.4,
      west: -10.7,
    };
    
    // Build time filter parameter
    let timeFilterParam = '';
    if (timeFilter) {
      timeFilterParam = `&timeFilter=${timeFilter}`;
    } else if (recentFilter) {
      // Map existing filters to new timeFilter values
      if (recentFilter === '6m') timeFilterParam = '&timeFilter=last6Months';
      if (recentFilter === '12m') timeFilterParam = '&timeFilter=last12Months';
    }

    // Fetch map data with all Ireland bounds and selected sources
    fetch(`/api/map-data?sources=${sources.join(',')}&north=${irelandBounds.north}&south=${irelandBounds.south}&east=${irelandBounds.east}&west=${irelandBounds.west}&limit=100000${timeFilterParam}`)
      .then(res => res.json())
      .then(data => {
        // Update properties if sold is selected
        if (data.properties) {
          setProperties(data.properties);
          
          // Calculate over/under asking from loaded data
          const withAsking = data.properties.filter((p: Property) => p.askingPrice && p.askingPrice > 0);
          const overAsking = withAsking.filter((p: Property) => p.soldPrice > p.askingPrice!).length;
          const underAsking = withAsking.filter((p: Property) => p.soldPrice < p.askingPrice!).length;
          
          setStats(prev => ({
            ...prev,
            total: data.properties.length,
            overAsking,
            underAsking,
          }));
        }
        
        // Update listings if forSale is selected
        if (data.listings) {
          setListings(data.listings);
          const prices = data.listings.map((l: Listing) => l.askingPrice).sort((a: number, b: number) => a - b);
          const medianPrice = prices[Math.floor(prices.length / 2)] || 0;
          const withSqm = data.listings.filter((l: Listing) => l.pricePerSqm && l.pricePerSqm > 0);
          const avgPricePerSqm = withSqm.length > 0 
            ? Math.round(withSqm.reduce((sum: number, l: Listing) => sum + (l.pricePerSqm || 0), 0) / withSqm.length)
            : 0;
          setListingStats({
            totalListings: data.listings.length,
            medianPrice,
            avgPricePerSqm,
          });
        }
        
        // Update rentals if rentals is selected
        if (data.rentals) {
          setRentals(data.rentals);
          const rents = data.rentals.map((r: RentalListing) => r.monthlyRent).sort((a: number, b: number) => a - b);
          const medianRent = rents[Math.floor(rents.length / 2)] || 0;
          const withSqm = data.rentals.filter((r: RentalListing) => r.rentPerSqm && r.rentPerSqm > 0);
          const avgRentPerSqm = withSqm.length > 0 
            ? Math.round(withSqm.reduce((sum: number, r: RentalListing) => sum + (r.rentPerSqm || 0), 0) / withSqm.length * 10) / 10
            : 0;
          setRentalStats({
            totalRentals: data.rentals.length,
            medianRent,
            avgRentPerSqm,
            rentRange: { min: rents[0] || 0, max: rents[rents.length - 1] || 0 },
          });
        }
        
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading map data:', err);
        setLoading(false);
      });

    // Fetch overall Dublin-wide stats (lightweight)
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => {
        setStats(prev => ({
          ...prev,
          avgPrice: data.stats.medianPrice,
          avgPricePerSqm: data.stats.avgPricePerSqm,
        }));
      })
      .catch(err => console.error('Error loading stats:', err));
      
  }, [dataSources.sold, dataSources.forSale, dataSources.rentals, timeFilter, recentFilter, selectedYear]);

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
    if (yieldFilter !== null) {
      filtered = filtered.filter(p => {
        const y = p.yieldEstimate?.grossYield;
        return y !== undefined && y !== null && y >= yieldFilter;
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
    setTimeFilter(null);
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
    if (yieldFilter !== null) {
      filtered = filtered.filter(l => {
        const y = l.yieldEstimate?.grossYield;
        return y !== undefined && y !== null && y >= yieldFilter;
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
    if (differenceFilter !== null) count++;
    if (bedsFilter !== null) count++;
    if (propertyTypeFilter !== null) count++;
    if (minPrice !== null) count++;
    if (maxPrice !== null) count++;
    if (minArea !== null) count++;
    if (maxArea !== null) count++;
    if (yieldFilter !== null) count++;
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
    if (timeFilter === 'today') return 'Today';
    if (timeFilter === 'thisWeek') return 'This Week';
    if (timeFilter === 'thisMonth') return 'This Month';
    if (timeFilter === 'lastWeek') return 'Last Week';
    if (timeFilter === 'lastMonth') return 'Last Month';
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

    const navControl = new mapboxgl.NavigationControl();
    map.current.addControl(navControl, 'top-right');
    
    // Store reference to nav control for hiding/showing
    (map.current as any).navControl = navControl;
    
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

  // Function to reset/reload the map
  const resetMap = useCallback(() => {
    if (map.current) {
      // Force map to resize and redraw
      map.current.resize();
      map.current.triggerRepaint();
      
      // Fly back to Dublin center
      map.current.flyTo({
        center: [-6.26, 53.35],
        zoom: 11,
        essential: true
      });
    }
  }, []);

  // Hide navigation controls on mobile when property panel is open
  useEffect(() => {
    if (!map.current) return;
    
    const isMobile = window.innerWidth < 768;
    const hasPropertyOpen = selectedProperty || selectedListing || selectedRental;
    
    if (isMobile && hasPropertyOpen) {
      // Hide navigation control on mobile when property is selected
      const navControlContainer = document.querySelector('.mapboxgl-ctrl-top-right');
      if (navControlContainer) {
        (navControlContainer as HTMLElement).style.display = 'none';
      }
    } else {
      // Show navigation control
      const navControlContainer = document.querySelector('.mapboxgl-ctrl-top-right');
      if (navControlContainer) {
        (navControlContainer as HTMLElement).style.display = 'block';
      }
    }
  }, [selectedProperty, selectedListing, selectedRental]);

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
    
    const layersToRemove = ['clusters', 'cluster-count', 'unclustered-point', 'properties-points', 'selected-property-point', 'selected-property-star'];
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
        
        // Prevent reopening if we just closed a card
        if (isClosingRef.current) {
          console.log('Ignoring click - card is being closed');
          return;
        }

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
          // Single property - show details and zoom to focus on it
          const props = clickedFeature.properties;
          if (props?.isRental) {
            // Find the full rental object
            const fullRental = rentals.find(r => r.address === props?.address);
            if (fullRental && fullRental.longitude && fullRental.latitude) {
              setSelectedRental(fullRental);
            }
            setSelectedProperty(null);
            setSelectedListing(null);
          } else if (props?.isListing) {
            // Find the full listing object
            const fullListing = listings.find(l => l.address === props?.address);
            if (fullListing && fullListing.longitude && fullListing.latitude) {
              setSelectedListing(fullListing);
            }
            setSelectedProperty(null);
            setSelectedRental(null);
          } else {
            // Find the full property object
            const fullProperty = properties.find(p => p.address === props?.address);
            if (fullProperty && fullProperty.longitude && fullProperty.latitude) {
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

      // Add selected property highlight layer (on top of regular properties)
      const currentProperty = selectedProperty || selectedListing || selectedRental;
      console.log('Adding selected property layer for:', currentProperty?.address);
      console.log('Selected property coords:', currentProperty?.longitude, currentProperty?.latitude);
      if (currentProperty && currentProperty.longitude && currentProperty.latitude) {
        console.log('Creating selected property highlight layer for address:', currentProperty.address);
        try {
          map.current.addLayer({
            id: 'selected-property-point',
            type: 'circle',
            source: 'properties',
            filter: ['==', ['get', 'address'], currentProperty.address],
            paint: {
              'circle-radius': [
                'interpolate',
                ['linear'],
                ['zoom'],
                9, 8,  // Larger than regular markers
                14, 16,
              ],
              'circle-color': '#9333EA', // Purple/magenta for selected
              'circle-opacity': 1.0,
              'circle-stroke-width': 3,
              'circle-stroke-color': '#ffffff',
              // Add a subtle pulse effect
              'circle-stroke-opacity': 0.8,
            },
          });
          console.log('Selected property highlight layer created successfully');
        } catch (error) {
          console.error('Error creating selected property layer:', error);
        }
      } else {
        console.log('Skipping selected property layer - missing coords or no selection');
      }

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

      // Add selected property highlight layer (on top of regular properties)
      const currentProperty = selectedProperty || selectedListing || selectedRental;
      if (currentProperty && currentProperty.longitude && currentProperty.latitude) {
        map.current.addLayer({
          id: 'selected-property-point',
          type: 'circle',
          source: 'properties',
          filter: ['==', ['get', 'address'], currentProperty.address],
          paint: {
            'circle-radius': [
              'interpolate',
              ['linear'],
              ['zoom'],
              9, 10,  // Larger than regular markers
              14, 20,
            ],
            'circle-color': '#9333EA', // Purple/magenta for selected
            'circle-opacity': 1.0,
            'circle-stroke-width': 4,
            'circle-stroke-color': '#ffffff',
            // Add a subtle pulse effect
            'circle-stroke-opacity': 0.9,
          },
        });
      }

      setupPointClickHandler('properties-points');
    }

    function setupPointClickHandler(layerId: string) {
      map.current?.on('click', layerId, (e) => {
        if (!e.features || !e.features[0]) return;
        
        // Prevent reopening if we just closed a card
        if (isClosingRef.current) {
          console.log('Ignoring click - card is being closed');
          return;
        }
        
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

    // Add star icon for selected property in amenities mode (using built-in Mapbox Maki icon)
    // We'll use the 'star' icon which should be available in the default Mapbox style

    // Add amenities sources and layers
    if (!map.current.getSource('amenities')) {
      map.current.addSource('amenities', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });

      // Heavy rail layer (DART/Luas) - larger, more prominent
      map.current.addLayer({
        id: 'amenities-heavy-rail',
        type: 'symbol',
        source: 'amenities',
        filter: ['==', ['get', 'isHeavyRail'], true],
        layout: {
          'icon-image': ['get', 'icon'], // Mapbox Maki icon
          'icon-size': 1.8, // Even larger for prominence in amenities mode
          'icon-allow-overlap': true,
          'text-field': ['get', 'name'],
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-size': 12,
          'text-anchor': 'top',
          'text-offset': [0, 2],
          'visibility': 'none', // Hidden initially
        },
        paint: {
          'icon-color': '#3B82F6', // Blue for transport
          'text-color': '#ffffff',
          'text-halo-color': '#000000',
          'text-halo-width': 2,
        }
      });

      // Regular amenities layer - more prominent in amenities mode
      map.current.addLayer({
        id: 'amenities-regular',
        type: 'symbol',
        source: 'amenities',
        filter: ['!=', ['get', 'isHeavyRail'], true],
        layout: {
          'icon-image': ['get', 'icon'],
          'icon-size': 1.3, // Larger than normal for better visibility
          'icon-allow-overlap': true, // Allow overlap for better visibility
          'text-field': ['get', 'name'],
          'text-font': ['Open Sans Semibold', 'Arial Unicode MS Regular'],
          'text-size': 11,
          'text-anchor': 'top',
          'text-offset': [0, 1.5],
          'visibility': 'none', // Hidden initially
        },
        paint: {
          // Color by category - brighter colors for better visibility
          'icon-color': [
            'match',
            ['get', 'category'],
            'public_transport', '#3B82F6', // Blue
            'education', '#A855F7',         // Purple
            'healthcare', '#EF4444',        // Red
            'shopping', '#10B981',          // Green
            'leisure', '#F59E0B',           // Orange
            'services', '#6B7280',          // Gray
            '#FFFFFF' // Default
          ],
          'text-color': '#ffffff',
          'text-halo-color': '#000000',
          'text-halo-width': 1.5,
        }
      });

      // Add route source and layer
      if (!map.current.getSource('route')) {
        map.current.addSource('route', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] }
        });

        map.current.addLayer({
          id: 'route-line',
          type: 'line',
          source: 'route',
          paint: {
            'line-color': '#3B82F6',
            'line-width': 6,
            'line-opacity': 0.9,
          }
        }, 'amenities-regular'); // Add above amenity layers
      }

      // Amenity click handlers
      map.current.on('click', 'amenities-heavy-rail', (e) => {
        if (!e.features?.[0]) return;
        handleAmenityClick(e.features[0]);
      });

      map.current.on('click', 'amenities-regular', (e) => {
        if (!e.features?.[0]) return;
        handleAmenityClick(e.features[0]);
      });

      // Amenity hover handlers
      ['amenities-heavy-rail', 'amenities-regular'].forEach(layerId => {
        map.current?.on('mouseenter', layerId, () => {
          if (map.current?.getLayer(layerId)) {
            map.current.getCanvas().style.cursor = 'pointer';
          }
        });
        map.current?.on('mouseleave', layerId, () => {
          if (map.current) map.current.getCanvas().style.cursor = '';
        });
      });
    }

    function handleAmenityClick(feature: any) {
      const props = feature.properties;
      const amenity = amenities.find(a => a.id === props.id);

      if (amenity) {
        // Track amenity click
        analytics.amenityClicked(amenity.type, amenity.name);

        setSelectedAmenity(amenity);

        // Create popup with amenity details
        if (map.current) {
          new mapboxgl.Popup()
            .setLngLat([amenity.longitude, amenity.latitude])
            .setHTML(createAmenityPopupHTML(amenity))
            .addTo(map.current);
        }
      }
    }

    function createAmenityPopupHTML(amenity: Amenity): string {
      return `
        <div class="amenity-popup" style="min-width: 200px;">
          <h3 style="font-weight: bold; margin-bottom: 8px;">${amenity.name}</h3>
          <div style="color: #9ca3af; font-size: 12px; margin-bottom: 8px;">
            ${formatCategory(amenity.category)}
          </div>
          <div style="margin-bottom: 8px;">
            <div style="font-size: 14px;">📍 ${amenity.distance}m away</div>
            <div style="font-size: 14px;">⏱️ ${amenity.walkingTime} min walk</div>
          </div>
          <button
            onclick="window.getDirections('${amenity.id}')"
            style="width: 100%; padding: 8px; background: #3B82F6; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;"
          >
            Get Directions
          </button>
          <a
            href="https://www.google.com/maps/dir/?api=1&destination=${amenity.latitude},${amenity.longitude}"
            target="_blank"
            style="display: block; text-align: center; margin-top: 8px; font-size: 12px; color: #60a5fa;"
          >
            Open in Google Maps
          </a>
        </div>
      `;
    }
    }; // End of doSetupLayers
    
    // Start the setup process
    setupLayers();

  }, [mapReady, activeData, viewMode, dataSources, rentals, listings, properties]);

  // Update amenities map layers when category filters change (debounced)
  useEffect(() => {
    if (!map.current || !amenities.length) return;

    // Debounce rapid filter changes
    const timeoutId = setTimeout(() => {
      // Filter amenities by category
      const filtered = amenities.filter(a => categoryFilters[a.category]);

      console.log('Updating amenities layer with', filtered.length, 'filtered amenities');

      // Update map source
      const geojson: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: filtered.map(a => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [a.longitude, a.latitude] },
          properties: {
            id: a.id,
            name: a.name,
            category: a.category,
            icon: a.icon,
            isHeavyRail: a.isHeavyRail || false,
            distance: a.distance,
            walkingTime: a.walkingTime,
          }
        }))
      };

      console.log('Setting amenities GeoJSON:', geojson);

      const amenitiesSource = map.current?.getSource('amenities') as mapboxgl.GeoJSONSource;
      if (amenitiesSource) {
        amenitiesSource.setData(geojson);
        console.log('Amenities data set successfully');
      } else {
        console.error('Amenities source not found!');
      }
    }, 100); // 100ms debounce

    return () => clearTimeout(timeoutId);
  }, [amenities, categoryFilters]);

  // Control layer visibility when amenities mode changes
  useEffect(() => {
    if (!map.current) return;

    console.log('Amenities mode:', showAmenities);

    if (showAmenities) {
      // Filter properties-points to only show the selected property
      const currentProperty = selectedProperty || selectedListing || selectedRental;
      console.log('Amenities mode activated, currentProperty:', currentProperty);
      console.log('selectedProperty:', selectedProperty);
      console.log('selectedListing:', selectedListing);
      console.log('selectedRental:', selectedRental);

      if (currentProperty && currentProperty.longitude && currentProperty.latitude) {
        console.log('Focusing on selected property for amenities mode:', currentProperty.address, 'coords:', currentProperty.longitude, currentProperty.latitude);

        // Hide clusters completely
        if (map.current.getLayer('clusters')) {
          console.log('Hiding clusters layer');
          map.current.setLayoutProperty('clusters', 'visibility', 'none');
        }

        // Hide properties-points completely and create star marker instead
        if (map.current.getLayer('properties-points')) {
          console.log('Hiding properties-points layer completely');
          map.current.setLayoutProperty('properties-points', 'visibility', 'none');
        }

        // Create star marker for selected property using Mapbox Maki icon
        if (!map.current.getLayer('selected-property-star')) {
          console.log('Creating star marker for selected property');

          // Ensure the properties source exists before adding the layer
          if (!map.current.getSource('properties')) {
            console.log('Properties source not found, creating it for star marker');
            // Create geojson from current properties data (only include properties with valid coordinates)
            const propertiesGeojson: GeoJSON.FeatureCollection = {
              type: 'FeatureCollection',
              features: properties
                .filter(p => p.longitude !== null && p.latitude !== null)
                .map(p => ({
                  type: 'Feature',
                  geometry: {
                    type: 'Point',
                    coordinates: [p.longitude!, p.latitude!]
                  },
                  properties: {
                    address: p.address,
                    soldPrice: p.soldPrice,
                    pricePerSqm: p.pricePerSqm,
                    beds: p.beds,
                    baths: p.baths,
                    areaSqm: p.areaSqm,
                    propertyType: p.propertyType,
                    soldDate: p.soldDate,
                    sourceUrl: p.sourceUrl,
                  }
                }))
            };

            map.current.addSource('properties', {
              type: 'geojson',
              data: propertiesGeojson,
            });
          }

          map.current.addLayer({
            id: 'selected-property-star',
            type: 'symbol',
            source: 'properties',
            filter: ['==', ['get', 'address'], currentProperty.address],
            layout: {
              'icon-image': 'star', // Mapbox Maki star icon
              'icon-size': [
                'interpolate',
                ['linear'],
                ['zoom'],
                9, 1.5,  // Larger star for prominence
                14, 2.0,
              ],
              'icon-allow-overlap': true,
              'icon-ignore-placement': true,
              'icon-anchor': 'center',
            },
            paint: {
              'icon-color': '#9333EA', // Purple/magenta for selected property
            }
          });
        }

        // Zoom to focus on the selected property
        map.current.flyTo({
          center: [currentProperty.longitude, currentProperty.latitude],
          zoom: 16,
          duration: 1000
        });
      } else {
        console.log('Cannot focus on property - missing coordinates or no current property');
        if (currentProperty) {
          console.log('Property exists but missing coords:', currentProperty.address, 'longitude:', currentProperty.longitude, 'latitude:', currentProperty.latitude);
        }
      }

      // Show amenities layers (they will become visible when data is loaded)
      const layersToShow = ['amenities-regular', 'amenities-heavy-rail'];
      layersToShow.forEach(layerId => {
        if (map.current?.getLayer(layerId)) {
          console.log('Showing layer:', layerId);
          map.current.setLayoutProperty(layerId, 'visibility', 'visible');
        } else {
          console.log('Amenities layer not found:', layerId);
        }
      });
    } else {
      // Hide amenities and restore map to normal view mode state
      console.log('Hiding amenities - restoring normal map view');

      // Restore map layers based on current view mode
      if (viewMode === 'clusters') {
        // Restore clusters if they should be visible
        if (map.current.getLayer('clusters')) {
          console.log('Restoring clusters layer');
          map.current.setLayoutProperty('clusters', 'visibility', 'visible');
        }
      } else if (viewMode === 'price') {
        // Restore properties-points layer
        if (map.current.getLayer('properties-points')) {
          console.log('Restoring properties-points layer');
          map.current.setLayoutProperty('properties-points', 'visibility', 'visible');
          // Remove the filter that was showing only selected property
          map.current.setFilter('properties-points', null);
        }
      }

      // Remove star marker layer
      if (map.current.getLayer('selected-property-star')) {
        console.log('Removing star marker layer');
        map.current.removeLayer('selected-property-star');
      }

      // Hide amenities layers
      const layersToHide = ['amenities-regular', 'amenities-heavy-rail'];
      layersToHide.forEach(layerId => {
        if (map.current?.getLayer(layerId)) {
          console.log('Hiding amenities layer:', layerId);
          map.current.setLayoutProperty(layerId, 'visibility', 'none');
        }
      });

      // Clear route if visible
      if (map.current.getSource('route')) {
        (map.current.getSource('route') as mapboxgl.GeoJSONSource)?.setData({
          type: 'FeatureCollection',
          features: []
        });
      }
      setRouteInfo(null);
    }
  }, [showAmenities, selectedProperty, selectedListing, selectedRental, viewMode]);

  // Zoom to amenities when they are loaded (but not when in amenities mode - let property focus handle zoom)
  useEffect(() => {
    const currentProperty = selectedProperty || selectedListing || selectedRental;
    if (!map.current || !currentProperty || showAmenities || amenities.length === 0) {
      console.log('Zoom effect skipped:', { map: !!map.current, property: !!currentProperty, showAmenities, amenitiesCount: amenities.length });
      return;
    }

    console.log('Zooming to amenities:', amenities.length, 'amenities');

    // Zoom to fit property and amenities
    const allCoords: [number, number][] = [];

    // Add property coordinates if available
    if (currentProperty.longitude !== null && currentProperty.latitude !== null) {
      allCoords.push([currentProperty.longitude, currentProperty.latitude]);
      console.log('Property coords:', currentProperty.longitude, currentProperty.latitude);
    }

    // Add amenity coordinates
    amenities.forEach(a => {
      allCoords.push([a.longitude, a.latitude]);
    });

    console.log('Total coords for zoom:', allCoords.length);

    if (allCoords.length > 0) {
      const bounds = allCoords.reduce((bounds, coord) => {
        return bounds.extend(coord);
      }, new mapboxgl.LngLatBounds(allCoords[0], allCoords[0]));

      console.log('Zooming to bounds');
      map.current.fitBounds(bounds, {
        padding: 100,
        maxZoom: 16, // Don't zoom in too much
        duration: 1000 // Smooth zoom animation
      });

      // Trigger resize after zoom to ensure proper layout
      setTimeout(() => {
        map.current?.resize();
      }, 1100);
    }
  }, [amenities, showAmenities, selectedProperty, selectedListing, selectedRental]);

  // Fetch amenities when any property type is selected and amenities are toggled on
  useEffect(() => {
    const abortController = new AbortController();

    const fetchAndDisplayAmenities = async (property: any) => {
      if (!property?.latitude || !property?.longitude) return;

      const cacheKey = `${property.latitude},${property.longitude}`;

      // Check cache first
      if (amenitiesCache.has(cacheKey)) {
        const cached = amenitiesCache.get(cacheKey)!;
        setAmenities(cached);
        setWalkabilityScore(calculateWalkabilityScore(cached));
        setAmenitiesError(null);
        return;
      }

      setLoadingAmenities(true);
      setAmenitiesError(null);

      try {
        // Validate coordinates
        if (!property.latitude || !property.longitude) {
          throw new Error('Invalid property coordinates');
        }

        console.log('Selected property coords:', property.latitude, property.longitude);

        const results = await fetchAmenities(
          property.latitude,
          property.longitude,
          1000, // 1km radius (2km total diameter) for nearby amenities only
          abortController.signal // Pass abort signal
        );

        // Check if request was cancelled
        if (abortController.signal.aborted) return;

        // If no amenities found from API, add test data for UI testing
        let finalResults = results;
        if (results.length === 0) {
          console.log('API returned no amenities, adding test data for UI testing');
          const testData = [
          {
            id: 'test-bus-stop',
            type: 'bus_stop' as any,
            category: 'public_transport' as any,
            name: '🚍 TEST BUS STOP (Click me!)',
            latitude: property.latitude + 0.01,
            longitude: property.longitude + 0.01,
            distance: 1000,
            walkingTime: 2,
            icon: 'bus',
            isHeavyRail: false,
            tags: { amenity: 'bus_stop', name: '🚍 TEST BUS STOP (Click me!)' } as Record<string, string>
          },
          {
            id: 'test-shop',
            type: 'supermarket' as any,
            category: 'shopping' as any,
            name: '🛒 TEST SUPERMARKET (Click me!)',
            latitude: property.latitude - 0.01,
            longitude: property.longitude - 0.01,
            distance: 1100,
            walkingTime: 3,
            icon: 'grocery',
            isHeavyRail: false,
            tags: { shop: 'supermarket', name: '🛒 TEST SUPERMARKET (Click me!)' } as Record<string, string>
          },
          {
            id: 'test-school',
            type: 'school' as any,
            category: 'education' as any,
            name: '🏫 TEST SCHOOL (Click me!)',
            latitude: property.latitude + 0.007,
            longitude: property.longitude - 0.007,
            distance: 800,
            walkingTime: 16,
            icon: 'school',
            isHeavyRail: false,
            tags: { amenity: 'school', name: '🏫 TEST SCHOOL (Click me!)' } as Record<string, string>
          },
          {
            id: 'test-dart',
            type: 'train_station' as any,
            category: 'public_transport' as any,
            name: '🚆 TEST DART STATION (Heavy Rail!)',
            latitude: property.latitude - 0.007,
            longitude: property.longitude + 0.007,
            distance: 900,
            walkingTime: 18,
            icon: 'rail',
            isHeavyRail: true,
            tags: { railway: 'station', name: '🚆 TEST DART STATION (Heavy Rail!)', operator: 'Iarnród Éireann' } as Record<string, string>
          }
          ];

          finalResults = testData;
        }

        // Calculate walkability score
        const score = calculateWalkabilityScore(finalResults);

        // Cache results
        setAmenitiesCache(prev => new Map(prev).set(cacheKey, results));
        setAmenities(results);
        setWalkabilityScore(score);

        // Track successful amenities loading
        const propertyType = selectedProperty ? 'sold' : selectedListing ? 'forSale' : 'rental';
        analytics.amenitiesLoaded(finalResults.length, propertyType);

        console.log('Amenities loaded:', finalResults.length, 'items');

      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return; // Request was cancelled

        console.error('Failed to fetch amenities:', error);

        // Provide user-friendly error messages
        let errorMessage = 'Unable to load nearby amenities.';
        if (error instanceof Error) {
          if (error.message.includes('timeout')) {
            errorMessage = 'Request timed out. Please try again.';
          } else if (error.message.includes('network') || error.message.includes('fetch')) {
            errorMessage = 'Network error. Check your connection and try again.';
          } else if (error.message.includes('Rate limited')) {
            errorMessage = 'Service temporarily busy. Please wait a moment and try again.';
          }
        }

        setAmenitiesError(errorMessage);
      } finally {
        if (!abortController.signal.aborted) {
          setLoadingAmenities(false);
        }
      }
    };

    // Determine which property type is currently selected
    const currentProperty = selectedProperty || selectedListing || selectedRental;

    if (showAmenities && currentProperty) {
      fetchAndDisplayAmenities(currentProperty);
    } else {
      setAmenities([]);
      setWalkabilityScore(null);
      setAmenitiesError(null);
    }

    // Cleanup: cancel any ongoing requests
    return () => {
      abortController.abort();
    };
  }, [showAmenities, selectedProperty, selectedListing, selectedRental]);

  // Clear amenities when switching to a different property
  const prevPropertyRef = useRef<string | null>(null);

  useEffect(() => {
    const currentProperty = selectedProperty || selectedListing || selectedRental;
    const currentKey = currentProperty ? `${currentProperty.latitude},${currentProperty.longitude}` : null;

    // If property changed, reset amenities state
    if (currentKey !== prevPropertyRef.current) {
      console.log('Property changed, resetting amenities state');
      setAmenities([]);
      setWalkabilityScore(null);
      setShowAmenities(false);
      setLoadingAmenities(false); // Clear any loading state
      setAmenitiesError(null);
    }

    prevPropertyRef.current = currentKey;
  }, [selectedProperty, selectedListing, selectedRental]);

  // Hide amenities when property card is closed
  useEffect(() => {
    const hasSelectedProperty = selectedProperty || selectedListing || selectedRental;
    if (!hasSelectedProperty && showAmenities) {
      console.log('Property card closed, resetting amenities state');
      setShowAmenities(false);
      setAmenities([]);
      setWalkabilityScore(null);
      setAmenitiesError(null);
    }
  }, [selectedProperty, selectedListing, selectedRental, showAmenities]);

  // Route visualization function
  const fetchAndDisplayRoute = async (amenity: Amenity) => {
    // Get the currently selected property (any type)
    const currentProperty = selectedProperty || selectedListing || selectedRental;

    console.log('🛣️ Getting route from:', currentProperty, 'to amenity:', amenity.name);

    if (!currentProperty?.latitude || !currentProperty?.longitude || !map.current) {
      console.log('❌ Route failed: No current property or map not ready');
      return;
    }

    const origin: [number, number] = [currentProperty.longitude, currentProperty.latitude];
    const destination: [number, number] = [amenity.longitude, amenity.latitude];

    console.log('📍 Route request:', { origin, destination, travelMode });

    try {
      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/${travelMode}/${origin.join(',')};${destination.join(',')}?` +
        `geometries=geojson&access_token=${MAPBOX_TOKEN}`
      );

      if (!response.ok) {
        throw new Error(`Directions API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.routes && data.routes[0]) {
        const route = data.routes[0];

        console.log('✅ Route found:', {
          distance: route.distance,
          duration: route.duration,
          coordinates: route.geometry.coordinates.length
        });

        setRouteInfo({
          distance: route.distance,
          duration: route.duration,
          geometry: route.geometry,
          mode: travelMode,
        });

        // Update route layer
        const routeSource = map.current.getSource('route') as mapboxgl.GeoJSONSource;
        if (routeSource) {
          // Create proper GeoJSON feature
          const routeFeature = {
            type: 'Feature' as const,
            geometry: route.geometry,
            properties: {
              distance: route.distance,
              duration: route.duration
            }
          };

          routeSource.setData(routeFeature);
          console.log('🗺️ Route layer updated with', route.geometry.coordinates.length, 'coordinates');
        } else {
          console.log('❌ Route source not found - creating it now');

          // Fallback: Try to create the route layer if it doesn't exist
          if (!map.current.getSource('route')) {
            map.current.addSource('route', {
              type: 'geojson',
              data: {
                type: 'Feature',
                geometry: route.geometry,
                properties: {}
              }
            });

            map.current.addLayer({
              id: 'route-line',
              type: 'line',
              source: 'route',
              paint: {
                'line-color': '#3B82F6',
                'line-width': 8,
                'line-opacity': 1.0,
              }
            }, 'amenities-regular');
          }
        }

        // Fit map to show full route
        try {
          const coordinates = route.geometry.coordinates;
          if (coordinates && coordinates.length > 0) {
            const bounds = new mapboxgl.LngLatBounds()
              .extend(coordinates[0] as [number, number])
              .extend(coordinates[coordinates.length - 1] as [number, number]);

            // Extend bounds to include some padding
            for (const coord of coordinates) {
              bounds.extend(coord as [number, number]);
            }

            map.current.fitBounds(bounds, {
              padding: 50,
              maxZoom: 18
            });
          }
        } catch (boundsError) {
          console.log('Bounds calculation failed, centering on destination');
          // Fallback: just center on the amenity
          map.current.flyTo({
            center: [amenity.longitude, amenity.latitude],
            zoom: 16
          });
        }

        // Clear any existing popups
        const popups = document.getElementsByClassName('mapboxgl-popup');
        Array.from(popups).forEach(popup => popup.remove());
      } else {
        console.log('❌ No routes returned from API - trying fallback');

        // Fallback: Create a simple straight line route
        const fallbackRoute = {
          type: 'LineString' as const,
          coordinates: [
            [currentProperty.longitude, currentProperty.latitude],
            [amenity.longitude, amenity.latitude]
          ]
        };

        setRouteInfo({
          distance: Math.round(calculateDistance(currentProperty.latitude, currentProperty.longitude, amenity.latitude, amenity.longitude)),
          duration: Math.round(calculateDistance(currentProperty.latitude, currentProperty.longitude, amenity.latitude, amenity.longitude) * 12), // Rough walking time estimate
          geometry: fallbackRoute,
          mode: travelMode // Use current travel mode instead of 'fallback'
        });

        // Update route layer with fallback
        const routeSource = map.current.getSource('route') as mapboxgl.GeoJSONSource;
        if (routeSource) {
          routeSource.setData({
            type: 'Feature' as const,
            geometry: fallbackRoute,
            properties: {}
          });
        }

        // Center on the amenity
        map.current.flyTo({
          center: [amenity.longitude, amenity.latitude],
          zoom: 16
        });

        console.log('✅ Fallback route created');
        return; // Don't throw error for fallback
      }
    } catch (error) {
      console.error('Failed to fetch route:', error);

      // Provide user-friendly error messages
      let errorMessage = 'Unable to get directions. Try Google Maps link above.';
      if (error instanceof Error) {
        if (error.message.includes('Rate limited') || error.message.includes('429')) {
          errorMessage = 'Too many requests. Please wait a moment and try again.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Network error. Check your connection and try again.';
        }
      }

      // Show error popup
      if (map.current) {
        new mapboxgl.Popup()
          .setLngLat([amenity.longitude, amenity.latitude])
          .setHTML(`<div style="color: #ef4444; padding: 8px;">${errorMessage}</div>`)
          .addTo(map.current);
      }
    }
  };

  // Set up global function for popup buttons
  useEffect(() => {
    (window as any).getDirections = (amenityId: string) => {
      console.log('🎯 getDirections called with amenityId:', amenityId);
      const amenity = amenities.find(a => a.id === amenityId);
      console.log('📍 Found amenity:', amenity);
      if (amenity) {
        fetchAndDisplayRoute(amenity);
      } else {
        console.log('❌ Amenity not found in current amenities list');
      }
    };
  }, [amenities]);

  // Clear route when travel mode changes
  useEffect(() => {
    if (routeInfo && map.current) {
      (map.current.getSource('route') as mapboxgl.GeoJSONSource)?.setData({
        type: 'FeatureCollection',
        features: []
      });
      setRouteInfo(null);
    }
  }, [travelMode]);

  // Resize map when filter panel is toggled
  useEffect(() => {
    if (map.current) {
      // Small delay to allow DOM to update
      setTimeout(() => {
        map.current?.resize();
      }, 250);
    }
  }, [showFilters]);

  // Resize map on window resize and initial load
  useEffect(() => {
    const handleResize = () => {
      if (map.current) {
        map.current.resize();
      }
    };

    // Resize on mount
    setTimeout(handleResize, 100);

    // Resize on window resize
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [mapReady]);

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
      <div className="px-2 py-2 md:px-4 md:py-3 bg-[#111827] border-b border-gray-800 flex flex-wrap md:flex-nowrap items-center justify-between gap-2 md:gap-4">
        <div className="flex items-center gap-2 md:gap-4 flex-wrap md:flex-nowrap">
          {/* Data Source Multi-Select */}
          <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1 border border-gray-700">
            <button
              onClick={() => toggleDataSource('sold')}
              className={`flex-1 px-2 md:px-3 py-1.5 text-xs md:text-sm font-medium rounded-md transition-all ${
                dataSources.sold 
                  ? 'bg-cyan-600 text-white shadow-sm' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
              title="Toggle sold properties"
            >
              Sold
            </button>
            <button
              onClick={() => toggleDataSource('forSale')}
              className={`flex-1 px-2 md:px-3 py-1.5 text-xs md:text-sm font-medium rounded-md transition-all ${
                dataSources.forSale 
                  ? 'bg-rose-500 text-white shadow-sm' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
              title="Toggle for sale listings"
            >
              For Sale
            </button>
            <button
              onClick={() => toggleDataSource('rentals')}
              className={`flex-1 px-2 md:px-3 py-1.5 text-xs md:text-sm font-medium rounded-md transition-all ${
                dataSources.rentals 
                  ? 'bg-purple-500 text-white shadow-sm' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
              title="Toggle rental listings"
            >
              Rentals
            </button>
          </div>
          
          {/* Count display - shows totals for all selected sources */}
          <span className="hidden sm:inline text-gray-400 text-sm font-medium">
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
          <div className="relative w-full sm:w-auto">
            <div className="flex items-center">
              <span className="absolute left-3 text-gray-500">🔍</span>
              <input
                type="text"
                placeholder="Search location..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => setShowSearchResults(true)}
                className="w-full sm:w-40 md:w-56 pl-9 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 text-sm"
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
        
        <div className="flex items-center gap-1.5 md:gap-3">
          {/* View Mode Toggle */}
          <div className="flex rounded-lg overflow-hidden border border-gray-700">
            <button
              onClick={() => handleViewModeChange('clusters')}
              className={`flex-1 px-2 md:px-3 py-1.5 text-xs md:text-sm font-medium transition-colors whitespace-nowrap ${
                viewMode === 'clusters' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
              title="Group nearby properties into clusters"
            >
              Clusters
            </button>
            <button
              onClick={() => handleViewModeChange('price')}
              className={`flex-1 px-2 md:px-3 py-1.5 text-xs md:text-sm font-medium transition-colors whitespace-nowrap ${
                viewMode === 'price' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
              title="Color by price"
            >
              Price
            </button>
            {dataSources.sold && (
              <button
                onClick={() => handleViewModeChange('difference')}
                className={`flex-1 px-2 md:px-3 py-1.5 text-xs md:text-sm font-medium transition-colors whitespace-nowrap ${
                  viewMode === 'difference' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
                title="Color by sold vs asking price difference"
              >
                Over Asking
              </button>
            )}
          </div>
          
          {/* Reset Map Button */}
          <button
            onClick={resetMap}
            className="px-3 md:px-4 py-2 rounded-lg font-medium text-sm transition-all bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700"
            title="Reset map view"
          >
            🔄
          </button>
          
          {/* Filter Toggle Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 md:px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-1.5 md:gap-2 ${
              showFilters || activeFilterCount > 0
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
            }`}
          >
            <span>Filters</span>
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
        <div className="bg-[#0d1117] border-b border-gray-800 px-2 py-3 md:px-4 md:py-4 animate-in slide-in-from-top duration-200">
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowFilters(false)}
              className="px-4 py-2 md:px-3 md:py-1.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded transition-colors"
            >
              Done
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-3 md:gap-4">
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
                    Over Asking
                  </label>
                )}
              </div>
            </div>

            {/* TIME PERIOD Section */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className="text-xs text-gray-500 uppercase tracking-wider font-medium">Time Period</label>
                <div className="group relative">
                  <span className="text-xs text-gray-400 hover:text-gray-300 cursor-help border border-gray-400 rounded-full w-4 h-4 flex items-center justify-center">i</span>
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10 border border-gray-600">
                    Time indicates when we captured the data, not when the listing was posted
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-600"></div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer hover:text-white">
                  <input type="radio" name="timePeriod" checked={selectedYear === null && recentFilter === null && timeFilter === null} onChange={() => clearTimeFilters()} className="accent-indigo-500" />
                  All Time
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer hover:text-white">
                  <input type="radio" name="timePeriod" checked={timeFilter === 'thisWeek'} onChange={() => { setSelectedYear(null); setSelectedQuarter(null); setSelectedMonth(null); setRecentFilter(null); setTimeFilter('thisWeek'); }} className="accent-indigo-500" />
                  This Week
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer hover:text-white">
                  <input type="radio" name="timePeriod" checked={timeFilter === 'thisMonth'} onChange={() => { setSelectedYear(null); setSelectedQuarter(null); setSelectedMonth(null); setRecentFilter(null); setTimeFilter('thisMonth'); }} className="accent-indigo-500" />
                  This Month
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer hover:text-white">
                  <input type="radio" name="timePeriod" checked={recentFilter === '6m'} onChange={() => { setSelectedYear(null); setSelectedQuarter(null); setSelectedMonth(null); setRecentFilter('6m'); setTimeFilter(null); }} className="accent-indigo-500" />
                  Last 6 Months
                </label>
              </div>
              <div className="flex gap-2 mt-2">
                <select
                  value={selectedYear ?? ''}
                  onChange={(e) => { setSelectedYear(e.target.value ? parseInt(e.target.value) : null); setSelectedQuarter(null); setSelectedMonth(null); setRecentFilter(null); }}
                  className="flex-1 px-2 py-2 md:py-1 text-sm md:text-xs bg-gray-800 border border-gray-700 rounded text-gray-300 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">Year</option>
                  {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                {selectedYear !== null && (
                  <select
                    value={selectedQuarter ?? ''}
                    onChange={(e) => { setSelectedQuarter(e.target.value ? parseInt(e.target.value) : null); setSelectedMonth(null); }}
                    className="flex-1 px-2 py-2 md:py-1 text-sm md:text-xs bg-gray-800 border border-gray-700 rounded text-gray-300 focus:border-indigo-500 focus:outline-none"
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
                className="w-full px-2 py-2 md:py-1.5 text-sm bg-gray-800 border border-gray-700 rounded text-gray-300 focus:border-indigo-500 focus:outline-none mb-2"
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
                className="w-full px-2 py-2 md:py-1.5 text-sm bg-gray-800 border border-gray-700 rounded text-gray-300 focus:border-indigo-500 focus:outline-none"
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
                  className="w-full px-2 py-2 md:py-1.5 text-sm bg-gray-800 border border-gray-700 rounded text-gray-300 focus:border-indigo-500 focus:outline-none placeholder-gray-600"
                />
                <input
                  type="number"
                  placeholder="Max €"
                  value={maxPrice ?? ''}
                  onChange={(e) => setMaxPrice(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-2 py-2 md:py-1.5 text-sm bg-gray-800 border border-gray-700 rounded text-gray-300 focus:border-indigo-500 focus:outline-none placeholder-gray-600"
                />
              </div>
              <div className="flex gap-2 mt-2">
                <input
                  type="number"
                  placeholder="Min m²"
                  value={minArea ?? ''}
                  onChange={(e) => setMinArea(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-2 py-2 md:py-1.5 text-sm bg-gray-800 border border-gray-700 rounded text-gray-300 focus:border-indigo-500 focus:outline-none placeholder-gray-600"
                />
                <input
                  type="number"
                  placeholder="Max m²"
                  value={maxArea ?? ''}
                  onChange={(e) => setMaxArea(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-2 py-2 md:py-1.5 text-sm bg-gray-800 border border-gray-700 rounded text-gray-300 focus:border-indigo-500 focus:outline-none placeholder-gray-600"
                />
              </div>
            </div>

            {/* YIELD Section - only for sold and forSale */}
            {(dataSources.sold || dataSources.forSale) && (
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-2 block">
                  Min Est. Yield: {yieldFilter !== null ? `${yieldFilter}%` : 'Any'}
                </label>
                <input
                  type="range"
                  min="0"
                  max="15"
                  step="0.5"
                  value={yieldFilter ?? 0}
                  onChange={(e) => setYieldFilter(e.target.value === '0' ? null : parseFloat(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                  style={{
                    background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${(yieldFilter ?? 0) / 15 * 100}%, #374151 ${(yieldFilter ?? 0) / 15 * 100}%, #374151 100%)`
                  }}
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>0%</span>
                  <span>15%</span>
                </div>
              </div>
            )}

            {/* SALE TYPE Section - only for sold */}
            {dataSources.sold && (
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-2 block">
                  Difference to Asking Price: {differenceFilter !== null ? `${differenceFilter > 0 ? '+' : ''}${differenceFilter}%` : 'Any'}
                </label>
                <input
                  type="range"
                  min="-20"
                  max="50"
                  step="5"
                  value={differenceFilter ?? 0}
                  onChange={(e) => {
                    const newValue = e.target.value === '0' ? null : parseInt(e.target.value);
                    setDifferenceFilter(newValue);
                    if (newValue !== null) {
                      // Turn off forSale and rentals when difference filter is activated
                      setDataSources(prev => ({ ...prev, sold: true, forSale: false, rentals: false }));
                    }
                  }}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                  style={{
                    background: differenceFilter !== null && differenceFilter !== 0
                      ? `linear-gradient(to right, #22c55e 0%, #22c55e ${Math.max(0, (differenceFilter + 20) / 70 * 100)}%, #6366f1 ${Math.max(0, (differenceFilter + 20) / 70 * 100)}%, #6366f1 100%)`
                      : undefined
                  }}
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>-20%</span>
                  <span>+50%</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {differenceFilter === null || differenceFilter === 0 ? 'Shows all sales' :
                   differenceFilter > 0 ? `Only bidding wars (+${differenceFilter}% or more)` :
                   `Only deals (${differenceFilter}% or less)`}
                </div>
              </div>
            )}
          </div>

          {/* Clear and Close */}
          <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-800">
            {activeFilterCount > 0 && (
              <div className="text-xs md:text-sm text-gray-500">
                {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} active
              </div>
            )}
            <div className="flex gap-2">
              {activeFilterCount > 0 && (
                <button
                  onClick={handleClearFilters}
                  className="px-4 py-2 md:px-3 md:py-1.5 text-sm font-medium text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded transition-colors"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Compact Legend Bar */}
      <div className="hidden sm:flex px-4 py-1.5 bg-[#0D1117] border-b border-gray-800 items-center gap-4 text-xs text-gray-400 overflow-x-auto">
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
            <span className="text-gray-500 font-medium shrink-0">Over Asking:</span>
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
      </div>
      
      {/* Map */}
      <div className="flex-1 relative">
        <div ref={mapContainer} className="absolute inset-0" style={{ width: '100%', height: '100%' }} />
        
        {/* Loading indicator - non-blocking */}
        {loading && (
          <div className="absolute top-4 right-4 z-10 bg-gray-900/95 backdrop-blur-xl rounded-lg px-4 py-3 border border-blue-500 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-white font-medium">Loading data...</span>
            </div>
          </div>
        )}

        {/* Amenities Mode Indicator */}
        {showAmenities && (selectedProperty || selectedListing || selectedRental) && (
          <div className="absolute top-4 left-4 z-10 bg-blue-600/95 backdrop-blur-xl rounded-lg px-4 py-3 border border-blue-400 shadow-xl">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <div>
                  <div className="text-white text-sm font-medium">Exploring Nearby</div>
                  <div className="text-blue-200 text-xs">
                    {amenities.length > 0 ? `${amenities.filter(a => categoryFilters[a.category]).length} amenities visible` : 'Loading...'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowAmenities(false)}
                className="px-3 py-1 text-xs bg-blue-700 hover:bg-blue-800 text-white rounded-md transition-colors font-medium"
              >
                Exit
              </button>
            </div>
          </div>
        )}
        
        {/* Selected Property Panel */}
        {selectedProperty && (
          <div
            className="absolute bottom-4 left-4 right-4 md:left-4 md:right-auto md:w-[400px] bg-gray-900/95 backdrop-blur-xl rounded-xl p-4 md:p-5 shadow-2xl border border-gray-700 max-h-[75vh] overflow-y-auto z-50"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with Minimize, Share and Close buttons */}
            <div className="absolute top-4 right-4 flex gap-2 z-10">
              <button
                onClick={() => setMinimizeProperty(!minimizeProperty)}
                className="px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded transition-colors border border-gray-700"
                title={minimizeProperty ? "Expand property card" : "Minimize property card"}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={minimizeProperty ? "M19 9l-7 7-7-7" : "M5 15l7-7 7 7"} />
                </svg>
              </button>
              <button
                onClick={() => {
                  soldShare.shareProperty();
                  analytics.propertyShared('sold');
                }}
                disabled={soldShare.isGenerating}
                className="px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-gray-300 hover:text-white rounded transition-colors flex items-center gap-1 border border-gray-700"
                title="Share this property"
              >
                {soldShare.isGenerating ? (
                  <>
                    <div className="w-3 h-3 border-2 border-gray-300 border-t-transparent rounded-full animate-spin"></div>
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </>
                )}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  console.log('Close button clicked for property:', selectedProperty?.address);
                  isClosingRef.current = true;
                  setSelectedProperty(null);
                  setTimeout(() => {
                    isClosingRef.current = false;
                  }, 100);
                }}
                className="text-gray-500 hover:text-white text-xl p-1 rounded hover:bg-gray-700 transition-colors"
                title="Close property card"
              >
                ✕
              </button>
            </div>

            {/* Share Error Notification */}
            {soldShare.error && (
              <div className="absolute top-12 right-4 bg-red-900/95 text-red-200 text-xs px-3 py-2 rounded border border-red-700 z-10 max-w-xs">
                {soldShare.error}
              </div>
            )}
            
            {/* Minimized View */}
            {minimizeProperty ? (
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-white text-sm leading-tight truncate pr-32">
                    {selectedProperty.address}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-gray-300 text-xs">
                      €{selectedProperty.soldPrice?.toLocaleString() || 'N/A'}
                    </span>
                    {selectedProperty.beds && (
                      <span className="text-gray-400 text-xs">• {selectedProperty.beds} bed</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log('Close button clicked for minimized property:', selectedProperty?.address);
                    isClosingRef.current = true;
                    setSelectedProperty(null);
                    setTimeout(() => {
                      isClosingRef.current = false;
                    }, 100);
                  }}
                  className="text-gray-500 hover:text-white text-xl ml-2 p-1 rounded hover:bg-gray-700 transition-colors"
                  title="Close property card"
                >
                  ✕
                </button>
              </div>
            ) : (
              <>
                {/* Header spacing to avoid overlap with header buttons */}
                <div className="h-12"></div>

                {/* Address */}
                <h3 className="font-semibold text-white pr-32 mb-3 text-lg leading-tight">
                  {selectedProperty.address}
                </h3>

            {/* Property Insights */}
            {walkabilityScore && (
              <div className="mb-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-300">Walkability Score</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-300"
                        style={{ width: `${walkabilityScore.score * 10}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-semibold text-white min-w-[2rem]">{walkabilityScore.score}/10</span>
                  </div>
                </div>

                <div className="text-xs text-gray-400 capitalize">{walkabilityScore.rating}</div>

                {walkabilityScore.nearestDartLuas && walkabilityScore.nearestDartLuas.distance <= 500 && (
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-gray-300">{walkabilityScore.nearestDartLuas.type} station</span>
                    <span className="text-white font-medium">{walkabilityScore.nearestDartLuas.distance}m away</span>
                  </div>
                )}
              </div>
            )}

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
            <div className="grid grid-cols-2 gap-2 mb-3">
              {selectedProperty.beds && (
                <div className="bg-gray-800 rounded-md px-2 py-1.5">
                  <div className="text-gray-500 text-xs">Bedrooms</div>
                  <div className="text-white font-semibold text-sm">{selectedProperty.beds}</div>
                </div>
              )}
              {selectedProperty.baths && (
                <div className="bg-gray-800 rounded-md px-2 py-1.5">
                  <div className="text-gray-500 text-xs">Bathrooms</div>
                  <div className="text-white font-semibold text-sm">{selectedProperty.baths}</div>
                </div>
              )}
              {selectedProperty.propertyType && (
                <div className="bg-gray-800 rounded-md px-2 py-1.5">
                  <div className="text-gray-500 text-xs">Type</div>
                  <div className="text-white font-semibold text-sm">{selectedProperty.propertyType}</div>
                </div>
              )}
              {selectedProperty.areaSqm && (
                <div className="bg-gray-800 rounded-md px-2 py-1.5">
                  <div className="text-gray-500 text-xs">Floor Area</div>
                  <div className="text-white font-semibold text-sm">{selectedProperty.areaSqm} m²</div>
                </div>
              )}
            </div>

            {/* Nearby Amenities Section */}
            <div className="mt-4 pt-4 border-t border-gray-700 mb-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-300">Nearby Amenities</h4>
                {showAmenities && amenities.length > 0 && (
                  <span className="text-xs text-gray-500">
                    {amenities.filter(a => categoryFilters[a.category]).length} found
                  </span>
                )}
              </div>

              <button
                onClick={() => {
                  const newShowAmenities = !showAmenities;
                  setShowAmenities(newShowAmenities);
                  if (newShowAmenities) {
                    // Track when amenities exploration starts - determine property type
                    const propertyType = selectedProperty ? 'sold' : selectedListing ? 'forSale' : 'rental';
                    analytics.amenitiesExplored(propertyType);
                  } else {
                    // Track when amenities mode is exited
                    const propertyType = selectedProperty ? 'sold' : selectedListing ? 'forSale' : 'rental';
                    analytics.amenitiesExited(propertyType);
                  }
                }}
                disabled={loadingAmenities}
                className={`w-full px-4 py-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-3 ${
                  showAmenities
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-600'
                }`}
              >
                {loadingAmenities ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Loading nearby amenities...</span>
                  </>
                ) : showAmenities ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span>Hide Amenities</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>Explore Nearby</span>
                  </>
                )}
              </button>

              {amenitiesError && (
                <p className="text-red-400 text-xs mt-2">{amenitiesError}</p>
              )}

              {/* Amenities Controls */}
              {showAmenities && amenities.length > 0 && (
                <div className="mt-4 space-y-4">
                  {/* Category Filters */}
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-2 block">Categories</label>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(categoryFilters).map(([category, enabled]) => {
                        const count = amenities.filter(a => a.category === category).length;
                        return (
                          <button
                            key={category}
                            onClick={() => setCategoryFilters(prev => ({ ...prev, [category]: !enabled }))}
                            className={`px-3 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-between ${
                              enabled
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-600'
                            }`}
                          >
                            <span>{getCategoryDisplayName(category as any)}</span>
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              enabled ? 'bg-white/20' : 'bg-gray-600'
                            }`}>
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

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
            </>
            )}

          </div>
        )}
        
        {/* Selected Listing Panel (For Sale) */}
        {selectedListing && (
          <div
            className="absolute bottom-4 left-4 right-4 md:left-4 md:right-auto md:w-[400px] bg-gray-900/95 backdrop-blur-xl rounded-xl p-4 md:p-5 shadow-2xl border border-cyan-700 max-h-[75vh] overflow-y-auto z-50"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with Minimize, Share and Close buttons */}
            <div className="absolute top-4 right-4 flex gap-2 z-10">
              <button
                onClick={() => setMinimizeListing(!minimizeListing)}
                className="px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded transition-colors border border-gray-700"
                title={minimizeListing ? "Expand property card" : "Minimize property card"}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={minimizeListing ? "M19 9l-7 7-7-7" : "M5 15l7-7 7 7"} />
                </svg>
              </button>
              <button
                onClick={() => {
                  listingShare.shareProperty();
                  analytics.propertyShared('forSale');
                }}
                disabled={listingShare.isGenerating}
                className="px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-gray-300 hover:text-white rounded transition-colors flex items-center gap-1 border border-gray-700"
                title="Share this property"
              >
                {listingShare.isGenerating ? (
                  <>
                    <div className="w-3 h-3 border-2 border-gray-300 border-t-transparent rounded-full animate-spin"></div>
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </>
                )}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  console.log('Close button clicked for listing:', selectedListing?.address);
                  isClosingRef.current = true;
                  setSelectedListing(null);
                  setTimeout(() => {
                    isClosingRef.current = false;
                  }, 100);
                }}
                className="text-gray-500 hover:text-white text-xl p-1 rounded hover:bg-gray-700 transition-colors"
                title="Close property card"
              >
                ✕
              </button>
            </div>

            {/* Share Error Notification */}
            {listingShare.error && (
              <div className="absolute top-12 right-4 bg-red-900/95 text-red-200 text-xs px-3 py-2 rounded border border-red-700 z-10 max-w-xs">
                {listingShare.error}
              </div>
            )}
            
            {/* Minimized View */}
            {minimizeListing ? (
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-white text-sm leading-tight truncate pr-32">
                    {selectedListing.address}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-cyan-300 text-xs">
                      €{selectedListing.askingPrice?.toLocaleString() || 'N/A'}
                    </span>
                    {selectedListing.beds && (
                      <span className="text-gray-400 text-xs">• {selectedListing.beds} bed</span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Header spacing to avoid overlap with header buttons */}
                <div className="h-12"></div>

                {/* Address */}
                <h3 className="font-semibold text-white pr-32 mb-3 text-lg leading-tight">
                  {selectedListing.address}
                </h3>

            {/* Property Insights */}
            {walkabilityScore && (
              <div className="mb-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-300">Walkability Score</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-300"
                        style={{ width: `${walkabilityScore.score * 10}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-semibold text-white min-w-[2rem]">{walkabilityScore.score}/10</span>
                  </div>
                </div>

                <div className="text-xs text-gray-400 capitalize">{walkabilityScore.rating}</div>

                {walkabilityScore.nearestDartLuas && walkabilityScore.nearestDartLuas.distance <= 500 && (
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-gray-300">{walkabilityScore.nearestDartLuas.type} station</span>
                    <span className="text-white font-medium">{walkabilityScore.nearestDartLuas.distance}m away</span>
                  </div>
                )}
              </div>
            )}

            {/* Nearby Amenities Section */}
            <div className="mt-4 pt-4 border-t border-gray-700 mb-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-300">Nearby Amenities</h4>
                {showAmenities && amenities.length > 0 && (
                  <span className="text-xs text-gray-500">
                    {amenities.filter(a => categoryFilters[a.category]).length} found
                  </span>
                )}
              </div>

              <button
                onClick={() => {
                  const newShowAmenities = !showAmenities;
                  setShowAmenities(newShowAmenities);
                  if (newShowAmenities) {
                    // Track when amenities exploration starts - determine property type
                    const propertyType = selectedProperty ? 'sold' : selectedListing ? 'forSale' : 'rental';
                    analytics.amenitiesExplored(propertyType);
                  } else {
                    // Track when amenities mode is exited
                    const propertyType = selectedProperty ? 'sold' : selectedListing ? 'forSale' : 'rental';
                    analytics.amenitiesExited(propertyType);
                  }
                }}
                disabled={loadingAmenities}
                className={`w-full px-4 py-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-3 ${
                  showAmenities
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-600'
                }`}
              >
                {loadingAmenities ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Loading nearby amenities...</span>
                  </>
                ) : showAmenities ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span>Hide Amenities</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>Explore Nearby</span>
                  </>
                )}
              </button>

              {amenitiesError && (
                <p className="text-red-400 text-xs mt-2">{amenitiesError}</p>
              )}

              {/* Amenities Controls */}
              {showAmenities && amenities.length > 0 && (
                <div className="mt-4 space-y-4">
                  {/* Category Filters */}
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-2 block">Categories</label>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(categoryFilters).map(([category, enabled]) => {
                        const count = amenities.filter(a => a.category === category).length;
                        return (
                          <button
                            key={category}
                            onClick={() => setCategoryFilters(prev => ({ ...prev, [category]: !enabled }))}
                            className={`px-3 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-between ${
                              enabled
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-600'
                            }`}
                          >
                            <span>{getCategoryDisplayName(category as any)}</span>
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              enabled ? 'bg-white/20' : 'bg-gray-600'
                            }`}>
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                </div>
              )}
            </div>

            {/* Price with For Sale badge */}
            <div className="flex items-center gap-3 mb-4">
              <div className="text-3xl font-bold text-white font-mono">
                {formatFullPrice(selectedListing.askingPrice)}
              </div>
              <div className="px-3 py-1 rounded-full bg-cyan-600 text-white text-sm font-medium flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 7V3a2 2 0 012-2z" />
                </svg>
                For Sale
              </div>
            </div>
            
            {/* Property details grid */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              {selectedListing.beds && (
                <div className="bg-gray-800 rounded-md px-2 py-1.5">
                  <div className="text-gray-500 text-xs">Bedrooms</div>
                  <div className="text-white font-semibold text-sm">{selectedListing.beds}</div>
                </div>
              )}
              {selectedListing.baths && (
                <div className="bg-gray-800 rounded-md px-2 py-1.5">
                  <div className="text-gray-500 text-xs">Bathrooms</div>
                  <div className="text-white font-semibold text-sm">{selectedListing.baths}</div>
                </div>
              )}
              {selectedListing.propertyType && (
                <div className="bg-gray-800 rounded-md px-2 py-1.5">
                  <div className="text-gray-500 text-xs">Type</div>
                  <div className="text-white font-semibold text-sm">{selectedListing.propertyType}</div>
                </div>
              )}
              {selectedListing.berRating && (
                <div className="bg-gray-800 rounded-md px-2 py-1.5">
                  <div className="text-gray-500 text-xs">BER Rating</div>
                  <div className="text-white font-semibold text-sm">{selectedListing.berRating}</div>
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
            </>
            )}

          </div>
        )}

        {/* Selected Rental Panel */}
        {selectedRental && (
          <div
            className="absolute bottom-4 left-4 right-4 md:left-4 md:right-auto md:w-[400px] bg-gray-900/95 backdrop-blur-xl rounded-xl p-4 md:p-5 shadow-2xl border border-purple-600 max-h-[75vh] overflow-y-auto z-50"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with Minimize, Share and Close buttons */}
            <div className="absolute top-4 right-4 flex gap-2 z-10">
              <button
                onClick={() => setMinimizeRental(!minimizeRental)}
                className="px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded transition-colors border border-gray-700"
                title={minimizeRental ? "Expand property card" : "Minimize property card"}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={minimizeRental ? "M19 9l-7 7-7-7" : "M5 15l7-7 7 7"} />
                </svg>
              </button>
              <button
                onClick={() => {
                  rentalShare.shareProperty();
                  analytics.propertyShared('rental');
                }}
                disabled={rentalShare.isGenerating}
                className="px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-gray-300 hover:text-white rounded transition-colors flex items-center gap-1 border border-gray-700"
                title="Share this property"
              >
                {rentalShare.isGenerating ? (
                  <>
                    <div className="w-3 h-3 border-2 border-gray-300 border-t-transparent rounded-full animate-spin"></div>
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </>
                )}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  console.log('Close button clicked for rental:', selectedRental?.address);
                  isClosingRef.current = true;
                  setSelectedRental(null);
                  setTimeout(() => {
                    isClosingRef.current = false;
                  }, 100);
                }}
                className="text-gray-500 hover:text-white text-xl p-1 rounded hover:bg-gray-700 transition-colors"
                title="Close property card"
              >
                ✕
              </button>
            </div>

            {/* Share Error Notification */}
            {rentalShare.error && (
              <div className="absolute top-12 right-4 bg-red-900/95 text-red-200 text-xs px-3 py-2 rounded border border-red-700 z-10 max-w-xs">
                {rentalShare.error}
              </div>
            )}
            
            {/* Minimized View */}
            {minimizeRental ? (
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-white text-sm leading-tight truncate pr-32">
                    {selectedRental.address}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-purple-300 text-xs">
                      €{selectedRental.monthlyRent?.toLocaleString() || 'N/A'}/mo
                    </span>
                    {selectedRental.beds && (
                      <span className="text-gray-400 text-xs">• {selectedRental.beds} bed</span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Header spacing to avoid overlap with header buttons */}
                <div className="h-12"></div>

                {/* Address */}
                <h3 className="font-semibold text-white pr-32 mb-3 text-lg leading-tight">
                  {selectedRental.address}
                </h3>

            {/* Property Insights */}
            {walkabilityScore && (
              <div className="mb-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-300">Walkability Score</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-300"
                        style={{ width: `${walkabilityScore.score * 10}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-semibold text-white min-w-[2rem]">{walkabilityScore.score}/10</span>
                  </div>
                </div>

                <div className="text-xs text-gray-400 capitalize">{walkabilityScore.rating}</div>

                {walkabilityScore.nearestDartLuas && walkabilityScore.nearestDartLuas.distance <= 500 && (
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-gray-300">{walkabilityScore.nearestDartLuas.type} station</span>
                    <span className="text-white font-medium">{walkabilityScore.nearestDartLuas.distance}m away</span>
                  </div>
                )}
              </div>
            )}

            {/* Nearby Amenities Section */}
            <div className="mt-4 pt-4 border-t border-gray-700 mb-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-300">Nearby Amenities</h4>
                {showAmenities && amenities.length > 0 && (
                  <span className="text-xs text-gray-500">
                    {amenities.filter(a => categoryFilters[a.category]).length} found
                  </span>
                )}
              </div>

              <button
                onClick={() => {
                  const newShowAmenities = !showAmenities;
                  setShowAmenities(newShowAmenities);
                  if (newShowAmenities) {
                    // Track when amenities exploration starts - determine property type
                    const propertyType = selectedProperty ? 'sold' : selectedListing ? 'forSale' : 'rental';
                    analytics.amenitiesExplored(propertyType);
                  } else {
                    // Track when amenities mode is exited
                    const propertyType = selectedProperty ? 'sold' : selectedListing ? 'forSale' : 'rental';
                    analytics.amenitiesExited(propertyType);
                  }
                }}
                disabled={loadingAmenities}
                className={`w-full px-4 py-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-3 ${
                  showAmenities
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-600'
                }`}
              >
                {loadingAmenities ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Loading nearby amenities...</span>
                  </>
                ) : showAmenities ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span>Hide Amenities</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>Explore Nearby</span>
                  </>
                )}
              </button>

              {amenitiesError && (
                <p className="text-red-400 text-xs mt-2">{amenitiesError}</p>
              )}

              {/* Amenities Controls */}
              {showAmenities && amenities.length > 0 && (
                <div className="mt-4 space-y-4">
                  {/* Category Filters */}
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-2 block">Categories</label>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(categoryFilters).map(([category, enabled]) => {
                        const count = amenities.filter(a => a.category === category).length;
                        return (
                          <button
                            key={category}
                            onClick={() => setCategoryFilters(prev => ({ ...prev, [category]: !enabled }))}
                            className={`px-3 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-between ${
                              enabled
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-600'
                            }`}
                          >
                            <span>{getCategoryDisplayName(category as any)}</span>
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              enabled ? 'bg-white/20' : 'bg-gray-600'
                            }`}>
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                </div>
              )}
            </div>

            {/* Rent with badge */}
            <div className="flex items-center gap-3 mb-4">
              <div className="text-3xl font-bold text-white font-mono">
                €{selectedRental.monthlyRent.toLocaleString()}/mo
              </div>
              <div className="px-3 py-1 rounded-full bg-purple-500 text-white text-sm font-medium flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Rental
              </div>
            </div>
            
            {/* Property details grid */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              {selectedRental.beds && (
                <div className="bg-gray-800 rounded-md px-2 py-1.5">
                  <div className="text-gray-500 text-xs">Bedrooms</div>
                  <div className="text-white font-semibold text-sm">{selectedRental.beds}</div>
                </div>
              )}
              {selectedRental.baths && (
                <div className="bg-gray-800 rounded-md px-2 py-1.5">
                  <div className="text-gray-500 text-xs">Bathrooms</div>
                  <div className="text-white font-semibold text-sm">{selectedRental.baths}</div>
                </div>
              )}
              {selectedRental.propertyType && (
                <div className="bg-gray-800 rounded-md px-2 py-1.5">
                  <div className="text-gray-500 text-xs">Type</div>
                  <div className="text-white font-semibold text-sm">{selectedRental.propertyType}</div>
                </div>
              )}
              {selectedRental.berRating && (
                <div className="bg-gray-800 rounded-md px-2 py-1.5">
                  <div className="text-gray-500 text-xs">BER</div>
                  <div className="text-white font-semibold text-sm">{selectedRental.berRating}</div>
                </div>
              )}
              {selectedRental.furnishing && (
                <div className="bg-gray-800 rounded-md px-2 py-1.5">
                  <div className="text-gray-500 text-xs">Furnished</div>
                  <div className="text-white font-semibold text-sm">{selectedRental.furnishing}</div>
                </div>
              )}
              {selectedRental.dublinPostcode && (
                <div className="bg-gray-800 rounded-md px-2 py-1.5">
                  <div className="text-gray-500 text-xs">Area</div>
                  <div className="text-white font-semibold text-sm">{selectedRental.dublinPostcode}</div>
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
            </>
            )}

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
        
        {/* Hidden PropertySnapshot components for image generation */}
        {selectedProperty && (
          <PropertySnapshot 
            property={selectedProperty} 
            snapshotRef={soldSnapshotRef}
          />
        )}
        {selectedListing && (
          <PropertySnapshot 
            listing={selectedListing} 
            snapshotRef={listingSnapshotRef}
          />
        )}
        {selectedRental && (
          <PropertySnapshot 
            rental={selectedRental} 
            snapshotRef={rentalSnapshotRef}
          />
        )}
      </div>
    </div>
  );
}

// Global function for amenity popup buttons
if (typeof window !== 'undefined') {
  (window as any).getDirections = (amenityId: string) => {
    // This will be set by the component when amenities are loaded
  };
}
