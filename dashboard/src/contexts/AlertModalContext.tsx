import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Location data from search
export interface LocationContext {
  name: string;
  coordinates: { lat: number; lng: number };
  postcode?: string;
}

// Alert modal state
interface AlertModalState {
  isOpen: boolean;
  step: 'initial' | 'property-types' | 'configure-alerts' | 'payment' | 'authentication' | 'success';
  location: LocationContext | null;
  isDismissed: boolean;
}

interface AlertModalContextType {
  // State
  modalState: AlertModalState;

  // Actions
  showAlertModal: (location: LocationContext) => void;
  hideAlertModal: () => void;
  dismissAlertModal: () => void;
  setModalStep: (step: AlertModalState['step']) => void;
  resetModal: () => void;

  // Utilities
  canShowModal: (location: LocationContext) => boolean;
}

const AlertModalContext = createContext<AlertModalContextType | undefined>(undefined);

export function AlertModalProvider({ children }: { children: ReactNode }) {
  const DISMISSAL_STORAGE_KEY = 'alert-modal-dismissed';
  const SESSION_STORAGE_KEY = 'alert-modal-shown-session';

  // Initialize modal state
  const [modalState, setModalState] = useState<AlertModalState>({
    isOpen: false,
    step: 'initial',
    location: null,
    isDismissed: false,
  });

  // Check if modal was dismissed in last 7 days for a specific location
  const wasRecentlyDismissedForLocation = (locationName: string): boolean => {
    if (typeof window === 'undefined') return false;
    try {
      const dismissedData = localStorage.getItem(`${DISMISSAL_STORAGE_KEY}_${locationName}`);
      if (!dismissedData) return false;

      const { timestamp } = JSON.parse(dismissedData);
      const daysSinceDismissal = (Date.now() - timestamp) / (1000 * 60 * 60 * 24);
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
    console.log('showAlertModal called with location:', location);
    console.log('canShowModal result:', canShowModal(location));
    console.log('modalState.isOpen:', modalState.isOpen);
    console.log('wasRecentlyDismissed:', wasRecentlyDismissedForLocation(location.name));
    console.log('wasShownInSession:', wasShownInSession(location.name));

    if (!canShowModal(location)) {
      console.log('Modal cannot be shown, returning early');
      return;
    }

    console.log('Setting modal state to open for location:', location.name);
    setModalState({
      isOpen: true,
      step: 'initial',
      location,
      isDismissed: false,
    });

    markAsShownInSession(location.name);
  };

  const hideAlertModal = () => {
    setModalState(prev => ({
      ...prev,
      isOpen: false,
    }));
  };

  const dismissAlertModal = () => {
    if (modalState.location) {
      // Store dismissal with timestamp for this specific location
      const dismissalData = {
        timestamp: Date.now(),
      };
      localStorage.setItem(`${DISMISSAL_STORAGE_KEY}_${modalState.location.name}`, JSON.stringify(dismissalData));
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
      location: null,
      isDismissed: false,
    });
  };

  const canShowModal = (location: LocationContext): boolean => {
    // Don't show if recently dismissed for this specific location
    if (wasRecentlyDismissedForLocation(location.name)) return false;

    // Don't show if already shown in this session for this location
    if (wasShownInSession(location.name)) return false;

    // Don't show if modal is already open
    if (modalState.isOpen) return false;

    return true;
  };

  const value: AlertModalContextType = {
    modalState,
    showAlertModal,
    hideAlertModal,
    dismissAlertModal,
    setModalStep,
    resetModal,
    canShowModal,
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
