'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAlertModal } from '@/contexts/AlertModalContext';
import { analytics } from '@/lib/analytics';

export function useBlogAlertTracking() {
  const { showBlogAlertModal, canShowBlogModal } = useAlertModal();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const hasTriggeredRef = useRef<boolean>(false);

  // Clear existing timer
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Start tracking blog reading time
  const startBlogTracking = useCallback((blogSlug: string) => {
    console.log('🚨 BLOG ALERT TRACKING STARTED for blog:', blogSlug);
    console.log('🚨 Will show blog alerts modal in 8 seconds...');
    console.log('🚨 Checking canShowBlogModal for:', blogSlug);

    // Clear any existing timer
    clearTimer();

    // Reset tracking state
    hasTriggeredRef.current = false;

    // Start 8-second timer for blog alerts modal
    console.log('⏰ Starting 8-second countdown for blog alert modal...');
    console.log('⏰ Timer will expire in 8 seconds...');

    timerRef.current = setTimeout(() => {
      console.log('⏰ Blog reading timer EXPIRED - SHOWING BLOG ALERTS MODAL!');
      console.log('⏰ hasTriggeredRef.current:', hasTriggeredRef.current);
      console.log('⏰ canShowBlogModal result:', canShowBlogModal(blogSlug));

      // Only show modal if user hasn't left the page or triggered already
      if (!hasTriggeredRef.current && canShowBlogModal(blogSlug)) {
        console.log('📧 SHOWING BLOG ALERTS MODAL!');
        analytics.track('blog_alert_modal_shown', {
          blog_slug: blogSlug,
          reading_time_seconds: 8,
          source: 'blog_page'
        });

        // Show blog alerts modal (this will handle payment and redirect)
        const blogContext = {
          title: 'Premium Blog Alerts',
          slug: blogSlug, // Use the actual blog slug for proper dismissal tracking
          excerpt: 'Get exclusive Dublin property market insights and money-saving opportunities delivered first to your inbox.'
        };
        console.log('📧 Calling showBlogAlertModal with context:', blogContext);
        showBlogAlertModal(blogContext);
        hasTriggeredRef.current = true;
      } else {
        console.log('📧 Blog alert modal cannot be shown (already triggered or blocked)');
        if (hasTriggeredRef.current) {
          console.log('📧 Reason: hasTriggeredRef.current is true');
        }
        if (!canShowBlogModal(blogSlug)) {
          console.log('📧 Reason: canShowBlogModal returned false');
        }
      }
    }, 8000); // 8 seconds
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

      // Restart timer with 8 seconds
      timerRef.current = setTimeout(() => {
        if (!hasTriggeredRef.current) {
          console.log('📧 Showing blog alerts modal after engagement delay');
          // Show the modal again after engagement delay
          const blogContext = {
            title: 'Blog Alerts',
            slug: 'blog-alerts-general',
            excerpt: 'Get notified when we publish new research articles and market insights.'
          };
          showBlogAlertModal(blogContext);
          hasTriggeredRef.current = true;
        }
      }, 8000);
    }
  }, [clearTimer, showBlogAlertModal]);

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
