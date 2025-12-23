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

  // Debug logging
  useEffect(() => {
    console.log('[GA Debug] Component mounted');
    console.log('[GA Debug] Environment:', {
      hostname: typeof window !== 'undefined' ? window.location.hostname : 'undefined',
      isProduction,
      measurementId: measurementId ? 'set' : 'not set',
      nodeVersion: process.versions?.node
    });
  }, []);

  if (!isProduction) {
    console.log('[GA Debug] Not loading GA - not in production');
    return null;
  }

  useEffect(() => {
    // Check if user has consented to cookies
    const consent = localStorage.getItem('cookie-consent');
    console.log('[GA Debug] Initial cookie consent:', consent);
    if (consent === 'accepted') {
      console.log('[GA Debug] Setting hasConsent to true');
      setHasConsent(true);
    }

    // Listen for consent changes
    const handleConsentChange = () => {
      const newConsent = localStorage.getItem('cookie-consent');
      console.log('[GA Debug] Cookie consent changed:', newConsent);
      setHasConsent(newConsent === 'accepted');
    };

    window.addEventListener('cookie-consent-changed', handleConsentChange);
    return () => {
      window.removeEventListener('cookie-consent-changed', handleConsentChange);
    };
  }, []);

  if (!measurementId || !hasConsent) {
    console.log('[GA Debug] Not loading GA script:', { measurementId: !!measurementId, hasConsent });
    return null;
  }

  console.log('[GA Debug] Loading GA script with measurement ID:', measurementId);

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        onLoad={() => {
          console.log('[GA Debug] GA script loaded successfully');
        }}
        onError={() => {
          console.error('[GA Debug] Failed to load GA script');
        }}
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
            console.log('[GA Debug] GA initialized with measurement ID:', '${measurementId}');
          `,
        }}
      />
    </>
  );
}

