'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAlertModal, type LocationContext } from '@/contexts/AlertModalContext';
import { analytics } from '@/lib/analytics';

interface LocationAlertEvent {
  location: LocationContext;
  pageType: 'planning' | 'amenities';
  timestamp: number;
}

export function useLocationAlertTracking() {
  const { showAlertModal, canShowModal } = useAlertModal();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastEventRef = useRef<LocationAlertEvent | null>(null);
  const hasTriggeredRef = useRef<boolean>(false);

  // Clear existing timer
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Start tracking location page engagement
  const startLocationTracking = useCallback((location: LocationContext, pageType: 'planning' | 'amenities') => {
    console.log(`🏠 startLocationTracking called for ${pageType} with location:`, location);

    // Clear any existing timer
    clearTimer();

    // Reset tracking state
    hasTriggeredRef.current = false;

    // Store the event
    lastEventRef.current = {
      location,
      pageType,
      timestamp: Date.now(),
    };

    // Check if modal can be shown immediately
    const canShow = canShowModal(location);
    console.log(`🏠 canShowModal check result:`, canShow);

    // TEMPORARY: Force show modal for testing (remove this in production)
    const forceShowForTesting = true; // Set to false to disable

    if (!canShow && !forceShowForTesting) {
      console.log(`🏠 Modal cannot be shown for ${pageType}, not starting timer`);
      return;
    }

    if (!canShow && forceShowForTesting) {
      console.log(`🏠 Modal would normally be blocked, but forcing for testing`);
    }

    console.log(`⏰ Starting 8-second timer for ${pageType} page alert`);

    // Start 8-second timer for location alert (slightly faster than search alerts)
    timerRef.current = setTimeout(() => {
      console.log(`⏰ ${pageType} page timer expired, checking if modal can be shown`);
      console.log(`⏰ hasTriggeredRef.current:`, hasTriggeredRef.current);
      console.log(`⏰ lastEventRef.current:`, lastEventRef.current);

      // Double-check modal can still be shown
      if (lastEventRef.current && !hasTriggeredRef.current) {
        const canShow = canShowModal(lastEventRef.current.location);
        console.log(`⏰ canShowModal result:`, canShow);

        if (canShow) {
          console.log(`📧 Showing ${pageType} alert modal for:`, lastEventRef.current.location.name);
          analytics.track('location_alert_modal_shown', {
            location: lastEventRef.current.location.name,
            page_type: pageType,
            source: 'property_page',
          });
          showAlertModal(lastEventRef.current.location);
          hasTriggeredRef.current = true;
        } else {
          console.log(`📧 ${pageType} modal cannot be shown - canShowModal returned false`);
        }
      } else {
        console.log(`📧 ${pageType} modal cannot be shown - no event data or already triggered`);
      }
    }, 3000); // 3 seconds for testing (normally 8000) - slightly faster than search alerts
  }, [showAlertModal, canShowModal, clearTimer]);

  // Stop tracking (when user navigates away)
  const stopLocationTracking = useCallback(() => {
    console.log('🏠 Stopping location alert tracking');
    clearTimer();
    hasTriggeredRef.current = true; // Prevent any pending timers from triggering
  }, [clearTimer]);

  // Track user interactions that indicate engagement
  const trackEngagement = useCallback(() => {
    // Reset timer on engagement to give user more time
    if (timerRef.current && !hasTriggeredRef.current) {
      console.log('🔄 User engagement detected on location page, resetting alert timer');
      clearTimer();

      // Restart timer with remaining time
      const elapsedTime = lastEventRef.current ? (Date.now() - lastEventRef.current.timestamp) : 0;
      const remainingTime = Math.max(2000, 8000 - elapsedTime); // Minimum 2 seconds, maximum remaining time

      timerRef.current = setTimeout(() => {
        // Re-check location context exists
        if (lastEventRef.current && canShowModal(lastEventRef.current.location)) {
          console.log('📧 Showing location alert modal after engagement delay');
          showAlertModal(lastEventRef.current.location);
        }
      }, remainingTime);
    }
  }, [clearTimer, canShowModal, showAlertModal]);

  // Clear timer on unmount
  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  return {
    startLocationTracking,
    stopLocationTracking,
    trackEngagement,
  };
}
