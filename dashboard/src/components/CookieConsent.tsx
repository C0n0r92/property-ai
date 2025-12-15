'use client';

import { useState, useEffect } from 'react';
import { analytics } from '@/lib/analytics';

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if user has already made a choice
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      setShowBanner(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookie-consent', 'accepted');
    setShowBanner(false);
    // Dispatch event to notify GoogleAnalytics component
    window.dispatchEvent(new Event('cookie-consent-changed'));
    // Track after GA loads
    setTimeout(() => analytics.cookieConsentAccepted(), 100);
  };

  const handleReject = () => {
    localStorage.setItem('cookie-consent', 'rejected');
    setShowBanner(false);
    window.dispatchEvent(new Event('cookie-consent-changed'));
    analytics.cookieConsentRejected();
  };

  if (!showBanner) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-[#0D1117] border-t border-gray-800 shadow-2xl">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-white font-semibold mb-1">Cookie Consent</h3>
          <p className="text-gray-400 text-sm">
            We use cookies to analyze site usage and improve your experience. By clicking &quot;Accept&quot;, you consent to our use of cookies.
            <a href="/privacy" className="text-emerald-400 hover:text-emerald-300 ml-1 underline">
              Learn more
            </a>
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleReject}
            className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
          >
            Reject
          </button>
          <button
            onClick={handleAccept}
            className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-emerald-500 to-cyan-500 text-white rounded-lg hover:from-emerald-400 hover:to-cyan-400 transition-all"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}

