'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { areaToSlug } from '@/lib/areas';
import { formatFullPrice } from '@/lib/format';
import { HeroSection } from '@/components/HeroSection';
import { analytics } from '@/lib/analytics';

interface AreaStats {
  name: string;
  count: number;
  medianPrice: number;
  avgPricePerSqm: number;
  pctOverAsking: number;
  change6m: number;
}

export default function AreasIndexPage() {
  const [areaStats, setAreaStats] = useState<AreaStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'count' | 'medianPrice' | 'change6m'>('count');
  const [currentPage, setCurrentPage] = useState(1);
  
  const ITEMS_PER_PAGE = 20;
  
  useEffect(() => {
    // Track page view
    analytics.areasPageViewed();

    // Fetch stats from existing stats API
    fetch('/api/stats')
      .then(res => res.json())
      .then(data => {
        setAreaStats(data.areaStats || []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load area stats:', err);
        setLoading(false);
      });
  }, []);
  
  // Filter and sort areas
  const filteredAndSortedAreas = useMemo(() => {
    let filtered = areaStats;
    
    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(area =>
        area.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'medianPrice': return b.medianPrice - a.medianPrice;
        case 'change6m': return b.change6m - a.change6m;
        default: return b.count - a.count;
      }
    });
    
    return sorted;
  }, [areaStats, searchQuery, sortBy]);
  
  // Pagination
  const totalPages = Math.ceil(filteredAndSortedAreas.length / ITEMS_PER_PAGE);
  const paginatedAreas = filteredAndSortedAreas.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );
  
  // Reset to page 1 when search or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortBy]);
  
  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--background)' }}>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-[var(--muted)] rounded w-64"></div>
            <div className="grid grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="card h-24"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      <HeroSection
        title="Dublin Property Prices by Area"
        description={`Explore detailed property market data for ${areaStats.length} Dublin areas`}
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Areas' }
        ]}
      />

      <div className="max-w-7xl mx-auto px-4 py-8">

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="card">
          <div className="stat-label">Total Areas</div>
          <div className="stat-value mt-2">{areaStats.length}</div>
        </div>
        <div className="card">
          <div className="stat-label">Sales in Featured Areas</div>
          <div className="stat-value mt-2">
            {areaStats.reduce((sum, a) => sum + a.count, 0).toLocaleString()}
          </div>
          <div className="text-xs text-[var(--muted-foreground)] mt-1">
            Areas with 5+ sales
          </div>
        </div>
        <div className="card">
          <div className="stat-label">Highest Typical Price</div>
          <div className="stat-value mt-2">
            {areaStats.length > 0 ? formatFullPrice(Math.max(...areaStats.map(a => a.medianPrice))) : 'N/A'}
          </div>
        </div>
        <div className="card">
          <div className="stat-label">Lowest Typical Price</div>
          <div className="stat-value mt-2">
            {areaStats.length > 0 ? formatFullPrice(Math.min(...areaStats.map(a => a.medianPrice))) : 'N/A'}
          </div>
        </div>
      </div>

      {/* Map Link CTA */}
      <div className="mb-8">
        <Link
          href="/map"
          className="card hover:shadow-lg transition-all duration-200 border-2 border-[var(--primary)]/20 hover:border-[var(--primary)]/40 bg-gradient-to-r from-[var(--primary)]/5 to-[var(--accent)]/5 block"
          onClick={() => analytics.pageViewed('map_from_areas_cta')}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[var(--primary)] rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V7m0 0L9 4" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-base sm:text-lg text-[var(--foreground)] mb-1">Explore Interactive Map</h3>
                <p className="text-[var(--muted-foreground)] text-sm leading-relaxed">
                  View all properties on an interactive map with advanced filtering and search capabilities
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end sm:justify-start">
              <div className="text-[var(--primary)] font-medium text-sm sm:text-base flex items-center gap-1">
                View Map
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search areas..."
            value={searchQuery}
            onChange={(e) => {
              const value = e.target.value;
              setSearchQuery(value);
              // Track search usage (debounced)
              if (value.trim().length > 2) {
                analytics.areasSearchUsed(value);
              }
            }}
            className="w-full px-4 py-3 bg-[var(--muted)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={sortBy}
            onChange={(e) => {
              const value = e.target.value as 'count' | 'medianPrice' | 'change6m';
              setSortBy(value);
              analytics.areasSortChanged(value);
            }}
            className="px-4 py-3 bg-[var(--muted)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-[var(--foreground)]"
          >
            <option value="count">Sort by Sales Count</option>
            <option value="medianPrice">Sort by Price</option>
            <option value="change6m">Sort by 6M Change</option>
          </select>
        </div>
      </div>

      {/* Results Summary */}
      <div className="mb-6">
        <p className="text-[var(--muted-foreground)]">
          Showing {paginatedAreas.length} of {filteredAndSortedAreas.length} areas
          {searchQuery && ` matching "${searchQuery}"`}
        </p>
      </div>

      {/* Areas Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-8">
        {paginatedAreas.map((area, index) => (
          <Link
            key={area.name}
            href={`/areas/${areaToSlug(area.name)}`}
            className="card hover:shadow-lg transition-shadow"
            onClick={() => analytics.areasAreaViewed(area.name)}
          >
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-semibold text-lg text-[var(--foreground)]">{area.name}</h3>
              <span className="text-xs text-[var(--muted-foreground)] bg-[var(--muted)] px-2 py-1 rounded">
                #{index + 1}
              </span>
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between">
                <span className="text-sm text-[var(--muted-foreground)]">Median Price</span>
                <span className="font-semibold text-[var(--foreground)]">{formatFullPrice(area.medianPrice)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[var(--muted-foreground)]">Price per m²</span>
                <span className="font-semibold text-[var(--foreground)]">€{area.avgPricePerSqm.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[var(--muted-foreground)]">Sales Count</span>
                <span className="font-semibold text-[var(--foreground)]">{area.count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[var(--muted-foreground)]">Over Asking</span>
                <span className={`font-semibold ${area.pctOverAsking > 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]'}`}>
                  {area.pctOverAsking > 0 ? '+' : ''}{area.pctOverAsking.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[var(--muted-foreground)]">6M Change</span>
                <span className={`font-semibold ${area.change6m > 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]'}`}>
                  {area.change6m > 0 ? '+' : ''}{area.change6m.toFixed(1)}%
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Navigation */}
      <div className="card mb-8">
        <h2 className="text-xl font-semibold mb-4">Popular Areas</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div>
            <h3 className="font-medium mb-2 text-sm text-[var(--muted-foreground)]">City Centre</h3>
            <div className="space-y-1">
              {['Dublin 1', 'Dublin 2', 'Dublin 7', 'Dublin 8'].map(area => {
                const slug = areaToSlug(area);
                return (
                  <Link
                    key={slug}
                    href={`/areas/${slug}`}
                    className="block text-sm text-[var(--primary)] hover:underline"
                    onClick={() => analytics.areasQuickNavUsed(area)}
                  >
                    {area}
                  </Link>
                );
              })}
            </div>
          </div>
          <div>
            <h3 className="font-medium mb-2 text-sm text-[var(--muted-foreground)]">South Dublin</h3>
            <div className="space-y-1">
              {['Dublin 4', 'Dublin 6', 'Dublin 14', 'Dublin 16'].map(area => {
                const slug = areaToSlug(area);
                return (
                  <Link
                    key={slug}
                    href={`/areas/${slug}`}
                    className="block text-sm text-[var(--primary)] hover:underline"
                    onClick={() => analytics.areasQuickNavUsed(area)}
                  >
                    {area}
                  </Link>
                );
              })}
            </div>
          </div>
          <div>
            <h3 className="font-medium mb-2 text-sm text-[var(--muted-foreground)]">North Dublin</h3>
            <div className="space-y-1">
              {['Dublin 3', 'Dublin 5', 'Dublin 9', 'Dublin 11'].map(area => {
                const slug = areaToSlug(area);
                return (
                  <Link
                    key={slug}
                    href={`/areas/${slug}`}
                    className="block text-sm text-[var(--primary)] hover:underline"
                    onClick={() => analytics.areasQuickNavUsed(area)}
                  >
                    {area}
                  </Link>
                );
              })}
            </div>
          </div>
          <div>
            <h3 className="font-medium mb-2 text-sm text-[var(--muted-foreground)]">Popular</h3>
            <div className="space-y-1">
              {['Ballsbridge', 'Ranelagh', 'Rathmines', 'Clontarf'].map(area => {
                const slug = areaToSlug(area);
                return (
                  <Link
                    key={slug}
                    href={`/areas/${slug}`}
                    className="block text-sm text-[var(--primary)] hover:underline"
                    onClick={() => analytics.areasQuickNavUsed(area)}
                  >
                    {area}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      
      {/* All Areas Table */}
      <div className="card">
        <h2 className="text-2xl font-semibold mb-6">All Dublin Areas</h2>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-[var(--muted-foreground)] text-sm">
                <th className="pb-3 font-medium">#</th>
                <th className="pb-3 font-medium">Area</th>
                <th className="pb-3 font-medium text-right">Typical Price</th>
                <th className="pb-3 font-medium text-right">€/sqm</th>
                <th className="pb-3 font-medium text-right">% Over Asking</th>
                <th className="pb-3 font-medium text-right">6mo Change</th>
                <th className="pb-3 font-medium text-right">Sales</th>
                <th className="pb-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {paginatedAreas.map((area, i) => {
                const slug = areaToSlug(area.name);
                const globalIndex = (currentPage - 1) * ITEMS_PER_PAGE + i + 1;
                return (
                  <tr 
                    key={area.name} 
                    className="border-b border-[var(--border)] hover:bg-[var(--muted)] transition-colors"
                  >
                    <td className="py-3 text-[var(--muted-foreground)]">{globalIndex}</td>
                    <td className="py-3">
                      <Link
                        href={`/areas/${slug}`}
                        className="font-medium hover:text-[var(--primary)] hover:underline text-[var(--foreground)]"
                        onClick={() => analytics.areasAreaViewed(area.name)}
                      >
                        {area.name}
                      </Link>
                    </td>
                    <td className="py-3 text-right font-mono text-[var(--foreground)]">
                      {formatFullPrice(area.medianPrice)}
                    </td>
                    <td className="py-3 text-right font-mono text-[var(--muted-foreground)]">
                      {area.avgPricePerSqm > 0 ? `€${area.avgPricePerSqm.toLocaleString()}` : 'N/A'}
                    </td>
                    <td className={`py-3 text-right font-mono ${area.pctOverAsking > 60 ? 'text-[var(--positive)]' : 'text-[var(--foreground)]'}`}>
                      {area.pctOverAsking}%
                    </td>
                    <td className={`py-3 text-right font-mono ${area.change6m >= 0 ? 'text-[var(--positive)]' : 'text-[var(--negative)]'}`}>
                      {area.change6m >= 0 ? '+' : ''}{area.change6m}%
                    </td>
                    <td className="py-3 text-right text-[var(--muted-foreground)]">
                      {area.count.toLocaleString()}
                    </td>
                    <td className="py-3 text-right">
                      <Link
                        href={`/areas/${slug}`}
                        className="text-sm text-[var(--primary)] hover:underline"
                        onClick={() => analytics.areasAreaViewed(area.name)}
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex justify-center">
            <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const newPage = Math.max(1, currentPage - 1);
                setCurrentPage(newPage);
                analytics.areasPaginationUsed(newPage);
              }}
              disabled={currentPage === 1}
              className="px-3 py-2 border border-[var(--border)] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--muted)] text-[var(--foreground)] bg-[var(--muted)]"
            >
                Previous
              </button>

              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                if (pageNum > totalPages) return null;

              return (
                <button
                  key={pageNum}
                  onClick={() => {
                    setCurrentPage(pageNum);
                    analytics.areasPaginationUsed(pageNum);
                  }}
                  className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                    currentPage === pageNum
                      ? 'bg-[var(--primary)] text-white'
                      : 'text-[var(--foreground)] hover:bg-[var(--muted)] bg-[var(--muted)]'
                  }`}
                >
                  {pageNum}
                </button>
              );
              })}

            <button
              onClick={() => {
                const newPage = Math.min(totalPages, currentPage + 1);
                setCurrentPage(newPage);
                analytics.areasPaginationUsed(newPage);
              }}
              disabled={currentPage === totalPages}
              className="px-3 py-2 border border-[var(--border)] rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--muted)] text-[var(--foreground)] bg-[var(--muted)]"
            >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* SEO Content */}
      <div className="mt-8 card">
        <h2 className="text-2xl font-semibold mb-4">Understanding Dublin Property Prices by Area</h2>
        <p className="text-[var(--muted-foreground)] mb-6">
          Dublin's property market varies significantly by area, with prices influenced by factors including 
          proximity to the city centre, transport links, schools, and local amenities. Our comprehensive data 
          covers {areaStats.length} distinct areas across Dublin and surrounding counties.
        </p>
        
        <h3 className="text-xl font-semibold mb-3">How to Use This Data</h3>
        <p className="text-[var(--muted-foreground)]">
          Use the search box above to find specific areas, or sort by price, growth, or sales volume. 
          Click on any area to see detailed statistics including price trends over time, property type 
          breakdowns, recent sales, and comprehensive market analysis.
        </p>
      </div>

      </div>
    </div>
  );
}
