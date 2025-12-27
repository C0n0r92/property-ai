/**
 * Mortgage Calculator Constants
 * Default values, options, and configuration constants
 */

import { CURRENCIES, DEFAULT_MORTGAGE_INPUTS } from '@/types/mortgage';

// Re-export from types for convenience
export { CURRENCIES, DEFAULT_MORTGAGE_INPUTS };

// Loan term options (in years)
export const LOAN_TERMS = [15, 20, 25, 30] as const;

// Payment frequency options
export const PAYMENT_FREQUENCIES = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'biweekly', label: 'Bi-weekly' }
] as const;

// PMI rate options (as percentages)
export const PMI_RATES = [
  { value: 0.35, label: '0.35%' },
  { value: 0.50, label: '0.50%' },
  { value: 0.75, label: '0.75%' },
  { value: 1.00, label: '1.00%' }
] as const;

// Default PMI rate (Ireland-specific)
export const DEFAULT_PMI_RATE = 0.5; // 0.5%

// Currency options (limited to EUR for Irish market)
export const SUPPORTED_CURRENCIES = ['EUR'] as const;

// Extra payment scenario options
export const EXTRA_PAYMENT_SCENARIOS = [
  { amount: 50, label: '€50 extra/month' },
  { amount: 100, label: '€100 extra/month' },
  { amount: 200, label: '€200 extra/month' },
  { amount: 500, label: '€500 extra/month' }
];

// Age range for validation
export const AGE_RANGE = {
  min: 18,
  max: 100
} as const;

// Interest rate range for validation
export const INTEREST_RATE_RANGE = {
  min: 0.1,
  max: 30
} as const;

// Loan amount range for validation
export const LOAN_AMOUNT_RANGE = {
  min: 10000,
  max: 10000000
} as const;

// Home value range for validation
export const HOME_VALUE_RANGE = {
  min: 50000,
  max: 20000000
} as const;

// Calculation limits
export const CALCULATION_LIMITS = {
  maxAmortizationPeriods: 600, // 50 years
  maxScenarios: 10,
  maxExtraPaymentAmount: 50000,
  maxOneTimePaymentAmount: 1000000
} as const;

// Local storage keys
export const STORAGE_KEYS = {
  mortgageInputs: 'mortgage-calculator-inputs',
  scenarios: 'mortgage-calculator-scenarios',
  userPreferences: 'mortgage-calculator-preferences'
} as const;

// API endpoints
export const API_ENDPOINTS = {
  calculate: '/api/mortgage/calculate',
  scenarios: '/api/mortgage/scenarios',
  health: '/api/mortgage/health'
} as const;

// Error messages
export const ERROR_MESSAGES = {
  calculationFailed: 'Failed to calculate mortgage. Please check your inputs.',
  saveFailed: 'Failed to save scenario. Please try again.',
  loadFailed: 'Failed to load scenarios. Please refresh the page.',
  invalidInputs: 'Please check your inputs and try again.',
  networkError: 'Network error. Please check your connection.',
  authenticationRequired: 'Please log in to save scenarios.',
  quotaExceeded: 'Scenario limit exceeded. Please delete some scenarios first.'
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  scenarioSaved: 'Scenario saved successfully!',
  scenarioDeleted: 'Scenario deleted successfully!',
  calculationComplete: 'Calculation completed successfully!'
} as const;

// Loading messages
export const LOADING_MESSAGES = {
  calculating: 'Calculating mortgage...',
  saving: 'Saving scenario...',
  loading: 'Loading scenarios...',
  validating: 'Validating inputs...'
} as const;

// Chart colors (using property-ml theme colors)
export const CHART_COLORS = {
  primary: '#10b981', // emerald-500
  secondary: '#3b82f6', // blue-500
  accent: '#8b5cf6', // purple-500
  neutral: '#6b7280', // gray-500
  success: '#22c55e', // green-500
  warning: '#f59e0b', // amber-500
  error: '#ef4444' // red-500
} as const;

// Chart themes
export const CHART_THEME = {
  backgroundColor: 'var(--background)',
  textColor: 'var(--foreground)',
  gridColor: 'var(--border)',
  tooltipBackgroundColor: 'var(--surface)',
  tooltipBorderColor: 'var(--border)',
  tooltipTextColor: 'var(--foreground)'
} as const;

// Animation durations
export const ANIMATION_DURATIONS = {
  fast: 200,
  normal: 300,
  slow: 500,
  verySlow: 1000
} as const;

// Debounce delays
export const DEBOUNCE_DELAYS = {
  calculation: 300, // ms
  search: 300, // ms
  save: 500 // ms
} as const;

// Irish-specific constants
export const IRISH_MARKET = {
  averageInterestRate: 3.5, // Current average Irish mortgage rate
  averageLoanTerm: 30,
  stampDutyThresholds: [
    { maxValue: 1000000, rate: 0.01 }, // 1%
    { maxValue: 2000000, rate: 0.02 }, // 2%
    { maxValue: Infinity, rate: 0.10 } // 10%
  ],
  commonDownPaymentPercentages: [10, 15, 20, 25, 30]
} as const;

// Analytics event names
export const ANALYTICS_EVENTS = {
  pageView: 'mortgage_calculator_page_view',
  calculationPerformed: 'mortgage_calculation_performed',
  scenarioSaved: 'mortgage_scenario_saved',
  scenarioDeleted: 'mortgage_scenario_deleted',
  scenarioCompared: 'mortgage_scenarios_compared',
  inputChanged: 'mortgage_input_changed',
  tooltipViewed: 'mortgage_tooltip_viewed',
  amortizationViewed: 'mortgage_amortization_viewed',
  exportAttempted: 'mortgage_export_attempted'
} as const;

// Feature flags (for future development)
export const FEATURE_FLAGS = {
  enableScenarios: true,
  enableComparison: true,
  enableExport: false, // Future feature
  enableSharing: false, // Future feature
  enablePropertyLinking: false, // Future feature
  enableHistoricalRates: false // Future feature
} as const;




