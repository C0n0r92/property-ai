'use client';

import Script from 'next/script';
import { useEffect, useState } from 'react';

export default function GoogleAnalytics() {
  const [hasConsent, setHasConsent] = useState(false);
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  // Only track analytics in production
  const isProduction = typeof window !== 'undefined' &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1';

  // Debug functions for troubleshooting
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).debugGA = () => {
        console.log('GA Status:', {
          gtag: !!(window as any).gtag,
          dataLayer: !!(window as any).dataLayer,
          consent: localStorage.getItem('cookie-consent'),
          measurementId: measurementId ? 'configured' : 'missing'
        });
        return 'GA debug info logged to console';
      };

      (window as any).testGAEvent = () => {
        if ((window as any).gtag) {
          console.log('Sending test event to GA...');
          (window as any).gtag('event', 'debug_test', {
            event_category: 'debug',
            event_label: 'manual_test'
          });
          return 'Test event sent - check GA realtime dashboard';
        } else {
          return 'GA not loaded - check debugGA() for status';
        }
      };
    }
  }, []);

  if (!isProduction) {
    console.log('[GA Debug] Not loading GA - not in production');
    return null;
  }

  useEffect(() => {
    // Check if user has consented to cookies
    const consent = localStorage.getItem('cookie-consent');
    if (consent === 'accepted') {
      setHasConsent(true);
    }

    // Listen for consent changes
    const handleConsentChange = () => {
      const newConsent = localStorage.getItem('cookie-consent');
      setHasConsent(newConsent === 'accepted');
    };

    window.addEventListener('cookie-consent-changed', handleConsentChange);
    return () => {
      window.removeEventListener('cookie-consent-changed', handleConsentChange);
    };
  }, []);

  if (!measurementId || !hasConsent) {
    return null;
  }

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${measurementId}', {
              page_path: window.location.pathname,
            });
          `,
        }}
      />
    </>
  );
}

