'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAlertModal } from '@/contexts/AlertModalContext';
import { useAuth } from '@/components/auth/AuthProvider';
import { analytics } from '@/lib/analytics';

export function useBlogAlertTracking() {
  const { showBlogAlertModal, canShowBlogModal } = useAlertModal();
  const { user } = useAuth();
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
    console.log('🚨 Will show blog alerts modal in 3 seconds...');
    console.log('🚨 Checking canShowBlogModal for:', blogSlug);
    console.log('🚨 User authentication status:', !!user); // Add user check

    // Clear any existing timer
    clearTimer();

    // Reset tracking state
    hasTriggeredRef.current = false;

    // Start 3-second timer for blog alerts modal (reduced for testing)
    console.log('⏰ Starting 3-second countdown for blog alert modal...');
    console.log('⏰ Timer will expire in 3 seconds...');

    timerRef.current = setTimeout(() => {
      console.log('⏰ Blog reading timer EXPIRED - SHOWING BLOG ALERTS MODAL!');
      console.log('⏰ hasTriggeredRef.current:', hasTriggeredRef.current);
      console.log('⏰ canShowBlogModal result:', canShowBlogModal(blogSlug));
      console.log('⏰ User is logged in:', !!user);

      // Only show modal if user hasn't left the page or triggered already
      // TEMP: Force show for debugging logged-out user issue
      const shouldShow = !hasTriggeredRef.current && (canShowBlogModal(blogSlug) || true); // Force show for testing
      console.log('⏰ shouldShow calculation:', shouldShow, '(forced for debugging)');

      if (shouldShow) {
        console.log('📧 SHOWING BLOG ALERTS MODAL!');
        analytics.track('blog_alert_modal_shown', {
          blog_slug: blogSlug,
          reading_time_seconds: 3,
          source: 'blog_page',
          user_logged_in: !!user
        });

        // Show blog alerts modal (this will handle payment and redirect)
        const blogContext = {
          title: 'Premium Blog Alerts',
          slug: blogSlug, // Use the actual blog slug for proper dismissal tracking
          excerpt: 'Get exclusive Dublin property market insights and money-saving opportunities. Each email is AI-summarized for clarity and impact, delivered first to your inbox.'
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
    }, 3000); // 3 seconds for testing
  }, [showBlogAlertModal, canShowBlogModal, clearTimer]);

  // Stop tracking (when user navigates away or closes page)
  const stopBlogTracking = useCallback(() => {
    console.log('📖 Stopping blog alert tracking');
    clearTimer();
    if (engagementTimerRef.current) {
      clearTimeout(engagementTimerRef.current);
      engagementTimerRef.current = null;
    }
    hasTriggeredRef.current = true; // Prevent any pending timers from triggering
  }, [clearTimer]);

  // Track user interactions that indicate engagement (scrolling, clicking)
  // Use refs to prevent multiple engagement timers
  const engagementTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastEngagementTimeRef = useRef<number>(0);

  const trackEngagement = useCallback(() => {
    const now = Date.now();
    const timeSinceLastEngagement = now - lastEngagementTimeRef.current;

    // Debounce engagement tracking to prevent excessive timer resets (minimum 1 second between engagements)
    if (timeSinceLastEngagement < 1000) {
      return;
    }

    lastEngagementTimeRef.current = now;

    // Clear any existing engagement timer
    if (engagementTimerRef.current) {
      clearTimeout(engagementTimerRef.current);
      engagementTimerRef.current = null;
    }

    // Only reset the main timer if it exists and hasn't triggered yet
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
            excerpt: 'Get notified when we publish new research articles and market insights, each AI-summarized for clarity and impact.'
          };
          showBlogAlertModal(blogContext);
          hasTriggeredRef.current = true;
        }
      }, 8000);
    }
  }, [clearTimer, showBlogAlertModal]);

  // Clear timers on unmount
  useEffect(() => {
    return () => {
      clearTimer();
      if (engagementTimerRef.current) {
        clearTimeout(engagementTimerRef.current);
        engagementTimerRef.current = null;
      }
    };
  }, [clearTimer]);

  return {
    startBlogTracking,
    stopBlogTracking,
    trackEngagement,
  };
}
