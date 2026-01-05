'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatFullPrice } from '@/lib/format';
import { useRecentlyViewed } from '@/hooks/useRecentlyViewed';
import { Building2, Clock, X, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface RecentlyViewedMobileProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RecentlyViewedMobile({ isOpen, onClose }: RecentlyViewedMobileProps) {
  const { recentlyViewed, clearRecentlyViewed } = useRecentlyViewed();
  const router = useRouter();


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

  const getPropertyTypeColor = (type: string) => {
    switch (type) {
      case 'sold': return 'bg-blue-100 text-blue-700';
      case 'listing': return 'bg-rose-100 text-rose-700';
      case 'rental': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
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

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Slide-up panel */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl max-h-[80vh] overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-gray-600" />
                <h2 className="font-semibold text-gray-900">Recently Viewed</h2>
                {recentlyViewed.length > 0 && (
                  <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium">
                    {recentlyViewed.length}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {recentlyViewed.length > 0 && (
                  <button
                    onClick={clearRecentlyViewed}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Clear
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                >
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="overflow-y-auto max-h-[calc(80vh-60px)]">
              {recentlyViewed.length === 0 ? (
                <div className="py-12 text-center">
                  <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500 font-medium mb-2">No recently viewed properties</p>
                  <p className="text-sm text-gray-400">View some properties to see them appear here</p>
                  <p className="text-xs text-gray-300 mt-2">Your viewing history is stored locally on your device</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {recentlyViewed.map((item, index) => (
                    <button
                      key={`${item.address}-${item.propertyType}-${index}`}
                      onClick={() => {
                        onClose();
                        // Navigate to map with focus on this property
                        router.push(`/map?focus=${encodeURIComponent(item.address)}&type=${item.propertyType}`);
                      }}
                      className="flex items-center gap-3 px-4 py-4 hover:bg-gray-50 transition-colors active:bg-gray-100 w-full text-left"
                    >
                      <div className="w-12 h-12 bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-6 h-6 text-slate-500" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">
                          {item.address.split(',')[0]}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getPropertyTypeColor(item.propertyType)}`}>
                            {getPropertyTypeLabel(item.propertyType)}
                          </span>
                          <span className="text-sm font-semibold text-gray-700">
                            {formatFullPrice(item.price)}
                            {item.propertyType === 'rental' && '/mo'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-gray-400">
                          {formatTimeAgo(item.viewedAt)}
                        </span>
                        <ChevronRight className="w-4 h-4 text-gray-300" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
