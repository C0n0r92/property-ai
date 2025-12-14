'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { formatFullPrice } from '@/lib/format';
import type { Property } from '@/types/property';

// Mapbox access token
const MAPBOX_TOKEN = 'pk.eyJ1IjoiYzBuMHI5IiwiYSI6ImNtajZiaXZzdDBrOHMzZXF5dnFnMmZ6Ym4ifQ.Np14DcYGtlYDP8yBPUp_JQ';
mapboxgl.accessToken = MAPBOX_TOKEN;

type DifferenceFilter = 'all' | 'over' | 'under' | 'exact';
type TimeFilter = 'all' | '2024' | '2023' | '2022' | 'recent6m' | 'recent12m';

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
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [viewMode, setViewMode] = useState<'clusters' | 'price' | 'difference'>('clusters');
  const [differenceFilter, setDifferenceFilter] = useState<DifferenceFilter>('all');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [stats, setStats] = useState({ total: 0, avgPrice: 0, avgPricePerSqm: 0, overAsking: 0, underAsking: 0 });
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ place_name: string; center: [number, number] }>>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

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
        `access_token=${MAPBOX_TOKEN}&` +
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

  // Load properties and true Dublin stats
  useEffect(() => {
    // Fetch ALL properties for the map (clustering handles performance)
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
        setLoading(false);
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
  }, []);

  // Filter properties based on difference and time filters
  const filteredProperties = useMemo(() => {
    let filtered = properties;
    
    // Apply time filter
    if (timeFilter !== 'all') {
      const now = new Date();
      filtered = filtered.filter(p => {
        if (!p.soldDate) return false;
        const soldDate = new Date(p.soldDate);
        
        switch (timeFilter) {
          case '2024':
            return soldDate.getFullYear() === 2024;
          case '2023':
            return soldDate.getFullYear() === 2023;
          case '2022':
            return soldDate.getFullYear() === 2022;
          case 'recent6m': {
            const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
            return soldDate >= sixMonthsAgo;
          }
          case 'recent12m': {
            const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
            return soldDate >= oneYearAgo;
          }
          default:
            return true;
        }
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
  }, [properties, differenceFilter, timeFilter]);

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
      setMapReady(true);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Setup map layers based on view mode and filtered properties
  useEffect(() => {
    if (!mapReady || !map.current || filteredProperties.length === 0) return;

    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: filteredProperties.map(p => {
        const priceDiff = p.askingPrice ? p.soldPrice - p.askingPrice : 0;
        const priceDiffPercent = p.askingPrice ? Math.round((priceDiff / p.askingPrice) * 100) : 0;
        
        return {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [p.longitude!, p.latitude!],
          },
          properties: {
            id: p.url || p.address,
            address: p.address,
            soldPrice: p.soldPrice,
            askingPrice: p.askingPrice || 0,
            pricePerSqm: p.pricePerSqm || 0,
            priceDiff,
            priceDiffPercent,
            beds: p.beds,
            baths: p.baths,
            propertyType: p.propertyType,
            soldDate: p.soldDate,
            floorArea: p.floorArea,
          },
        };
      }),
    };

    // Remove existing layers/sources
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

      // Individual unclustered points
      map.current.addLayer({
        id: 'unclustered-point',
        type: 'circle',
        source: 'properties-clustered',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-radius': 8,
          'circle-color': [
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
          'circle-stroke-color': '#ffffff',
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

      // Click on unclustered point
      map.current.on('click', 'unclustered-point', (e) => {
        if (e.features && e.features[0]) {
          const props = e.features[0].properties;
          setSelectedProperty({
            address: props?.address,
            soldPrice: props?.soldPrice,
            askingPrice: props?.askingPrice,
            pricePerSqm: props?.pricePerSqm,
            beds: props?.beds,
            baths: props?.baths,
            propertyType: props?.propertyType,
            soldDate: props?.soldDate,
            floorArea: props?.floorArea,
          } as Property);
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
            ['get', 'soldPrice'],
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
        if (e.features && e.features[0]) {
          const props = e.features[0].properties;
          setSelectedProperty({
            address: props?.address,
            soldPrice: props?.soldPrice,
            askingPrice: props?.askingPrice,
            pricePerSqm: props?.pricePerSqm,
            beds: props?.beds,
            baths: props?.baths,
            propertyType: props?.propertyType,
            soldDate: props?.soldDate,
            floorArea: props?.floorArea,
          } as Property);
        }
      });

      map.current?.on('mouseenter', layerId, () => {
        if (map.current) map.current.getCanvas().style.cursor = 'pointer';
      });
      map.current?.on('mouseleave', layerId, () => {
        if (map.current) map.current.getCanvas().style.cursor = '';
      });
    }

  }, [mapReady, filteredProperties, viewMode]);

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

  // Get year from date
  const getSoldYear = (dateStr: string | undefined): string => {
    if (!dateStr) return 'Unknown';
    try {
      return new Date(dateStr).getFullYear().toString();
    } catch {
      return 'Unknown';
    }
  };

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col">
      {/* Map Controls */}
      <div className="p-4 bg-[#111827] border-b border-gray-800 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-white">Property Map</h1>
          <span className="text-gray-400">
            {loading ? 'Loading...' : `${filteredProperties.length.toLocaleString()} properties`}
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
        
        <div className="flex items-center gap-4 flex-wrap">
          {/* View Toggle */}
          <div className="flex rounded-lg overflow-hidden border border-gray-700">
            <button
              onClick={() => setViewMode('clusters')}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                viewMode === 'clusters' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              Clusters
            </button>
            <button
              onClick={() => setViewMode('price')}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                viewMode === 'price' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              By Price
            </button>
            <button
              onClick={() => setViewMode('difference')}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                viewMode === 'difference' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              Sold vs Asking
            </button>
          </div>

          {/* Time Period Filter */}
          <div className="flex rounded-lg overflow-hidden border border-gray-700">
            <button
              onClick={() => setTimeFilter('all')}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                timeFilter === 'all' 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => setTimeFilter('recent6m')}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                timeFilter === 'recent6m' 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              6 Months
            </button>
            <button
              onClick={() => setTimeFilter('recent12m')}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                timeFilter === 'recent12m' 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              12 Months
            </button>
            <button
              onClick={() => setTimeFilter('2024')}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                timeFilter === '2024' 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              2024
            </button>
            <button
              onClick={() => setTimeFilter('2023')}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                timeFilter === '2023' 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              2023
            </button>
          </div>

          {/* Price vs Asking Filter */}
          <div className="flex rounded-lg overflow-hidden border border-gray-700">
            <button
              onClick={() => setDifferenceFilter('all')}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                differenceFilter === 'all' 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              All Sales
            </button>
            <button
              onClick={() => setDifferenceFilter('over')}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
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
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                differenceFilter === 'under' 
                  ? 'bg-green-600 text-white' 
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
              title="Properties that sold below their asking price"
            >
              💰 Deals
            </button>
          </div>
        </div>
      </div>
      
      {/* Legend bar */}
      <div className="px-4 py-2 bg-[#0D1117] border-b border-gray-800 flex items-center gap-6 text-xs text-gray-400 overflow-x-auto">
        {viewMode === 'clusters' && (
          <>
            <span className="text-gray-500 font-medium">Cluster size:</span>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-blue-500"></div> &lt;10</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-green-500"></div> 10-50</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-yellow-400"></div> 50-100</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-red-500"></div> 200+</div>
          </>
        )}
        {viewMode === 'price' && (
          <>
            <span className="text-gray-500 font-medium">Sold price:</span>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-green-500"></div> €200k</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-blue-500"></div> €400k</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-yellow-400"></div> €600k</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-orange-500"></div> €800k</div>
            <div className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-red-500"></div> €1M+</div>
          </>
        )}
        {viewMode === 'difference' && (
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
          <span>🔥 {stats.overAsking.toLocaleString()} bidding wars</span>
          <span>💰 {stats.underAsking.toLocaleString()} deals</span>
          {timeFilter !== 'all' && (
            <span className="text-indigo-400 font-medium">
              Showing: {timeFilter === 'recent6m' ? 'Last 6 months' : 
                       timeFilter === 'recent12m' ? 'Last 12 months' : 
                       timeFilter}
            </span>
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
                Sold {getSoldYear(selectedProperty.soldDate)}
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
              {selectedProperty.floorArea && (
                <div className="bg-gray-800 rounded-lg px-3 py-2">
                  <div className="text-gray-500 text-xs">Floor Area</div>
                  <div className="text-white font-semibold">{selectedProperty.floorArea} m²</div>
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
        
        {/* Stats overlay */}
        <div className="absolute top-4 left-4 hidden md:block">
          <div className="bg-gray-900/90 backdrop-blur-xl rounded-lg p-4 border border-gray-700">
            <div className="text-sm text-gray-500 mb-1">Dublin Avg €/m²</div>
            <div className="text-2xl font-bold text-white font-mono">€{stats.avgPricePerSqm.toLocaleString()}</div>
          </div>
        </div>
        
        {/* View mode tips */}
        <div className="absolute bottom-4 right-4 hidden md:block">
          <div className="bg-gray-900/90 backdrop-blur-xl rounded-lg px-4 py-3 border border-gray-700 text-sm text-gray-400 max-w-xs">
            {viewMode === 'clusters' && (
              <p>💡 Click clusters to zoom in. Click properties for details.</p>
            )}
            {viewMode === 'price' && (
              <p>💡 Colors show sold price. Green = under €400k, Red = over €1M.</p>
            )}
            {viewMode === 'difference' && (
              <p>💡 Green = deals (sold under asking), Red = bidding wars (sold over asking).</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
