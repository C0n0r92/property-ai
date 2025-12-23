'use client';

import { useEffect } from 'react';
import { analytics } from '@/lib/analytics';

interface BlogViewTrackerProps {
  articleSlug: string;
}

export function BlogViewTracker({ articleSlug }: BlogViewTrackerProps) {
  useEffect(() => {
    analytics.blogArticleViewed(articleSlug);
  }, [articleSlug]);

  return null; // This component doesn't render anything
}
