'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { formatFullPrice } from '@/lib/format';
import type { Property, Listing } from '@/types/property';
import { SpiderfyManager, SpiderFeature } from '@/lib/spiderfy';
import { analytics } from '@/lib/analytics';

// Mapbox access token
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';
mapboxgl.accessToken = MAPBOX_TOKEN;

type DifferenceFilter = 'all' | 'over' | 'under' | 'exact';
type DataSource = 'sold' | 'forSale' | 'both';

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
  const [loading, setLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [viewMode, setViewMode] = useState<'clusters' | 'price' | 'difference'>('clusters');
  const [differenceFilter, setDifferenceFilter] = useState<DifferenceFilter>('all');
  
  // Data source toggle: Sold Properties vs For Sale
  const [dataSource, setDataSource] = useState<DataSource>('sold');
  
  // Hierarchical time filter state (only for sold properties)
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedQuarter, setSelectedQuarter] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [recentFilter, setRecentFilter] = useState<'6m' | '12m' | null>(null);
  
  const [stats, setStats] = useState({ total: 0, avgPrice: 0, avgPricePerSqm: 0, overAsking: 0, underAsking: 0 });
  const [listingStats, setListingStats] = useState({ totalListings: 0, medianPrice: 0, avgPricePerSqm: 0 });
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ place_name: string; center: [number, number] }>>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  // Analytics-wrapped state setters
  const handleViewModeChange = (mode: 'clusters' | 'price' | 'difference') => {
    setViewMode(mode);
    analytics.mapViewModeChanged(mode);
  };

  const handleDataSourceChange = (source: DataSource) => {
    setDataSource(source);
    analytics.mapDataSourceChanged(source);
    setSelectedProperty(null);
    setSelectedListing(null);
    if (source !== 'sold' && viewMode === 'difference') {
      setViewMode('clusters');
    }
  };

  const handleFilterChange = (filterType: string, value: string) => {
    analytics.mapFilterApplied(filterType, value);
  };

  const handleClearFilters = () => {
    setSelectedYear(null);
    setSelectedQuarter(null);
    setSelectedMonth(null);
    setRecentFilter(null);
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
    if (props?.isListing) {
      setSelectedListing({
        address: props?.address as string,
        askingPrice: props?.askingPrice as number,
        pricePerSqm: props?.pricePerSqm as number,
        beds: props?.beds as number,
        baths: props?.baths as number,
        propertyType: props?.propertyType as string,
        berRating: props?.berRating as string,
      } as Listing);
      setSelectedProperty(null);
    } else {
      setSelectedProperty({
        address: props?.address as string,
        soldPrice: props?.soldPrice as number,
        askingPrice: props?.askingPrice as number,
        pricePerSqm: props?.pricePerSqm as number,
        beds: props?.beds as number,
        baths: props?.baths as number,
        propertyType: props?.propertyType as string,
        soldDate: props?.soldDate as string,
      } as Property);
      setSelectedListing(null);
    }
  }, []);

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
        if (dataSource === 'sold') {
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
        if (dataSource === 'forSale') {
          setLoading(false);
        }
      })
      .catch(() => {
        // Listings file may not exist yet
        setListings([]);
        if (dataSource === 'forSale') {
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
    
    return filtered;
  }, [properties, differenceFilter, selectedYear, selectedQuarter, selectedMonth, recentFilter]);

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
    
    return filtered;
  }, [listings, recentFilter, selectedYear, selectedQuarter, selectedMonth]);

  // Get active data based on data source
  const activeData = useMemo(() => {
    const listingsData = filteredListings.map(l => ({
      ...l,
      // Normalize for map display
      price: l.askingPrice,
      soldPrice: 0, // Not applicable
      soldDate: l.scrapedAt, // Use scrapedAt for listings
      overUnderPercent: 0, // Not applicable
      isListing: true,
    }));
    
    const soldData = filteredProperties.map(p => ({
      ...p,
      price: p.soldPrice,
      isListing: false,
    }));
    
    if (dataSource === 'forSale') {
      return listingsData;
    }
    if (dataSource === 'both') {
      // Combine both datasets
      return [...soldData, ...listingsData];
    }
    // Default: sold only
    return soldData;
  }, [dataSource, filteredListings, filteredProperties]);

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

    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: activeData.map(item => {
        const isListing = item.isListing;
        const soldPrice = isListing ? 0 : item.soldPrice;
        const askingPrice = item.askingPrice || 0;
        const priceDiff = isListing ? 0 : (askingPrice ? soldPrice - askingPrice : 0);
        const priceDiffPercent = isListing ? 0 : (askingPrice ? Math.round((priceDiff / askingPrice) * 100) : 0);
        
        return {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [item.longitude!, item.latitude!],
          },
          properties: {
            id: item.sourceUrl || item.address,
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
            soldDate: isListing ? '' : item.soldDate,
            berRating: isListing ? (item as any).berRating : null,
            isListing: isListing,
          },
        };
      }),
    };

    // Remove existing layers/sources
    // Collapse spider when view/data changes
    spiderfyManager.current?.collapse();
    
    const layersToRemove = ['clusters', 'cluster-count', 'unclustered-point', 'properties-points'];
    layersToRemove.forEach(layer => {
      if (map.current?.getLayer(layer)) map.current.removeLayer(layer);
    });
    if (map.current.getSource('properties')) map.current.removeSource('properties');
    if (map.current.getSource('properties-clustered')) map.current.removeSource('properties-clustered');

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

      // Individual unclustered points - different colors for sold vs for sale
      map.current.addLayer({
        id: 'unclustered-point',
        type: 'circle',
        source: 'properties-clustered',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-radius': 8,
          'circle-color': dataSource === 'both' 
            ? [
                'case',
                ['==', ['get', 'isListing'], true],
                '#F43F5E', // Rose/hot pink for listings (for sale) - bright, attention-grabbing
                '#FFFFFF', // White for sold properties - neutral, clear contrast
              ]
            : dataSource === 'forSale'
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
          'circle-stroke-color': dataSource === 'both' 
            ? [
                'case',
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
          if (props?.isListing) {
            setSelectedListing({
              address: props?.address,
              askingPrice: props?.askingPrice,
              pricePerSqm: props?.pricePerSqm,
              beds: props?.beds,
              baths: props?.baths,
              propertyType: props?.propertyType,
              berRating: props?.berRating,
            } as Listing);
            setSelectedProperty(null);
          } else {
            setSelectedProperty({
              address: props?.address,
              soldPrice: props?.soldPrice,
              askingPrice: props?.askingPrice,
              pricePerSqm: props?.pricePerSqm,
              beds: props?.beds,
              baths: props?.baths,
              propertyType: props?.propertyType,
              soldDate: props?.soldDate,
            } as Property);
            setSelectedListing(null);
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
          if (props?.isListing) {
            setSelectedListing({
              address: props?.address,
              askingPrice: props?.askingPrice,
              pricePerSqm: props?.pricePerSqm,
              beds: props?.beds,
              baths: props?.baths,
              propertyType: props?.propertyType,
              berRating: props?.berRating,
            } as Listing);
            setSelectedProperty(null);
          } else {
            setSelectedProperty({
              address: props?.address,
              soldPrice: props?.soldPrice,
              askingPrice: props?.askingPrice,
              pricePerSqm: props?.pricePerSqm,
              beds: props?.beds,
              baths: props?.baths,
              propertyType: props?.propertyType,
              soldDate: props?.soldDate,
            } as Property);
            setSelectedListing(null);
          }
        }
      });
      
      // Click elsewhere on map to collapse spider (for price/difference view modes)
      map.current?.on('click', (e) => {
        // Check if click was on spider markers - if so, don't collapse
        if (spiderfyManager.current?.isClickOnSpider(e.point)) return;
        
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
        if (map.current) map.current.getCanvas().style.cursor = 'pointer';
      });
      map.current?.on('mouseleave', layerId, () => {
        if (map.current) map.current.getCanvas().style.cursor = '';
      });
    }

  }, [mapReady, activeData, viewMode, dataSource]);

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

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col">
      {/* Map Controls - Row 1: Data Source Toggle, Title, Search, View Mode, Price Filter */}
      <div className="px-4 py-3 bg-[#111827] border-b border-gray-800 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Data Source Toggle */}
          <div className="flex rounded-lg overflow-hidden border-2 border-cyan-600">
            <button
              onClick={() => handleDataSourceChange('sold')}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                dataSource === 'sold' 
                  ? 'bg-cyan-600 text-white' 
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              🏠 Sold
            </button>
            <button
              onClick={() => handleDataSourceChange('forSale')}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                dataSource === 'forSale' 
                  ? 'bg-cyan-600 text-white' 
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              🏷️ For Sale
            </button>
            <button
              onClick={() => handleDataSourceChange('both')}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                dataSource === 'both' 
                  ? 'bg-gradient-to-r from-cyan-600 to-emerald-600 text-white' 
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              🔄 Both
            </button>
          </div>
          
          <h1 className="text-xl font-bold text-white">
            {dataSource === 'sold' ? 'Sold Properties' : dataSource === 'forSale' ? 'For Sale' : 'Sold vs For Sale'}
          </h1>
          <span className="text-gray-400 text-sm">
            {loading ? 'Loading...' : dataSource === 'sold' 
              ? `${filteredProperties.length.toLocaleString()} sold`
              : dataSource === 'forSale'
              ? `${filteredListings.length.toLocaleString()} listings`
              : `${filteredProperties.length.toLocaleString()} sold · ${filteredListings.length.toLocaleString()} for sale`
            }
          </span>
          
          {/* Location Search */}
          <div className="relative">
            <div className="flex items-center">
              <input
                type="text"
                placeholder="Search location..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => setShowSearchResults(true)}
                className="w-48 md:w-64 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
              />
              {isSearching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>
            
            {/* Search Results Dropdown */}
            {showSearchResults && (searchResults.length > 0 || searchQuery === '') && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto">
                {/* Quick area buttons */}
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
                
                {/* Search results */}
                {searchResults.map((result, index) => (
                  <button
                    key={index}
                    onClick={() => flyToLocation(result.center, 15)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-700 text-white text-sm border-b border-gray-700 last:border-b-0 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-blue-400">📍</span>
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
          {/* View Toggle */}
          <div className="flex rounded-lg overflow-hidden border border-gray-700">
            <button
              onClick={() => handleViewModeChange('clusters')}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === 'clusters' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              Clusters
            </button>
            <button
              onClick={() => handleViewModeChange('price')}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === 'price' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              By Price
            </button>
            {dataSource === 'sold' && (
              <button
                onClick={() => handleViewModeChange('difference')}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  viewMode === 'difference' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                Sold vs Asking
              </button>
            )}
          </div>

          {/* Price vs Asking Filter - only for sold properties */}
          {dataSource === 'sold' && (
            <div className="flex rounded-lg overflow-hidden border border-gray-700">
              <button
                onClick={() => setDifferenceFilter('all')}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  differenceFilter === 'all' 
                    ? 'bg-purple-600 text-white' 
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                All Sales
              </button>
              <button
                onClick={() => setDifferenceFilter('over')}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                differenceFilter === 'over' 
                  ? 'bg-red-600 text-white' 
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
              title="Properties that sold above their asking price"
            >
              🔥 Bidding Wars
            </button>
            <button
              onClick={() => setDifferenceFilter('under')}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                differenceFilter === 'under' 
                  ? 'bg-green-600 text-white' 
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
              title="Properties that sold below their asking price"
            >
              💰 Deals
            </button>
            </div>
          )}
        </div>
      </div>

      {/* Map Controls - Row 2: Time Period Filters (all modes) */}
      {(dataSource === 'sold' || dataSource === 'forSale' || dataSource === 'both') && (
      <div className="px-4 py-2 bg-[#0f1419] border-b border-gray-800 flex items-center gap-3">
        <span className="text-gray-500 text-sm font-medium">Time Period:</span>
        
        {/* Quick presets */}
        <div className="flex rounded-lg overflow-hidden border border-gray-700">
          <button
            onClick={() => { clearTimeFilters(); }}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
              selectedYear === null && recentFilter === null
                ? 'bg-indigo-600 text-white' 
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            All Time
          </button>
          <button
            onClick={() => { setSelectedYear(null); setSelectedQuarter(null); setSelectedMonth(null); setRecentFilter('6m'); }}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
              recentFilter === '6m'
                ? 'bg-indigo-600 text-white' 
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            6 Months
          </button>
          <button
            onClick={() => { setSelectedYear(null); setSelectedQuarter(null); setSelectedMonth(null); setRecentFilter('12m'); }}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
              recentFilter === '12m'
                ? 'bg-indigo-600 text-white' 
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            12 Months
          </button>
        </div>

        <div className="w-px h-6 bg-gray-700" />

        {/* Year dropdown */}
        <select
          value={selectedYear ?? ''}
          onChange={(e) => {
            const year = e.target.value ? parseInt(e.target.value) : null;
            setSelectedYear(year);
            setSelectedQuarter(null);
            setSelectedMonth(null);
            setRecentFilter(null);
          }}
          className={`px-3 py-1.5 text-sm font-medium border rounded-lg focus:outline-none focus:border-indigo-500 cursor-pointer ${
            selectedYear !== null 
              ? 'bg-indigo-600 border-indigo-600 text-white' 
              : 'bg-gray-800 border-gray-700 text-gray-300'
          }`}
        >
          <option value="">Year</option>
          {availableYears.map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>

        {/* Quarter dropdown - only show when year selected */}
        {selectedYear !== null && (
          <select
            value={selectedQuarter ?? ''}
            onChange={(e) => {
              const quarter = e.target.value ? parseInt(e.target.value) : null;
              setSelectedQuarter(quarter);
              setSelectedMonth(null);
            }}
            className={`px-3 py-1.5 text-sm font-medium border rounded-lg focus:outline-none focus:border-indigo-500 cursor-pointer ${
              selectedQuarter !== null 
                ? 'bg-indigo-600 border-indigo-600 text-white' 
                : 'bg-gray-800 border-gray-700 text-gray-300'
            }`}
          >
            <option value="">Quarter</option>
            <option value="1">Q1 (Jan-Mar)</option>
            <option value="2">Q2 (Apr-Jun)</option>
            <option value="3">Q3 (Jul-Sep)</option>
            <option value="4">Q4 (Oct-Dec)</option>
          </select>
        )}

        {/* Month dropdown - only show when quarter selected */}
        {selectedYear !== null && selectedQuarter !== null && (
          <select
            value={selectedMonth ?? ''}
            onChange={(e) => {
              const month = e.target.value !== '' ? parseInt(e.target.value) : null;
              setSelectedMonth(month);
            }}
            className={`px-3 py-1.5 text-sm font-medium border rounded-lg focus:outline-none focus:border-indigo-500 cursor-pointer ${
              selectedMonth !== null 
                ? 'bg-indigo-600 border-indigo-600 text-white' 
                : 'bg-gray-800 border-gray-700 text-gray-300'
            }`}
          >
            <option value="">Month</option>
            {QUARTER_MONTHS[selectedQuarter].map(monthIndex => (
              <option key={monthIndex} value={monthIndex}>{MONTH_NAMES[monthIndex]}</option>
            ))}
          </select>
        )}

        {/* Show current filter summary and clear button */}
        {(selectedYear !== null || recentFilter !== null) && (
          <div className="ml-auto flex items-center gap-3">
            <span className="text-indigo-400 text-sm font-medium">
              Showing: {getTimeFilterLabel()}
            </span>
            <button
              onClick={clearTimeFilters}
              className="px-2 py-1 text-xs font-medium text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 rounded transition-colors"
            >
              ✕ Clear
            </button>
          </div>
        )}
      </div>
      )}
      
      {/* Legend bar */}
      <div className="px-4 py-2 bg-[#0D1117] border-b border-gray-800 flex items-center gap-6 text-xs text-gray-400 overflow-x-auto">
        {viewMode === 'clusters' && dataSource !== 'both' && (
          <>
            <span className="text-gray-500 font-medium">Cluster size:</span>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-blue-500"></div> &lt;10</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-green-500"></div> 10-50</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-yellow-400"></div> 50-100</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-red-500"></div> 200+</div>
          </>
        )}
        {viewMode === 'clusters' && dataSource === 'both' && (
          <>
            <span className="text-gray-500 font-medium">Property type:</span>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-white border border-gray-500"></div> Sold</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-rose-500"></div> For Sale</div>
            <span className="mx-2 text-gray-600">|</span>
            <span className="text-gray-500 font-medium">Cluster size:</span>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-blue-500"></div> &lt;10</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-green-500"></div> 10-50</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-yellow-400"></div> 50-100</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-red-500"></div> 200+</div>
          </>
        )}
        {viewMode === 'price' && (
          <>
            <span className="text-gray-500 font-medium">{dataSource === 'sold' ? 'Sold price:' : 'Asking price:'}</span>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-green-500"></div> €200k</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-blue-500"></div> €400k</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-yellow-400"></div> €600k</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-orange-500"></div> €800k</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-red-500"></div> €1M+</div>
          </>
        )}
        {viewMode === 'difference' && dataSource === 'sold' && (
          <>
            <span className="text-gray-500 font-medium">vs Asking:</span>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-green-500"></div> 20% under</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-green-400"></div> 10% under</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-yellow-400"></div> At asking</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-orange-500"></div> 10% over</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-red-500"></div> 20%+ over</div>
          </>
        )}
        
        <div className="ml-auto flex items-center gap-4 text-gray-500">
          {dataSource === 'sold' && (
            <>
              <span>🔥 {stats.overAsking.toLocaleString()} bidding wars</span>
              <span>💰 {stats.underAsking.toLocaleString()} deals</span>
            </>
          )}
          {dataSource === 'forSale' && (
            <span>🏷️ {filteredListings.length.toLocaleString()} listings</span>
          )}
          {dataSource === 'both' && (
            <>
              <span className="text-gray-200">⚪ {filteredProperties.length.toLocaleString()} sold</span>
              <span className="text-rose-400">🔴 {filteredListings.length.toLocaleString()} for sale</span>
            </>
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
          </div>
        )}
        
        {/* Stats overlay */}
        <div className="absolute top-4 left-4 hidden md:block">
          <div className="bg-gray-900/90 backdrop-blur-xl rounded-lg p-4 border border-gray-700 min-w-[180px]">
            {dataSource === 'sold' && (
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
            {dataSource === 'forSale' && (
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
            {dataSource === 'both' && (
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
        
        {/* View mode tips */}
        <div className="absolute bottom-4 right-4 hidden md:block">
          <div className="bg-gray-900/90 backdrop-blur-xl rounded-lg px-4 py-3 border border-gray-700 text-sm text-gray-400 max-w-xs">
            {viewMode === 'clusters' && dataSource !== 'both' && (
              <p>💡 Click clusters to zoom in. Click {dataSource === 'sold' ? 'properties' : 'listings'} for details.</p>
            )}
            {viewMode === 'clusters' && dataSource === 'both' && (
              <p>💡 <span className="text-white">White</span> = Sold, <span className="text-rose-400">Pink</span> = For Sale. Click for details.</p>
            )}
            {viewMode === 'price' && (
              <p>💡 Colors show {dataSource === 'sold' ? 'sold' : 'asking'} price. Green = under €400k, Red = over €1M.</p>
            )}
            {viewMode === 'difference' && dataSource === 'sold' && (
              <p>💡 Green = deals (sold under asking), Red = bidding wars (sold over asking).</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
