import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Shared geocoding utility using Nominatim or LocationIQ
 * Used by all scrapers for address-to-coordinates conversion
 *
 * Supports both:
 * - Local Nominatim (Docker): NOMINATIM_URL=http://localhost:8080/search
 * - LocationIQ Cloud API: LOCATIONIQ_API_KEY=your_key_here
 */

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  eircode?: string | null;
  nominatimAddress: string;
}

// Geocoding configuration - supports both local Nominatim and LocationIQ cloud
const GEOCODING_CONFIG = {
  // Use LocationIQ if API key is provided, otherwise fall back to local Nominatim
  useLocationIQ: !!process.env.LOCATIONIQ_API_KEY,
  locationIQKey: process.env.LOCATIONIQ_API_KEY || '',
  locationIQUrl: 'https://us1.locationiq.com/v1/search',
  nominatimUrl: process.env.NOMINATIM_URL || 'http://localhost:8080/search',
};

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
 * Geocode an address using Nominatim or LocationIQ
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  if (!address || address.trim().length === 0) {
    return null;
  }

  const variations = getAddressVariations(address);

  for (const query of variations) {
    try {
      // Build URL based on geocoding provider
      let url: string;
      if (GEOCODING_CONFIG.useLocationIQ) {
        // LocationIQ API (Nominatim-compatible)
        url = `${GEOCODING_CONFIG.locationIQUrl}?key=${GEOCODING_CONFIG.locationIQKey}&q=${encodeURIComponent(query)}&format=json&countrycodes=ie&limit=3`;
      } else {
        // Local Nominatim
        url = `${GEOCODING_CONFIG.nominatimUrl}?q=${encodeURIComponent(query)}&format=json&countrycodes=ie&limit=3`;
      }

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

    // Rate limiting: LocationIQ free tier allows 2 requests/second
    if (GEOCODING_CONFIG.useLocationIQ) {
      await new Promise(resolve => setTimeout(resolve, 600)); // 600ms = ~1.6 req/sec
    }
  }

  return null;
}