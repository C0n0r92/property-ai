// Amenities service with Overpass API integration and walkability scoring

import { Amenity, AmenityCategory, AmenityType, WalkabilityScore } from '@/types/amenities';
import { calculateDistanceMeters, estimateWalkingTime } from './coordinates';

// Map OSM tags to Mapbox Maki icons and categories
const AMENITY_ICONS: Record<string, { icon: string; category: AmenityCategory }> = {
  // Transport
  'bus_stop': { icon: 'bus', category: 'public_transport' },
  'bus_station': { icon: 'bus', category: 'public_transport' },
  'train_station': { icon: 'rail', category: 'public_transport' },
  'tram_stop': { icon: 'rail-light', category: 'public_transport' },
  'ferry': { icon: 'ferry', category: 'public_transport' },
  'bicycle_parking': { icon: 'bicycle', category: 'public_transport' },

  // Education
  'school': { icon: 'school', category: 'education' },
  'university': { icon: 'college', category: 'education' },
  'college': { icon: 'college', category: 'education' },
  'kindergarten': { icon: 'playground', category: 'education' },
  'library': { icon: 'library', category: 'education' },
  'childcare': { icon: 'playground', category: 'education' },

  // Healthcare
  'hospital': { icon: 'hospital', category: 'healthcare' },
  'clinic': { icon: 'doctor', category: 'healthcare' },
  'pharmacy': { icon: 'pharmacy', category: 'healthcare' },
  'doctors': { icon: 'doctor', category: 'healthcare' },
  'dentist': { icon: 'dentist', category: 'healthcare' },

  // Shopping
  'supermarket': { icon: 'grocery', category: 'shopping' },
  'convenience': { icon: 'shop', category: 'shopping' },
  'mall': { icon: 'commercial', category: 'shopping' },
  'clothing_store': { icon: 'clothing-store', category: 'shopping' },
  'department_store': { icon: 'shop', category: 'shopping' },

  // Leisure
  'park': { icon: 'park', category: 'leisure' },
  'restaurant': { icon: 'restaurant', category: 'leisure' },
  'cafe': { icon: 'cafe', category: 'leisure' },
  'pub': { icon: 'beer', category: 'leisure' },
  'bar': { icon: 'beer', category: 'leisure' },
  'cinema': { icon: 'theatre', category: 'leisure' },
  'theatre': { icon: 'theatre', category: 'leisure' },
  'gym': { icon: 'pitch', category: 'leisure' },
  'fitness_centre': { icon: 'pitch', category: 'leisure' },
  'sports_centre': { icon: 'pitch', category: 'leisure' },
  'stadium': { icon: 'pitch', category: 'leisure' },

  // Services
  'bank': { icon: 'bank', category: 'services' },
  'post_office': { icon: 'post', category: 'services' },
  'atm': { icon: 'atm', category: 'services' },
  'town_hall': { icon: 'town-hall', category: 'services' },
  'police': { icon: 'police', category: 'services' },
  'fire_station': { icon: 'fire-station', category: 'services' },
};

// Identify if amenity is heavy rail (DART/Luas/Train)
function isHeavyRail(tags: Record<string, string>): boolean {
  const railway = tags.railway;
  const operator = tags.operator?.toLowerCase();
  const name = tags.name?.toLowerCase();

  // DART stations (Irish Rail commuter trains)
  if (operator?.includes('irish rail') || operator?.includes('iarnród éireann')) {
    return true;
  }

  // Luas stations
  if (operator?.includes('luas')) {
    return true;
  }

  // Railway stations
  if (railway === 'station' && (name?.includes('dart') || name?.includes('luas'))) {
    return true;
  }

  // Tram stops that are actually heavy rail
  if (railway === 'tram_stop' && operator?.includes('luas')) {
    return true;
  }

  return false;
}

// Generate meaningful names for amenities without explicit names
function generateAmenityName(tags: Record<string, string>): string {
  // For transport stops
  if (tags.public_transport === 'stop_position' || tags.public_transport === 'stop') {
    if (tags.bus === 'yes') {
      return tags.ref ? `Bus Stop #${tags.ref}` : 'Bus Stop';
    }
    if (tags.tram === 'yes' || tags.railway === 'tram_stop') {
      return 'Tram Stop';
    }
    if (tags.train === 'yes' || tags.railway === 'stop') {
      return 'Train Stop';
    }
    return 'Transport Stop';
  }

  // For railway stations
  if (tags.railway === 'station') {
    if (tags.operator?.includes('Luas')) {
      return 'Luas Station';
    }
    return 'Train Station';
  }

  // For other amenity types
  if (tags.amenity) {
    return tags.amenity.charAt(0).toUpperCase() + tags.amenity.slice(1).replace(/_/g, ' ');
  }

  if (tags.shop) {
    return tags.shop.charAt(0).toUpperCase() + tags.shop.slice(1).replace(/_/g, ' ');
  }

  if (tags.leisure) {
    return tags.leisure.charAt(0).toUpperCase() + tags.leisure.slice(1).replace(/_/g, ' ');
  }

  return 'Amenity';
}

// Parse Overpass API response into Amenity objects
export function parseOverpassResponse(data: { elements?: Array<{
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}> }, propertyLat: number, propertyLng: number): Amenity[] {
  if (!data?.elements) {
    return [];
  }

  const amenities: Amenity[] = [];

  for (const element of data.elements) {
    if (!element.tags) continue;

    let lat: number, lng: number;

    if (element.type === 'node' && element.lat !== undefined && element.lon !== undefined) {
      lat = element.lat;
      lng = element.lon;
    } else if (element.type === 'way' && element.center) {
      lat = element.center.lat;
      lng = element.center.lon;
    } else {
      continue;
    }

    const distance = calculateDistanceMeters(propertyLat, propertyLng, lat, lng);
    const walkingTime = estimateWalkingTime(distance);

    // Determine amenity type from tags
    let amenityType: AmenityType | null = null;
    const name = element.tags.name || generateAmenityName(element.tags);

    // Check various OSM tags
    if (element.tags.amenity) {
      amenityType = element.tags.amenity as AmenityType;
    } else if (element.tags.shop) {
      amenityType = element.tags.shop as AmenityType;
    } else if (element.tags.leisure) {
      amenityType = element.tags.leisure as AmenityType;
    } else if (element.tags.railway) {
      if (element.tags.railway === 'tram_stop') {
        amenityType = 'tram_stop';
      } else if (element.tags.railway === 'station' || element.tags.railway === 'halt') {
        amenityType = 'train_station';
      }
    }

    // Check public_transport tag
    if (!amenityType && element.tags.public_transport) {
      if (element.tags.public_transport === 'stop_position') {
        if (element.tags.tram === 'yes' || element.tags.railway === 'tram_stop') {
          amenityType = 'tram_stop';
        } else if (element.tags.train === 'yes') {
          amenityType = 'train_station';
        } else {
          amenityType = 'bus_stop';
        }
      }
    }

    if (!amenityType || !AMENITY_ICONS[amenityType]) {
      continue;
    }

    const iconData = AMENITY_ICONS[amenityType];
    const isHeavyRailAmenity = isHeavyRail(element.tags);

    amenities.push({
      id: `${element.type}-${element.id}`,
      type: amenityType,
      category: iconData.category,
      name,
      latitude: lat,
      longitude: lng,
      distance,
      walkingTime,
      icon: isHeavyRailAmenity ? 'rail' : iconData.icon,
      isHeavyRail: isHeavyRailAmenity,
      tags: element.tags,
    });
  }

  // Sort by distance and limit per category
  const sortedByDistance = amenities.sort((a, b) => a.distance - b.distance);

  const categoryCounts: Record<AmenityCategory, number> = {
    public_transport: 0,
    education: 0,
    healthcare: 0,
    shopping: 0,
    leisure: 0,
    services: 0,
  };

  const limited: Amenity[] = [];
  for (const amenity of sortedByDistance) {
    if (categoryCounts[amenity.category] < 10) {
      limited.push(amenity);
      categoryCounts[amenity.category]++;
    }
  }

  return limited;
}

// Calculate walkability score based on amenity density
export function calculateWalkabilityScore(amenities: Amenity[]): WalkabilityScore {
  const breakdown = {
    transport: 0,
    education: 0,
    healthcare: 0,
    shopping: 0,
    leisure: 0,
    services: 0,
  };

  // Count amenities by category within 500m (very close)
  const closeAmenities = amenities.filter(a => a.distance <= 500);

  // Score calculation (0-3 points per category)
  for (const amenity of closeAmenities) {
    switch (amenity.category) {
      case 'public_transport':
        breakdown.transport = Math.min(3, breakdown.transport + 1);
        break;
      case 'education':
        breakdown.education = Math.min(2, breakdown.education + 1);
        break;
      case 'healthcare':
        breakdown.healthcare = Math.min(2, breakdown.healthcare + 1);
        break;
      case 'shopping':
        breakdown.shopping = Math.min(2, breakdown.shopping + 1);
        break;
      case 'leisure':
        breakdown.leisure = Math.min(1, breakdown.leisure + 0.5);
        break;
      case 'services':
        breakdown.services = Math.min(1, breakdown.services + 0.5);
        break;
    }
  }

  const totalScore = breakdown.transport +
                     breakdown.education +
                     breakdown.healthcare +
                     breakdown.shopping +
                     breakdown.leisure +
                     breakdown.services;

  // Determine rating
  let rating: 'Excellent' | 'Very Good' | 'Good' | 'Fair' | 'Low';
  if (totalScore >= 9) rating = 'Excellent';
  else if (totalScore >= 7) rating = 'Very Good';
  else if (totalScore >= 5) rating = 'Good';
  else if (totalScore >= 3) rating = 'Fair';
  else rating = 'Low';

  // Find nearest DART/Luas
  const heavyRailAmenities = amenities
    .filter(a => a.isHeavyRail)
    .sort((a, b) => a.distance - b.distance);

  let nearestDartLuas: { name: string; distance: number; type: 'DART' | 'Luas' } | undefined;
  if (heavyRailAmenities.length > 0) {
    const nearest = heavyRailAmenities[0];
    const type = nearest.tags?.operator?.toLowerCase().includes('luas') ? 'Luas' : 'DART';
    nearestDartLuas = {
      name: nearest.name,
      distance: nearest.distance,
      type,
    };
  }

  // Normalize total score to 1-10 scale (max possible is 11 points)
  const normalizedScore = Math.min(10, Math.max(1, Math.round((totalScore / 11) * 10)));

  return {
    score: normalizedScore,
    rating,
    breakdown,
    nearestDartLuas,
  };
}

// Fetch amenities from Overpass API
export async function fetchAmenities(
  lat: number,
  lng: number,
  radius: number = 1000,
  signal?: AbortSignal
): Promise<Amenity[]> {
  const query = `
[out:json][timeout:25];
(
  node["amenity"](around:${radius},${lat},${lng});
  way["amenity"](around:${radius},${lat},${lng});
  node["shop"](around:${radius},${lat},${lng});
  way["shop"](around:${radius},${lat},${lng});
  node["public_transport"](around:${radius},${lat},${lng});
  node["railway"~"station|halt|tram_stop"](around:${radius},${lat},${lng});
  way["railway"~"station|halt"](around:${radius},${lat},${lng});
  node["leisure"](around:${radius},${lat},${lng});
  way["leisure"](around:${radius},${lat},${lng});
  node["amenity"="school"](around:${radius},${lat},${lng});
  way["amenity"="school"](around:${radius},${lat},${lng});
  node["amenity"="university"](around:${radius},${lat},${lng});
  node["amenity"="college"](around:${radius},${lat},${lng});
  node["amenity"="library"](around:${radius},${lat},${lng});
);
out body center;
  `.trim();

  const response = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `data=${encodeURIComponent(query)}`,
    signal,
  });

  if (!response.ok) {
    throw new Error(`Overpass API error: ${response.status}`);
  }

  const data = await response.json();
  return parseOverpassResponse(data, lat, lng);
}

// Get category display name
export function getCategoryDisplayName(category: AmenityCategory): string {
  const names: Record<AmenityCategory, string> = {
    public_transport: 'Transport',
    education: 'Education',
    healthcare: 'Healthcare',
    shopping: 'Shopping',
    leisure: 'Leisure',
    services: 'Services',
  };
  return names[category];
}
