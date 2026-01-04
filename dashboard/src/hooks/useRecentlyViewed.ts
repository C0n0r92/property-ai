import { useState, useEffect, useCallback } from 'react';

interface RecentlyViewedItem {
  address: string;
  propertyType: 'sold' | 'listing' | 'rental';
  price: number;
  thumbnail?: string;
  viewedAt: number;
}

const STORAGE_KEY = 'recently-viewed-properties';
const MAX_ITEMS = 20;
const EXPIRY_DAYS = 30;

export function useRecentlyViewed() {
  const [recentlyViewed, setRecentlyViewed] = useState<RecentlyViewedItem[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const items: RecentlyViewedItem[] = JSON.parse(stored);

        // Filter out expired items (older than 30 days)
        const now = Date.now();
        const expiryTime = EXPIRY_DAYS * 24 * 60 * 60 * 1000;
        const validItems = items.filter(item => (now - item.viewedAt) < expiryTime);

        // Limit to max items
        const limitedItems = validItems.slice(0, MAX_ITEMS);

        setRecentlyViewed(limitedItems);

        // Save back to localStorage if we filtered anything
        if (limitedItems.length !== items.length) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(limitedItems));
        }
      }
    } catch (error) {
      console.error('Failed to load recently viewed items:', error);
    }
  }, []);

  // Add a property to recently viewed
  const addRecentlyViewed = useCallback((item: Omit<RecentlyViewedItem, 'viewedAt'>) => {
    const newItem: RecentlyViewedItem = {
      ...item,
      viewedAt: Date.now(),
    };

    setRecentlyViewed(prev => {
      // Remove if already exists
      const filtered = prev.filter(existing =>
        !(existing.address === newItem.address && existing.propertyType === newItem.propertyType)
      );

      // Add to beginning
      const updated = [newItem, ...filtered].slice(0, MAX_ITEMS);

      // Save to localStorage
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (error) {
        console.error('Failed to save recently viewed items:', error);
      }

      return updated;
    });
  }, []);

  // Clear all recently viewed items
  const clearRecentlyViewed = useCallback(() => {
    setRecentlyViewed([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear recently viewed items:', error);
    }
  }, []);

  return {
    recentlyViewed,
    addRecentlyViewed,
    clearRecentlyViewed,
  };
}
