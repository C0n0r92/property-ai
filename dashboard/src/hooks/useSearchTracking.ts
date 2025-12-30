'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAlertModal, type LocationContext } from '@/contexts/AlertModalContext';
import { analytics } from '@/lib/analytics';

interface SearchEvent {
  location: LocationContext;
  timestamp: number;
  source: 'homepage' | 'map' | 'areas';
}

export function useSearchTracking() {
  const { showAlertModal, canShowModal } = useAlertModal();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSearchRef = useRef<SearchEvent | null>(null);

  // Clear existing timer
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Start the 4-second timer for modal
  const startModalTimer = useCallback((searchEvent: SearchEvent) => {
    console.log('startModalTimer called with searchEvent:', searchEvent);
    clearTimer(); // Clear any existing timer

    // Only start timer if modal can be shown
    const canShow = canShowModal(searchEvent.location);
    console.log('canShowModal result:', canShow);
    if (!canShow) {
      console.log('Cannot show modal, returning early');
      return;
    }

    // Store the search event
    lastSearchRef.current = searchEvent;

    console.log('Starting 4-second timer for location:', searchEvent.location.name);

    // Start 7-second timer
    timerRef.current = setTimeout(() => {
      console.log('Timer expired, checking if modal can still be shown');
      // Double-check modal can still be shown (user might have dismissed it)
      if (canShowModal(searchEvent.location)) {
        console.log('Showing modal for location:', searchEvent.location.name);
        analytics.track('alert_modal_shown', {
          location: searchEvent.location.name,
          source: searchEvent.source,
        });
        showAlertModal(searchEvent.location);
      } else {
        console.log('Modal cannot be shown anymore');
      }
    }, 4000); // 4 seconds for testing
  }, [showAlertModal, canShowModal, clearTimer]);

  // Track search on homepage
  const trackHomepageSearch = useCallback((location: LocationContext) => {
    console.log('trackHomepageSearch called with location:', location);
    analytics.track('search_performed', {
      location: location.name,
      source: 'homepage',
    });

    startModalTimer({
      location,
      timestamp: Date.now(),
      source: 'homepage',
    });
  }, [startModalTimer]);

  // Track search on map page
  const trackMapSearch = useCallback((location: LocationContext) => {
    analytics.track('search_performed', {
      location: location.name,
      source: 'map',
    });

    startModalTimer({
      location,
      timestamp: Date.now(),
      source: 'map',
    });
  }, [startModalTimer]);

  // Track search on areas page
  const trackAreasSearch = useCallback((location: LocationContext) => {
    analytics.track('search_performed', {
      location: location.name,
      source: 'areas',
    });

    startModalTimer({
      location,
      timestamp: Date.now(),
      source: 'areas',
    });
  }, [startModalTimer]);

  // Clear timer on unmount
  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  return {
    trackHomepageSearch,
    trackMapSearch,
    trackAreasSearch,
    clearTimer,
  };
}
