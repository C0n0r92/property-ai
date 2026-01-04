// Amenities service with Overpass API integration and walkability scoring

export interface Amenity {
  id: string;
  type: AmenityType;
  category: AmenityCategory;
  name: string;
  latitude: number;
  longitude: number;
  distance: number; // meters
  walkingTime: number; // minutes
  icon: string; // Mapbox Maki icon name
  isHeavyRail?: boolean; // DART/Luas/Train station
  tags?: Record<string, string>;
}

export type AmenityCategory =
  | 'public_transport'
  | 'education'
  | 'healthcare'
  | 'shopping'
  | 'leisure'
  | 'services';

export type AmenityType =
  // Transport
  | 'bus_stop' | 'train_station' | 'tram_stop' | 'ferry' | 'dart' | 'luas'
  // Education
  | 'school' | 'university' | 'library' | 'kindergarten' | 'childcare'
  // Healthcare
  | 'hospital' | 'clinic' | 'pharmacy' | 'doctors' | 'dentist'
  // Shopping
  | 'supermarket' | 'convenience' | 'mall' | 'clothing_store'
  // Leisure
  | 'park' | 'restaurant' | 'cafe' | 'pub' | 'cinema' | 'gym' | 'theatre'
  // Services
  | 'bank' | 'post_office' | 'atm' | 'town_hall';

export interface WalkabilityScore {
  score: number; // 0-10
  rating: 'Excellent' | 'Very Good' | 'Good' | 'Fair' | 'Low';
  breakdown: {
    transport: number;
    education: number;
    healthcare: number;
    shopping: number;
    leisure: number;
    services: number;
  };
  nearestDartLuas?: {
    name: string;
    distance: number;
    type: 'DART' | 'Luas';
  };
}

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

// Calculate distance using Haversine formula
export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return Math.round(R * c);
}

// Estimate walking time (5 km/h = 83 m/min)
export function estimateWalkingTime(distance: number): number {
  const walkingSpeed = 83; // meters per minute (5 km/h)
  return Math.round(distance / walkingSpeed);
}

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

// Parse Overpass API response into Amenity objects
export function parseOverpassResponse(data: any, propertyLat: number, propertyLng: number): Amenity[] {
  if (!data?.elements) {
    console.log('No elements in Overpass response');
    return [];
  }

  console.log('🎯 Processing', data.elements.length, 'elements from Overpass');

  const amenities: Amenity[] = [];

  for (const element of data.elements) {
    if (!element.tags) continue;

    let lat: number, lng: number;

    if (element.type === 'node') {
      lat = element.lat;
      lng = element.lon;
    } else if (element.type === 'way' && element.center) {
      // Use center of way if available
      lat = element.center.lat;
      lng = element.center.lon;
    } else {
      // Skip elements we can't get coordinates for
      continue;
    }
    const distance = calculateDistance(propertyLat, propertyLng, lat, lng);
    const walkingTime = estimateWalkingTime(distance);

    // Determine amenity type from tags
    let amenityType: AmenityType | null = null;
    let name = element.tags.name || generateAmenityName(element.tags);


    // Check various OSM tags
    if (element.tags.amenity) {
      amenityType = element.tags.amenity as AmenityType;
    } else if (element.tags.shop) {
      amenityType = element.tags.shop as AmenityType;
    } else if (element.tags.leisure) {
      amenityType = element.tags.leisure as AmenityType;
    } else if (element.tags.railway) {
      // Handle railway types
      if (element.tags.railway === 'tram_stop') {
        amenityType = 'tram_stop';
      } else if (element.tags.railway === 'station' || element.tags.railway === 'halt') {
        amenityType = 'train_station';
      } else if (element.tags.railway === 'stop') {
        // Check if it's a train stop
        if (element.tags.train === 'yes') {
          amenityType = 'train_station';
        }
        // If not a train stop, it might be a tram or other rail
      }
    }

    // If railway didn't match but we have public_transport, check that
    if (!amenityType && element.tags.public_transport) {
      if (element.tags.public_transport === 'stop_position') {
        // Check specific types within stop_position
        if (element.tags.tram === 'yes' || element.tags.railway === 'tram_stop') {
          amenityType = 'tram_stop';
        } else if (element.tags.train === 'yes' || element.tags.railway === 'stop') {
          amenityType = 'train_station';
        } else {
          amenityType = 'bus_stop';
        }
      } else if (element.tags.public_transport === 'stop') {
        amenityType = 'bus_stop'; // Generic stop
      }
    }

    // Debug: log what we're processing
    if (element.tags.amenity === 'bank' || element.tags.amenity === 'pharmacy' || element.tags.amenity === 'restaurant') {
      console.log('🔍 Processing key amenity:', {
        id: element.id,
        amenity: element.tags.amenity,
        name: element.tags.name,
        distance: Math.round(distance),
        amenityType: amenityType,
        hasIcon: amenityType ? !!AMENITY_ICONS[amenityType] : false
      });
    }

    if (!amenityType || !AMENITY_ICONS[amenityType]) {
      continue;
    }

    const iconData = AMENITY_ICONS[amenityType];
    const isHeavyRailAmenity = isHeavyRail(element.tags);

    // Override icon for heavy rail
    let finalIcon = iconData.icon;
    if (isHeavyRailAmenity) {
      finalIcon = 'rail'; // Use heavy rail icon
    }

    amenities.push({
      id: `${element.type}-${element.id}`,
      type: amenityType,
      category: iconData.category,
      name,
      latitude: lat,
      longitude: lng,
      distance,
      walkingTime,
      icon: finalIcon,
      isHeavyRail: isHeavyRailAmenity,
      tags: element.tags,
    });

    console.log('Added amenity:', name, amenityType, 'at distance:', Math.round(distance), 'm');
  }

  console.log('Total amenities before limiting:', amenities.length);

  // Sort by distance and limit per category (top 10 closest)
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

  console.log('🚇 Transport amenities found:', amenities.filter(a => a.category === 'public_transport').length);
  console.log('📚 Education amenities found:', amenities.filter(a => a.category === 'education').length);
  console.log('🏥 Healthcare amenities found:', amenities.filter(a => a.category === 'healthcare').length);
  console.log('🛒 Shopping amenities found:', amenities.filter(a => a.category === 'shopping').length);
  console.log('🎾 Leisure amenities found:', amenities.filter(a => a.category === 'leisure').length);
  console.log('🏦 Services amenities found:', amenities.filter(a => a.category === 'services').length);

  console.log('Final amenities after limiting:', limited.length, 'by category:', categoryCounts);

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

  return {
    score: Math.round(totalScore),
    rating,
    breakdown,
    nearestDartLuas,
  };
}

// Retry utility with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  signal?: AbortSignal
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (signal?.aborted) throw error;
      if (attempt === maxRetries) throw error;

      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
}

// Fetch amenities from Overpass API with retry logic
export async function fetchAmenities(lat: number, lng: number, radius: number = 1000, signal?: AbortSignal): Promise<Amenity[]> {
  console.log('Fetching amenities for:', lat, lng, 'radius:', radius);

  // Test basic connectivity first
  try {
    console.log('Testing basic connectivity to Overpass...');
    const connectivityTest = await fetch('https://overpass-api.de/api/status', { signal });
    console.log('Connectivity test:', connectivityTest.ok ? 'OK' : 'Failed');
  } catch (error) {
    console.warn('Connectivity test failed:', error);
  }

  // Try multiple query strategies
  let query;

  try {
    // First try: Comprehensive query including transport
    query = `
[out:json][timeout:25];
(
  node["amenity"](around:${radius},${lat},${lng});
  way["amenity"](around:${radius},${lat},${lng});
  relation["amenity"](around:${radius},${lat},${lng});
  node["shop"](around:${radius},${lat},${lng});
  way["shop"](around:${radius},${lat},${lng});
  relation["shop"](around:${radius},${lat},${lng});
  node["public_transport"](around:${radius},${lat},${lng});
  way["public_transport"](around:${radius},${lat},${lng});
  relation["public_transport"](around:${radius},${lat},${lng});
  node["railway"~"station|halt"](around:${radius},${lat},${lng});
  way["railway"~"station|halt"](around:${radius},${lat},${lng});
  relation["railway"~"station|halt"](around:${radius},${lat},${lng});
  node["leisure"](around:${radius},${lat},${lng});
  way["leisure"](around:${radius},${lat},${lng});
  relation["leisure"](around:${radius},${lat},${lng});
  node["healthcare"](around:${radius},${lat},${lng});
  way["healthcare"](around:${radius},${lat},${lng});
  relation["healthcare"](around:${radius},${lat},${lng});
  node["office"](around:${radius},${lat},${lng});
  way["office"](around:${radius},${lat},${lng});
  relation["office"](around:${radius},${lat},${lng});
  // Education amenities - schools are often tagged as buildings OR amenities
  node["building"="school"](around:${radius},${lat},${lng});
  way["building"="school"](around:${radius},${lat},${lng});
  relation["building"="school"](around:${radius},${lat},${lng});
  node["amenity"="school"](around:${radius},${lat},${lng});
  node["amenity"="university"](around:${radius},${lat},${lng});
  node["amenity"="college"](around:${radius},${lat},${lng});
  node["amenity"="kindergarten"](around:${radius},${lat},${lng});
  node["amenity"="library"](around:${radius},${lat},${lng});
  node["amenity"="childcare"](around:${radius},${lat},${lng});
  way["amenity"="school"](around:${radius},${lat},${lng});
  way["amenity"="university"](around:${radius},${lat},${lng});
  way["amenity"="college"](around:${radius},${lat},${lng});
  way["amenity"="kindergarten"](around:${radius},${lat},${lng});
  way["amenity"="library"](around:${radius},${lat},${lng});
  way["amenity"="childcare"](around:${radius},${lat},${lng});
  relation["amenity"="school"](around:${radius},${lat},${lng});
  relation["amenity"="university"](around:${radius},${lat},${lng});
  relation["amenity"="college"](around:${radius},${lat},${lng});
  relation["amenity"="kindergarten"](around:${radius},${lat},${lng});
  relation["amenity"="library"](around:${radius},${lat},${lng});
  relation["amenity"="childcare"](around:${radius},${lat},${lng});
);
out body;
    `.trim();

    console.log('Trying comprehensive query...');
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
      signal,
    });

    const data = await response.json();
    console.log('Comprehensive query returned', data.elements?.length || 0, 'elements');

    if (data.elements && data.elements.length > 0) {
      console.log('Using comprehensive query results');
      const parsed = parseOverpassResponse(data, lat, lng);
      if (parsed.length > 0) {
        return parsed;
      }
    }

    // Fallback: Simple amenity search
    query = `
[out:json][timeout:15];
node["amenity"](around:${radius},${lat},${lng});
out body;
    `.trim();

  } catch (error) {
    console.warn('Comprehensive query failed, trying basic query');
    query = `
[out:json][timeout:20];
(
  node["amenity"](around:${radius},${lat},${lng});
  node["shop"](around:${radius},${lat},${lng});
  node["public_transport"](around:${radius},${lat},${lng});
  node["railway"~"station|halt"](around:${radius},${lat},${lng});
  way["amenity"](around:${radius},${lat},${lng});
  way["shop"](around:${radius},${lat},${lng});
);
out body;
    `.trim();
  }

  console.log('Overpass query:', query);

  try {
    // Use the main Overpass server (tested and working)
    const endpoints = [
      'https://overpass-api.de/api/interpreter',
    ];

    let lastError;

    for (const endpoint of endpoints) {
      try {
        console.log('Trying endpoint:', endpoint);

        return await retryWithBackoff(async () => {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `data=${encodeURIComponent(query)}`,
            signal, // Abort signal for request cancellation
          });

          if (!response.ok) {
            if (response.status === 429) {
              throw new Error('Rate limited - retrying...');
            }
            throw new Error(`Overpass API error: ${response.status} at ${endpoint}`);
          }

          const data = await response.json();
          console.log('Overpass API response from', endpoint, ':', data);

          // Check if we got a valid response
          if (!data || !Array.isArray(data.elements)) {
            throw new Error('Invalid response from Overpass API');
          }

          console.log('Raw elements from Overpass:', data.elements.length);

          const parsedAmenities = parseOverpassResponse(data, lat, lng);
          console.log('Parsed amenities:', parsedAmenities.length);

          return parsedAmenities;
        }, 2, 1000, signal);
      } catch (error) {
        console.warn(`Endpoint ${endpoint} failed:`, error);
        lastError = error;
        continue;
      }
    }

    throw lastError || new Error('All Overpass endpoints failed');
  } catch (error) {
    // If 2km radius fails, try 500m as fallback
    if (radius === 2000 && !signal?.aborted) {
      console.warn('2km query failed, trying 500m radius...');
      return fetchAmenities(lat, lng, 500, signal);
    }
    throw error;
  }
}

// Get Mapbox icon for amenity
export function getMapboxIcon(amenityType: string): string {
  return AMENITY_ICONS[amenityType]?.icon || 'marker';
}

// Format category for display
export function formatCategory(category: AmenityCategory): string {
  return category.split('_').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
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
    // Capitalize first letter
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

// Get category icon emoji
export function getCategoryIcon(category: AmenityCategory): string {
  const icons: Record<AmenityCategory, string> = {
    public_transport: '🚇',
    education: '🏫',
    healthcare: '🏥',
    shopping: '🛒',
    leisure: '🎾',
    services: '🏦',
  };
  return icons[category];
}
