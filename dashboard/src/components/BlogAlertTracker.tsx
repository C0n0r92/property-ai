'use client';

import { useEffect } from 'react';
import { useBlogAlertTracking } from '@/hooks/useBlogAlertTracking';

interface BlogAlertTrackerProps {
  slug: string;
}

export function BlogAlertTracker({ slug }: BlogAlertTrackerProps) {
  const { startBlogTracking, stopBlogTracking, trackEngagement } = useBlogAlertTracking();

  // Start blog alert tracking when component mounts
  useEffect(() => {
    console.log('🚀 BlogAlertTracker useEffect triggered, starting blog alert tracking for slug:', slug);
    startBlogTracking(slug);

    // Track user engagement events
    const handleScroll = () => trackEngagement();
    const handleClick = () => trackEngagement();

    // Add event listeners
    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('click', handleClick);

    // Cleanup on unmount
    return () => {
      stopBlogTracking();
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('click', handleClick);
    };
  }, [slug, startBlogTracking, stopBlogTracking, trackEngagement]);

  return null; // This component doesn't render anything
}
