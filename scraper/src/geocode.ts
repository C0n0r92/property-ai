/**
 * Shared geocoding utility using Nominatim
 * Used by all scrapers for address-to-coordinates conversion
 */

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  eircode?: string | null;
  nominatimAddress: string;
}

const NOMINATIM_URL = 'http://localhost:8080/search';
const DUBLIN_BOUNDS = {
  minLat: 53.10,
  maxLat: 53.65,
  minLng: -6.60,
  maxLng: -5.95
};

/**
 * Clean address for geocoding
 */
function cleanAddressForGeocode(addr: string): string {
  return addr
    .replace(/,?\s*Dublin,\s*Dublin$/i, ', Dublin')
    .replace(/^Apt\.?\s*\d+[\s,\-]*/i, '')
    .replace(/^Apartment\.?\s*\d+[\s,\-]*/i, '')
    .replace(/^Unit\.?\s*\d+[\s,\-]*/i, '')
    .replace(/,\s*,/g, ',')
    .trim();
}

/**
 * Generate address variations for better geocoding
 */
function getAddressVariations(addr: string): string[] {
  const cleaned = cleanAddressForGeocode(addr);
  const variations: string[] = [];

  variations.push(cleaned + ', Ireland');

  const parts = cleaned.split(',').map(p => p.trim()).filter(p => p);
  if (parts.length >= 4) {
    variations.push(`${parts[0]}, ${parts.slice(-2).join(', ')}, Ireland`);
  }
  if (parts.length >= 3) {
    variations.push(`${parts[0]}, ${parts[parts.length - 2]}, Ireland`);
  }
  if (parts.length >= 2) {
    variations.push(`${parts.slice(-2).join(', ')}, Ireland`);
  }

  return [...new Set(variations)];
}

/**
 * Extract Eircode from Nominatim result
 */
function extractEircode(displayName: string): string | null {
  const match = displayName.match(/[A-Z]\d{2}\s?[A-Z0-9]{4}/i);
  return match ? match[0].toUpperCase() : null;
}

/**
 * Geocode an address using Nominatim
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  if (!address || address.trim().length === 0) {
    return null;
  }

  const variations = getAddressVariations(address);

  for (const query of variations) {
    try {
      const url = `${NOMINATIM_URL}?q=${encodeURIComponent(query)}&format=json&countrycodes=ie&limit=3`;
      const response = await fetch(url);

      if (!response.ok) continue;

      const results = await response.json();

      for (const result of results) {
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);
        const displayName = result.display_name || '';

        // Validate Dublin bounds
        if (lat < DUBLIN_BOUNDS.minLat || lat > DUBLIN_BOUNDS.maxLat) continue;
        if (lng < DUBLIN_BOUNDS.minLng || lng > DUBLIN_BOUNDS.maxLng) continue;
        if (!displayName.includes('Dublin') && !displayName.includes('Fingal') && !displayName.includes('Dún Laoghaire')) continue;

        return {
          latitude: lat,
          longitude: lng,
          eircode: extractEircode(displayName),
          nominatimAddress: displayName,
        };
      }
    } catch (error) {
      // Continue to next variation
      continue;
    }
  }

  return null;
}