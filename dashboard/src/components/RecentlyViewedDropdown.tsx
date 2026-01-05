'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatFullPrice } from '@/lib/format';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { Building2, Clock } from 'lucide-react';

export function RecentlyViewedDropdown() {
  const { recentlyViewed, clearRecentlyViewed } = useRecentlyViewed();
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  console.log('RecentlyViewedDropdown render, items:', recentlyViewed.length, recentlyViewed.map(item => item.address));

  const hasItems = recentlyViewed.length > 0;

  const getPropertyTypeColor = (type: string) => {
    switch (type) {
      case 'sold': return 'text-blue-400';
      case 'listing': return 'text-rose-400';
      case 'rental': return 'text-purple-400';
      default: return 'text-gray-400';
    }
  };

  const getPropertyTypeLabel = (type: string) => {
    switch (type) {
      case 'sold': return 'Sold';
      case 'listing': return 'For Sale';
      case 'rental': return 'For Rent';
      default: return type;
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diffMs = now - timestamp;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays}d ago`;
    } else if (diffHours > 0) {
      return `${diffHours}h ago`;
    } else {
      return 'Just now';
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1 px-4 py-2 rounded-lg hover:text-[var(--foreground)] hover:bg-[var(--surface)] transition-colors font-medium ${
          hasItems
            ? 'text-[var(--foreground-secondary)]'
            : 'text-[var(--foreground-secondary)] opacity-60'
        }`}
        title={hasItems ? `Recently viewed (${recentlyViewed.length} properties)` : 'No recently viewed properties - view some properties to see them here'}
      >
        <Clock className="w-4 h-4" />
        Recent
        {hasItems && (
          <span className="ml-1 bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full">
            {recentlyViewed.length}
          </span>
        )}
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute top-full mt-1 w-80 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 max-h-96 overflow-y-auto">
            <div className="px-4 py-2 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900">Recently Viewed</h3>
                {hasItems && (
                  <button
                    onClick={clearRecentlyViewed}
                    className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Clear all
                  </button>
                )}
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {hasItems ? (
                recentlyViewed.map((item, index) => (
                  <button
                    key={`${item.address}-${item.propertyType}-${index}`}
                    onClick={() => {
                      console.log('🖱️ Clicking recently viewed property:', item.address);
                      setIsOpen(false);

                      // Just search for this address - same as typing it in the search box
                      // This will trigger the search functionality and fly to the location
                      // If we have coordinates, use them directly, otherwise search
                      if (item.latitude && item.longitude) {
                        router.push(`/map?lat=${item.latitude}&lng=${item.longitude}&address=${encodeURIComponent(item.address)}`);
                      } else {
                        router.push(`/map?search=${item.address}`);
                      }
                    }}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 w-full text-left"
                  >
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-5 h-5 text-gray-600" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">
                        {item.address}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span className={getPropertyTypeColor(item.propertyType)}>
                          {getPropertyTypeLabel(item.propertyType)}
                        </span>
                        <span>•</span>
                        <span>{formatFullPrice(item.price)}</span>
                      </div>
                    </div>

                    <div className="text-xs text-gray-400 flex-shrink-0">
                      {formatTimeAgo(item.viewedAt)}
                    </div>
                  </button>
                ))
              ) : (
                <div className="px-4 py-8 text-center text-gray-500">
                  <Clock className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <div className="text-sm font-medium mb-1">No recently viewed properties</div>
                  <div className="text-xs">Properties you view will appear here</div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
