import React from 'react';
import { formatDistance, getDistanceContext } from '@/lib/distance-calculator';
import { formatFullPrice } from '@/lib/format';

interface DistanceDisplayProps {
  latitude: number;
  longitude: number;
  className?: string;
}

export function DistanceDisplay({ latitude, longitude, className = '' }: DistanceDisplayProps) {
  const context = getDistanceContext(latitude, longitude);

  return (
    <div className={`${className}`}>
      <div className="flex items-center gap-2 text-sm text-gray-300">
        <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span>{formatDistance(context.distanceMeters)} from Dublin City Centre</span>
      </div>
    </div>
  );
}
