// Yield estimate from rental data matching
export interface YieldEstimate {
  monthlyRent: number;
  grossYield: number;
  confidence: 'high' | 'medium' | 'low' | 'very_low';
  source: 'eircode' | 'nearby' | 'area_average';
  dataPoints: number;
  searchRadius?: number;
  rentRange: { min: number; max: number };
  note: string;
}

export interface Property {
  address: string;
  soldDate: string;
  soldPrice: number;
  askingPrice: number;
  overUnderPercent: number;
  beds: number | null;
  baths: number | null;
  areaSqm: number | null;
  propertyType: string;
  sourceUrl: string;
  sourcePage: number;
  latitude: number | null;
  longitude: number | null;
  eircode: string | null;
  nominatimAddress: string | null;
  pricePerSqm: number | null;
  scrapedAt: string;
  // Yield estimate (added by consolidate script)
  yieldEstimate?: YieldEstimate | null;
  dublinPostcode?: string | null;
}

export interface PropertyFilters {
  minPrice?: number;
  maxPrice?: number;
  minBeds?: number;
  maxBeds?: number;
  propertyTypes?: string[];
  areas?: string[];
  minDate?: string;
  maxDate?: string;
}

export interface MarketStats {
  totalProperties: number;
  medianPrice: number;
  avgPricePerSqm: number;
  pctOverAsking: number;
  priceChange: number;
}

export interface AreaStats {
  name: string;
  count: number;
  medianPrice: number;
  avgPricePerSqm: number;
  pctOverAsking: number;
  change6m: number;
}

// For Sale Listings (active market inventory)
export interface Listing {
  address: string;
  askingPrice: number;
  beds: number | null;
  baths: number | null;
  areaSqm: number | null;
  propertyType: string;
  berRating: string | null;
  sourceUrl: string;
  sourcePage: number;
  latitude: number | null;
  longitude: number | null;
  eircode: string | null;
  nominatimAddress: string | null;
  pricePerSqm: number | null;
  scrapedAt: string;
  // Yield estimate (added by consolidate script)
  yieldEstimate?: YieldEstimate | null;
  dublinPostcode?: string | null;
}

export interface ListingStats {
  totalListings: number;
  medianPrice: number;
  avgPricePerSqm: number;
  priceRange: { min: number; max: number };
}

// Rental Listings
export interface RentalListing {
  address: string;
  monthlyRent: number;
  beds: number | null;
  baths: number | null;
  areaSqm: number | null;
  propertyType: string;
  berRating: string | null;
  furnishing: string | null;
  sourceUrl: string;
  sourcePage: number;
  latitude: number | null;
  longitude: number | null;
  eircode: string | null;
  nominatimAddress: string | null;
  rentPerSqm: number | null;
  rentPerBed: number | null;
  dublinPostcode: string | null;
  scrapedAt: string;
}

export interface RentalStats {
  totalRentals: number;
  medianRent: number;
  avgRentPerSqm: number;
  rentRange: { min: number; max: number };
}

