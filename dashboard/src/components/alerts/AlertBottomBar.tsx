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

// Helper function to truncate location names for mobile
function truncateLocationName(name: string, maxLength: number = 25): string {
  if (name.length <= maxLength) return name;

  // Try to truncate at a comma or space if possible
  const truncated = name.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  const lastComma = truncated.lastIndexOf(',');

  // Use the last space or comma as a natural break point
  const breakPoint = Math.max(lastSpace, lastComma);
  if (breakPoint > maxLength * 0.6) {
    return name.substring(0, breakPoint) + '...';
  }

  return truncated + '...';
}

export function AlertBottomBar({ locationName, coordinates }: AlertBottomBarProps) {
  const { user } = useAuth();
  const { showAlertModal, canShowModal } = useAlertModal();
  const [isDismissed, setIsDismissed] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Extract Dublin postcode from location name for consistent matching
  const extractDublinPostcode = (locationName: string): string => {
    // Match patterns like "Dublin 15", "D15", etc.
    const dublinMatch = locationName.match(/Dublin\s+\d+|\bD\d+\b/i);
    return dublinMatch ? dublinMatch[0] : locationName;
  };

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
      // Check if dismissed this session (check both full name and normalized)
      const normalizedLocation = extractDublinPostcode(locationName);
      const dismissed = sessionStorage.getItem(`alert-bar-dismissed-${locationName}`) ||
                       sessionStorage.getItem(`alert-bar-dismissed-${normalizedLocation}`);
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
    // Store dismissal for both full name and normalized version for better matching
    const normalizedLocation = extractDublinPostcode(locationName);
    sessionStorage.setItem(`alert-bar-dismissed-${locationName}`, 'true');
    sessionStorage.setItem(`alert-bar-dismissed-${normalizedLocation}`, 'true');
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

    if (canShowModal(locationContext, false)) { // Don't bypass dismissal for bottom bar
      showAlertModal(locationContext, false); // Don't bypass dismissal for bottom bar
    }
  };

  if (!isVisible || isDismissed) return null;

  const displayName = truncateLocationName(locationName);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg transform transition-transform duration-300 ease-out">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          {/* Message */}
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
              <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm sm:text-base truncate">
                Get alerts for {displayName}
              </p>
              <p className="text-blue-100 text-xs sm:text-sm hidden sm:block">
                Be first to know about new listings and price drops
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <button
              onClick={handleSetupAlerts}
              className="bg-white text-blue-600 hover:bg-blue-50 px-3 sm:px-4 py-2 rounded-lg font-semibold text-sm transition-colors shadow-sm whitespace-nowrap"
            >
              Set Up Alerts
            </button>
            <button
              onClick={handleDismiss}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors touch-manipulation"
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

