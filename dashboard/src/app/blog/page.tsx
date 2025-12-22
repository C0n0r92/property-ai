import { Metadata } from 'next';
import Link from 'next/link';
import { useState, useMemo, useRef, useEffect } from 'react';
import { NewsletterSignup } from '@/components/NewsletterSignup';
import { ArticleCardSkeleton } from '@/components/ArticleCardSkeleton';
import { getCategoryConfig } from '@/lib/blog-categories';

export const metadata: Metadata = {
  title: 'Market Research & Intelligence | Irish Property Data',
  description: 'Professional market analysis and data-driven insights for Dublin\'s property landscape. Access comprehensive research on property trends, investment opportunities, and market analysis.',
  keywords: ['Dublin property market', 'market research', 'property analysis', 'investment research', 'real estate insights', 'Dublin property trends'],
  openGraph: {
    title: 'Market Research & Intelligence | Irish Property Data',
    description: 'Professional market analysis and data-driven insights for Dublin\'s property landscape.',
    type: 'website',
    url: 'https://irishpropertydata.com/blog',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Market Research & Intelligence | Irish Property Data',
    description: 'Professional market analysis and data-driven insights for Dublin\'s property landscape.',
  },
  alternates: {
    canonical: '/blog',
  },
};

// Research articles data
const researchArticles = [
  {
    id: 'dublin-property-market-q4-2024',
    title: 'Dublin Property Market Analysis Q4 2024',
    excerpt: 'Comprehensive analysis of Dublin\'s property market performance, price trends, and future outlook based on 43,000+ transactions.',
    category: 'Market Analysis',
    date: '2024-12-22',
    readTime: '8 min read',
    featured: true,
    tags: ['Market Trends', 'Price Analysis', 'Q4 2024'],
    author: 'Market Research Team',
    views: 2847,
  },
  {
    id: 'properties-over-asking-dublin',
    title: 'Where Dublin Properties Go Most Over Asking Price in 2024',
    excerpt: 'Detailed breakdown of Dublin areas where properties consistently sell above asking price, with market demand indicators.',
    category: 'Market Analysis',
    date: '2024-12-22',
    readTime: '6 min read',
    featured: false,
    tags: ['Over Asking', 'Market Demand', 'Buyer Competition'],
    author: 'Market Research Team',
    views: 1923,
  },
  {
    id: 'dublin-rental-yield-analysis',
    title: 'Dublin Rental Yield Analysis: Best Areas for Property Investment',
    excerpt: 'Comprehensive analysis of rental yields across Dublin areas with investment potential and risk assessment.',
    category: 'Investment',
    date: '2024-12-22',
    readTime: '7 min read',
    featured: false,
    tags: ['Rental Yield', 'Investment', 'Buy-to-Let'],
    author: 'Investment Research Team',
    views: 1654,
  },
  {
    id: 'dublin-price-per-square-meter',
    title: 'Dublin Property Price Per Square Meter: Comprehensive Area Comparison',
    excerpt: 'Detailed analysis of price per square meter across all Dublin areas with value insights and market segmentation.',
    category: 'Market Analysis',
    date: '2024-12-22',
    readTime: '5 min read',
    featured: false,
    tags: ['Price per m²', 'Value Analysis', 'Market Comparison'],
    author: 'Market Research Team',
    views: 2134,
  },
  {
    id: 'fastest-growing-areas-dublin',
    title: 'Dublin Areas with Fastest Property Price Growth: 6-Month Analysis',
    excerpt: 'Analysis of Dublin\'s fastest growing property markets with momentum indicators and emerging opportunities.',
    category: 'Market Trends',
    date: '2024-12-22',
    readTime: '6 min read',
    featured: false,
    tags: ['Price Growth', 'Market Momentum', 'Investment Opportunities'],
    author: 'Market Research Team',
    views: 1789,
  },
  {
    id: 'planning-permission-activity',
    title: 'Planning Permission Activity and Future Property Supply in Dublin',
    excerpt: 'Analysis of development applications and future property supply across Dublin\'s planning pipeline.',
    category: 'Planning',
    date: '2024-12-22',
    readTime: '9 min read',
    featured: false,
    tags: ['Planning Permission', 'Future Supply', 'Development'],
    author: 'Planning Research Team',
    views: 1456,
  },
  {
    id: 'property-types-analysis',
    title: 'Dublin Property Types Analysis: Apartments vs Houses Market Dynamics',
    excerpt: 'Comparative analysis of apartments versus houses in Dublin with price trends and market preferences.',
    category: 'Market Analysis',
    date: '2024-12-22',
    readTime: '7 min read',
    featured: false,
    tags: ['Property Types', 'Apartments', 'Houses'],
    author: 'Market Research Team',
    views: 2341,
  },
  {
    id: 'bedroom-count-analysis',
    title: 'Bedroom Count vs Property Prices: Dublin Market Breakdown',
    excerpt: 'Analysis of how bedroom count affects property prices across Dublin with cost per bedroom insights.',
    category: 'Market Analysis',
    date: '2024-12-22',
    readTime: '5 min read',
    featured: false,
    tags: ['Bedrooms', 'Price Analysis', 'Property Size'],
    author: 'Market Research Team',
    views: 1987,
  },
  {
    id: 'amenities-impact-prices',
    title: 'Dublin Property Amenities Impact Analysis: Schools, Transport, and Value',
    excerpt: 'Quantitative analysis of how proximity to amenities affects Dublin property prices and values.',
    category: 'Location Analysis',
    date: '2024-12-22',
    readTime: '8 min read',
    featured: false,
    tags: ['Amenities', 'Schools', 'Transport'],
    author: 'Location Research Team',
    views: 1678,
  },
  {
    id: 'complete-area-rankings',
    title: 'Complete Guide to Dublin Property Areas: Price, Yield, and Growth Rankings',
    excerpt: 'Comprehensive rankings of all Dublin areas across multiple factors for informed property decisions.',
    category: 'Market Guide',
    date: '2024-12-22',
    readTime: '10 min read',
    featured: false,
    tags: ['Area Rankings', 'Comprehensive Guide', 'Decision Framework'],
    author: 'Market Research Team',
    views: 3124,
  },
  {
    id: 'dublin-luxury-hotspots-2024',
    title: 'Dublin Luxury Property Hotspots: D6 Leads with €976k Average Price',
    excerpt: 'Data analysis reveals Dublin\'s most expensive property markets, with D6 commanding the highest average prices at €976k based on 695 recent transactions.',
    category: 'Market Analysis',
    date: '2024-12-23',
    readTime: '6 min read',
    featured: true,
    tags: ['Luxury Properties', 'Area Analysis', 'Premium Market'],
    author: 'Market Research Team',
    views: 4521,
  },
  {
    id: 'over-asking-phenomenon-2024',
    title: 'Dublin Over-Asking Phenomenon: 85.6% of D14 Properties Sell Above Asking Price',
    excerpt: 'Record-breaking analysis shows 85.6% of D14 properties selling over asking price, with an average premium of 11% across Dublin\'s 21,059 recent transactions.',
    category: 'Market Trends',
    date: '2024-12-24',
    readTime: '5 min read',
    featured: false,
    tags: ['Over Asking', 'Market Demand', 'Buyer Competition'],
    author: 'Market Research Team',
    views: 3876,
  },
  {
    id: 'extensions-attic-conversions-property-value-2024',
    title: 'Extensions & Attic Conversions: Dublin Properties Worth 164% More After Renovations',
    excerpt: 'Data analysis reveals properties in Dublin 6 with extensions sell for 164% more than similar non-extended homes, backed by planning permission records showing attic conversions and rear extensions.',
    category: 'Market Analysis',
    date: '2024-12-29',
    readTime: '8 min read',
    featured: true,
    tags: ['Extensions', 'Attic Conversions', 'Property Value', 'Renovations'],
    author: 'Market Research Team',
    views: 5234,
  },
  {
    id: 'detached-houses-dominance',
    title: 'Detached Houses Dominate: €1.1M Average Price in Dublin Premium Market',
    excerpt: 'Detached properties lead Dublin\'s market with €1.1M average price across 1,666 transactions, commanding 85% premium over apartments.',
    category: 'Market Analysis',
    date: '2024-12-25',
    readTime: '7 min read',
    featured: false,
    tags: ['Property Types', 'Detached Houses', 'Market Segmentation'],
    author: 'Market Research Team',
    views: 3245,
  },
  {
    id: 'dublin-postcode-power-rankings',
    title: 'Dublin Postcode Power Rankings: Complete 2024 Investment Guide',
    excerpt: 'Comprehensive analysis of all Dublin postcodes reveals D6 as top performer with €9,769/sqm, while D24 offers best value at €3,412/sqm.',
    category: 'Investment',
    date: '2024-12-26',
    readTime: '8 min read',
    featured: false,
    tags: ['Area Rankings', 'Investment Guide', 'Price Analysis'],
    author: 'Investment Research Team',
    views: 5678,
  },
  {
    id: 'bedroom-count-property-values',
    title: 'Size Matters: Bedroom Count vs Property Values in Dublin 2024',
    excerpt: 'Detailed analysis shows 4-bedroom properties average €888k vs €394k for apartments, revealing clear pricing patterns by property size.',
    category: 'Market Analysis',
    date: '2024-12-27',
    readTime: '6 min read',
    featured: false,
    tags: ['Property Size', 'Bedroom Analysis', 'Value Comparison'],
    author: 'Market Research Team',
    views: 4231,
  },
  {
    id: 'dublin-undervalued-gems-2024',
    title: 'Dublin\'s Hidden Gems: Undervalued Areas with 78%+ Over-Asking Rates',
    excerpt: 'Discover Dublin\'s best-kept secrets: D6W leads with 83.7% over-asking rate while maintaining relatively affordable entry points.',
    category: 'Investment',
    date: '2024-12-28',
    readTime: '7 min read',
    featured: false,
    tags: ['Undervalued Areas', 'Growth Potential', 'Market Opportunities'],
    author: 'Investment Research Team',
    views: 4987,
  },
];

const categories = ['All', 'Market Analysis', 'Investment', 'Market Trends', 'Planning', 'Location Analysis', 'Market Guide'];
const ARTICLES_PER_PAGE = 9;

export default function BlogPage() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('date');
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filtered and sorted articles
  const filteredArticles = useMemo(() => {
    let filtered = researchArticles.filter(article => {
      const matchesCategory = selectedCategory === 'All' || article.category === selectedCategory;
      const matchesSearch = searchQuery === '' ||
        article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesCategory && matchesSearch;
    });

    // Sort articles
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case 'title':
          return a.title.localeCompare(b.title);
        case 'views':
          return b.views - a.views;
        default:
          return 0;
      }
    });

    return filtered;
  }, [selectedCategory, searchQuery, sortBy]);

  const totalPages = Math.ceil(filteredArticles.length / ARTICLES_PER_PAGE);
  const paginatedArticles = filteredArticles.slice(
    (currentPage - 1) * ARTICLES_PER_PAGE,
    currentPage * ARTICLES_PER_PAGE
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 200);
    return () => clearTimeout(timer);
  }, [selectedCategory, searchQuery, sortBy]);

  const featuredArticle = researchArticles.find(article => article.featured);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Compact Header */}
      <div className="relative bg-gradient-to-r from-indigo-900 via-blue-900 to-purple-900 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-4 left-4 w-32 h-32 bg-white rounded-full mix-blend-multiply filter blur-xl"></div>
          <div className="absolute top-8 right-8 w-24 h-24 bg-purple-300 rounded-full mix-blend-multiply filter blur-lg"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 py-8 lg:py-12">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Left side - Title and description */}
            <div className="flex-1">
              {/* Breadcrumb */}
              <nav className="flex items-center space-x-2 text-slate-300 text-sm mb-3">
                <Link href="/" className="hover:text-white transition-colors">Home</Link>
                <span>/</span>
                <span className="text-white font-medium">Market Research</span>
              </nav>

              {/* Title */}
              <h1 className="text-2xl lg:text-4xl font-bold text-white mb-2">
                Market Research & Intelligence
              </h1>

              {/* Subtitle */}
              <p className="text-slate-300 text-sm lg:text-base max-w-2xl leading-relaxed">
                Professional market analysis and data-driven insights for Dublin's property landscape.
              </p>
            </div>

            {/* Right side - Stats */}
            <div className="flex items-center gap-4 lg:gap-6">
              <div className="text-center">
                <div className="text-lg lg:text-xl font-bold text-white">{researchArticles.length}</div>
                <div className="text-slate-300 text-xs">Articles</div>
              </div>
              <div className="text-center">
                <div className="text-lg lg:text-xl font-bold text-white">{categories.length - 1}</div>
                <div className="text-slate-300 text-xs">Categories</div>
              </div>
              <div className="text-center">
                <div className="text-lg lg:text-xl font-bold text-white">Free</div>
                <div className="text-slate-300 text-xs">Access</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8" id="articles">
        {/* Filters Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8">
          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Category Filters */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Categories</h3>
            <div className="flex flex-wrap gap-3">
              {categories.map(category => {
                const categoryConfig = getCategoryConfig(category);
                return (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-6 py-3 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                      selectedCategory === category
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg transform scale-105'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 hover:shadow-md'
                    }`}
                  >
                    {categoryConfig && (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={categoryConfig.icon} />
                      </svg>
                    )}
                    {category}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sort and View Controls */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-600">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="date">Latest First</option>
                <option value="title">Title A-Z</option>
                <option value="views">Most Viewed</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600 mr-2">View:</span>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="flex justify-between items-center mb-8">
          <div className="text-slate-600">
            Showing {((currentPage - 1) * ARTICLES_PER_PAGE) + 1}-{Math.min(currentPage * ARTICLES_PER_PAGE, filteredArticles.length)} of {filteredArticles.length} articles
            {searchQuery && <span> matching "{searchQuery}"</span>}
            {selectedCategory !== 'All' && <span> in {selectedCategory}</span>}
          </div>
        </div>

        {/* Articles Grid/List */}
        {isLoading ? (
          <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" : "space-y-6"}>
            {Array.from({ length: ARTICLES_PER_PAGE }, (_, i) => (
              <ArticleCardSkeleton key={`skeleton-${i}`} />
            ))}
          </div>
        ) : (
          <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8" : "space-y-6"}>
            {paginatedArticles.map(article => (
              <article
                key={article.id}
                className={`group bg-white rounded-2xl shadow-sm hover:shadow-xl border border-slate-200 hover:border-slate-300 transition-all duration-300 overflow-hidden ${
                  viewMode === 'list' ? 'flex' : ''
                }`}
              >
                {/* Article Content */}
                <div className={`p-6 ${viewMode === 'list' ? 'flex-1' : ''}`}>
                  {/* Category Badge */}
                  <div className="flex items-start justify-between mb-4">
                    <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${
                      getCategoryConfig(article.category)?.color.bg || 'bg-slate-100'
                    } ${
                      getCategoryConfig(article.category)?.color.text || 'text-slate-800'
                    }`}>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={
                          getCategoryConfig(article.category)?.icon || 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z'
                        } />
                      </svg>
                      {article.category}
                    </span>
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>{article.views.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-bold text-slate-900 mb-3 leading-tight group-hover:text-blue-600 transition-colors">
                    <Link href={`/blog/${article.id}`} className="block">
                      {article.title}
                    </Link>
                  </h3>

                  {/* Excerpt */}
                  <p className="text-slate-600 mb-4 line-clamp-3 leading-relaxed">{article.excerpt}</p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {article.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium">
                        {tag}
                      </span>
                    ))}
                    {article.tags.length > 3 && (
                      <span className="px-2.5 py-1 bg-slate-50 text-slate-500 rounded-lg text-xs">
                        +{article.tags.length - 3} more
                      </span>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <span>{article.date}</span>
                      <span>•</span>
                      <span>{article.readTime}</span>
                      <span>•</span>
                      <span>{article.author}</span>
                    </div>
                    <Link
                      href={`/blog/${article.id}`}
                      className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold text-sm transition-colors"
                    >
                      <span>Read More</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </Link>
                  </div>
                </div>

                {/* Featured Badge for Grid View */}
                {viewMode === 'grid' && article.featured && (
                  <div className="absolute top-4 right-4">
                    <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg">
                      Featured
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-16">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 text-sm rounded-xl bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Previous
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-12 h-12 rounded-xl text-sm font-medium transition-all duration-200 ${
                        currentPage === pageNum
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg transform scale-105'
                          : 'bg-white border border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 text-sm rounded-xl bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2"
              >
                Next
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}


        {/* Explore Areas Section */}
        <div className="mt-20 mb-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">
              Explore Areas Featured in Research
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Discover detailed market analysis for Dublin's key neighborhoods and property hotspots
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { href: '/areas/dublin-4', name: 'Dublin 4', desc: 'Premium Market', color: 'from-blue-500 to-blue-600' },
              { href: '/areas/dublin-6', name: 'Dublin 6', desc: 'Family Areas', color: 'from-green-500 to-green-600' },
              { href: '/areas/dublin-2', name: 'Dublin 2', desc: 'City Centre', color: 'from-purple-500 to-purple-600' },
              { href: '/areas', name: 'All Areas', desc: 'Complete List', color: 'from-orange-500 to-red-500' }
            ].map((area, index) => (
              <Link
                key={area.href}
                href={area.href}
                className={`group relative overflow-hidden bg-gradient-to-br ${area.color} rounded-3xl p-8 text-white hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="relative">
                  <div className="text-2xl font-bold mb-2">{area.name}</div>
                  <div className="text-white/80 text-sm">{area.desc}</div>
                  <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-white/10 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Newsletter Signup */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 rounded-3xl p-12 text-white text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">
              Stay Ahead of the Market
            </h2>
            <p className="text-xl text-slate-300 mb-8 leading-relaxed">
              Get weekly market insights, analysis updates, and exclusive research delivered to your inbox.
            </p>
            <NewsletterSignup />
          </div>
        </div>
      </div>
    </div>
  );
}
