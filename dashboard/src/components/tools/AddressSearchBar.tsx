'use client';

import React, { useState, useRef, useEffect } from 'react';
import { geocodeAddress } from '@/lib/geocoding';

interface AddressSearchBarProps {
  onLocationFound: (lat: number, lng: number, address: string) => void;
  onLocationTracked?: (lat: number, lng: number, address: string) => void;
  placeholder?: string;
  className?: string;
}

interface RecentSearch {
  address: string;
  lat: number;
  lng: number;
  timestamp: number;
}

export function AddressSearchBar({
  onLocationFound,
  onLocationTracked,
  placeholder = "Enter a Dublin address...",
  className = ""
}: AddressSearchBarProps) {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Load recent searches from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('address-search-recent');
    if (saved) {
      try {
        const searches = JSON.parse(saved);
        setRecentSearches(searches.slice(0, 5)); // Keep only 5 most recent
      } catch (e) {
        // Ignore invalid localStorage data
      }
    }
  }, []);

  // Handle clicks outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addRecentSearch = (address: string, lat: number, lng: number) => {
    const newSearch: RecentSearch = {
      address,
      lat,
      lng,
      timestamp: Date.now()
    };

    const updated = [newSearch, ...recentSearches.filter(s => s.address !== address)].slice(0, 5);
    setRecentSearches(updated);

    try {
      localStorage.setItem('address-search-recent', JSON.stringify(updated));
    } catch (e) {
      // Ignore localStorage errors
    }
  };

  const handleSubmit = async (e: React.FormEvent | string) => {
    if (typeof e !== 'string' && e.preventDefault) {
      e.preventDefault();
    }
    const address = typeof e === 'string' ? e : query.trim();

    if (!address) return;

    setIsLoading(true);
    setError(null);
    setShowSuggestions(false);

    try {
      const result = await geocodeAddress(address);

      if (result) {
        addRecentSearch(address, result.latitude, result.longitude);
        onLocationFound(result.latitude, result.longitude, address);
      } else {
        setError('Address not found. Please try a more specific address.');
      }
    } catch (err) {
      setError('Failed to search address. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = async (address: string) => {
    setQuery(address);
    setShowSuggestions(false);

    try {
      const result = await geocodeAddress(address);

      if (result) {
        addRecentSearch(address, result.latitude, result.longitude);

        // Call tracking callback if provided
        if (onLocationTracked) {
          onLocationTracked(result.latitude, result.longitude, address);
        }

        onLocationFound(result.latitude, result.longitude, address);
      } else {
        setError('Address not found. Please try a more specific address.');
      }
    } catch (err) {
      setError('Failed to search address. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setShowSuggestions(true);
    setError(null);
  };

  const handleInputFocus = () => {
    setShowSuggestions(true);
  };

  const getFilteredSuggestions = () => {
    if (!query.trim()) return recentSearches.slice(0, 5);
    return recentSearches
      .filter(search => search.address.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 5);
  };

  const suggestions = getFilteredSuggestions();

  return (
    <div className={`relative ${className}`}>
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            placeholder={placeholder}
            className="w-full px-4 py-3 pr-12 text-lg border border-[var(--border)] rounded-xl bg-[var(--background)] text-[var(--foreground)] placeholder-[var(--foreground-muted)] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-[var(--foreground-secondary)] hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            )}
          </button>
        </div>
      </form>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute top-full left-0 right-0 bg-[var(--background)] border border-[var(--border)] rounded-xl shadow-xl mt-2 z-50 max-h-64 overflow-y-auto animate-in slide-in-from-top-2 duration-200"
        >
          <div className="p-2">
            <div className="text-xs text-[var(--foreground-muted)] px-3 py-1 mb-1 uppercase tracking-wide">
              {query.trim() ? 'Matching recent searches' : 'Recent searches'}
            </div>
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(suggestion.address)}
                className="w-full text-left px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--surface-hover)] rounded-lg transition-colors flex items-center gap-3"
              >
                <svg className="w-4 h-4 text-[var(--foreground-secondary)] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="truncate">{suggestion.address}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mt-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* Example addresses hint */}
      {!query && !showSuggestions && recentSearches.length === 0 && (
        <div className="mt-3 text-sm text-[var(--foreground-muted)]">
          <div className="mb-2">Try searching for:</div>
          <div className="flex flex-wrap gap-2">
            {[
              "123 Main Street, Dublin 4",
              "45 Grafton Street, Dublin 2",
              "78 O'Connell Street, Dublin 1"
            ].map((example) => (
              <button
                key={example}
                onClick={() => handleSuggestionClick(example)}
                className="px-3 py-1 text-xs bg-[var(--surface-hover)] hover:bg-[var(--border)] rounded-full transition-colors"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
