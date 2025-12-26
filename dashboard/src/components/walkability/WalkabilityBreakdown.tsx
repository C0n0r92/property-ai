import React from 'react';
import { formatCategory, getCategoryDisplayName, getCategoryIcon } from '@/lib/amenities';
import type { Amenity } from '@/types/property';

interface WalkabilityBreakdownProps {
  amenities: Amenity[];
  nearestAmenities?: Array<{
    name: string;
    type: string;
    distance: number;
    walkingTime: number;
  }>;
  className?: string;
}

const CATEGORY_ORDER = ['public_transport', 'education', 'healthcare', 'shopping', 'leisure', 'services'];

export function WalkabilityBreakdown({
  amenities,
  nearestAmenities = [],
  className = ''
}: WalkabilityBreakdownProps) {

  // Group amenities by category
  const amenitiesByCategory = amenities.reduce((acc, amenity) => {
    if (!acc[amenity.category]) {
      acc[amenity.category] = [];
    }
    acc[amenity.category].push(amenity);
    return acc;
  }, {} as Record<string, Amenity[]>);

  // Sort categories and amenities within categories
  const sortedCategories = CATEGORY_ORDER.filter(cat => amenitiesByCategory[cat]);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Nearest Important Amenities */}
      {nearestAmenities.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-300 uppercase tracking-wider mb-3">
            Nearest Key Amenities
          </h4>
          <div className="grid grid-cols-1 gap-2">
            {nearestAmenities.slice(0, 5).map((amenity, index) => (
              <div key={index} className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="text-gray-400 text-sm">•</span>
                  <span className="text-sm text-white truncate">{amenity.name}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400 ml-2">
                  <span>{Math.round(amenity.distance)}m</span>
                  <span>•</span>
                  <span>{amenity.walkingTime}min</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full Category Breakdown */}
      <div>
        <h4 className="text-sm font-medium text-gray-300 uppercase tracking-wider mb-3">
          All Nearby Amenities
        </h4>

        <div className="space-y-3">
          {sortedCategories.map(category => {
            const categoryAmenities = amenitiesByCategory[category];
            const categoryIcon = getCategoryIcon(category as any);

            return (
              <div key={category} className="bg-gray-800 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{categoryIcon}</span>
                  <span className="text-sm font-medium text-white">
                    {getCategoryDisplayName(category as any)}
                  </span>
                  <span className="text-xs text-gray-400 bg-gray-700 px-2 py-0.5 rounded-full ml-auto">
                    {categoryAmenities.length}
                  </span>
                </div>

                <div className="space-y-1">
                  {categoryAmenities.slice(0, 8).map((amenity, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="text-gray-300 truncate flex-1 mr-2">{amenity.name}</span>
                      <div className="flex items-center gap-2 text-xs text-gray-400">
                        <span>{Math.round(amenity.distance)}m</span>
                        <span>•</span>
                        <span>{amenity.walkingTime}min</span>
                      </div>
                    </div>
                  ))}

                  {categoryAmenities.length > 8 && (
                    <div className="text-xs text-gray-500 mt-2">
                      +{categoryAmenities.length - 8} more...
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
