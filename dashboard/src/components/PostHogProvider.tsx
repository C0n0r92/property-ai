'use client';

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

const POSTHOG_KEY = 'phc_nLfA33WKEloZwBPM7QvjW4EiioDbjpvYnM7sCSYB4Zp';
const POSTHOG_HOST = 'https://eu.i.posthog.com';

export function PostHogPageview() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Only track pageviews in production
  const isProduction = typeof window !== 'undefined' &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1';

  useEffect(() => {
    if (pathname && posthog && isProduction) {
      let url = window.origin + pathname;
      if (searchParams && searchParams.toString()) {
        url = url + '?' + searchParams.toString();
      }
      posthog.capture('$pageview', { $current_url: url });
    }
  }, [pathname, searchParams, isProduction]);

  return null;
}

export default function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Only initialize PostHog in production
    const isProduction = typeof window !== 'undefined' &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1';

    if (isProduction) {
      posthog.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        person_profiles: 'identified_only',
        capture_pageview: false, // We capture manually for better SPA tracking
        capture_pageleave: true,
        autocapture: true,
        persistence: 'localStorage+cookie',
      });
    }
  }, []);

  return (
    <PHProvider client={posthog}>
      {children}
    </PHProvider>
  );
}

