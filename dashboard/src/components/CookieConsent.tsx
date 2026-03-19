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
    <div className="fixed bottom-4 left-4 z-50 max-w-[360px] bg-white border border-gray-200 rounded-2xl shadow-2xl p-4">
      <div className="flex flex-col gap-3">
        <div>
          <h3 className="text-gray-900 font-semibold text-sm mb-1">Cookie Consent</h3>
          <p className="text-gray-600 text-xs leading-relaxed">
            We use cookies to analyze site usage. By clicking &quot;Accept&quot;, you consent to our use of cookies.{' '}
            <a href="/privacy" className="text-indigo-600 hover:text-indigo-700 font-medium underline">
              Learn more
            </a>
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleReject}
            className="flex-1 px-3 py-2 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Reject
          </button>
          <button
            onClick={handleAccept}
            className="flex-1 px-3 py-2 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}

