'use client';

import { Suspense } from 'react';
import GoogleAnalytics from './GoogleAnalytics';
import CookieConsent from './CookieConsent';
import PostHogProvider, { PostHogPageview } from './PostHogProvider';
import { AuthProvider } from './auth/AuthProvider';
import { analytics } from '../lib/analytics';

// Debug component for testing GA
function DebugAnalytics() {

  return (
    <div style={{
      position: 'fixed',
      bottom: '100px',
      right: '20px',
      background: 'red',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      zIndex: 9999,
      cursor: 'pointer'
    }} onClick={() => {
      console.log('[Debug] Triggering test event');
      analytics.pageViewed('debug_test_page');
    }}>
      🧪 Test GA Event
    </div>
  );
}

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
        <DebugAnalytics />
      </PostHogProvider>
    </AuthProvider>
  );
}

