export interface BlogCategory {
  name: string;
  color: {
    bg: string;
    text: string;
    border?: string;
  };
  icon: string;
  description: string;
}

export const BLOG_CATEGORIES: Record<string, BlogCategory> = {
  'Market Analysis': {
    name: 'Market Analysis',
    color: {
      bg: 'bg-blue-100',
      text: 'text-blue-800',
      border: 'border-blue-200'
    },
    icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
    description: 'Comprehensive market data analysis and trends'
  },
  'Investment': {
    name: 'Investment',
    color: {
      bg: 'bg-emerald-100',
      text: 'text-emerald-800',
      border: 'border-emerald-200'
    },
    icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1',
    description: 'Buy-to-let opportunities and investment strategies'
  },
  'Market Trends': {
    name: 'Market Trends',
    color: {
      bg: 'bg-orange-100',
      text: 'text-orange-800',
      border: 'border-orange-200'
    },
    icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
    description: 'Price movements and market momentum analysis'
  },
  'Planning': {
    name: 'Planning',
    color: {
      bg: 'bg-purple-100',
      text: 'text-purple-800',
      border: 'border-purple-200'
    },
    icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
    description: 'Development planning and future supply analysis'
  },
  'Location Analysis': {
    name: 'Location Analysis',
    color: {
      bg: 'bg-indigo-100',
      text: 'text-indigo-800',
      border: 'border-indigo-200'
    },
    icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z',
    description: 'Amenities and location-based value analysis'
  },
  'Market Guide': {
    name: 'Market Guide',
    color: {
      bg: 'bg-pink-100',
      text: 'text-pink-800',
      border: 'border-pink-200'
    },
    icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
    description: 'Comprehensive guides and decision frameworks'
  },
  'Renting': {
    name: 'Renting',
    color: {
      bg: 'bg-green-100',
      text: 'text-green-800',
      border: 'border-green-200'
    },
    icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
    description: 'Rental market analysis and renting guides'
  }
};

export const getCategoryConfig = (categoryName: string): BlogCategory | null => {
  return BLOG_CATEGORIES[categoryName] || null;
};

export const getCategoryClasses = (categoryName: string, variant: 'badge' | 'button' = 'badge') => {
  const category = getCategoryConfig(categoryName);
  if (!category) return '';

  if (variant === 'badge') {
    return `${category.color.bg} ${category.color.text}`;
  }

  // Button variant for active/inactive states
  return {
    active: `bg-blue-600 text-white shadow-lg transform scale-105`,
    inactive: `bg-slate-100 text-slate-700 hover:bg-slate-200 hover:shadow-md`
  };
};
