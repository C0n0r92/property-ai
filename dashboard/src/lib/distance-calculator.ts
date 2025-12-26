// Distance calculation utilities for Dublin property analysis

// Dublin General Post Office coordinates (city centre reference point)
export const DUBLIN_CITY_CENTRE: [number, number] = [53.3498, -6.2603]; // [lat, lng]

// Haversine distance calculation
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return Math.round(R * c); // Distance in meters
}

// Calculate distance from Dublin city centre
export function calculateDistanceFromCentre(lat: number, lng: number): number {
  return calculateDistance(lat, lng, DUBLIN_CITY_CENTRE[0], DUBLIN_CITY_CENTRE[1]);
}

// Convert distance in meters to kilometers
export function metersToKilometers(meters: number): number {
  return Math.round((meters / 1000) * 10) / 10; // Round to 1 decimal place
}

// Distance band classification
export type DistanceBand =
  | 'City Centre'
  | 'Inner Suburbs'
  | 'Established Areas'
  | 'Outer Suburbs'
  | 'Further Areas';

export function getDistanceBand(distanceKm: number): DistanceBand {
  if (distanceKm <= 2) return 'City Centre';
  if (distanceKm <= 5) return 'Inner Suburbs';
  if (distanceKm <= 10) return 'Established Areas';
  if (distanceKm <= 15) return 'Outer Suburbs';
  return 'Further Areas';
}

// Price expectations by distance band (based on historical analysis)
export const PRICE_EXPECTATIONS: Record<DistanceBand, { median: number; premium: number }> = {
  'City Centre': { median: 650000, premium: 1.0 },
  'Inner Suburbs': { median: 525000, premium: 0.81 },
  'Established Areas': { median: 475000, premium: 0.73 },
  'Outer Suburbs': { median: 439000, premium: 0.68 },
  'Further Areas': { median: 385000, premium: 0.59 }
};

// Transport time estimates (rough approximations)
export function estimateTransportTime(distanceKm: number, mode: 'walking' | 'cycling' | 'driving' | 'public_transport'): number {
  const speeds = {
    walking: 5, // km/h
    cycling: 15, // km/h
    driving: 30, // km/h average including traffic
    public_transport: 25 // km/h effective speed
  };

  const hours = distanceKm / speeds[mode];
  return Math.round(hours * 60); // Convert to minutes
}

// Format distance for display
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${meters}m`;
  } else {
    const km = metersToKilometers(meters);
    return `${km}km`;
  }
}

// Format transport time for display
export function formatTransportTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}min`;
  } else {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}min`;
  }
}

// Distance context for property analysis
export interface DistanceContext {
  distanceMeters: number;
  distanceKm: number;
  band: DistanceBand;
  expectedPrice: number;
  premium: number;
  transportTimes: {
    walking?: number;
    cycling?: number;
    driving?: number;
    publicTransport?: number;
  };
}

export function getDistanceContext(lat: number, lng: number): DistanceContext {
  const distanceMeters = calculateDistanceFromCentre(lat, lng);
  const distanceKm = metersToKilometers(distanceMeters);
  const band = getDistanceBand(distanceKm);
  const expectations = PRICE_EXPECTATIONS[band];

  // Only show transport times for reasonable distances
  const transportTimes: DistanceContext['transportTimes'] = {};

  if (distanceKm <= 5) {
    transportTimes.walking = estimateTransportTime(distanceKm, 'walking');
    transportTimes.cycling = estimateTransportTime(distanceKm, 'cycling');
  }

  if (distanceKm <= 20) {
    transportTimes.driving = estimateTransportTime(distanceKm, 'driving');
    transportTimes.publicTransport = estimateTransportTime(distanceKm, 'public_transport');
  }

  return {
    distanceMeters,
    distanceKm,
    band,
    expectedPrice: expectations.median,
    premium: expectations.premium,
    transportTimes
  };
}
