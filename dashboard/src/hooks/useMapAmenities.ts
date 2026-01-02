import { useState } from 'react';
import type { Amenity, WalkabilityScore as WalkabilityScoreType, RouteInfo, AmenitiesFilter } from '@/types/property';

// Custom hook for managing amenities state
export const useMapAmenities = () => {
  const [showAmenities, setShowAmenities] = useState(false);
  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [amenitiesCache, setAmenitiesCache] = useState<Map<string, Amenity[]>>(new Map());
  const [walkabilityScore, setWalkabilityScore] = useState<WalkabilityScoreType | null>(null);

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

  return {
    showAmenities,
    setShowAmenities,
    amenities,
    setAmenities,
    amenitiesCache,
    setAmenitiesCache,
    walkabilityScore,
    setWalkabilityScore,
    categoryFilters,
    setCategoryFilters,
    selectedAmenity,
    setSelectedAmenity,
    routeInfo,
    setRouteInfo,
    travelMode,
    setTravelMode,
  };
};
