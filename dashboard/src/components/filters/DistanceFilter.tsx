import React from 'react';
import { DistanceBand, PRICE_EXPECTATIONS } from '@/lib/distance-calculator';
import { formatFullPrice } from '@/lib/format';

interface DistanceFilterProps {
  selectedBands: string[];
  onBandChange: (bands: string[]) => void;
  showPriceTrends?: boolean;
  className?: string;
}

const DISTANCE_BANDS: Array<{
  band: DistanceBand;
  range: string;
  description: string;
  price: number;
}> = [
  {
    band: 'City Centre',
    range: '0-2km',
    description: 'Premium Location',
    price: PRICE_EXPECTATIONS['City Centre'].median
  },
  {
    band: 'Inner Suburbs',
    range: '2-5km',
    description: 'Excellent Access',
    price: PRICE_EXPECTATIONS['Inner Suburbs'].median
  },
  {
    band: 'Established Areas',
    range: '5-10km',
    description: 'Good Balance',
    price: PRICE_EXPECTATIONS['Established Areas'].median
  },
  {
    band: 'Outer Suburbs',
    range: '10-15km',
    description: 'Affordable',
    price: PRICE_EXPECTATIONS['Outer Suburbs'].median
  },
  {
    band: 'Further Areas',
    range: '15-25km',
    description: 'Value',
    price: PRICE_EXPECTATIONS['Further Areas'].median
  }
];

export function DistanceFilter({
  selectedBands,
  onBandChange,
  showPriceTrends = true,
  className = ''
}: DistanceFilterProps) {

  const handleBandToggle = (band: DistanceBand) => {
    if (selectedBands.includes(band)) {
      onBandChange(selectedBands.filter(b => b !== band));
    } else {
      onBandChange([...selectedBands, band]);
    }
  };

  const handleBandSelect = (band: DistanceBand) => {
    onBandChange([band]);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div>
        <label className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-3 block">
          🎯 Distance from City Centre
        </label>

        <div className="space-y-2">
          {DISTANCE_BANDS.map(({ band, range, description, price }) => {
            const isSelected = selectedBands.includes(band);

            return (
              <div
                key={band}
                className={`border rounded-lg p-3 transition-all touch-manipulation ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleBandToggle(band);
                      }}
                      className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {band}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {range} • {description}
                      </div>
                    </div>
                  </div>

                  {showPriceTrends && (
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">
                        {formatFullPrice(price)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        median
                      </div>
                    </div>
                  )}
                </div>

                {/* Progress indicator for selected state */}
                {isSelected && (
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                      <div className="bg-blue-600 h-1 rounded-full transition-all duration-300" style={{ width: '100%' }} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Price Trends Summary */}
      {showPriceTrends && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
            Price Trends by Distance
          </h4>

          <div className="space-y-2">
            {DISTANCE_BANDS.map(({ band, price }, index) => {
              const percentage = ((price - DISTANCE_BANDS[DISTANCE_BANDS.length - 1].price) /
                                 (DISTANCE_BANDS[0].price - DISTANCE_BANDS[DISTANCE_BANDS.length - 1].price)) * 100;

              return (
                <div key={band} className="flex items-center gap-3">
                  <div className="w-16 text-xs text-gray-500 dark:text-gray-400 text-right">
                    {band.split(' ')[0]}
                  </div>
                  <div className="flex-1">
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-green-500 to-red-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(percentage, 10)}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-20 text-xs font-mono text-gray-600 dark:text-gray-300 text-right">
                    {formatFullPrice(price)}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Prices generally decrease with distance from city centre, though quality of location and amenities can significantly impact values.
            </p>
          </div>
        </div>
      )}

      {/* Clear Selection */}
      {selectedBands.length > 0 && (
        <button
          onClick={() => onBandChange([])}
          className="w-full px-3 py-2 text-sm text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded transition-colors"
        >
          Clear Distance Filters
        </button>
      )}
    </div>
  );
}
