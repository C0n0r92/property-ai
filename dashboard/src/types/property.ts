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

// Amenities Layer Types
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

export interface RouteInfo {
  distance: number; // meters
  duration: number; // seconds
  geometry: GeoJSON.LineString;
  mode: 'walking' | 'cycling' | 'driving';
}

export interface AmenitiesFilter {
  public_transport: boolean;
  education: boolean;
  healthcare: boolean;
  shopping: boolean;
  leisure: boolean;
  services: boolean;
}

