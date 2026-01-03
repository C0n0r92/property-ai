import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';

// Location data from search
export interface LocationContext {
  name: string;
  coordinates: { lat: number; lng: number };
  postcode?: string;
  defaultAlertConfig?: {
    monitor_sale?: boolean;
    monitor_rental?: boolean;
    monitor_sold?: boolean;
    sale_alert_on_new?: boolean;
    sale_alert_on_price_drops?: boolean;
    rental_alert_on_new?: boolean;
    sold_alert_on_over_asking?: boolean;
    sold_alert_on_under_asking?: boolean;
    sold_price_threshold_percent?: number;
  };
}

// Blog data for blog alerts
export interface BlogContext {
  title: string;
  slug: string;
  excerpt: string;
}

// Alert types
export type AlertType = 'location' | 'blog';

// Alert modal state
interface AlertModalState {
  isOpen: boolean;
  step: 'initial' | 'property-types' | 'configure-alerts' | 'payment' | 'authentication' | 'success';
  alertType: AlertType;
  location: LocationContext | null;
  blog: BlogContext | null;
  isDismissed: boolean;
  defaultAlertConfig?: LocationContext['defaultAlertConfig'];
}

interface AlertModalContextType {
  // State
  modalState: AlertModalState;

  // Actions
  showAlertModal: (location: LocationContext) => void;
  showBlogAlertModal: (blog: BlogContext) => void;
  hideAlertModal: () => void;
  dismissAlertModal: () => void;
  setModalStep: (step: AlertModalState['step']) => void;
  persistModalForAuth: () => void;
  resetModal: () => void;

  // Utilities
  canShowModal: (location: LocationContext) => boolean;
  canShowBlogModal: (blogSlug: string) => boolean;
}

const AlertModalContext = createContext<AlertModalContextType | undefined>(undefined);

export function AlertModalProvider({ children }: { children: ReactNode }) {
  const LOCATION_DISMISSAL_STORAGE_KEY = 'alert-modal-dismissed';
  const BLOG_DISMISSAL_STORAGE_KEY = 'blog-alert-modal-dismissed';
  const SESSION_STORAGE_KEY = 'alert-modal-shown-session';

  // Track last searched location for exit-intent (separate from modal state)
  const lastSearchedLocationRef = useRef<LocationContext | null>(null);

  // Initialize modal state - check for persisted state from authentication redirect
  const getInitialModalState = (): AlertModalState => {
    if (typeof window === 'undefined') {
      return {
        isOpen: false,
        step: 'initial',
        alertType: 'location',
        location: null,
        blog: null,
        isDismissed: false,
      };
    }

    try {
      const persistedState = sessionStorage.getItem('alert-modal-auth-redirect');
      if (persistedState) {
        const parsedState = JSON.parse(persistedState);
        sessionStorage.removeItem('alert-modal-auth-redirect'); // Clean up

        // Only restore if user was in the middle of alert setup
        if (parsedState.step !== 'initial' && parsedState.step !== 'success') {
          console.log('Restoring alert modal state after authentication:', parsedState);
          return {
            ...parsedState,
            isOpen: true, // Reopen the modal
          };
        }
      }
    } catch (error) {
      console.error('Error restoring modal state:', error);
    }

    return {
      isOpen: false,
      step: 'initial',
      alertType: 'location',
      location: null,
      blog: null,
      isDismissed: false,
    };
  };

  const [modalState, setModalState] = useState<AlertModalState>(getInitialModalState());

  // Check if modal was dismissed in last 7 days for a specific location
  const wasRecentlyDismissedForLocation = (locationName: string): boolean => {
    if (typeof window === 'undefined') return false;
    try {
      const dismissedData = localStorage.getItem(`${LOCATION_DISMISSAL_STORAGE_KEY}_${locationName}`);
      if (!dismissedData) return false;

      const { timestamp } = JSON.parse(dismissedData);
      const daysSinceDismissal = (Date.now() - timestamp) / (1000 * 60 * 60 * 24);
      console.log(`🚫 Modal dismissed ${daysSinceDismissal.toFixed(1)} days ago for ${locationName}`);
      return daysSinceDismissal < 7;
    } catch {
      return false;
    }
  };

  // Check if blog modal was dismissed in last 7 days for a specific blog
  const wasRecentlyDismissedForBlog = (blogSlug: string): boolean => {
    if (typeof window === 'undefined') return false;
    try {
      const dismissedData = localStorage.getItem(`${BLOG_DISMISSAL_STORAGE_KEY}_${blogSlug}`);
      if (!dismissedData) return false;

      const { timestamp } = JSON.parse(dismissedData);
      const daysSinceDismissal = (Date.now() - timestamp) / (1000 * 60 * 60 * 24);
      console.log(`🚫 Blog modal dismissed ${daysSinceDismissal.toFixed(1)} days ago for ${blogSlug}`);
      return daysSinceDismissal < 7;
    } catch {
      return false;
    }
  };

  // Check if modal was already shown this session for this location
  const wasShownInSession = (locationName: string): boolean => {
    if (typeof window === 'undefined') return false;
    try {
      const shownLocations = JSON.parse(sessionStorage.getItem(SESSION_STORAGE_KEY) || '[]');
      return shownLocations.includes(locationName);
    } catch {
      return false;
    }
  };

  // Mark as shown in session
  const markAsShownInSession = (locationName: string) => {
    if (typeof window === 'undefined') return;
    try {
      const shownLocations = JSON.parse(sessionStorage.getItem(SESSION_STORAGE_KEY) || '[]');
      shownLocations.push(locationName);
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(shownLocations));
    } catch (error) {
      console.error('Failed to update session storage:', error);
    }
  };

  const showAlertModal = (location: LocationContext) => {
    // Always store the last searched location for exit-intent
    lastSearchedLocationRef.current = location;

    if (!canShowModal(location)) {
      return;
    }

    setModalState({
      isOpen: true,
      step: 'initial',
      alertType: 'location',
      location,
      blog: null,
      isDismissed: false,
      defaultAlertConfig: location.defaultAlertConfig,
    });

    markAsShownInSession(location.name);
  };

  const showBlogAlertModal = (blog: BlogContext) => {
    if (!canShowBlogModal(blog.slug)) {
      return;
    }

    setModalState({
      isOpen: true,
      step: 'initial',
      alertType: 'blog',
      location: null,
      blog,
      isDismissed: false,
    });
  };

  const hideAlertModal = () => {
    setModalState(prev => ({
      ...prev,
      isOpen: false,
    }));
  };

  const dismissAlertModal = () => {
    if (modalState.alertType === 'location' && modalState.location) {
      // Store dismissal with timestamp for this specific location
      const dismissalData = {
        timestamp: Date.now(),
      };
      localStorage.setItem(`${LOCATION_DISMISSAL_STORAGE_KEY}_${modalState.location.name}`, JSON.stringify(dismissalData));
    } else if (modalState.alertType === 'blog' && modalState.blog) {
      // Store dismissal with timestamp for this specific blog
      const dismissalData = {
        timestamp: Date.now(),
      };
      localStorage.setItem(`${BLOG_DISMISSAL_STORAGE_KEY}_${modalState.blog.slug}`, JSON.stringify(dismissalData));
    }

    setModalState(prev => ({
      ...prev,
      isOpen: false,
      isDismissed: true,
    }));
  };

  const setModalStep = (step: AlertModalState['step']) => {
    setModalState(prev => ({
      ...prev,
      step,
    }));
  };

  const persistModalForAuth = () => {
    if (typeof window === 'undefined') return;

    try {
      sessionStorage.setItem('alert-modal-auth-redirect', JSON.stringify(modalState));
      console.log('Persisted modal state for authentication redirect:', modalState);
    } catch (error) {
      console.error('Error persisting modal state:', error);
    }
  };

  const resetModal = () => {
    setModalState({
      isOpen: false,
      step: 'initial',
      alertType: 'location',
      location: null,
      blog: null,
      isDismissed: false,
    });
  };

  const canShowModal = (location: LocationContext): boolean => {
    // Don't show if recently dismissed for this specific location
    if (wasRecentlyDismissedForLocation(location.name)) {
      return false;
    }

    // Don't show if already shown in this session for this location
    if (wasShownInSession(location.name)) {
      return false;
    }

    // Don't show if modal is already open
    if (modalState.isOpen) {
      return false;
    }

    return true;
  };

  const canShowBlogModal = (blogSlug: string): boolean => {
    // Don't show if recently dismissed for this specific blog
    if (wasRecentlyDismissedForBlog(blogSlug)) return false;

    // Don't show if modal is already open
    if (modalState.isOpen) return false;

    return true;
  };

  // Exit-intent detection for desktop users
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Only run on desktop (non-touch devices)
    const isMobile = window.innerWidth <= 768 || 'ontouchstart' in window;
    if (isMobile) return;

    const handleMouseLeave = (e: MouseEvent) => {
      // Detect when mouse leaves the viewport from the top
      if (e.clientY <= 0 && !modalState.isOpen && !modalState.isDismissed) {
        // Use last searched location from ref (works even if modal wasn't triggered by timer)
        const locationToUse = lastSearchedLocationRef.current;
        if (locationToUse && canShowModal(locationToUse)) {
          console.log('Exit-intent triggered for:', locationToUse.name);
          showAlertModal(locationToUse);
        }
      }
    };

    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [modalState.isOpen, modalState.isDismissed, canShowModal, showAlertModal]);

  const value: AlertModalContextType = {
    modalState,
    showAlertModal,
    showBlogAlertModal,
    hideAlertModal,
    dismissAlertModal,
    setModalStep,
    persistModalForAuth,
    resetModal,
    canShowModal,
    canShowBlogModal,
  };

  return (
    <AlertModalContext.Provider value={value}>
      {children}
    </AlertModalContext.Provider>
  );
}

export function useAlertModal() {
  const context = useContext(AlertModalContext);
  if (!context) {
    throw new Error('useAlertModal must be used within AlertModalProvider');
  }
  return context;
}
