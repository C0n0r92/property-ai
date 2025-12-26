import React from 'react';
import { getWalkabilityColorScheme, getAmenityStyle, COMPONENT_STYLES, ANIMATIONS } from '@/lib/design-system';

interface WalkabilityScoreProps {
  score: number;
  rating: 'Excellent' | 'Very Good' | 'Good' | 'Fair' | 'Low';
  breakdown: {
    transport: number;
    education: number;
    healthcare: number;
    shopping: number;
    leisure: number;
  };
  className?: string;
}

const CATEGORY_LABELS = {
  transport: 'Transport',
  education: 'Education',
  healthcare: 'Healthcare',
  shopping: 'Shopping',
  leisure: 'Leisure'
};

export function WalkabilityScore({
  score,
  rating,
  breakdown,
  className = ''
}: WalkabilityScoreProps) {
  const colors = getWalkabilityColorScheme(rating.toLowerCase().replace(' ', '-') as keyof typeof getWalkabilityColorScheme);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main Score Display */}
      <div className={`${colors.bg} ${colors.border} border rounded-xl p-4`}>
        <div className="text-center">
          <div className={`text-4xl font-bold ${colors.text} font-mono mb-1`}>
            {score}/10
          </div>
          <div className={`text-lg font-semibold ${colors.text} uppercase tracking-wide`}>
            {rating} Walkability
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-300 uppercase tracking-wider">
          Category Breakdown
        </h4>

        <div className="grid grid-cols-1 gap-2">
          {Object.entries(breakdown).map(([category, value]) => {
            const percentage = (value / 3) * 100; // Max 3 points per category
            const amenityStyle = getAmenityStyle(category as keyof typeof getAmenityStyle);
            return (
              <div key={category} className="flex items-center gap-3">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="text-lg">
                    {amenityStyle.icon}
                  </span>
                  <span className="text-sm text-gray-300 truncate">
                    {CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS]}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="flex-1 max-w-24">
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${colors.bar}`}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Score */}
                <div className="text-sm font-mono text-gray-400 min-w-[2rem] text-right">
                  {value}/3
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
