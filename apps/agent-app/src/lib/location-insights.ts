/**
 * Location insights library
 * Calculates transport premium, nearest stations, and location-based price correlations
 */

import { calculateDistanceMeters, estimateWalkingTime } from './coordinates';

// DART and Luas station coordinates
// Data from OpenStreetMap and Transport for Ireland
export interface Station {
  name: string;
  type: 'DART' | 'Luas';
  line?: string; // Red, Green, Northern, Southeastern
  lat: number;
  lng: number;
}

export const DUBLIN_STATIONS: Station[] = [
  // DART Northern Line (Howth/Malahide to City)
  { name: 'Howth', type: 'DART', line: 'Northern', lat: 53.3887, lng: -6.0663 },
  { name: 'Sutton', type: 'DART', line: 'Northern', lat: 53.3914, lng: -6.1068 },
  { name: 'Bayside', type: 'DART', line: 'Northern', lat: 53.3859, lng: -6.1325 },
  { name: 'Howth Junction', type: 'DART', line: 'Northern', lat: 53.3880, lng: -6.1488 },
  { name: 'Kilbarrack', type: 'DART', line: 'Northern', lat: 53.3769, lng: -6.1513 },
  { name: 'Raheny', type: 'DART', line: 'Northern', lat: 53.3727, lng: -6.1653 },
  { name: 'Harmonstown', type: 'DART', line: 'Northern', lat: 53.3687, lng: -6.1750 },
  { name: 'Killester', type: 'DART', line: 'Northern', lat: 53.3656, lng: -6.1878 },
  { name: 'Clontarf Road', type: 'DART', line: 'Northern', lat: 53.3601, lng: -6.2140 },
  { name: 'Connolly', type: 'DART', line: 'Northern', lat: 53.3525, lng: -6.2470 },

  // DART Southeastern (City to Bray/Greystones)
  { name: 'Tara Street', type: 'DART', line: 'Southeastern', lat: 53.3471, lng: -6.2542 },
  { name: 'Pearse', type: 'DART', line: 'Southeastern', lat: 53.3435, lng: -6.2506 },
  { name: 'Grand Canal Dock', type: 'DART', line: 'Southeastern', lat: 53.3392, lng: -6.2381 },
  { name: 'Lansdowne Road', type: 'DART', line: 'Southeastern', lat: 53.3304, lng: -6.2278 },
  { name: 'Sandymount', type: 'DART', line: 'Southeastern', lat: 53.3265, lng: -6.2198 },
  { name: 'Sydney Parade', type: 'DART', line: 'Southeastern', lat: 53.3194, lng: -6.2112 },
  { name: 'Booterstown', type: 'DART', line: 'Southeastern', lat: 53.3104, lng: -6.1987 },
  { name: 'Blackrock', type: 'DART', line: 'Southeastern', lat: 53.3010, lng: -6.1793 },
  { name: 'Seapoint', type: 'DART', line: 'Southeastern', lat: 53.2953, lng: -6.1728 },
  { name: 'Salthill & Monkstown', type: 'DART', line: 'Southeastern', lat: 53.2909, lng: -6.1630 },
  { name: 'Dún Laoghaire', type: 'DART', line: 'Southeastern', lat: 53.2932, lng: -6.1356 },
  { name: 'Sandycove & Glasthule', type: 'DART', line: 'Southeastern', lat: 53.2874, lng: -6.1180 },
  { name: 'Glenageary', type: 'DART', line: 'Southeastern', lat: 53.2780, lng: -6.1200 },
  { name: 'Dalkey', type: 'DART', line: 'Southeastern', lat: 53.2718, lng: -6.1004 },
  { name: 'Killiney', type: 'DART', line: 'Southeastern', lat: 53.2594, lng: -6.0877 },
  { name: 'Shankill', type: 'DART', line: 'Southeastern', lat: 53.2380, lng: -6.1185 },
  { name: 'Bray', type: 'DART', line: 'Southeastern', lat: 53.2044, lng: -6.1005 },
  { name: 'Greystones', type: 'DART', line: 'Southeastern', lat: 53.1445, lng: -6.0638 },

  // Luas Green Line (Broombridge to Bride's Glen)
  { name: 'Broombridge', type: 'Luas', line: 'Green', lat: 53.3726, lng: -6.2972 },
  { name: 'Cabra', type: 'Luas', line: 'Green', lat: 53.3625, lng: -6.2967 },
  { name: 'Phibsborough', type: 'Luas', line: 'Green', lat: 53.3569, lng: -6.2822 },
  { name: 'Grangegorman', type: 'Luas', line: 'Green', lat: 53.3536, lng: -6.2798 },
  { name: 'Broadstone - DIT', type: 'Luas', line: 'Green', lat: 53.3516, lng: -6.2749 },
  { name: 'Dominick', type: 'Luas', line: 'Green', lat: 53.3487, lng: -6.2731 },
  { name: 'Parnell', type: 'Luas', line: 'Green', lat: 53.3519, lng: -6.2629 },
  { name: "O'Connell - Upper", type: 'Luas', line: 'Green', lat: 53.3518, lng: -6.2600 },
  { name: "O'Connell - GPO", type: 'Luas', line: 'Green', lat: 53.3488, lng: -6.2600 },
  { name: 'Marlborough', type: 'Luas', line: 'Green', lat: 53.3486, lng: -6.2550 },
  { name: 'Westmoreland', type: 'Luas', line: 'Green', lat: 53.3455, lng: -6.2585 },
  { name: 'Trinity', type: 'Luas', line: 'Green', lat: 53.3443, lng: -6.2568 },
  { name: 'Dawson', type: 'Luas', line: 'Green', lat: 53.3408, lng: -6.2573 },
  { name: "St. Stephen's Green", type: 'Luas', line: 'Green', lat: 53.3390, lng: -6.2613 },
  { name: 'Harcourt', type: 'Luas', line: 'Green', lat: 53.3335, lng: -6.2630 },
  { name: 'Charlemont', type: 'Luas', line: 'Green', lat: 53.3305, lng: -6.2591 },
  { name: 'Ranelagh', type: 'Luas', line: 'Green', lat: 53.3260, lng: -6.2560 },
  { name: 'Beechwood', type: 'Luas', line: 'Green', lat: 53.3205, lng: -6.2521 },
  { name: 'Cowper', type: 'Luas', line: 'Green', lat: 53.3150, lng: -6.2545 },
  { name: 'Milltown', type: 'Luas', line: 'Green', lat: 53.3067, lng: -6.2490 },
  { name: 'Windy Arbour', type: 'Luas', line: 'Green', lat: 53.2999, lng: -6.2487 },
  { name: 'Dundrum', type: 'Luas', line: 'Green', lat: 53.2886, lng: -6.2452 },
  { name: 'Balally', type: 'Luas', line: 'Green', lat: 53.2856, lng: -6.2367 },
  { name: 'Kilmacud', type: 'Luas', line: 'Green', lat: 53.2829, lng: -6.2234 },
  { name: 'Stillorgan', type: 'Luas', line: 'Green', lat: 53.2794, lng: -6.2101 },
  { name: 'Sandyford', type: 'Luas', line: 'Green', lat: 53.2739, lng: -6.2040 },
  { name: 'Central Park', type: 'Luas', line: 'Green', lat: 53.2670, lng: -6.2049 },
  { name: 'Glencairn', type: 'Luas', line: 'Green', lat: 53.2631, lng: -6.2107 },
  { name: 'The Gallops', type: 'Luas', line: 'Green', lat: 53.2599, lng: -6.2126 },
  { name: 'Leopardstown Valley', type: 'Luas', line: 'Green', lat: 53.2544, lng: -6.2139 },
  { name: 'Ballyogan Wood', type: 'Luas', line: 'Green', lat: 53.2514, lng: -6.2077 },
  { name: 'Carrickmines', type: 'Luas', line: 'Green', lat: 53.2474, lng: -6.1866 },
  { name: 'Laughanstown', type: 'Luas', line: 'Green', lat: 53.2432, lng: -6.1565 },
  { name: 'Cherrywood', type: 'Luas', line: 'Green', lat: 53.2396, lng: -6.1459 },
  { name: "Bride's Glen", type: 'Luas', line: 'Green', lat: 53.2335, lng: -6.1426 },

  // Luas Red Line (The Point to Saggart/Tallaght)
  { name: 'The Point', type: 'Luas', line: 'Red', lat: 53.3477, lng: -6.2288 },
  { name: 'Spencer Dock', type: 'Luas', line: 'Red', lat: 53.3487, lng: -6.2370 },
  { name: 'Mayor Square - NCI', type: 'Luas', line: 'Red', lat: 53.3497, lng: -6.2439 },
  { name: 'George\'s Dock', type: 'Luas', line: 'Red', lat: 53.3496, lng: -6.2479 },
  { name: 'Connolly', type: 'Luas', line: 'Red', lat: 53.3503, lng: -6.2510 },
  { name: 'Busáras', type: 'Luas', line: 'Red', lat: 53.3509, lng: -6.2541 },
  { name: 'Abbey Street', type: 'Luas', line: 'Red', lat: 53.3486, lng: -6.2594 },
  { name: 'Jervis', type: 'Luas', line: 'Red', lat: 53.3475, lng: -6.2668 },
  { name: 'Four Courts', type: 'Luas', line: 'Red', lat: 53.3467, lng: -6.2740 },
  { name: 'Smithfield', type: 'Luas', line: 'Red', lat: 53.3471, lng: -6.2778 },
  { name: 'Museum', type: 'Luas', line: 'Red', lat: 53.3459, lng: -6.2869 },
  { name: 'Heuston', type: 'Luas', line: 'Red', lat: 53.3464, lng: -6.2945 },
  { name: 'James\'s', type: 'Luas', line: 'Red', lat: 53.3423, lng: -6.2949 },
  { name: 'Fatima', type: 'Luas', line: 'Red', lat: 53.3361, lng: -6.3012 },
  { name: 'Rialto', type: 'Luas', line: 'Red', lat: 53.3324, lng: -6.3075 },
  { name: 'Suir Road', type: 'Luas', line: 'Red', lat: 53.3287, lng: -6.3169 },
  { name: 'Goldenbridge', type: 'Luas', line: 'Red', lat: 53.3268, lng: -6.3267 },
  { name: 'Drimnagh', type: 'Luas', line: 'Red', lat: 53.3219, lng: -6.3355 },
  { name: 'Blackhorse', type: 'Luas', line: 'Red', lat: 53.3179, lng: -6.3455 },
  { name: 'Bluebell', type: 'Luas', line: 'Red', lat: 53.3134, lng: -6.3525 },
  { name: 'Kylemore', type: 'Luas', line: 'Red', lat: 53.3096, lng: -6.3661 },
  { name: 'Red Cow', type: 'Luas', line: 'Red', lat: 53.3160, lng: -6.3868 },
  // Tallaght branch
  { name: 'Kingswood', type: 'Luas', line: 'Red', lat: 53.3108, lng: -6.3931 },
  { name: 'Belgard', type: 'Luas', line: 'Red', lat: 53.2979, lng: -6.3753 },
  { name: 'Cookstown', type: 'Luas', line: 'Red', lat: 53.2921, lng: -6.3771 },
  { name: 'Hospital', type: 'Luas', line: 'Red', lat: 53.2875, lng: -6.3781 },
  { name: 'Tallaght', type: 'Luas', line: 'Red', lat: 53.2872, lng: -6.3728 },
  // Saggart branch
  { name: 'Fettercairn', type: 'Luas', line: 'Red', lat: 53.2858, lng: -6.4056 },
  { name: 'Cheeverstown', type: 'Luas', line: 'Red', lat: 53.2798, lng: -6.4143 },
  { name: 'Citywest Campus', type: 'Luas', line: 'Red', lat: 53.2797, lng: -6.4267 },
  { name: 'Fortunestown', type: 'Luas', line: 'Red', lat: 53.2765, lng: -6.4364 },
  { name: 'Saggart', type: 'Luas', line: 'Red', lat: 53.2765, lng: -6.4470 },
];

export interface NearestStation {
  name: string;
  distance: number; // meters
  walkingTime: number; // minutes
  type: 'DART' | 'Luas';
  line?: string;
}

/**
 * Find the nearest DART or Luas station to a given location
 */
export function calculateNearestStation(lat: number, lng: number): NearestStation | null {
  if (!lat || !lng) return null;

  let nearest: NearestStation | null = null;
  let minDistance = Infinity;

  for (const station of DUBLIN_STATIONS) {
    const distance = calculateDistanceMeters(lat, lng, station.lat, station.lng);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = {
        name: station.name,
        distance,
        walkingTime: estimateWalkingTime(distance),
        type: station.type,
        line: station.line,
      };
    }
  }

  return nearest;
}

export interface TransportPremium {
  hasAccess: boolean; // Within 800m of station
  premiumPercent: number | null;
  nearRailMedian: number | null;
  farRailMedian: number | null;
  sampleSizeNear: number;
  sampleSizeFar: number;
  confidence: 'high' | 'medium' | 'low';
}

export interface Property {
  latitude?: number | null;
  longitude?: number | null;
  soldPrice?: number;
  askingPrice?: number;
  areaSqm?: number | null;
  propertyType?: string;
  beds?: number | null;
  dublinPostcode?: string | null;
}

/**
 * Calculate transport premium by comparing prices near rail vs far from rail
 * within same postcode, property type, and bedroom count
 */
export function calculateTransportPremium(
  propertyLat: number,
  propertyLng: number,
  propertyPostcode: string | null,
  propertyType: string | undefined,
  propertyBeds: number | null | undefined,
  allProperties: Property[]
): TransportPremium {
  const NEAR_RAIL_THRESHOLD = 800; // meters
  const MIN_SAMPLE_SIZE = 5;

  // Find distance to nearest station for the property
  const nearest = calculateNearestStation(propertyLat, propertyLng);
  const hasAccess = nearest ? nearest.distance <= NEAR_RAIL_THRESHOLD : false;

  // If no postcode, can't do controlled comparison
  if (!propertyPostcode) {
    return {
      hasAccess,
      premiumPercent: null,
      nearRailMedian: null,
      farRailMedian: null,
      sampleSizeNear: 0,
      sampleSizeFar: 0,
      confidence: 'low',
    };
  }

  // Filter to same postcode, type, and beds (controlled comparison)
  const comparable = allProperties.filter(p => {
    if (!p.latitude || !p.longitude) return false;
    if (!p.soldPrice || p.soldPrice <= 0) return false;
    if (!p.areaSqm || p.areaSqm <= 0) return false;
    if (p.dublinPostcode !== propertyPostcode) return false;
    if (propertyType && p.propertyType !== propertyType) return false;
    if (propertyBeds !== undefined && propertyBeds !== null && p.beds !== propertyBeds) return false;
    return true;
  });

  // Calculate distance to nearest station for each property
  const withDistance = comparable.map(p => {
    const nearestStation = calculateNearestStation(p.latitude as number, p.longitude as number);
    const pricePerSqm = p.soldPrice! / p.areaSqm!;
    return {
      ...p,
      distanceToStation: nearestStation?.distance ?? Infinity,
      pricePerSqm,
    };
  });

  // Split into near and far groups
  const nearRail = withDistance.filter(p => p.distanceToStation <= NEAR_RAIL_THRESHOLD);
  const farRail = withDistance.filter(p => p.distanceToStation > NEAR_RAIL_THRESHOLD);

  // Need minimum sample size in both groups
  if (nearRail.length < MIN_SAMPLE_SIZE || farRail.length < MIN_SAMPLE_SIZE) {
    return {
      hasAccess,
      premiumPercent: null,
      nearRailMedian: null,
      farRailMedian: null,
      sampleSizeNear: nearRail.length,
      sampleSizeFar: farRail.length,
      confidence: 'low',
    };
  }

  // Calculate medians
  const median = (arr: number[]) => {
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  };

  const nearRailMedian = Math.round(median(nearRail.map(p => p.pricePerSqm)));
  const farRailMedian = Math.round(median(farRail.map(p => p.pricePerSqm)));

  // Calculate premium
  const premiumPercent = farRailMedian > 0
    ? Math.round(((nearRailMedian - farRailMedian) / farRailMedian) * 1000) / 10
    : null;

  // Determine confidence based on sample sizes
  const totalSample = nearRail.length + farRail.length;
  let confidence: 'high' | 'medium' | 'low';
  if (totalSample >= 50 && nearRail.length >= 15 && farRail.length >= 15) {
    confidence = 'high';
  } else if (totalSample >= 20) {
    confidence = 'medium';
  } else {
    confidence = 'low';
  }

  return {
    hasAccess,
    premiumPercent,
    nearRailMedian,
    farRailMedian,
    sampleSizeNear: nearRail.length,
    sampleSizeFar: farRail.length,
    confidence,
  };
}

export interface LocationInsights {
  nearestStation: NearestStation | null;
  transportPremium: TransportPremium;
}

/**
 * Calculate all location insights for a property
 */
export function calculateLocationInsights(
  propertyLat: number,
  propertyLng: number,
  propertyPostcode: string | null | undefined,
  propertyType: string | undefined,
  propertyBeds: number | null | undefined,
  allProperties: Property[]
): LocationInsights {
  const nearestStation = calculateNearestStation(propertyLat, propertyLng);
  const transportPremium = calculateTransportPremium(
    propertyLat,
    propertyLng,
    propertyPostcode ?? null,
    propertyType,
    propertyBeds,
    allProperties
  );

  return {
    nearestStation,
    transportPremium,
  };
}
