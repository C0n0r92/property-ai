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

export interface AmenitiesFilter {
  public_transport: boolean;
  education: boolean;
  healthcare: boolean;
  shopping: boolean;
  leisure: boolean;
  services: boolean;
}
