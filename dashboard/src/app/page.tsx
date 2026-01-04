'use client';

import Link from 'next/link';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { areaToSlug } from '@/lib/areas';
import { formatFullPrice } from '@/lib/format';
import { useSearchTracking } from '@/hooks/useSearchTracking';
import { NewsletterSignup } from '@/components/NewsletterSignup';
import { PropertyCard } from '@/components/PropertyCard';
import { SearchSuggestions } from '@/components/SearchSuggestions';

interface FeaturedArea {
  name: string;
  medianPrice: number;
  change6m: number;
  count: number;
  avgPricePerSqm: number;
}

interface MarketStats {
  totalProperties: number;
  medianPrice: number;
  avgPricePerSqm: number;
  pctOverAsking: number;
  priceChange: number;
}

// Blog articles for search suggestions
const blogArticles = [
  {
    title: 'Dublin Planning Permission Tool: Uncovering Development Potential',
    excerpt: 'Our planning permission search tool reveals Dublin\'s most active development areas',
    tags: ['Planning Permission', 'Development Potential', 'Property Extensions'],
    category: 'Tool Guide'
  },
  {
    title: 'Dublin Property Prices Since COVID: The €107k Recovery Surge',
    excerpt: 'Dublin property prices have surged €107,000 (22%) since COVID',
    tags: ['COVID Recovery', 'Price Changes', 'Market Growth'],
    category: 'Market Analysis'
  },
  {
    title: 'D5 Dublin: The Hidden Gem of North Dublin Property Market',
    excerpt: 'D5 emerges as Dublin\'s most competitively priced premium area',
    tags: ['D5', 'Area Analysis', 'North Dublin'],
    category: 'Area Analysis'
  },
  {
    title: 'Dublin\'s Hidden Market Quiet Zones',
    excerpt: 'Where property prices stay stable despite market volatility',
    tags: ['Market Stability', 'Quiet Zones', 'Price Stability'],
    category: 'Market Analysis'
  },
  {
    title: 'Dublin Conservative Market Strategy',
    excerpt: 'How to navigate Dublin\'s property market during uncertain times',
    tags: ['Market Strategy', 'Risk Management', 'Conservative Investing'],
    category: 'Investment Strategy'
  }
];

export default function Home() {
  const router = useRouter();
  const { trackHomepageSearch } = useSearchTracking();
  const [featuredAreas, setFeaturedAreas] = useState<FeaturedArea[]>([]);
  const [marketStats, setMarketStats] = useState<MarketStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ place_name: string; center: [number, number] }>>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [newListings, setNewListings] = useState<any[]>([]);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);


  // Popular Dublin areas for suggestions
  const popularAreas = [
    { name: 'Dublin 4', description: 'Ballsbridge, Donnybrook, Sandymount' },
    { name: 'Dublin 2', description: 'City Centre, Trinity College area' },
    { name: 'Dublin 6', description: 'Rathmines, Rathgar, Terenure' },
    { name: 'Dublin 18', description: 'Cabinteely, Foxrock, Leopardstown' },
    { name: 'Dublin 14', description: 'Churchtown, Clonskeagh, Goatstown' },
    { name: 'Dublin 7', description: 'Smithfield, Arbour Hill, Phoenix Park' },
  ];

  useEffect(() => {
    // Fetch market stats and featured areas
    Promise.all([
      fetch('/api/stats'),
      fetch('/api/stats')
    ])
      .then(async ([statsRes, areasRes]) => {
        const statsData = await statsRes.json();
        setMarketStats(statsData.stats);

        // Get top areas by sales volume
        const areasData = statsData.areaStats || [];
        const topAreas = areasData
          .sort((a: any, b: any) => b.count - a.count)
          .slice(0, 12)
          .map((area: any) => ({
            name: area.name,
            medianPrice: area.medianPrice,
            change6m: area.change6m,
            count: area.count,
            avgPricePerSqm: area.avgPricePerSqm
          }));
        setFeaturedAreas(topAreas);
      })
      .catch(err => {
        console.error('Failed to load homepage data:', err);
      })
      .finally(() => setLoading(false));
  }, []);

  // Load new listings (added in last 3 days)
  useEffect(() => {
    const loadNewListings = async () => {
      try {
        const response = await fetch('/api/listings?limit=50&sortBy=scrapedAt&sortOrder=desc&hasCoordinates=true');
        if (response.ok) {
          const data = await response.json();
          // Filter to only listings from last 3 days
          const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
          const recentListings = data.listings.filter((listing: any) => {
            const scrapedDate = new Date(listing.scrapedAt);
            return scrapedDate > threeDaysAgo;
          });
          setNewListings(recentListings.slice(0, 12)); // Show up to 12
        }
      } catch (error) {
        console.error('Failed to load new listings:', error);
      }
    };

    loadNewListings();
  }, []);

  // Search functionality - same as map component
  const searchLocation = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    try {
      // Same Mapbox geocoding as map component
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?` +
        `access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''}&` +
        `country=IE&` +
        `bbox=-6.6,53.1,-5.9,53.6&` + // Dublin bounding box
        `limit=5`
      );
      const data = await response.json();
      setSearchResults(data.features || []);
      setShowSearchResults((data.features || []).length > 0);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
      setShowSearchResults(false);
    }
    setIsSearching(false);
  };

  // Debounced search - same as map component
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);

    if (!value.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    searchTimeout.current = setTimeout(() => {
      searchLocation(value);
    }, 300);
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    // Track search for alert modal - always track, regardless of results
    if (searchResults.length > 0) {
      const firstResult = searchResults[0];
      trackHomepageSearch({
        name: firstResult.place_name.split(',')[0],
        coordinates: { lat: firstResult.center[1], lng: firstResult.center[0] },
      });
    } else {
      // Use search query as location name with Dublin center coordinates
      trackHomepageSearch({
        name: searchQuery,
        coordinates: { lat: 53.3498, lng: -6.2603 }, // Dublin center
      });
    }

    // Redirect to map with search query - map will auto-search
    router.push(`/map?search=${encodeURIComponent(searchQuery)}`);
  };

  const handleAreaSelect = (result: { place_name: string; center: [number, number] }) => {
    const locationName = result.place_name.split(',')[0];
    setSearchQuery(locationName);
    setSearchResults([]);
    setShowSearchResults(false);

    // Track search for alert modal
    trackHomepageSearch({
      name: locationName,
      coordinates: { lat: result.center[1], lng: result.center[0] },
    });

    // Redirect to map with search - map will auto-focus on this location
    router.push(`/map?search=${encodeURIComponent(locationName)}`);
  };

  const handleSuggestionClick = (suggestion: string) => {
    // Check if it's a blog article title
    const blogArticle = blogArticles.find(article =>
      article.title.toLowerCase().includes(suggestion.toLowerCase()) ||
      article.tags.some(tag => tag.toLowerCase().includes(suggestion.toLowerCase())) ||
      article.category.toLowerCase().includes(suggestion.toLowerCase())
    );

    if (blogArticle) {
      // Navigate to blog page with search
      router.push(`/blog?search=${encodeURIComponent(suggestion)}`);
    } else {
      // Navigate to map for location search
      router.push(`/map?search=${encodeURIComponent(suggestion)}`);
    }

    setSearchQuery(suggestion);
    setShowSearchResults(false);
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div
            className="w-full h-full"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
            }}
          />
        </div>

        {/* Floating Elements */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-blue-200 rounded-full opacity-20 animate-pulse"></div>
        <div className="absolute top-40 right-20 w-16 h-16 bg-indigo-200 rounded-full opacity-30 animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute bottom-32 left-20 w-12 h-12 bg-purple-200 rounded-full opacity-25 animate-pulse" style={{animationDelay: '2s'}}></div>

        <div className="relative max-w-7xl mx-auto px-4 py-20 md:py-32">
          <div className="text-center max-w-5xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium mb-8">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Ireland's Most Comprehensive Property Database
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 text-slate-900 leading-tight">
              Know Irish Property
              <span className="block text-blue-600">Like Never Before</span>
            </h1>

            <p className="text-lg md:text-xl text-slate-600 mb-10 leading-relaxed max-w-3xl mx-auto">
              Access real-time market intelligence on 47,000+ property transactions across Ireland.
              Make smarter property decisions with accurate data, trends, and insights.
            </p>

            {/* Search Bar */}
            <div className="max-w-lg mx-auto mb-8 relative">
              <form onSubmit={handleSearch} className="relative">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder=""
                    onFocus={() => setShowSearchResults(true)}
                    onBlur={() => {
                      // Delay hiding to allow click on suggestions
                      setTimeout(() => setShowSearchResults(false), 150);
                    }}
                    className="w-full px-6 py-4 pr-16 bg-white border-2 border-slate-200 rounded-2xl text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all text-lg shadow-lg"
                  />
                  <button
                    type="submit"
                    disabled={isSearching}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-xl text-white font-medium transition-colors shadow-md hover:shadow-lg disabled:cursor-not-allowed"
                  >
                    {isSearching ? (
                      <div className="w-4 h-4 border border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      'Search'
                    )}
                  </button>
                </div>
              </form>

              {/* Search Results Dropdown */}
              {showSearchResults && (
                <div className="absolute z-10 w-full mt-2 space-y-2">
                  {/* Blog Suggestions */}
                  <SearchSuggestions
                    query={searchQuery}
                    articles={blogArticles}
                    onSuggestionClick={handleSuggestionClick}
                    isVisible={searchQuery.length > 1}
                  />

                  {searchResults.length > 0 ? (
                    <div className="bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                      <div className="px-4 py-2 border-b border-slate-100">
                        <div className="text-sm font-medium text-slate-700">Locations</div>
                      </div>
                      {searchResults.map((result, index) => (
                        <button
                          key={index}
                          onClick={() => handleAreaSelect(result)}
                          className="w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0"
                        >
                          <div className="font-medium text-slate-900">{result.place_name.split(',')[0]}</div>
                          <div className="text-sm text-slate-500">{result.place_name}</div>
                        </button>
                      ))}
                    </div>
                  ) : searchQuery.trim() === '' ? (
                    // Show popular areas when search is empty and focused
                    <div className="bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                      <div className="px-4 py-2 border-b border-slate-100">
                        <div className="text-sm font-medium text-slate-700">Popular Areas</div>
                      </div>
                      {popularAreas.map((area, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            setSearchQuery(area.name);

                            // Track search for alert modal (use Dublin center as fallback coordinates)
                            trackHomepageSearch({
                              name: area.name,
                              coordinates: { lat: 53.3498, lng: -6.2603 }, // Dublin center
                            });

                            router.push(`/map?search=${encodeURIComponent(area.name)}`);
                          }}
                          className="w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0"
                        >
                          <div className="font-medium text-slate-900">{area.name}</div>
                          <div className="text-sm text-slate-500">{area.description}</div>
                        </button>
                      ))}
                    </div>
                  ) : !isSearching ? (
                    // Show no results when search has text but no matches
                    <div className="bg-white border border-slate-200 rounded-xl shadow-xl px-4 py-8 text-center text-slate-500">
                      <div className="text-sm">No locations found</div>
                      <div className="text-xs mt-1">Try searching for a Dublin area or address</div>
                    </div>
                  ) : (
                    // Show loading state
                    <div className="bg-white border border-slate-200 rounded-xl shadow-xl px-4 py-8 text-center text-slate-500">
                      <div className="w-4 h-4 border border-slate-300 border-t-slate-600 rounded-full animate-spin mx-auto mb-2"></div>
                      <div className="text-sm">Searching...</div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Search Helper Text */}
            <div className="text-center mb-12">
              <p className="text-sm text-slate-500 flex items-center justify-center gap-2">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V7m0 0L9 4" />
                </svg>
                Search takes you to our interactive property map
              </p>
            </div>

            {/* New Listings Feed */}
            {newListings.length > 0 && (
              <div className="mb-16">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Fresh Listings This Week</h2>
                  <p className="text-slate-400 text-sm">New properties just added to our database</p>
                </div>

                {/* Horizontal scroll on mobile, grid on desktop */}
                <div className="overflow-x-auto sm:overflow-x-visible">
                  <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-4 sm:pb-0 min-w-max sm:min-w-0">
                    {newListings.map((listing, index) => (
                      <div key={listing.id || index} className="flex-shrink-0 w-80 sm:w-auto">
                        <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow relative">
                          {/* NEW Badge */}
                          <div className="absolute top-3 left-3 z-10">
                            <div className="bg-emerald-500 text-white px-2 py-1 rounded-full text-xs font-semibold shadow-md">
                              NEW
                            </div>
                          </div>

                          {/* Property Map Image */}
                          <div
                            className="h-48 bg-gradient-to-br from-slate-200 to-slate-300 relative overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                            onClick={() => {
                              // Navigate to map page with property focused
                              const propertyId = encodeURIComponent(listing.address);
                              const propertyType = 'listing'; // for-sale properties are called 'listing' in the map
                              router.push(`/map?focus=${propertyId}&type=${propertyType}`);
                            }}
                          >
                            {listing.latitude && listing.longitude ? (
                              <>
                                {/* Loading skeleton */}
                                <div className="absolute inset-0 bg-slate-200 animate-pulse flex items-center justify-center">
                                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V7m0 0L9 4" />
                                  </svg>
                                </div>
                                <img
                                  src={`https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-l-home+3b82f6(${listing.longitude},${listing.latitude})/${listing.longitude},${listing.latitude},15/400x300@2x?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`}
                                  alt={`Map view of ${listing.address.split(',')[0]}`}
                                  className="w-full h-full object-cover opacity-0 transition-opacity duration-300"
                                  loading="lazy"
                                  onLoad={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.classList.add('opacity-100');
                                    // Hide skeleton
                                    const skeleton = target.parentElement?.querySelector('.animate-pulse');
                                    if (skeleton) skeleton.classList.add('hidden');
                                  }}
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                    // Hide skeleton and show fallback
                                    const skeleton = target.parentElement?.querySelector('.animate-pulse');
                                    if (skeleton) skeleton.classList.add('hidden');

                                    const parent = target.parentElement;
                                    if (parent && !parent.querySelector('.fallback-icon')) {
                                      const fallback = document.createElement('div');
                                      fallback.className = 'fallback-icon absolute inset-0 flex items-center justify-center';
                                      fallback.innerHTML = `
                                        <svg class="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                        </svg>
                                      `;
                                      parent.appendChild(fallback);
                                    }
                                  }}
                                />
                                {/* Click overlay hint */}
                                <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
                                  <div className="bg-white/90 text-slate-700 px-3 py-1 rounded-full text-sm font-medium shadow-lg">
                                    View on Map
                                  </div>
                                </div>
                              </>
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                              </div>
                            )}
                          </div>

                          {/* Property Details */}
                          <div className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div className="font-bold text-lg text-slate-900">
                                {formatFullPrice(listing.askingPrice)}
                              </div>
                              <div className="text-sm text-slate-500">
                                {listing.beds} bed{listing.beds !== 1 ? 's' : ''}
                              </div>
                            </div>

                            <div className="text-slate-700 text-sm mb-3 line-clamp-2">
                              {listing.address.split(',')[0]}
                            </div>

                            <div className="flex items-center justify-between text-sm text-slate-600">
                              <span>{listing.propertyType}</span>
                              <span>{listing.areaSqm}m²</span>
                            </div>

                            <Link
                              href={`/property/forSale/${encodeURIComponent(listing.address)}`}
                              className="mt-3 w-full bg-slate-900 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors inline-block text-center"
                            >
                              View Details
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* View All Link */}
                <div className="text-center mt-6">
                  <Link
                    href="/map"
                    className="inline-flex items-center gap-2 text-blue-300 hover:text-blue-200 transition-colors text-sm font-medium"
                  >
                    View All Listings
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </Link>
                </div>
              </div>
            )}

            {/* CTA Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-16">
              {/* Primary Action - Explore Map */}
              <Link
                href="/map"
                className="group relative bg-gradient-to-br from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 text-white rounded-2xl p-6 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-1 border border-slate-700/50"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative">
                  <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-white/20 transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V7m0 0L9 4" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold mb-2">Explore Properties</h3>
                  <p className="text-slate-300 text-sm leading-relaxed">Interactive map with 48k+ Irish properties</p>
                </div>
                <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </Link>

              {/* Secondary Action - Mortgage Calculator */}
              <Link
                href="/mortgage-calc"
                className="group relative bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 hover:from-blue-500 hover:via-blue-600 hover:to-indigo-600 text-white rounded-2xl p-6 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-1 border border-blue-500/30"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-2xl"></div>
                <div className="relative">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-white/30 transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold mb-2">Mortgage Calculator</h3>
                  <p className="text-blue-100 text-sm leading-relaxed">Calculate payments and affordability</p>
                </div>
                <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </Link>

              {/* Tertiary Action - Browse Areas */}
              <Link
                href="/areas"
                className="group relative bg-white hover:bg-slate-50 text-slate-900 rounded-2xl p-6 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 border border-slate-200 hover:border-slate-300"
              >
                <div className="relative">
                  <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-slate-200 transition-colors">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold mb-2">Browse Areas</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">Explore Dublin neighborhoods & suburbs</p>
                </div>
                <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </div>
              </Link>
            </div>

            {/* Trust Indicators */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl mx-auto">
              <div className="flex flex-col items-center p-4 bg-white/50 backdrop-blur-sm rounded-xl border border-white/20">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div className="text-sm font-semibold text-slate-900 mb-1">Updated Daily</div>
                <div className="text-xs text-slate-600 text-center">Fresh data from Dublin's market</div>
              </div>

              <div className="flex flex-col items-center p-4 bg-white/50 backdrop-blur-sm rounded-xl border border-white/20">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div className="text-sm font-semibold text-slate-900 mb-1">Free Property Data</div>
                <div className="text-xs text-slate-600 text-center">Premium alerts from €0.99/year</div>
              </div>

              <div className="flex flex-col items-center p-4 bg-white/50 backdrop-blur-sm rounded-xl border border-white/20">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div className="text-sm font-semibold text-slate-900 mb-1">43,000+ Properties</div>
                <div className="text-xs text-slate-600 text-center">Comprehensive Dublin coverage</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What We Offer */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-full text-sm font-medium mb-6">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Irish Property Intelligence
            </div>
            <h2 className="text-4xl font-bold text-slate-900 mb-6">Everything You Need to Know About Dublin Property</h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              From market trends to area analysis, we provide the data and insights Dublin property professionals trust.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Transaction Data */}
            <div className="group relative bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 border border-blue-100 hover:border-blue-200 transition-all duration-300 hover:shadow-xl">
              <div className="absolute -top-4 -left-4 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-sm">1</span>
              </div>
              <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-200 transition-colors">
                <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Real Transaction Data</h3>
              <p className="text-slate-700 mb-6 leading-relaxed">
                Access 47,000+ verified property sales with actual sold prices, asking prices, and sale dates. No estimates, just facts.
              </p>
              <Link href="/map" className="inline-flex items-center gap-2 text-blue-600 font-semibold hover:text-blue-700 transition-colors group-hover:translate-x-1 transform transition-transform">
                Explore Sales Data
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            {/* Area Intelligence */}
            <div className="group relative bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-8 border border-emerald-100 hover:border-emerald-200 transition-all duration-300 hover:shadow-xl">
              <div className="absolute -top-4 -left-4 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-sm">2</span>
              </div>
              <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-emerald-200 transition-colors">
                <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Area-by-Area Intelligence</h3>
              <p className="text-slate-700 mb-6 leading-relaxed">
                Detailed analysis for each Dublin area including price trends, market activity, and comparative data across 150+ neighborhoods.
              </p>
              <Link href="/areas" className="inline-flex items-center gap-2 text-emerald-600 font-semibold hover:text-emerald-700 transition-colors group-hover:translate-x-1 transform transition-transform">
                Browse All Areas
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            {/* Market Research */}
            <div className="group relative bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-8 border border-purple-100 hover:border-purple-200 transition-all duration-300 hover:shadow-xl">
              <div className="absolute -top-4 -left-4 w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-sm">3</span>
              </div>
              <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-purple-200 transition-colors">
                <svg className="w-7 h-7 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Market Research & Insights</h3>
              <p className="text-slate-700 mb-6 leading-relaxed">
                Professional analysis of Dublin's property market with quarterly reports, trend analysis, and investment insights.
              </p>
              <Link href="/blog" className="inline-flex items-center gap-2 text-purple-600 font-semibold hover:text-purple-700 transition-colors group-hover:translate-x-1 transform transition-transform">
                Read Market Research
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter Signup */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium mb-4">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Market Intelligence
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Get Weekly Dublin Property Market Updates</h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Join thousands of property professionals who stay ahead of Dublin's market with weekly insights, trends, and opportunities.
            </p>
          </div>
          <NewsletterSignup />
        </div>
      </section>

      {/* Account Benefits */}
      <section className="py-16 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-200">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium mb-6">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Free Account Benefits
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Join Thousands of Property Professionals</h2>
            <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
              Create a free account and unlock powerful property tools that save time and money
            </p>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="flex flex-col items-center p-4 bg-slate-50 rounded-lg">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">Save Properties</h3>
                <p className="text-sm text-slate-600 text-center">Bookmark up to 5 properties and track price changes</p>
              </div>

              <div className="flex flex-col items-center p-4 bg-slate-50 rounded-lg">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">Free Alert</h3>
                <p className="text-sm text-slate-600 text-center">Get 1 location alert with weekly property updates</p>
              </div>

              <div className="flex flex-col items-center p-4 bg-slate-50 rounded-lg">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">Compare Tools</h3>
                <p className="text-sm text-slate-600 text-center">Side-by-side comparison of up to 5 properties</p>
              </div>

              <div className="flex flex-col items-center p-4 bg-slate-50 rounded-lg">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">View History</h3>
                <p className="text-sm text-slate-600 text-center">Track your property viewing history and preferences</p>
              </div>
            </div>

            <div className="text-center">
              <p className="text-slate-600 mb-4">Ready to get started?</p>
              <Link
                href="/map"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
              >
                Explore Properties
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Key Statistics */}
      <section className="py-20 bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/20 to-purple-900/20"></div>
        <div className="relative max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-300 rounded-full text-sm font-medium mb-4">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Ireland's Most Comprehensive Property Database
            </div>
            <h2 className="text-3xl font-bold mb-4">Trusted by Irish Property Professionals</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700">
              <div className="text-4xl font-bold text-blue-400 mb-3">
                43,000
              </div>
              <div className="text-slate-400 text-sm font-medium">Properties Tracked</div>
              <div className="text-slate-500 text-xs mt-1">Since 2020</div>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700">
              <div className="text-4xl font-bold text-emerald-400 mb-3">150+</div>
              <div className="text-slate-400 text-sm font-medium">Dublin Areas</div>
              <div className="text-slate-500 text-xs mt-1">Complete Coverage</div>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700">
              <div className="text-4xl font-bold text-purple-400 mb-3">2,800+</div>
              <div className="text-slate-400 text-sm font-medium">Active Listings</div>
              <div className="text-slate-500 text-xs mt-1">Updated Daily</div>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700">
              <div className="text-4xl font-bold text-orange-400 mb-3">10</div>
              <div className="text-slate-400 text-sm font-medium">Research Reports</div>
              <div className="text-slate-500 text-xs mt-1">Market Intelligence</div>
            </div>
          </div>

          <div className="text-center mt-12">
            <p className="text-slate-400 text-lg">
              Ireland's most accurate and comprehensive property market data platform
            </p>
          </div>
        </div>
      </section>

      {/* Dublin Areas Spotlight */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium mb-6">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Dublin Property Markets
            </div>
            <h2 className="text-4xl font-bold text-slate-900 mb-6">Explore Ireland's Property Landscape</h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              From premium Dublin city center apartments to family homes in established suburbs, discover detailed market intelligence for every Irish area.
            </p>
          </div>

          {loading ? (
            <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl p-6 shadow-sm animate-pulse">
                  <div className="h-6 bg-slate-200 rounded mb-4"></div>
                  <div className="h-8 bg-slate-200 rounded mb-2"></div>
                  <div className="h-4 bg-slate-200 rounded mb-2"></div>
                  <div className="h-4 bg-slate-200 rounded"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
              {featuredAreas.slice(0, 12).map((area) => (
                <Link
                  key={area.name}
                  href={`/areas/${areaToSlug(area.name)}`}
                  className="group bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-xl hover:border-blue-200 transition-all duration-300"
                >
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                      {area.name}
                    </h3>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      area.change6m >= 2 ? 'bg-emerald-100 text-emerald-800' :
                      area.change6m <= -2 ? 'bg-red-100 text-red-800' :
                      'bg-slate-100 text-slate-800'
                    }`}>
                      {area.change6m >= 0 ? '+' : ''}{area.change6m}%
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="text-3xl font-bold text-slate-900 mb-1">
                        {formatFullPrice(area.medianPrice)}
                      </div>
                      <div className="text-sm text-slate-600">Median Sale Price</div>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">
                        {area.count} sales tracked
                      </span>
                      <span className="text-slate-500">
                        €{area.avgPricePerSqm?.toLocaleString()}/m²
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-100">
                      <div className="text-xs text-slate-500 group-hover:text-blue-600 transition-colors">
                        View detailed analysis →
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          <div className="text-center mt-12">
            <div className="mb-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-800 rounded-full text-sm font-medium">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Complete Irish Coverage - 150+ Areas Analyzed
              </div>
            </div>
            <Link
              href="/areas"
              className="inline-flex items-center gap-3 px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Explore All Irish Areas
            </Link>
          </div>
        </div>
      </section>

      {/* Research Preview */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Market Research & Analysis</h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Professional market intelligence and data-driven insights to help you understand Dublin's property landscape.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {/* Research Article Preview 1 */}
            <Link href="/blog/dublin-property-market-q4-2024" className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 hover:shadow-lg hover:border-blue-200 transition-all group block">
              <div className="text-sm text-blue-600 font-medium mb-4">Market Analysis</div>
              <h3 className="text-xl font-bold text-slate-900 mb-4 group-hover:text-blue-600 transition-colors">Dublin Property Market Q4 2024 Analysis</h3>
              <p className="text-slate-600 mb-6">
                Comprehensive analysis of Dublin's property market performance, price trends, and future outlook based on 43,000+ transactions.
              </p>
              <div className="text-blue-600 font-medium group-hover:text-blue-700 transition-colors">
                Read Full Analysis →
              </div>
            </Link>

            {/* Research Article Preview 2 */}
            <Link href="/blog/dublin-rental-yield-analysis" className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 hover:shadow-lg hover:border-emerald-200 transition-all group block">
              <div className="text-sm text-emerald-600 font-medium mb-4">Investment</div>
              <h3 className="text-xl font-bold text-slate-900 mb-4 group-hover:text-emerald-600 transition-colors">Dublin Rental Yield Analysis</h3>
              <p className="text-slate-600 mb-6">
                Detailed breakdown of rental yields across Dublin areas with investment potential and risk assessment.
              </p>
              <div className="text-emerald-600 font-medium group-hover:text-emerald-700 transition-colors">
                Explore Investment →
              </div>
            </Link>

            {/* Research Article Preview 3 */}
            <Link href="/blog/planning-permission-activity" className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 hover:shadow-lg hover:border-purple-200 transition-all group block">
              <div className="text-sm text-purple-600 font-medium mb-4">Planning</div>
              <h3 className="text-xl font-bold text-slate-900 mb-4 group-hover:text-purple-600 transition-colors">Planning Permission Activity Report</h3>
              <p className="text-slate-600 mb-6">
                Analysis of development applications and future property supply across Dublin's planning pipeline.
              </p>
              <div className="text-purple-600 font-medium group-hover:text-purple-700 transition-colors">
                View Planning Data →
              </div>
            </Link>
          </div>

          <div className="text-center">
            <Link
              href="/blog"
              className="inline-flex items-center gap-3 px-8 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Explore All Research
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
