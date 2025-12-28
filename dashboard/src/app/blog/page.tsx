'use client'

import Link from 'next/link';
import { useState, useMemo, useRef, useEffect } from 'react';
import { NewsletterSignup } from '@/components/NewsletterSignup';
import { ArticleCardSkeleton } from '@/components/ArticleCardSkeleton';
import { getCategoryConfig } from '@/lib/blog-categories';
import { HeroSection } from '@/components/HeroSection';

// Research articles data
const researchArticles = [
  {
    id: 'dublin-bidding-war-costs',
    title: 'How Dublin Bidding Wars Can Add €90,000+ Over 30 Years',
    excerpt: 'Dublin bidding wars can cost €90,000+ over 30 years when you include both the premium and extra interest payments. Discover the true lifetime cost of competitive property buying.',
    category: 'Financial Analysis',
    date: '2025-12-28',
    readTime: '8 min read',
    featured: true,
    tags: ['Bidding War Costs', 'Mortgage Impact', 'Long-term Costs', 'Property Investment', 'Financial Planning', 'Dublin Market'],
    author: 'Market Research Team',
    views: 1100,
  },
  {
    id: 'dublin-bidding-wars-analysis',
    title: 'Dublin Bidding Wars: Where Properties Sell Over Asking Price and Why',
    excerpt: 'Dublin bidding wars analysis reveals 78.8% of properties sell over asking price with 10.74% average premium. Discover bidding war hotspots, under-performing areas, and strategic insights for buyers and sellers.',
    category: 'Market Analysis',
    date: '2025-12-27',
    readTime: '7 min read',
    featured: false,
    tags: ['Dublin Bidding Wars', 'Over Asking Price', 'Property Competition', 'Buyer Strategies', 'Seller Strategies', 'Market Hotspots'],
    author: 'Market Research Team',
    views: 1250,
  },
  {
    id: 'dublin-property-market-q4-2024',
    title: 'Dublin Property Market Q4 2024 Data: Complete Analysis & Price Trends',
    excerpt: 'Dublin property market analysis Q4 2024 reveals price trends, market performance, and future outlook based on 43,000+ property transactions. Get the latest Dublin real estate insights.',
    category: 'Market Analysis',
    date: '2024-03-15',
    readTime: '8 min read',
    featured: false,
    tags: ['Dublin Property Market', 'Q4 2024', 'Price Trends', 'Market Analysis', 'Property Prices', 'Dublin Real Estate'],
    author: 'Market Research Team',
    views: 2847,
  },
  {
    id: 'dublin-properties-over-asking-price-2024',
    title: 'Dublin Properties Over Asking Price 2024 Data: Hot Areas & Market Demand',
    excerpt: 'Which Dublin areas sell over asking price most? 2024 analysis shows hotspots where properties consistently achieve bidding wars. Essential guide for Dublin property buyers.',
    category: 'Market Analysis',
    date: '2024-05-22',
    readTime: '6 min read',
    featured: false,
    tags: ['Dublin Over Asking', 'Property Prices', 'Market Demand', 'Buyer Competition', 'Dublin Hotspots', 'Bidding Wars'],
    author: 'Market Research Team',
    views: 1923,
  },
  {
    id: 'dublin-rental-yield-analysis-best-areas',
    title: 'Dublin Rental Yields 2024 Data: Best Areas for Buy-to-Let Investment',
    excerpt: 'Dublin rental yield analysis reveals top areas for property investment. Discover which Dublin postcodes offer the highest rental returns for buy-to-let investors.',
    category: 'Investment',
    date: '2024-07-08',
    readTime: '7 min read',
    featured: false,
    tags: ['Dublin Rental Yields', 'Buy-to-Let Investment', 'Property Investment', 'Rental Returns', 'Dublin Areas', 'ROI'],
    author: 'Investment Research Team',
    views: 1654,
  },
  {
    id: 'dublin-price-per-square-meter-area-comparison',
    title: 'Dublin Price Per Square Meter 2024 Data: Complete Area-by-Area Analysis',
    excerpt: 'Dublin property prices per square meter compared across all areas. Find out which Dublin neighborhoods offer the best value for money in 2024.',
    category: 'Market Analysis',
    date: '2024-09-12',
    readTime: '5 min read',
    featured: false,
    tags: ['Dublin Price per m²', 'Property Values', 'Area Comparison', 'Dublin Neighborhoods', 'Value for Money', 'Real Estate Pricing'],
    author: 'Market Research Team',
    views: 2134,
  },
  {
    id: 'fastest-growing-areas-dublin',
    title: 'Dublin Areas with Fastest Property Price Growth: 6-Month Analysis',
    excerpt: 'Analysis of Dublin\'s fastest growing property markets with momentum indicators and emerging opportunities.',
    category: 'Market Trends',
    date: '2025-12-02',
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
    date: '2025-12-03',
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
    date: '2025-12-08',
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
    date: '2025-12-12',
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
    date: '2025-12-15',
    readTime: '8 min read',
    featured: false,
    tags: ['Amenities', 'Schools', 'Transport'],
    author: 'Location Research Team',
    views: 1678,
  },
  {
    id: 'dublin-property-areas-complete-guide-rankings',
    title: 'Dublin Property Areas 2024 Data: Complete Guide with Prices, Yields & Rankings',
    excerpt: 'Ultimate guide to Dublin property areas 2024. Compare all Dublin neighborhoods by price, rental yield, and growth potential. Essential for property buyers and investors.',
    category: 'Location Analysis',
    date: '2024-01-18',
    readTime: '12 min read',
    featured: false,
    tags: ['Dublin Property Areas', 'Area Rankings', 'Dublin Neighborhoods', 'Property Prices', 'Rental Yields', 'Investment Guide'],
    author: 'Market Research Team',
    views: 3124,
  },
  {
    id: 'dublin-luxury-hotspots-2024',
    title: 'Dublin Luxury Property Hotspots 2024 Data: D6 Leads with €976k Average Price',
    excerpt: 'Data analysis reveals Dublin\'s most expensive property markets, with D6 commanding the highest average prices at €976k based on 695 recent transactions.',
    category: 'Market Analysis',
    date: '2024-04-25',
    readTime: '6 min read',
    featured: true,
    tags: ['Luxury Properties', 'Area Analysis', 'Premium Market'],
    author: 'Market Research Team',
    views: 4521,
  },
  {
    id: 'over-asking-phenomenon-2024',
    title: 'Dublin Over-Asking Phenomenon 2024 Data: 85.6% of D14 Properties Sell Above Asking Price',
    excerpt: 'Record-breaking analysis shows 85.6% of D14 properties selling over asking price, with an average premium of 11% across Dublin\'s 21,059 recent transactions.',
    category: 'Market Trends',
    date: '2024-06-14',
    readTime: '5 min read',
    featured: false,
    tags: ['Over Asking', 'Market Demand', 'Buyer Competition'],
    author: 'Market Research Team',
    views: 3876,
  },
  {
    id: 'detached-houses-dominance',
    title: 'Detached Houses Dominate 2024 Data: €1.1M Average Price in Dublin Premium Market',
    excerpt: 'Detached properties lead Dublin\'s market with €1.1M average price across 1,666 transactions, commanding 85% premium over apartments.',
    category: 'Market Analysis',
    date: '2024-08-09',
    readTime: '7 min read',
    featured: false,
    tags: ['Property Types', 'Detached Houses', 'Market Segmentation'],
    author: 'Market Research Team',
    views: 3245,
  },
  {
    id: 'dublin-postcode-power-rankings',
    title: 'Dublin Postcode Power Rankings 2024 Data: Complete Investment Guide',
    excerpt: 'Comprehensive analysis of all Dublin postcodes reveals D6 as top performer with €9,769/sqm, while D24 offers best value at €3,412/sqm.',
    category: 'Investment',
    date: '2024-10-31',
    readTime: '8 min read',
    featured: false,
    tags: ['Area Rankings', 'Investment Guide', 'Price Analysis'],
    author: 'Investment Research Team',
    views: 5678,
  },
  {
    id: 'bedroom-count-property-values',
    title: 'Size Matters: Bedroom Count vs Property Values in Dublin 2024 Data',
    excerpt: 'Detailed analysis shows 4-bedroom properties average €888k vs €394k for apartments, revealing clear pricing patterns by property size.',
    category: 'Market Analysis',
    date: '2024-02-07',
    readTime: '6 min read',
    featured: false,
    tags: ['Property Size', 'Bedroom Analysis', 'Value Comparison'],
    author: 'Market Research Team',
    views: 187,
  },
  {
    id: 'dublin-undervalued-gems-2024',
    title: 'Dublin\'s Hidden Gems 2024 Data: Undervalued Areas with 78%+ Over-Asking Rates',
    excerpt: 'Discover Dublin\'s best-kept secrets: D6W leads with 83.7% over-asking rate while maintaining relatively affordable entry points.',
    category: 'Investment',
    date: '2024-11-20',
    readTime: '7 min read',
    featured: false,
    tags: ['Undervalued Areas', 'Growth Potential', 'Market Opportunities'],
    author: 'Investment Research Team',
    views: 234,
  },
  {
    id: 'affordable-hotspots-2025',
    title: 'Dublin\'s Affordable Hotspots 2025: Where 90%+ Properties Sell Over Asking for Under €400K',
    excerpt: 'Data reveals fierce buyer competition in affordable areas - D10 leads with 91.3% over-asking rate at just €307K average, based on 4,919 transactions.',
    category: 'Market Analysis',
    date: '2025-12-04',
    readTime: '7 min read',
    featured: true,
    tags: ['Affordable Areas', 'Over Asking', 'First-Time Buyers', '2025 Data'],
    author: 'Market Research Team',
    views: 0,
  },
  {
    id: 'property-size-premium-2025',
    title: 'Dublin Property Size Premium 2025: Why Homes Over 150sqm Cost 127% More',
    excerpt: 'Space commands a massive premium - analysis of 3,358 large properties reveals 127% price increase over market average, with implications for buyers and investors.',
    category: 'Market Analysis',
    date: '2025-12-09',
    readTime: '8 min read',
    featured: false,
    tags: ['Property Size', 'Space Premium', 'Value Analysis', '2025 Trends'],
    author: 'Market Research Team',
    views: 0,
  },
  {
    id: 'q4-2024-vs-q1-2025-market-shift',
    title: 'Dublin Property Market Q4 2024 vs Q1 2025: How Prices Shifted Into The New Year',
    excerpt: 'Quarter-over-quarter analysis reveals real market movements - 1,850 Q1 2025 transactions show €583K average with shifting competition patterns.',
    category: 'Market Trends',
    date: '2025-12-11',
    readTime: '9 min read',
    featured: true,
    tags: ['Market Trends', 'Q1 2025', 'Price Analysis', 'Seasonal Patterns'],
    author: 'Market Research Team',
    views: 0,
  },
  {
    id: 'rental-yields-buy-to-let-2025',
    title: 'Dublin Rental Yields 2025: Best Areas for Buy-to-Let Investors - 9.6% Returns in D22',
    excerpt: 'Comprehensive rental yield analysis across 27,239 properties reveals top investment areas - D22 leads with 9.6% yield, D11 at 9.1%, based on 11,670 high-confidence estimates.',
    category: 'Investment',
    date: '2025-12-13',
    readTime: '10 min read',
    featured: false,
    tags: ['Rental Yield', 'Buy-to-Let', 'Investment', 'ROI Analysis', '2025 Data'],
    author: 'Investment Research Team',
    views: 0,
  },
  {
    id: 'dublin-rental-guide-2025',
    title: 'Dublin Rental Guide 2025: Where to Find Affordable Rentals - €2,459/Month in D1',
    excerpt: 'Complete renter\'s guide analyzing 27,239 rental properties - from €1,963 for 1-beds to most affordable neighborhoods, with actual monthly costs across Dublin.',
    category: 'Renting',
    date: '2025-12-16',
    readTime: '8 min read',
    featured: true,
    tags: ['Renting', 'Rental Prices', 'Affordable Areas', 'Budget Guide', '2025 Data'],
    author: 'Market Research Team',
    views: 0,
  },
  {
    id: 'biggest-price-improvements-6-months',
    title: 'Dublin Areas Showing Biggest Price Improvement: 6-Month Analysis',
    excerpt: 'Comprehensive analysis reveals Foxrock Dublin 18 leading with 121.4% price increase, followed by Sandycove at 106.5% and Dalkey at 45.7% - based on 43,830 property transactions.',
    category: 'Market Trends',
    date: '2025-12-05',
    readTime: '10 min read',
    featured: true,
    tags: ['Price Growth', 'Market Trends', 'Area Analysis', '6-Month Analysis'],
    author: 'Market Research Team',
    views: 0,
  },
  {
    id: 'asking-price-strategy-dublin',
    title: 'The Asking Price Strategy: How Dublin Sellers Set Prices to Drive Bidding Wars',
    excerpt: 'Dublin property market analysis reveals 84.3% of properties sell over asking price with 7.5% average premium, examining strategic pricing patterns across property types and areas.',
    category: 'Market Analysis',
    date: '2025-12-18',
    readTime: '7 min read',
    featured: true,
    tags: ['Pricing Strategy', 'Bidding Wars', 'Market Psychology'],
    author: 'Market Research Team',
    views: 456,
  },
  {
    id: '250k-350k-property-bracket-dublin',
    title: 'The €250,000-€350,000 Bracket: Dublin\'s Largest Property Market Segment',
    excerpt: 'Analysis of Dublin\'s largest property segment reveals 8,930 properties in the €250k-€350k range, with apartments dominating (50.5%) and key insights for first-time buyers.',
    category: 'Market Analysis',
    date: '2025-12-22',
    readTime: '6 min read',
    featured: false,
    tags: ['Price Brackets', 'First-Time Buyers', 'Market Segments'],
    author: 'Market Research Team',
    views: 1650,
  },
  {
    id: 'dublin-apartment-market-2025',
    title: 'Dublin Apartment Market 2025: Comprehensive Analysis from €280,000 to €2.1M',
    excerpt: 'Dublin apartment market analysis covers 11,448 transactions with median €340,000 price, examining bedroom distribution, geographic trends, and investment potential.',
    category: 'Market Analysis',
    date: '2025-01-01',
    readTime: '8 min read',
    featured: false,
    tags: ['Apartments', 'Investment', 'Urban Living'],
    author: 'Market Research Team',
    views: 2100,
  },
  {
    id: '3-bed-property-sweet-spot',
    title: 'The 3-Bed Sweet Spot: Why 38% of Dublin Buyers Choose This Property Size',
    excerpt: '3-bedroom properties dominate Dublin market at 38.4% of transactions, with median €475,000 price and strong rental yields across semi-detached, terraced, and apartment options.',
    category: 'Market Analysis',
    date: '2025-01-02',
    readTime: '7 min read',
    featured: false,
    tags: ['3-Bed Properties', 'Family Homes', 'Market Trends'],
    author: 'Market Research Team',
    views: 1950,
  },
  {
    id: 'commuter-calculation-dublin',
    title: 'The Commuter Calculation: Dublin Properties by Distance from City Centre',
    excerpt: 'Property analysis by distance from Dublin city centre reveals median prices from €460,000 (0-5km) to €385,000 (15-25km), with space and yield trade-offs for different buyer profiles.',
    category: 'Location Analysis',
    date: '2025-01-03',
    readTime: '8 min read',
    featured: false,
    tags: ['Location Analysis', 'Commuting', 'Remote Work'],
    author: 'Market Research Team',
    views: 1750,
  },
  {
    id: 'christmas-property-market-analysis',
    title: 'Christmas Property Sales: Dublin Market Shutdown and Price Impact Analysis',
    excerpt: 'Analysis of December property sales reveals significant market slowdown during Christmas week with 8.1% lower prices and near-zero activity on Dec 25.',
    category: 'Market Trends',
    date: '2025-01-04',
    readTime: '6 min read',
    featured: false,
    tags: ['Christmas Sales', 'Market Activity', 'Seasonal Trends', 'Property Prices'],
    author: 'Market Research Team',
    views: 4237,
  },
  {
    id: 'investor-yield-curve',
    title: 'The Investor\'s Yield Curve: How €300k Less Property Doubles Your Returns',
    excerpt: 'Analysis of Dublin\'s rental yield curve reveals sub-€300k properties deliver 11.52% yields vs 4.88% for €700k+ properties, with the "Duplex Paradox" where premium types achieve both high yields and strong over-asking success.',
    category: 'Investment',
    date: '2025-12-06',
    readTime: '8 min read',
    featured: true,
    tags: ['Rental Yield', 'Investment Returns', 'Property Pricing', 'Duplex Paradox'],
    author: 'Market Research Team',
    views: 0,
  },
  {
    id: '3bed-phenomenon',
    title: 'The 3-Bed Phenomenon: Why Family Homes Win Dublin\'s Bidding Wars',
    excerpt: '3-bedroom properties achieve 87.4% over-asking success rates, outperforming all other sizes in Dublin\'s competitive market. Analysis reveals why family homes dominate bidding wars with clear performance patterns.',
    category: 'Market Analysis',
    date: '2025-12-19',
    readTime: '7 min read',
    featured: false,
    tags: ['3-Bed Properties', 'Family Homes', 'Over-Asking Success', 'Bedroom Analysis'],
    author: 'Market Research Team',
    views: 0,
  },
  {
    id: 'd4-premium',
    title: 'The D4 Premium: What €400,000 Extra Actually Buys You',
    excerpt: 'D4 properties command escalating premiums from 36.4% for 1-bed apartments to 90.8% for 4-bed homes. Analysis quantifies what additional €400,000+ buys in space, location, and efficiency.',
    category: 'Market Analysis',
    date: '2025-12-21',
    readTime: '8 min read',
    featured: false,
    tags: ['D4 Premium', 'Property Pricing', 'Space Efficiency', 'Premium Areas'],
    author: 'Market Research Team',
    views: 0,
  },
  {
    id: 'january-2025-timing',
    title: 'January 2025: Is It a Good Time to Buy or Sell Property?',
    excerpt: 'January 2025 analysis reveals 26% volume decline from December with 764 transactions, but sustained 83% over-asking rates despite severe first-week holiday disruptions affecting market timing.',
    category: 'Market Analysis',
    date: '2025-12-23',
    readTime: '8 min read',
    featured: false,
    tags: ['January 2025', 'Market Timing', 'Holiday Impact', 'Buy vs Sell'],
    author: 'Market Research Team',
    views: 0,
  },
  {
    id: 'dublin-rental-market-2025',
    title: 'Dublin Rental Market 2025: Complete Guide for Renters and Investors',
    excerpt: 'Dublin rental market analysis covers 27,236 properties with median rents from €1,925 (1-bed) to €3,931 (4-bed), revealing duplexes offer highest 9.0% yields while only 28.7% of rentals are affordable on €100k income.',
    category: 'Renting',
    date: '2025-12-26',
    readTime: '9 min read',
    featured: true,
    tags: ['Rental Market', 'Rent Prices', 'Rental Yields', 'Affordability', '2025 Data'],
    author: 'Market Research Team',
    views: 0,
  },
  {
    id: 'q2-vs-q1-selling-dublin',
    title: 'When to Sell Property Dublin: Q2 vs Q1 Seasonal Analysis 2024',
    excerpt: 'Best time to sell property in Dublin? Q2 vs Q1 analysis shows spring quarter delivers 8.86% higher sales volume and better over-asking rates. Seasonal property market timing guide.',
    category: 'Market Analysis',
    date: '2025-12-27',
    readTime: '7 min read',
    featured: false,
    tags: ['Dublin Property Selling', 'Q2 vs Q1', 'Seasonal Market', 'Property Timing', 'Spring Sales', 'Dublin Real Estate'],
    author: 'Market Research Team',
    views: 0,
  },
  {
    id: 'dublin-rental-market-tenant-perspective',
    title: 'Dublin Rental Market 2025: Tenant Guide to Affordable Housing',
    excerpt: 'Dublin rental prices 2025: Can you afford to rent in Dublin? Analysis shows rents consume 67-102% of average incomes. Find affordable areas and understand the tenant market.',
    category: 'Renting',
    date: '2025-12-27',
    readTime: '8 min read',
    featured: false,
    tags: ['Dublin Rental Market', 'Affordable Housing', 'Tenant Guide', 'Rent Prices Dublin', 'Housing Affordability', 'Property Renting'],
    author: 'Market Research Team',
    views: 0,
  },
  {
    id: 'space-efficiency-paradox',
    title: 'Space Efficiency Paradox: Why Smaller Dublin Properties Deliver More Bedrooms Per Square Meter',
    excerpt: 'Dublin\'s property market reveals a counterintuitive pattern where smaller properties achieve dramatically higher space efficiency. Properties under 80㎡ deliver 2.66 bedrooms per square meter while commanding premium pricing.',
    category: 'Market Analysis',
    date: '2025-12-28',
    readTime: '6 min read',
    featured: false,
    tags: ['Space Efficiency', 'Property Size', 'Bedrooms per m²', 'Market Paradox', 'Dublin Property Analysis', 'Compact Properties'],
    author: 'Market Research Team',
    views: 0,
  },
  {
    id: 'value-erosion-2021-2025',
    title: 'Value Erosion: How Dublin Property Prices Have Skyrocketed Since 2021',
    excerpt: 'Dublin property prices have increased dramatically since 2021, with detached houses rising 44% and the same money buying significantly less property value today. A €355,000 detached house in D15 that sold in 2021 would cost €1,500,000 today.',
    category: 'Market Trends',
    date: '2025-12-28',
    readTime: '7 min read',
    featured: true,
    tags: ['Property Price Inflation', 'Value Erosion', '2021 vs 2025', 'Dublin Property Prices', 'Purchasing Power', 'Market Trends'],
    author: 'Market Research Team',
    views: 0,
  },
];

const categories = ['All', 'Market Analysis', 'Investment', 'Market Trends', 'Planning', 'Location Analysis', 'Market Guide', 'Renting', 'Financial Analysis'];
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
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      <HeroSection
        title="Market Research & Intelligence"
        description="Professional market analysis and data-driven insights for Dublin's property landscape."
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Market Research' }
        ]}
        stats={[
          { label: 'Articles', value: 39 },
          { label: 'Categories', value: categories.length - 1 },
          { label: 'Access', value: 'Free' }
        ]}
      />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-4" id="articles">
        {/* Compact Filters Section */}
        <div className="card p-4 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            {/* Search Bar */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search articles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-[var(--muted)] border border-[var(--border)] rounded-lg text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all duration-200 text-sm"
                />
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Category Filters */}
            <div className="flex-1">
              <div className="flex flex-wrap gap-2">
                {categories.map(category => {
                  const categoryConfig = getCategoryConfig(category);
                  return (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${
                        selectedCategory === category
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-sm'
                          : 'bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--muted-hover)]'
                      }`}
                    >
                      {categoryConfig && (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={categoryConfig.icon} />
                        </svg>
                      )}
                      {category}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--muted-foreground)]">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-2 py-1.5 bg-[var(--muted)] border border-[var(--border)] rounded text-xs text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                >
                  <option value="date">Latest</option>
                  <option value="title">A-Z</option>
                  <option value="views">Popular</option>
                </select>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-[var(--primary)] text-white' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-[var(--primary)] text-white' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="flex justify-between items-center mb-6">
          <div className="text-sm text-[var(--muted-foreground)]">
            {filteredArticles.length} articles
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
                className={`group card hover:shadow-xl transition-all duration-300 overflow-hidden relative ${
                  viewMode === 'list' ? 'flex' : ''
                }`}
              >
                {/* Article Content */}
                <div className={`p-6 ${viewMode === 'list' ? 'flex-1' : ''}`}>
                  {/* Category Badge */}
                  <div className="flex items-start justify-between mb-4">
                    <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${
                      getCategoryConfig(article.category)?.color.bg || 'bg-[var(--muted)]'
                    } ${
                      getCategoryConfig(article.category)?.color.text || 'text-[var(--foreground)]'
                    }`}>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={
                          getCategoryConfig(article.category)?.icon || 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z'
                        } />
                      </svg>
                      {article.category}
                    </span>
                    <div className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>{article.views.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-bold text-[var(--foreground)] mb-3 leading-tight group-hover:text-[var(--primary)] transition-colors">
                    <Link href={`/blog/${article.id}`} className="block">
                      {article.title}
                    </Link>
                  </h3>

                  {/* Excerpt */}
                  <p className="text-[var(--muted-foreground)] mb-4 line-clamp-3 leading-relaxed">{article.excerpt}</p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {article.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="px-2.5 py-1 bg-[var(--muted)] text-[var(--foreground)] rounded-lg text-xs font-medium">
                        {tag}
                      </span>
                    ))}
                    {article.tags.length > 3 && (
                      <span className="px-2.5 py-1 bg-[var(--muted)] text-[var(--muted-foreground)] rounded-lg text-xs">
                        +{article.tags.length - 3} more
                      </span>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
                    <div className="flex items-center gap-4 text-sm text-[var(--muted-foreground)]">
                      <span>{article.date}</span>
                      <span>•</span>
                      <span>{article.readTime}</span>
                      <span>•</span>
                      <span>{article.author}</span>
                    </div>
                    <Link
                      href={`/blog/${article.id}`}
                      className="inline-flex items-center gap-2 text-[var(--primary)] hover:text-[var(--accent-hover)] font-semibold text-sm transition-colors"
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
                className="px-4 py-2 text-sm text-[var(--foreground)] rounded-xl bg-[var(--muted)] border border-[var(--border)] hover:bg-[var(--muted-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2"
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
                          : 'text-[var(--foreground)] bg-[var(--muted)] border border-[var(--border)] hover:bg-[var(--muted-hover)]'
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
                className="px-4 py-2 text-sm text-[var(--foreground)] rounded-xl bg-[var(--muted)] border border-[var(--border)] hover:bg-[var(--muted-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2"
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
            <h2 className="text-3xl lg:text-4xl font-bold text-[var(--foreground)] mb-4">
              Explore Areas Featured in Research
            </h2>
            <p className="text-xl text-[var(--muted-foreground)] max-w-2xl mx-auto">
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
