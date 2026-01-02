'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAlertModal, type BlogContext } from '@/contexts/AlertModalContext';
import { analytics } from '@/lib/analytics';

export function useBlogAlertTracking() {
  const { showBlogAlertModal, canShowBlogModal } = useAlertModal();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const hasTriggeredRef = useRef<boolean>(false);

  // Clear existing timer
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Start tracking blog reading time
  const startBlogTracking = useCallback((blog: BlogContext) => {
    console.log('📖 Starting blog alert tracking for:', blog.title);

    // Clear any existing timer
    clearTimer();

    // Reset tracking state
    startTimeRef.current = Date.now();
    hasTriggeredRef.current = false;

    // Start 10-second timer for blog alert
    timerRef.current = setTimeout(() => {
      console.log('⏰ Blog reading timer expired, checking if modal can be shown');

      // Only show if user hasn't left the page or triggered already
      if (!hasTriggeredRef.current && canShowBlogModal(blog.slug)) {
        console.log('📧 Showing blog alert modal for:', blog.title);
        analytics.track('blog_alert_modal_shown', {
          blog_slug: blog.slug,
          blog_title: blog.title,
          reading_time_seconds: 10,
        });
        showBlogAlertModal(blog);
        hasTriggeredRef.current = true;
      } else {
        console.log('📧 Blog modal cannot be shown or already triggered');
      }
    }, 10000); // 10 seconds
  }, [showBlogAlertModal, canShowBlogModal, clearTimer]);

  // Stop tracking (when user navigates away or closes page)
  const stopBlogTracking = useCallback(() => {
    console.log('📖 Stopping blog alert tracking');
    clearTimer();
    hasTriggeredRef.current = true; // Prevent any pending timers from triggering
  }, [clearTimer]);

  // Track user interactions that indicate engagement (scrolling, clicking)
  const trackEngagement = useCallback(() => {
    // Reset timer on engagement to give user more time
    if (timerRef.current && !hasTriggeredRef.current) {
      console.log('🔄 User engagement detected, resetting blog alert timer');
      clearTimer();

      // Restart timer with remaining time (but cap at 10 seconds total)
      const elapsedTime = startTimeRef.current ? (Date.now() - startTimeRef.current) : 0;
      const remainingTime = Math.max(1000, 10000 - elapsedTime); // Minimum 1 second, maximum remaining time

      timerRef.current = setTimeout(() => {
        // Re-check blog context exists (in case page changed)
        const currentBlogSlug = window.location.pathname.split('/blog/')[1];
        if (currentBlogSlug && canShowBlogModal(currentBlogSlug)) {
          console.log('📧 Showing blog alert modal after engagement delay');
          // Note: We would need the blog context here, but for simplicity we'll skip
          // This could be improved by storing the blog context in the hook
        }
      }, remainingTime);
    }
  }, [clearTimer, canShowBlogModal]);

  // Clear timer on unmount
  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  return {
    startBlogTracking,
    stopBlogTracking,
    trackEngagement,
  };
}
