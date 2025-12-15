'use client';

import { SessionProvider } from 'next-auth/react';
import GoogleAnalytics from './GoogleAnalytics';
import CookieConsent from './CookieConsent';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <GoogleAnalytics />
      <CookieConsent />
    </SessionProvider>
  );
}

