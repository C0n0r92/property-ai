/**
 * Coordinate conversion utilities for ArcGIS integration
 * Converts WGS84 (latitude/longitude) to Web Mercator (EPSG:3857)
 */

const EARTH_RADIUS = 6378137; // meters

/**
 * Convert WGS84 latitude/longitude to Web Mercator coordinates (EPSG:3857)
 * Used by ArcGIS FeatureServer API
 *
 * @param lat - Latitude in degrees (-90 to 90)
 * @param lng - Longitude in degrees (-180 to 180)
 * @returns [x, y] Web Mercator coordinates
 */
export function latLngToWebMercator(lat: number, lng: number): [number, number] {
  // Validate input ranges
  if (lat < -90 || lat > 90) {
    throw new Error(`Invalid latitude: ${lat}. Must be between -90 and 90`);
  }
  if (lng < -180 || lng > 180) {
    throw new Error(`Invalid longitude: ${lng}. Must be between -180 and 180`);
  }

  // Convert to radians
  const latRad = lat * (Math.PI / 180);
  const lngRad = lng * (Math.PI / 180);

  // Web Mercator projection formula
  const x = lngRad * EARTH_RADIUS;
  const y = Math.log(Math.tan((Math.PI / 4) + (latRad / 2))) * EARTH_RADIUS;

  return [x, y];
}

/**
 * Check if coordinates are valid Irish coordinates (rough bounds)
 * Dublin area: ~53.2-53.6 N, ~6.1-6.5 W
 */
export function isValidIrishCoordinates(lat: number, lng: number): boolean {
  return lat >= 51.0 && lat <= 55.5 && lng >= -10.8 && lng <= -5.8;
}

/**
 * Format Web Mercator coordinates for ArcGIS API (no decimals, comma-separated)
 */
export function formatWebMercatorForApi(x: number, y: number): string {
  return `${Math.round(x)},${Math.round(y)}`;
}


