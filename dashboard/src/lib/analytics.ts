// Analytics event tracking utility (Google Analytics + PostHog)
import posthog from 'posthog-js';

type GTagEvent = {
  action: string;
  category: string;
  label?: string;
  value?: number;
};

// Track custom events to both GA and PostHog
export const trackEvent = ({ action, category, label, value }: GTagEvent) => {
  // Only track events in production
  if (typeof window === 'undefined') return;
  const isProduction = window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1';
  if (!isProduction) return;

  // Google Analytics
  if ((window as any).gtag) {
    (window as any).gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }

  // PostHog
  if (posthog) {
    posthog.capture(action, {
      category,
      label,
      value,
    });
  }
};

// Predefined events for consistency
export const analytics = {
  // Map events
  mapViewModeChanged: (mode: 'clusters' | 'price' | 'difference') => {
    trackEvent({ action: 'view_mode_changed', category: 'map', label: mode });
  },
  
  mapDataSourceChanged: (source: string) => {
    trackEvent({ action: 'data_source_toggled', category: 'map', label: source });
  },
  
  mapFilterApplied: (filterType: string, filterValue: string) => {
    trackEvent({ action: 'filter_applied', category: 'map', label: `${filterType}:${filterValue}` });
  },
  
  mapPropertyClicked: (propertyType: 'sold' | 'forSale' | 'rental') => {
    trackEvent({ action: 'property_clicked', category: 'map', label: propertyType });
  },
  
  mapSearchUsed: (query: string) => {
    trackEvent({ action: 'search_used', category: 'map', label: query.substring(0, 50) });
  },
  
  mapAreaNavigated: (area: string) => {
    trackEvent({ action: 'area_navigated', category: 'map', label: area });
  },
  
  // Payment events
  paymentModalViewed: () => {
    trackEvent({ action: 'payment_modal_viewed', category: 'conversion' });
  },
  
  paymentPlanSelected: (plan: 'one-time' | 'monthly') => {
    trackEvent({ action: 'payment_plan_selected', category: 'conversion', label: plan });
  },
  
  paymentCheckoutStarted: (plan: 'one-time' | 'monthly', amount: number) => {
    trackEvent({ action: 'checkout_started', category: 'conversion', label: plan, value: amount });
  },
  
  paymentModalDismissed: () => {
    trackEvent({ action: 'payment_modal_dismissed', category: 'conversion' });
  },
  
  // Navigation events
  pageViewed: (page: string) => {
    trackEvent({ action: 'page_view', category: 'navigation', label: page });
  },
  
  navLinkClicked: (link: string) => {
    trackEvent({ action: 'nav_link_clicked', category: 'navigation', label: link });
  },
  
  // Cookie consent events
  cookieConsentAccepted: () => {
    trackEvent({ action: 'cookie_consent_accepted', category: 'privacy' });
  },
  
  cookieConsentRejected: () => {
    trackEvent({ action: 'cookie_consent_rejected', category: 'privacy' });
  },
  
  // Feature usage events
  spiderfyExpanded: (propertyCount: number) => {
    trackEvent({ action: 'spiderfy_expanded', category: 'feature', value: propertyCount });
  },
  
  filtersCleared: () => {
    trackEvent({ action: 'filters_cleared', category: 'feature' });
  },
  
  propertyShared: (propertyType: 'sold' | 'forSale' | 'rental') => {
    trackEvent({ action: 'property_shared', category: 'feature', label: propertyType });
  },

  propertySaved: (propertyType: 'sold' | 'forSale' | 'rental') => {
    trackEvent({ action: 'property_saved', category: 'engagement', label: propertyType });
  },

  propertyUnsaved: (propertyType: 'sold' | 'forSale' | 'rental') => {
    trackEvent({ action: 'property_unsaved', category: 'engagement', label: propertyType });
  },

  // Amenities feature events
  amenitiesExplored: (propertyType: 'sold' | 'forSale' | 'rental') => {
    trackEvent({ action: 'amenities_explored', category: 'feature', label: propertyType });
  },

  amenitiesLoaded: (amenityCount: number, propertyType: 'sold' | 'forSale' | 'rental') => {
    trackEvent({ action: 'amenities_loaded', category: 'feature', label: propertyType, value: amenityCount });
  },

  amenitiesExited: (propertyType: 'sold' | 'forSale' | 'rental') => {
    trackEvent({ action: 'amenities_exited', category: 'feature', label: propertyType });
  },

  amenityClicked: (amenityType: string, amenityName: string) => {
    trackEvent({ action: 'amenity_clicked', category: 'feature', label: `${amenityType}:${amenityName}` });
  },

  // Planning permission events
  planningCardViewed: (propertyType: 'sold' | 'forSale' | 'rental') => {
    trackEvent({ action: 'planning_card_viewed', category: 'feature', label: propertyType });
  },

  planningDataLoaded: (applicationCount: number, confidenceLevel: 'high' | 'medium' | 'low' | 'mixed', propertyType: 'sold' | 'forSale' | 'rental') => {
    trackEvent({ action: 'planning_data_loaded', category: 'feature', label: `${propertyType}:${confidenceLevel}`, value: applicationCount });
  },

  planningApplicationClicked: (applicationNumber: string, propertyType: 'sold' | 'forSale' | 'rental') => {
    trackEvent({ action: 'planning_application_clicked', category: 'feature', label: `${propertyType}:${applicationNumber}` });
  },

  planningExpandedSearch: (propertyType: 'sold' | 'forSale' | 'rental') => {
    trackEvent({ action: 'planning_expanded_search', category: 'feature', label: propertyType });
  },

  planningCardFlipped: (direction: 'front' | 'back', propertyType: 'sold' | 'forSale' | 'rental') => {
    trackEvent({ action: 'planning_card_flipped', category: 'feature', label: `${propertyType}:${direction}` });
  },
};

