// Types for scraped property data

export interface ScrapedProperty {
  // Identifiers
  daftUrl: string;

  // Location
  address: string;
  area?: string;
  county: string;

  // Prices - THE KEY DATA
  askingPrice: number;
  soldPrice: number;
  soldDate: string; // ISO date string

  // Property details
  propertyType?: string; // "Semi-D", "Detached", "Apartment", "Terrace", etc.
  bedrooms?: number;
  bathrooms?: number;
  floorArea?: number; // square meters
  berRating?: string; // "A1", "B2", "C3", etc.

  // Agent
  agent?: string;

  // Computed
  overUnderAskingPercent: number; // Positive = over asking, negative = under

  // Metadata
  scrapedAt: string; // ISO timestamp

  // Geocoding
  latitude?: number;
  longitude?: number;
  eircode?: string;
  nominatimAddress?: string; // Full address from Nominatim response
  geocodeStatus?: 'success' | 'not_found' | 'error';
}

export interface ScrapeProgress {
  currentPage: number;
  totalPages: number;
  propertiesScraped: number;
  lastScrapedAt: string;
  errors: string[];
}

export interface ScrapeConfig {
  baseUrl: string;
  location: string; // e.g., "dublin", "dublin-4", etc.
  maxPages?: number; // Limit for testing
  delayMs: number; // Delay between requests
  outputFile: string;
}

// Types for "For Sale" listings (active market inventory)
export interface Listing {
  // Identifiers
  id: string;

  // Location
  address: string;

  // Price
  askingPrice: number;

  // Property details
  beds: number | null;
  baths: number | null;
  areaSqm: number | null;
  propertyType: string;
  berRating: string | null;

  // Source
  sourceUrl: string;
  sourcePage: number;

  // Geocoding
  latitude: number | null;
  longitude: number | null;
  eircode: string | null;
  nominatimAddress: string | null;

  // Computed
  pricePerSqm: number | null;

  // Metadata
  scrapedAt: string;
}
