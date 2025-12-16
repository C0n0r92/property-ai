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
  // Google Analytics
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
  
  // PostHog
  if (typeof window !== 'undefined' && posthog) {
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
};

