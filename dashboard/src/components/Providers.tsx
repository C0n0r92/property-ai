'use client';

import { Suspense } from 'react';
import GoogleAnalytics from './GoogleAnalytics';
import CookieConsent from './CookieConsent';
import PostHogProvider, { PostHogPageview } from './PostHogProvider';
import { AuthProvider } from './auth/AuthProvider';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <PostHogProvider>
        {children}
        <Suspense fallback={null}>
          <PostHogPageview />
        </Suspense>
        <GoogleAnalytics />
        <CookieConsent />
      </PostHogProvider>
    </AuthProvider>
  );
}

