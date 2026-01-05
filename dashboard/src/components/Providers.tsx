'use client';

import { Suspense } from 'react';
import GoogleAnalytics from './GoogleAnalytics';
import CookieConsent from './CookieConsent';
import PostHogProvider, { PostHogPageview } from './PostHogProvider';
import { AuthProvider } from './auth/AuthProvider';
import { ComparisonProvider } from '@/contexts/ComparisonContext';
import { AlertModalProvider } from '@/contexts/AlertModalContext';
import { UIProvider } from '@/contexts/UIContext';
import { RecentlyViewedProvider } from '@/hooks/useRecentlyViewed';
import { LocationAlertModal } from '@/components/alerts/LocationAlertModal';
import { BlogAlertModal } from '@/components/alerts/BlogAlertModal';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <PostHogProvider>
        <ComparisonProvider>
          <UIProvider>
            <AlertModalProvider>
              <RecentlyViewedProvider>
                {children}
                <Suspense fallback={null}>
                  <PostHogPageview />
                </Suspense>
                <GoogleAnalytics />
                <CookieConsent />
                <LocationAlertModal />
                <BlogAlertModal />
              </RecentlyViewedProvider>
            </AlertModalProvider>
          </UIProvider>
        </ComparisonProvider>
      </PostHogProvider>
    </AuthProvider>
  );
}

