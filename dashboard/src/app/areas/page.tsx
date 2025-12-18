'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { areaToSlug } from '@/lib/areas';
import { formatFullPrice } from '@/lib/format';

interface AreaStats {
  name: string;
  count: number;
  medianPrice: number;
  avgPricePerSqm: number;
  pctOverAsking: number;
  change6m: number;
}

const ITEMS_PER_PAGE = 20;

export default function AreasIndexPage() {
  const [areaStats, setAreaStats] = useState<AreaStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'count' | 'medianPrice' | 'change6m'>('count');
  const [currentPage, setCurrentPage] = useState(1);
  
  useEffect(() => {
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
    );
  }
  
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <nav className="text-sm text-[var(--muted-foreground)] mb-4">
          <Link href="/" className="hover:underline">Home</Link>
          {' / '}
          <span className="text-foreground">Areas</span>
        </nav>
        
        <h1 className="text-4xl font-bold mb-2">Dublin Property Prices by Area</h1>
        <p className="text-xl text-[var(--muted-foreground)]">
          Explore detailed property market data for {areaStats.length} Dublin areas
        </p>
      </div>
      
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
            {formatFullPrice(Math.max(...areaStats.map(a => a.medianPrice)))}
          </div>
        </div>
        <div className="card">
          <div className="stat-label">Lowest Typical Price</div>
          <div className="stat-value mt-2">
            {formatFullPrice(Math.min(...areaStats.map(a => a.medianPrice)))}
          </div>
        </div>
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
                  >
                    {area}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      
      {/* All Areas Table with Search & Filters */}
      <div className="card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h2 className="text-2xl font-semibold">All Dublin Areas</h2>
          
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search areas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-64 px-4 py-2 pl-10 bg-[var(--muted)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
              <svg 
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]"
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            
            {/* Sort Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setSortBy('count')}
                className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                  sortBy === 'count' 
                    ? 'bg-[var(--primary)] text-white' 
                    : 'bg-[var(--muted)] hover:bg-[var(--muted)]/80'
                }`}
              >
                By Volume
              </button>
              <button
                onClick={() => setSortBy('medianPrice')}
                className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                  sortBy === 'medianPrice' 
                    ? 'bg-[var(--primary)] text-white' 
                    : 'bg-[var(--muted)] hover:bg-[var(--muted)]/80'
                }`}
              >
                By Price
              </button>
              <button
                onClick={() => setSortBy('change6m')}
                className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                  sortBy === 'change6m' 
                    ? 'bg-[var(--primary)] text-white' 
                    : 'bg-[var(--muted)] hover:bg-[var(--muted)]/80'
                }`}
              >
                By Growth
              </button>
            </div>
          </div>
        </div>
        
        {/* Results count */}
        <div className="text-sm text-[var(--muted-foreground)] mb-4">
          Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredAndSortedAreas.length)} of {filteredAndSortedAreas.length} areas
          {searchQuery && ` matching "${searchQuery}"`}
        </div>
        
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
                        className="font-medium hover:text-[var(--primary)] hover:underline"
                      >
                        {area.name}
                      </Link>
                    </td>
                    <td className="py-3 text-right font-mono">
                      {formatFullPrice(area.medianPrice)}
                    </td>
                    <td className="py-3 text-right font-mono text-[var(--muted-foreground)]">
                      {area.avgPricePerSqm > 0 ? `€${area.avgPricePerSqm.toLocaleString()}` : 'N/A'}
                    </td>
                    <td className={`py-3 text-right font-mono ${area.pctOverAsking > 60 ? 'price-positive' : ''}`}>
                      {area.pctOverAsking}%
                    </td>
                    <td className={`py-3 text-right font-mono ${area.change6m >= 0 ? 'price-positive' : 'price-negative'}`}>
                      {area.change6m >= 0 ? '+' : ''}{area.change6m}%
                    </td>
                    <td className="py-3 text-right text-[var(--muted-foreground)]">
                      {area.count.toLocaleString()}
                    </td>
                    <td className="py-3 text-right">
                      <Link 
                        href={`/areas/${slug}`}
                        className="text-sm text-[var(--primary)] hover:underline"
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
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-[var(--border)]">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 text-sm rounded-lg bg-[var(--muted)] hover:bg-[var(--muted)]/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              ← Previous
            </button>
            
            <div className="flex items-center gap-2">
              {/* Show page numbers */}
              {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 7) {
                  pageNum = i + 1;
                } else if (currentPage <= 4) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 3) {
                  pageNum = totalPages - 6 + i;
                } else {
                  pageNum = currentPage - 3 + i;
                }
                
                return (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-10 h-10 rounded-lg text-sm transition-colors ${
                      currentPage === pageNum
                        ? 'bg-[var(--primary)] text-white'
                        : 'bg-[var(--muted)] hover:bg-[var(--muted)]/80'
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
              className="px-4 py-2 text-sm rounded-lg bg-[var(--muted)] hover:bg-[var(--muted)]/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next →
            </button>
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
  );
}
