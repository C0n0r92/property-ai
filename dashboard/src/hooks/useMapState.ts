import { useState } from 'react';
import type { DifferenceFilter, DataSourceSelection } from '@/lib/map-constants';

// Custom hook for managing map-specific state
export const useMapState = () => {
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(14); // Track zoom for legend display
  const [viewMode, setViewMode] = useState<'clusters' | 'price' | 'difference'>('clusters');
  const [differenceFilter, setDifferenceFilter] = useState<DifferenceFilter>(null);

  return {
    mapReady,
    setMapReady,
    mapError,
    setMapError,
    zoomLevel,
    setZoomLevel,
    viewMode,
    setViewMode,
    differenceFilter,
    setDifferenceFilter,
  };
};
