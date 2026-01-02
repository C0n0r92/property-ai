import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Location data from search
export interface LocationContext {
  name: string;
  coordinates: { lat: number; lng: number };
  postcode?: string;
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

  // Initialize modal state
  const [modalState, setModalState] = useState<AlertModalState>({
    isOpen: false,
    step: 'initial',
    alertType: 'location',
    location: null,
    blog: null,
    isDismissed: false,
  });

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
    console.log('🚨 ALERT MODAL: showAlertModal called with location:', location);
    console.log('🚨 ALERT MODAL: canShowModal result:', canShowModal(location));
    console.log('🚨 ALERT MODAL: modalState.isOpen:', modalState.isOpen);
    console.log('🚨 ALERT MODAL: wasRecentlyDismissed:', wasRecentlyDismissedForLocation(location.name));
    console.log('🚨 ALERT MODAL: wasShownInSession:', wasShownInSession(location.name));

    if (!canShowModal(location)) {
      console.log('Modal cannot be shown, returning early');
      return;
    }

    console.log('🚨 ALERT MODAL: Setting modal state to open for location:', location.name);
    setModalState({
      isOpen: true,
      step: 'initial',
      alertType: 'location',
      location,
      blog: null,
      isDismissed: false,
    });

    markAsShownInSession(location.name);
    console.log('🚨 ALERT MODAL: Modal state updated to open');
  };

  const showBlogAlertModal = (blog: BlogContext) => {
    console.log('🚨 BLOG ALERT MODAL: showBlogAlertModal called with blog:', blog);
    console.log('🚨 BLOG ALERT MODAL: canShowBlogModal result:', canShowBlogModal(blog.slug));
    console.log('🚨 BLOG ALERT MODAL: modalState.isOpen:', modalState.isOpen);

    if (!canShowBlogModal(blog.slug)) {
      console.log('Blog modal cannot be shown, returning early');
      return;
    }

    console.log('🚨 BLOG ALERT MODAL: Setting modal state to open for blog:', blog.title);
    setModalState({
      isOpen: true,
      step: 'initial',
      alertType: 'blog',
      location: null,
      blog,
      isDismissed: false,
    });

    console.log('🚨 BLOG ALERT MODAL: Modal state updated to open');
  };

  const hideAlertModal = () => {
    console.log('🚨 ALERT MODAL: hideAlertModal called');
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
    console.log('🔍 canShowModal called for location:', location.name);

    // Check localStorage for dismissal data
    const dismissalKey = `${LOCATION_DISMISSAL_STORAGE_KEY}_${location.name}`;
    const dismissalData = localStorage.getItem(dismissalKey);
    console.log('🔍 Dismissal data in localStorage:', dismissalData);

    // Don't show if recently dismissed for this specific location
    const recentlyDismissed = wasRecentlyDismissedForLocation(location.name);
    console.log('🔍 Recently dismissed for location:', recentlyDismissed);
    if (recentlyDismissed) {
      console.log('❌ Modal blocked: recently dismissed');
      return false;
    }

    // Check sessionStorage for shown locations
    const sessionKey = SESSION_STORAGE_KEY;
    const sessionData = sessionStorage.getItem(sessionKey);
    console.log('🔍 Session data in sessionStorage:', sessionData);

    // Don't show if already shown in this session for this location
    const shownInSession = wasShownInSession(location.name);
    console.log('🔍 Already shown in session for location:', shownInSession);
    if (shownInSession) {
      console.log('❌ Modal blocked: already shown in session');
      return false;
    }

    // Don't show if modal is already open
    console.log('🔍 Modal already open:', modalState.isOpen);
    if (modalState.isOpen) {
      console.log('❌ Modal blocked: modal already open');
      return false;
    }

    console.log('✅ Modal can be shown for location:', location.name);
    return true;
  };

  const canShowBlogModal = (blogSlug: string): boolean => {
    console.log('🔍 canShowBlogModal called for blog:', blogSlug);

    // Don't show if recently dismissed for this specific blog
    const recentlyDismissed = wasRecentlyDismissedForBlog(blogSlug);
    console.log('Blog recently dismissed:', recentlyDismissed);
    if (recentlyDismissed) return false;

    // Don't show if modal is already open
    console.log('Modal already open:', modalState.isOpen);
    if (modalState.isOpen) return false;

    console.log('✅ Blog modal can be shown');
    return true;
  };

  const value: AlertModalContextType = {
    modalState,
    showAlertModal,
    showBlogAlertModal,
    hideAlertModal,
    dismissAlertModal,
    setModalStep,
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
