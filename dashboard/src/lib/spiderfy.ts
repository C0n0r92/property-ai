import mapboxgl from 'mapbox-gl';

export interface SpiderFeature {
  properties: Record<string, unknown>;
  originalCoords: [number, number];
  spiderCoords: [number, number];
}

/**
 * Calculate positions in a spiral/circular pattern around a center point
 */
export function calculateSpiderPositions(
  count: number,
  center: [number, number],
  baseRadius: number = 0.00025 // ~25m at Dublin's latitude
): [number, number][] {
  const positions: [number, number][] = [];
  
  if (count <= 8) {
    // Simple circle for small counts
    const angleStep = (2 * Math.PI) / count;
    for (let i = 0; i < count; i++) {
      const angle = i * angleStep - Math.PI / 2; // Start from top
      positions.push([
        center[0] + baseRadius * Math.cos(angle),
        center[1] + baseRadius * Math.sin(angle)
      ]);
    }
  } else {
    // Spiral for larger counts
    let angle = 0;
    let radius = baseRadius;
    const angleIncrement = Math.PI * 2 / 8; // 8 items per ring
    const radiusIncrement = baseRadius * 0.8;
    
    for (let i = 0; i < count; i++) {
      positions.push([
        center[0] + radius * Math.cos(angle - Math.PI / 2),
        center[1] + radius * Math.sin(angle - Math.PI / 2)
      ]);
      angle += angleIncrement;
      if ((i + 1) % 8 === 0) {
        radius += radiusIncrement;
        angle = 0; // Reset angle for new ring
      }
    }
  }
  
  return positions;
}

/**
 * Group features by their coordinates to find overlapping points
 */
export function findOverlappingFeatures(
  features: mapboxgl.MapboxGeoJSONFeature[]
): Map<string, mapboxgl.MapboxGeoJSONFeature[]> {
  const grouped = new Map<string, mapboxgl.MapboxGeoJSONFeature[]>();
  
  for (const feature of features) {
    if (feature.geometry.type !== 'Point') continue;
    const coords = (feature.geometry as GeoJSON.Point).coordinates;
    const key = `${coords[0].toFixed(6)},${coords[1].toFixed(6)}`;
    
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(feature);
  }
  
  return grouped;
}

/**
 * SpiderfyManager - manages the spider state and updates map layers
 */
export class SpiderfyManager {
  private map: mapboxgl.Map;
  private isExpanded: boolean = false;
  private currentCenter: [number, number] | null = null;
  private spiderFeatures: SpiderFeature[] = [];
  private onFeatureClick: (feature: SpiderFeature) => void;
  
  constructor(
    map: mapboxgl.Map,
    onFeatureClick: (feature: SpiderFeature) => void
  ) {
    this.map = map;
    this.onFeatureClick = onFeatureClick;
  }
  
  /**
   * Check if spider is currently expanded
   */
  get expanded(): boolean {
    return this.isExpanded;
  }
  
  /**
   * Get the current center coordinates of the spider
   */
  get center(): [number, number] | null {
    return this.currentCenter;
  }
  
  /**
   * Check if given coordinates match the spider center (within tolerance)
   */
  isAtCenter(coords: [number, number], tolerance: number = 0.000001): boolean {
    if (!this.isExpanded || !this.currentCenter) return false;
    return Math.abs(coords[0] - this.currentCenter[0]) < tolerance &&
           Math.abs(coords[1] - this.currentCenter[1]) < tolerance;
  }
  
  /**
   * Initialize spider layers on the map
   */
  initializeLayers(): void {
    // Spider legs layer (lines from center to each marker)
    if (!this.map.getSource('spider-legs')) {
      this.map.addSource('spider-legs', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });
      
      this.map.addLayer({
        id: 'spider-legs-layer',
        type: 'line',
        source: 'spider-legs',
        paint: {
          'line-color': '#6B7280',
          'line-width': 1.5,
          'line-opacity': 0.7
        }
      });
    }
    
    // Spider markers layer
    if (!this.map.getSource('spider-markers')) {
      this.map.addSource('spider-markers', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });
      
      this.map.addLayer({
        id: 'spider-markers-layer',
        type: 'circle',
        source: 'spider-markers',
        paint: {
          'circle-radius': 10,
          'circle-color': [
            'case',
            ['==', ['get', 'isListing'], true], '#FF69B4', // Hot Pink for listings
            '#FFFFFF' // White for sold properties
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#1F2937'
        }
      });
      
      // Click handler for spider markers
      this.map.on('click', 'spider-markers-layer', (e) => {
        if (e.features && e.features[0]) {
          const props = e.features[0].properties;
          const geometry = e.features[0].geometry as GeoJSON.Point;
          
          // Find the matching spider feature
          const spiderFeature = this.spiderFeatures.find(sf => 
            sf.spiderCoords[0].toFixed(6) === geometry.coordinates[0].toFixed(6) &&
            sf.spiderCoords[1].toFixed(6) === geometry.coordinates[1].toFixed(6)
          );
          
          if (spiderFeature) {
            this.onFeatureClick(spiderFeature);
          }
        }
      });
      
      // Cursor change for spider markers
      this.map.on('mouseenter', 'spider-markers-layer', () => {
        this.map.getCanvas().style.cursor = 'pointer';
      });
      
      this.map.on('mouseleave', 'spider-markers-layer', () => {
        this.map.getCanvas().style.cursor = '';
      });
    }
  }
  
  /**
   * Expand overlapping features into a spider pattern
   */
  expand(center: [number, number], features: mapboxgl.MapboxGeoJSONFeature[]): void {
    // Collapse any existing spider first
    if (this.isExpanded) {
      this.collapse();
    }
    
    const maxFeatures = 20; // Limit to prevent overcrowding
    const limitedFeatures = features.slice(0, maxFeatures);
    
    // Calculate spider positions
    const positions = calculateSpiderPositions(limitedFeatures.length, center);
    
    // Create spider features
    this.spiderFeatures = limitedFeatures.map((feature, i) => ({
      properties: feature.properties || {},
      originalCoords: center,
      spiderCoords: positions[i]
    }));
    
    this.currentCenter = center;
    this.isExpanded = true;
    
    // Update spider legs source
    const legsData: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: this.spiderFeatures.map(sf => ({
        type: 'Feature' as const,
        properties: {},
        geometry: {
          type: 'LineString' as const,
          coordinates: [sf.originalCoords, sf.spiderCoords]
        }
      }))
    };
    
    (this.map.getSource('spider-legs') as mapboxgl.GeoJSONSource)?.setData(legsData);
    
    // Update spider markers source
    const markersData: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: this.spiderFeatures.map(sf => ({
        type: 'Feature' as const,
        properties: sf.properties,
        geometry: {
          type: 'Point' as const,
          coordinates: sf.spiderCoords
        }
      }))
    };
    
    (this.map.getSource('spider-markers') as mapboxgl.GeoJSONSource)?.setData(markersData);
  }
  
  /**
   * Collapse the spider back to single point
   */
  collapse(): void {
    if (!this.isExpanded) return;
    
    this.isExpanded = false;
    this.currentCenter = null;
    this.spiderFeatures = [];
    
    // Clear spider legs
    (this.map.getSource('spider-legs') as mapboxgl.GeoJSONSource)?.setData({
      type: 'FeatureCollection',
      features: []
    });
    
    // Clear spider markers
    (this.map.getSource('spider-markers') as mapboxgl.GeoJSONSource)?.setData({
      type: 'FeatureCollection',
      features: []
    });
  }
  
  /**
   * Check if a click is on the spider (to prevent collapse)
   */
  isClickOnSpider(point: mapboxgl.Point): boolean {
    if (!this.isExpanded) return false;
    
    const features = this.map.queryRenderedFeatures(point, {
      layers: ['spider-markers-layer']
    });
    
    return features.length > 0;
  }
  
  /**
   * Get the count of features at the current spider location
   */
  getFeatureCount(): number {
    return this.spiderFeatures.length;
  }
  
  /**
   * Clean up layers when component unmounts
   */
  cleanup(): void {
    this.collapse();
    
    if (this.map.getLayer('spider-legs-layer')) {
      this.map.removeLayer('spider-legs-layer');
    }
    if (this.map.getSource('spider-legs')) {
      this.map.removeSource('spider-legs');
    }
    
    if (this.map.getLayer('spider-markers-layer')) {
      this.map.removeLayer('spider-markers-layer');
    }
    if (this.map.getSource('spider-markers')) {
      this.map.removeSource('spider-markers');
    }
  }
}

