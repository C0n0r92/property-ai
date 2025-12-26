import React, { useState } from 'react';

interface WalkabilityLegendProps {
  className?: string;
}

const WALKABILITY_GUIDE = [
  {
    range: '9-10',
    rating: 'Excellent',
    description: 'World-class urban amenities within walking distance',
    color: 'bg-emerald-500'
  },
  {
    range: '7-8',
    rating: 'Very Good',
    description: 'Excellent access to daily needs and services',
    color: 'bg-blue-500'
  },
  {
    range: '5-6',
    rating: 'Good',
    description: 'Good amenities available within reasonable distance',
    color: 'bg-amber-500'
  },
  {
    range: '3-4',
    rating: 'Fair',
    description: 'Basic amenities available, some gaps in coverage',
    color: 'bg-orange-500'
  },
  {
    range: '0-2',
    rating: 'Low',
    description: 'Limited local amenities, car-dependent location',
    color: 'bg-red-500'
  }
];

export function WalkabilityLegend({ className = '' }: WalkabilityLegendProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={`bg-gray-800 rounded-lg border border-gray-700 overflow-hidden ${className}`}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-750 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">📖</span>
          <span className="text-sm font-medium text-white">Walkability Guide</span>
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-700">
          <div className="space-y-3 mt-3">
            {WALKABILITY_GUIDE.map((item, index) => (
              <div key={index} className="flex items-start gap-3">
                {/* Color indicator */}
                <div className={`w-4 h-4 rounded-full ${item.color} mt-0.5 flex-shrink-0`} />

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-mono font-medium text-white">
                      {item.range}
                    </span>
                    <span className="text-sm font-medium text-gray-300">
                      {item.rating}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Footer note */}
          <div className="mt-4 pt-3 border-t border-gray-700">
            <p className="text-xs text-gray-500 leading-relaxed">
              <strong>How it's calculated:</strong> Each amenity category (transport, education, healthcare, shopping, leisure) can score up to 3 points based on proximity and density. The total score determines the overall walkability rating.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
