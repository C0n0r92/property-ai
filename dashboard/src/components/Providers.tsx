'use client';

import { SessionProvider } from 'next-auth/react';
import { Suspense } from 'react';
import GoogleAnalytics from './GoogleAnalytics';
import CookieConsent from './CookieConsent';
import PostHogProvider, { PostHogPageview } from './PostHogProvider';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <PostHogProvider>
        {children}
        <Suspense fallback={null}>
          <PostHogPageview />
        </Suspense>
        <GoogleAnalytics />
        <CookieConsent />
      </PostHogProvider>
    </SessionProvider>
  );
}

