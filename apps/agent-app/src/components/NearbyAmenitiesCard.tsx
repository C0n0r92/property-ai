'use client';

import { MapPin, Loader2, Train, GraduationCap, Heart, ShoppingBag, TreePine, Building2, Bus } from 'lucide-react';
import type { Amenity, AmenityCategory } from '@/types/amenities';

export interface NearbyAmenitiesCardProps {
  amenities: Amenity[];
  isLoading?: boolean;
}

const categoryConfig: Record<AmenityCategory, {
  icon: typeof Train;
  label: string;
  color: string;
}> = {
  public_transport: { icon: Bus, label: 'Transport', color: '#3B82F6' },
  education: { icon: GraduationCap, label: 'Education', color: '#8B5CF6' },
  healthcare: { icon: Heart, label: 'Healthcare', color: '#EF4444' },
  shopping: { icon: ShoppingBag, label: 'Shopping', color: '#F59E0B' },
  leisure: { icon: TreePine, label: 'Leisure', color: '#22C55E' },
  services: { icon: Building2, label: 'Services', color: '#6B7280' },
};

// Map amenity types to more readable names
const amenityTypeLabels: Record<string, string> = {
  bus_stop: 'Bus Stop',
  train_station: 'Train Station',
  tram_stop: 'Tram Stop',
  dart: 'DART Station',
  luas: 'Luas Stop',
  ferry: 'Ferry Terminal',
  school: 'School',
  university: 'University',
  library: 'Library',
  kindergarten: 'Kindergarten',
  childcare: 'Childcare',
  hospital: 'Hospital',
  clinic: 'Clinic',
  pharmacy: 'Pharmacy',
  doctors: 'GP/Doctor',
  dentist: 'Dentist',
  supermarket: 'Supermarket',
  convenience: 'Convenience Store',
  mall: 'Shopping Centre',
  clothing_store: 'Clothing Store',
  park: 'Park',
  restaurant: 'Restaurant',
  cafe: 'Cafe',
  pub: 'Pub',
  cinema: 'Cinema',
  gym: 'Gym',
  theatre: 'Theatre',
  bank: 'Bank',
  post_office: 'Post Office',
  atm: 'ATM',
  town_hall: 'Town Hall',
};

function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

export function NearbyAmenitiesCard({
  amenities,
  isLoading = false,
}: NearbyAmenitiesCardProps) {
  if (isLoading) {
    return (
      <div className="card h-full flex items-center justify-center py-8">
        <Loader2 className="animate-spin" size={24} style={{ color: 'var(--foreground-muted)' }} />
        <span className="ml-2" style={{ color: 'var(--foreground-muted)' }}>Finding nearby amenities...</span>
      </div>
    );
  }

  if (amenities.length === 0) {
    return null;
  }

  // Group amenities by category
  const grouped = amenities.reduce((acc, amenity) => {
    const category = amenity.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(amenity);
    return acc;
  }, {} as Record<AmenityCategory, Amenity[]>);

  // Sort each category by distance and limit to top items
  const sortedGroups = Object.entries(grouped).map(([category, items]) => ({
    category: category as AmenityCategory,
    items: items.sort((a, b) => a.distance - b.distance).slice(0, 4),
  }));

  // Order categories by importance
  const categoryOrder: AmenityCategory[] = [
    'public_transport',
    'shopping',
    'education',
    'healthcare',
    'leisure',
    'services',
  ];

  const orderedGroups = categoryOrder
    .map(cat => sortedGroups.find(g => g.category === cat))
    .filter((g): g is NonNullable<typeof g> => g !== undefined && g.items.length > 0);

  return (
    <div className="card" role="region" aria-label="Nearby amenities">
      <div className="flex items-center gap-2 mb-4">
        <MapPin size={20} style={{ color: 'var(--accent)' }} aria-hidden="true" />
        <h3 className="text-lg font-bold">What&apos;s Nearby</h3>
        <span
          className="text-xs px-2 py-0.5 rounded-full ml-auto"
          style={{ background: 'var(--surface-hover)', color: 'var(--foreground-muted)' }}
        >
          {amenities.length} places
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {orderedGroups.map(({ category, items }) => {
          const config = categoryConfig[category];
          const Icon = config.icon;

          return (
            <div key={category}>
              <div className="flex items-center gap-2 mb-2">
                <Icon size={16} style={{ color: config.color }} />
                <span className="text-sm font-semibold" style={{ color: config.color }}>
                  {config.label}
                </span>
                <span className="text-xs" style={{ color: 'var(--foreground-muted)' }}>
                  ({items.length})
                </span>
              </div>
              <ul className="space-y-1">
                {items.map((amenity, idx) => (
                  <li
                    key={`${amenity.id}-${idx}`}
                    className="flex items-center justify-between text-sm"
                  >
                    <span
                      className="truncate flex-1 mr-2"
                      style={{ color: 'var(--foreground-secondary)' }}
                      title={amenity.name || amenityTypeLabels[amenity.type] || amenity.type}
                    >
                      {amenity.name || amenityTypeLabels[amenity.type] || amenity.type}
                    </span>
                    <span
                      className="text-xs whitespace-nowrap font-medium"
                      style={{
                        color: amenity.distance <= 300
                          ? 'var(--positive)'
                          : amenity.distance <= 600
                            ? 'var(--accent)'
                            : 'var(--foreground-muted)',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      {formatDistance(amenity.distance)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Heavy Rail Highlight */}
      {amenities.some(a => a.isHeavyRail) && (
        <div
          className="mt-4 pt-4 flex items-center gap-2"
          style={{ borderTop: '1px solid var(--border)' }}
        >
          <Train size={16} style={{ color: 'var(--positive)' }} />
          <span className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
            <span className="font-medium" style={{ color: 'var(--positive)' }}>DART/Luas access</span>
            {' '}within walking distance
          </span>
        </div>
      )}

      <p
        className="text-xs mt-4 pt-3"
        style={{ borderTop: '1px solid var(--border)', color: 'var(--foreground-muted)' }}
      >
        Based on OpenStreetMap data within 1km radius.
      </p>
    </div>
  );
}
