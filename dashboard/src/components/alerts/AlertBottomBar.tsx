'use client';

import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useAlertModal } from '@/contexts/AlertModalContext';
import { analytics } from '@/lib/analytics';

interface AlertBottomBarProps {
  locationName: string;
  coordinates: { lat: number; lng: number };
}

export function AlertBottomBar({ locationName, coordinates }: AlertBottomBarProps) {
  const { user } = useAuth();
  const { showAlertModal, canShowModal } = useAlertModal();
  const [isDismissed, setIsDismissed] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Check if modal was already shown this session for this location
  const wasShownInSession = (locationName: string): boolean => {
    if (typeof window === 'undefined') return false;
    try {
      const shownLocations = JSON.parse(sessionStorage.getItem('alert-modal-shown-session') || '[]');
      return shownLocations.includes(locationName);
    } catch {
      return false;
    }
  };

  // Show the bar after a short delay (user has engaged with the page)
  useEffect(() => {
    const timer = setTimeout(() => {
      // Check if dismissed this session
      const dismissed = sessionStorage.getItem(`alert-bar-dismissed-${locationName}`);
      // Also check if modal was already shown in this session
      const shownInSession = wasShownInSession(locationName);

      if (!dismissed && !shownInSession) {
        setIsVisible(true);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [locationName]);

  const handleDismiss = () => {
    setIsDismissed(true);
    setIsVisible(false);
    sessionStorage.setItem(`alert-bar-dismissed-${locationName}`, 'true');
  };

  const handleSetupAlerts = () => {
    analytics.track('alert_bottom_bar_clicked', {
      location: locationName,
      user_logged_in: !!user,
    });

    const locationContext = {
      name: locationName,
      coordinates,
    };

    if (canShowModal(locationContext)) {
      showAlertModal(locationContext);
    }
  };

  if (!isVisible || isDismissed) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg transform transition-transform duration-300 ease-out">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Message */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
              <Bell className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-sm sm:text-base">
                Get alerts for {locationName}
              </p>
              <p className="text-blue-100 text-xs sm:text-sm hidden sm:block">
                Be first to know about new listings and price drops
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleSetupAlerts}
              className="bg-white text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg font-semibold text-sm transition-colors shadow-sm"
            >
              Set Up Alerts
            </button>
            <button
              onClick={handleDismiss}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

