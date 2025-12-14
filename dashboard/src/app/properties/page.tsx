'use client';

import { useState, useEffect } from 'react';
import { formatFullPrice } from '@/lib/format';
import type { Property } from '@/types/property';

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  
  // Filters
  const [minPrice, setMinPrice] = useState<number>(100000);
  const [maxPrice, setMaxPrice] = useState<number>(2000000);
  const [minBeds, setMinBeds] = useState<number>(0);
  const [sortBy, setSortBy] = useState('soldDate');
  const [propertyTypes, setPropertyTypes] = useState<string[]>([]);
  
  const allPropertyTypes = ['Apartment', 'Semi-D', 'Detached', 'Terrace', 'Duplex', 'Bungalow'];
  
  useEffect(() => {
    fetchProperties();
  }, [minPrice, maxPrice, minBeds, sortBy, propertyTypes, page]);
  
  async function fetchProperties() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '24',
        sortBy,
        sortOrder: 'desc',
        minPrice: minPrice.toString(),
        maxPrice: maxPrice.toString(),
      });
      
      if (minBeds > 0) {
        params.set('minBeds', minBeds.toString());
      }
      
      if (propertyTypes.length > 0) {
        params.set('propertyTypes', propertyTypes.join(','));
      }
      
      const response = await fetch(`/api/properties?${params}`);
      const data = await response.json();
      
      setProperties(data.properties);
      setTotal(data.total);
    } catch (error) {
      console.error('Error fetching properties:', error);
    } finally {
      setLoading(false);
    }
  }
  
  function togglePropertyType(type: string) {
    setPropertyTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
    setPage(1);
  }
  
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Property Search</h1>
      <p className="text-[var(--muted-foreground)] mb-8">
        Showing {total.toLocaleString()} properties
      </p>
      
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Filters Sidebar */}
        <aside className="lg:w-72 flex-shrink-0">
          <div className="card sticky top-4">
            <h2 className="font-semibold mb-6">Filters</h2>
            
            {/* Price Range */}
            <div className="mb-6">
              <label className="text-sm font-medium mb-2 block">Price Range</label>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm text-[var(--muted-foreground)]">€{(minPrice / 1000).toFixed(0)}k</span>
                <span className="text-sm text-[var(--muted-foreground)]">-</span>
                <span className="text-sm text-[var(--muted-foreground)]">€{(maxPrice / 1000).toFixed(0)}k</span>
              </div>
              <input
                type="range"
                min="50000"
                max="2000000"
                step="25000"
                value={minPrice}
                onChange={(e) => { setMinPrice(parseInt(e.target.value)); setPage(1); }}
                className="w-full"
              />
              <input
                type="range"
                min="100000"
                max="5000000"
                step="50000"
                value={maxPrice}
                onChange={(e) => { setMaxPrice(parseInt(e.target.value)); setPage(1); }}
                className="w-full mt-2"
              />
            </div>
            
            {/* Bedrooms */}
            <div className="mb-6">
              <label className="text-sm font-medium mb-2 block">Bedrooms</label>
              <div className="flex gap-2">
                {[0, 1, 2, 3, 4, 5].map(num => (
                  <button
                    key={num}
                    onClick={() => { setMinBeds(num); setPage(1); }}
                    className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                      minBeds === num 
                        ? 'bg-[var(--primary)] text-white' 
                        : 'bg-[var(--muted)] hover:bg-[var(--border)]'
                    }`}
                  >
                    {num === 0 ? 'Any' : `${num}+`}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Property Type */}
            <div className="mb-6">
              <label className="text-sm font-medium mb-2 block">Property Type</label>
              <div className="flex flex-wrap gap-2">
                {allPropertyTypes.map(type => (
                  <button
                    key={type}
                    onClick={() => togglePropertyType(type)}
                    className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                      propertyTypes.includes(type)
                        ? 'bg-[var(--primary)] text-white' 
                        : 'bg-[var(--muted)] hover:bg-[var(--border)]'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Sort */}
            <div>
              <label className="text-sm font-medium mb-2 block">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                className="w-full px-3 py-2 rounded border border-[var(--border)] bg-[var(--background)]"
              >
                <option value="soldDate">Date (Newest)</option>
                <option value="soldPrice">Price (Highest)</option>
                <option value="pricePerSqm">€/sqm (Highest)</option>
                <option value="overUnderPercent">Over Asking %</option>
              </select>
            </div>
          </div>
        </aside>
        
        {/* Property Grid */}
        <div className="flex-1">
          {loading ? (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="card animate-pulse">
                  <div className="h-4 bg-[var(--muted)] rounded w-3/4 mb-3"></div>
                  <div className="h-6 bg-[var(--muted)] rounded w-1/2 mb-2"></div>
                  <div className="h-4 bg-[var(--muted)] rounded w-2/3"></div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {properties.map((property, i) => (
                  <div 
                    key={i} 
                    className="card hover:shadow-lg transition-all hover:-translate-y-0.5 cursor-pointer"
                  >
                    <div className="mb-3">
                      <h3 className="font-medium text-sm line-clamp-2 min-h-[2.5rem]">
                        {property.address}
                      </h3>
                      {property.eircode && (
                        <span className="text-xs text-[var(--muted-foreground)]">
                          {property.eircode}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-baseline gap-2 mb-2">
                      <span className="text-xl font-semibold font-mono">
                        {formatFullPrice(property.soldPrice)}
                      </span>
                      <span className={`text-sm font-mono ${
                        property.overUnderPercent >= 0 ? 'price-positive' : 'price-negative'
                      }`}>
                        {property.overUnderPercent >= 0 ? '+' : ''}
                        {property.overUnderPercent.toFixed(1)}%
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-3 text-sm text-[var(--muted-foreground)] mb-2">
                      {property.beds && (
                        <span>{property.beds} bed</span>
                      )}
                      {property.baths && (
                        <span>{property.baths} bath</span>
                      )}
                      {property.areaSqm && (
                        <span>{property.areaSqm}m²</span>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)]">
                      <span>{property.propertyType || 'Property'}</span>
                      <span>
                        {new Date(property.soldDate).toLocaleDateString('en-IE', { 
                          day: 'numeric', month: 'short', year: 'numeric' 
                        })}
                      </span>
                    </div>
                    
                    {property.pricePerSqm && (
                      <div className="mt-3 pt-3 border-t border-[var(--border)] text-xs">
                        <span className="text-[var(--muted-foreground)]">€/sqm: </span>
                        <span className="font-mono font-medium">
                          €{property.pricePerSqm.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Pagination */}
              {total > 24 && (
                <div className="flex justify-center gap-2 mt-8">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 rounded border border-[var(--border)] disabled:opacity-50 hover:bg-[var(--muted)]"
                  >
                    Previous
                  </button>
                  <span className="px-4 py-2 text-[var(--muted-foreground)]">
                    Page {page} of {Math.ceil(total / 24)}
                  </span>
                  <button
                    onClick={() => setPage(p => p + 1)}
                    disabled={page >= Math.ceil(total / 24)}
                    className="px-4 py-2 rounded border border-[var(--border)] disabled:opacity-50 hover:bg-[var(--muted)]"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

