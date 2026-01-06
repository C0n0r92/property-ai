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

// Generic track method
export const track = (eventName: string, properties?: Record<string, any>) => {
  trackEvent({
    action: eventName,
    category: 'custom',
    label: properties ? JSON.stringify(properties) : undefined
  });
};

// Predefined events for consistency
export const analytics = {
  // Generic track method
  track,

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

  // Blog events
  blogShared: (platform: string, articleSlug: string) => {
    trackEvent({ action: 'blog_shared', category: 'engagement', label: `${platform}:${articleSlug}` });
  },

  blogVoted: (voteType: 'up' | 'down', articleSlug: string) => {
    trackEvent({ action: 'blog_voted', category: 'engagement', label: `${voteType}:${articleSlug}` });
  },

  blogArticleViewed: (articleSlug: string) => {
    trackEvent({ action: 'blog_article_viewed', category: 'engagement', label: articleSlug });
  },

  // Property reporting events
  propertyReported: (propertyType: 'sold' | 'listing' | 'rental') => {
    trackEvent({ action: 'property_reported', category: 'engagement', label: propertyType });
  },

  // Areas page events
  areasPageViewed: () => {
    trackEvent({ action: 'areas_page_viewed', category: 'navigation' });
  },

  areasSearchUsed: (query: string) => {
    trackEvent({ action: 'areas_search_used', category: 'engagement', label: query.substring(0, 50) });
  },

  areasSortChanged: (sortType: 'count' | 'medianPrice' | 'change6m') => {
    trackEvent({ action: 'areas_sort_changed', category: 'engagement', label: sortType });
  },

  areasAreaViewed: (areaName: string) => {
    trackEvent({ action: 'areas_area_viewed', category: 'engagement', label: areaName });
  },

  areasPaginationUsed: (pageNumber: number) => {
    trackEvent({ action: 'areas_pagination_used', category: 'engagement', value: pageNumber });
  },

  areasQuickNavUsed: (areaName: string) => {
    trackEvent({ action: 'areas_quick_nav_used', category: 'engagement', label: areaName });
  },

  // Location Alert Events
  alertModalShown: (location: string, source: 'homepage' | 'map' | 'areas') => {
    trackEvent({ action: 'alert_modal_shown', category: 'conversion', label: `${source}:${location}` });
  },

  alertModalDismissed: (location: string, step: string, source: 'homepage' | 'map' | 'areas' | 'unknown' = 'unknown') => {
    trackEvent({ action: 'alert_modal_dismissed', category: 'conversion', label: `${source}:${location}:${step}` });
  },

  alertStepTransition: (fromStep: string, toStep: string, location: string) => {
    trackEvent({ action: 'alert_step_transition', category: 'conversion', label: `${fromStep}:${toStep}:${location}` });
  },

  alertPropertyTypeSelected: (propertyType: 'for_sale' | 'for_rent' | 'sold', location: string) => {
    trackEvent({ action: 'alert_property_type_selected', category: 'conversion', label: `${propertyType}:${location}` });
  },

  alertConfigurationUpdated: (config: {
    radius_km: number;
    propertyType: 'for_sale' | 'for_rent' | 'sold';
    min_bedrooms?: number;
    max_bedrooms?: number;
    min_price?: number;
    max_price?: number;
    price_threshold_percent?: number;
  }) => {
    trackEvent({
      action: 'alert_configuration_updated',
      category: 'conversion',
      label: `${config.propertyType}:${config.radius_km}km`
    });
  },

  alertPaymentStarted: (amount: number, location: string, propertyType: 'for_sale' | 'for_rent' | 'sold') => {
    trackEvent({
      action: 'alert_payment_started',
      category: 'conversion',
      label: `${propertyType}:${location}`,
      value: amount
    });
  },

  alertPaymentCompleted: (alertId: string, amount: number, location: string, propertyType: 'for_sale' | 'for_rent' | 'sold') => {
    trackEvent({
      action: 'alert_payment_completed',
      category: 'revenue',
      label: `${propertyType}:${location}`,
      value: amount
    });
  },

  alertCreated: (alertId: string, location: string, propertyType: 'for_sale' | 'for_rent' | 'sold', radius_km: number) => {
    trackEvent({
      action: 'alert_created',
      category: 'engagement',
      label: `${propertyType}:${location}:${radius_km}km`
    });
  },

  alertEmailSent: (alertId: string, location: string, propertyCount: number, propertyType: 'for_sale' | 'for_rent' | 'sold') => {
    trackEvent({
      action: 'alert_email_sent',
      category: 'engagement',
      label: `${propertyType}:${location}`,
      value: propertyCount
    });
  },

  alertViewedFromEmail: (alertId: string, location: string, propertyType: 'for_sale' | 'for_rent' | 'sold') => {
    trackEvent({
      action: 'alert_viewed_from_email',
      category: 'engagement',
      label: `${propertyType}:${location}`
    });
  },

  alertPageViewed: (tab: 'alerts' | 'properties') => {
    trackEvent({ action: 'alert_page_viewed', category: 'engagement', label: tab });
  },

  alertRenewalOffered: (alertId: string, location: string, daysExpired: number) => {
    trackEvent({
      action: 'alert_renewal_offered',
      category: 'engagement',
      label: location,
      value: daysExpired
    });
  },

  alertRenewed: (alertId: string, location: string, amount: number) => {
    trackEvent({
      action: 'alert_renewed',
      category: 'revenue',
      label: location,
      value: amount
    });
  },

  // Registration Analytics
  registrationStarted: (method: 'modal' | 'direct' | 'save_prompt') => {
    trackEvent({
      action: 'registration_started',
      category: 'conversion',
      label: method
    });
  },

  registrationCompleted: (method: 'google' | 'email', source?: string) => {
    trackEvent({
      action: 'registration_completed',
      category: 'conversion',
      label: `${method}${source ? `:${source}` : ''}`
    });
  },

  // Mortgage Calculator Analytics
  mortgageCalculatorPageViewed: () => {
    trackEvent({ action: 'mortgage_calculator_page_viewed', category: 'engagement' });
  },

  mortgageCalculationPerformed: (loanAmount: number, interestRate: number, termYears: number) => {
    trackEvent({
      action: 'mortgage_calculation_performed',
      category: 'engagement',
      label: `${loanAmount}:${interestRate}:${termYears}`,
      value: loanAmount
    });
  },

  mortgageScenarioSaved: (scenarioName: string, loanAmount: number) => {
    trackEvent({
      action: 'mortgage_scenario_saved',
      category: 'engagement',
      label: scenarioName,
      value: loanAmount
    });
  },

  mortgageCalculatorShared: (platform?: string) => {
    trackEvent({
      action: 'mortgage_calculator_shared',
      category: 'engagement',
      label: platform || 'unknown'
    });
  },

  mortgageRateExplorerUsed: (loanAmount: number, currentRate: number) => {
    trackEvent({
      action: 'mortgage_rate_explorer_used',
      category: 'engagement',
      label: `${loanAmount}:${currentRate}`,
      value: loanAmount
    });
  },

  mortgagePayoffTimelineViewed: (loanAmount: number, termYears: number) => {
    trackEvent({
      action: 'mortgage_payoff_timeline_viewed',
      category: 'engagement',
      label: `${loanAmount}:${termYears}`,
      value: loanAmount
    });
  },

  // Comparison Tool Analytics
  comparisonToolPageViewed: () => {
    trackEvent({ action: 'comparison_tool_page_viewed', category: 'engagement' });
  },

  comparisonPropertiesAdded: (propertyCount: number, propertyTypes: string[]) => {
    trackEvent({
      action: 'comparison_properties_added',
      category: 'engagement',
      label: propertyTypes.join(','),
      value: propertyCount
    });
  },

  comparisonSectionToggled: (sectionName: string, isExpanded: boolean) => {
    trackEvent({
      action: 'comparison_section_toggled',
      category: 'engagement',
      label: `${sectionName}:${isExpanded ? 'expanded' : 'collapsed'}`
    });
  },

  comparisonShared: (platform?: string) => {
    trackEvent({
      action: 'comparison_shared',
      category: 'engagement',
      label: platform || 'unknown'
    });
  },

  comparisonCleared: (propertyCount: number) => {
    trackEvent({
      action: 'comparison_cleared',
      category: 'engagement',
      value: propertyCount
    });
  },

  // Mortgage Scenarios Analytics
  mortgageScenariosPageViewed: () => {
    trackEvent({ action: 'mortgage_scenarios_page_viewed', category: 'engagement' });
  },

  mortgageScenarioViewed: (scenarioId: string, loanAmount: number) => {
    trackEvent({
      action: 'mortgage_scenario_viewed',
      category: 'engagement',
      label: scenarioId,
      value: loanAmount
    });
  },

  mortgageScenarioDeleted: (scenarioId: string, loanAmount: number) => {
    trackEvent({
      action: 'mortgage_scenario_deleted',
      category: 'engagement',
      label: scenarioId,
      value: loanAmount
    });
  },

  mortgageScenarioEdited: (scenarioId: string, loanAmount: number) => {
    trackEvent({
      action: 'mortgage_scenario_edited',
      category: 'engagement',
      label: scenarioId,
      value: loanAmount
    });
  },

  // Error Tracking Analytics
  apiError: (endpoint: string, errorMessage: string, statusCode?: number) => {
    trackEvent({
      action: 'api_error',
      category: 'error',
      label: `${endpoint}:${errorMessage}${statusCode ? `:${statusCode}` : ''}`
    });
  },

  formSubmissionError: (formName: string, errorMessage: string, field?: string) => {
    trackEvent({
      action: 'form_submission_error',
      category: 'error',
      label: `${formName}:${field || 'general'}:${errorMessage}`
    });
  },

  userFacingError: (errorType: string, errorMessage: string, context?: string) => {
    trackEvent({
      action: 'user_facing_error',
      category: 'error',
      label: `${errorType}:${context || 'general'}:${errorMessage}`
    });
  },

  paymentError: (errorType: string, amount?: number, context?: string) => {
    trackEvent({
      action: 'payment_error',
      category: 'error',
      label: `${errorType}:${context || 'general'}`,
      value: amount
    });
  },

  // Alert Creation Analytics
  freeAlertCreated: (alertId: string, location: string, type: 'location' | 'blog') => {
    trackEvent({
      action: 'free_alert_created',
      category: 'engagement',
      label: `${type}:${location}`
    });
  },

  paidAlertCreated: (alertId: string, location: string, amount: number, type: 'location' | 'blog') => {
    trackEvent({
      action: 'paid_alert_created',
      category: 'revenue',
      label: `${type}:${location}`,
      value: amount
    });
  },

  // AI Summary Analytics
  aiSummaryCtaShown: (blogSlug: string) => {
    trackEvent({
      action: 'ai_summary_cta_shown',
      category: 'engagement',
      label: blogSlug
    });
  },

  aiSummaryCtaClicked: (blogSlug: string) => {
    trackEvent({
      action: 'ai_summary_cta_clicked',
      category: 'engagement',
      label: blogSlug
    });
  },

  aiSummaryEmailEntered: (blogSlug: string, requestNumber: number) => {
    trackEvent({
      action: 'ai_summary_email_entered',
      category: 'engagement',
      label: `${blogSlug}:${requestNumber}`,
      value: requestNumber
    });
  },

  aiSummaryPaymentInitiated: (blogSlug: string, amount: number, requestNumber: number) => {
    trackEvent({
      action: 'ai_summary_payment_initiated',
      category: 'conversion',
      label: `${blogSlug}:${requestNumber}`,
      value: amount
    });
  },

  aiSummaryPaymentCompleted: (blogSlug: string, amount: number, requestNumber: number) => {
    trackEvent({
      action: 'ai_summary_payment_completed',
      category: 'revenue',
      label: `${blogSlug}:${requestNumber}`,
      value: amount
    });
  },

  aiSummaryRequestSubmitted: (blogSlug: string, isPaid: boolean, requestNumber: number) => {
    trackEvent({
      action: 'ai_summary_request_submitted',
      category: isPaid ? 'revenue' : 'engagement',
      label: `${blogSlug}:${isPaid ? 'paid' : 'free'}:${requestNumber}`,
      value: isPaid ? 99 : 0 // 99 cents for paid, 0 for free
    });
  },
};

