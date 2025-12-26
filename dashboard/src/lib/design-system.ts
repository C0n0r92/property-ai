// Design System Utilities for consistent styling across Phase 0 components

// Color schemes for different states and scores
export const DESIGN_COLORS = {
  // Walkability scores
  walkability: {
    excellent: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', accent: 'bg-emerald-500', bar: 'bg-emerald-500' },
    'very-good': { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', accent: 'bg-blue-500', bar: 'bg-blue-500' },
    good: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', accent: 'bg-amber-500', bar: 'bg-amber-500' },
    fair: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', accent: 'bg-orange-500', bar: 'bg-orange-500' },
    low: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', accent: 'bg-red-500', bar: 'bg-red-500' }
  },

  // Transport modes
  transport: {
    walking: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', icon: '🚶' },
    cycling: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: '🚴' },
    driving: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', icon: '🚗' },
    publicTransport: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', icon: '🚇' }
  },

  // Amenity categories
  amenities: {
    transport: { icon: '🚇', color: 'text-blue-600' },
    education: { icon: '🏫', color: 'text-green-600' },
    healthcare: { icon: '🏥', color: 'text-red-600' },
    shopping: { icon: '🛒', color: 'text-purple-600' },
    leisure: { icon: '🎾', color: 'text-orange-600' },
    services: { icon: '🏦', color: 'text-gray-600' }
  }
} as const;

// Spacing scale
export const SPACING = {
  xs: '0.25rem',   // 4px
  sm: '0.5rem',    // 8px
  md: '1rem',      // 16px
  lg: '1.5rem',    // 24px
  xl: '2rem',      // 32px
  '2xl': '3rem'    // 48px
} as const;

// Border radius
export const RADIUS = {
  none: 'rounded-none',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  full: 'rounded-full'
} as const;

// Common component styles
export const COMPONENT_STYLES = {
  card: 'bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm',
  cardHover: 'bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow',
  button: 'px-3 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
  input: 'px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white',
  badge: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium'
} as const;

// Utility functions
export function getWalkabilityColorScheme(rating: keyof typeof DESIGN_COLORS.walkability) {
  return DESIGN_COLORS.walkability[rating];
}

export function getTransportColorScheme(mode: keyof typeof DESIGN_COLORS.transport) {
  return DESIGN_COLORS.transport[mode];
}

export function getAmenityStyle(category: keyof typeof DESIGN_COLORS.amenities) {
  return DESIGN_COLORS.amenities[category];
}

// Animation classes
export const ANIMATIONS = {
  fadeIn: 'animate-in fade-in duration-200',
  slideIn: 'animate-in slide-in-from-bottom duration-300',
  scaleIn: 'animate-in zoom-in duration-200',
  progress: 'transition-all duration-500 ease-out'
} as const;

// Typography scale
export const TYPOGRAPHY = {
  caption: 'text-xs text-gray-500 dark:text-gray-400',
  body: 'text-sm text-gray-700 dark:text-gray-300',
  heading: 'text-lg font-semibold text-gray-900 dark:text-white',
  subheading: 'text-base font-medium text-gray-800 dark:text-gray-200'
} as const;

// Responsive breakpoints
export const BREAKPOINTS = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px'
} as const;

// Common layout patterns
export const LAYOUT = {
  gridResponsive: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4',
  flexCenter: 'flex items-center justify-center',
  flexBetween: 'flex items-center justify-between',
  stack: 'flex flex-col space-y-4'
} as const;
