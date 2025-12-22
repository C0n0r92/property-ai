'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { SavedProperty } from '@/types/supabase';
import { formatFullPrice } from '@/lib/format';

export default function SavedPropertiesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [savedProperties, setSavedProperties] = useState<SavedProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'listing' | 'rental'>('all');
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'price' | 'address'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchSavedProperties();
    }
  }, [user]);

  const fetchSavedProperties = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/saved-properties');
      if (!response.ok) {
        throw new Error('Failed to fetch saved properties');
      }
      const data = await response.json();
      setSavedProperties(data.properties || []);
    } catch (err) {
      console.error('Error fetching saved properties:', err);
      setError('Failed to load saved properties');
    } finally {
      setLoading(false);
    }
  };

  const handleUnsave = async (propertyId: string, propertyType: 'listing' | 'rental') => {
    try {
      const response = await fetch(
        `/api/saved-properties?property_id=${encodeURIComponent(propertyId)}&property_type=${propertyType}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        throw new Error('Failed to remove property');
      }

      // Remove from local state
      setSavedProperties(prev => prev.filter(sp =>
        !(sp.property_id === propertyId && sp.property_type === propertyType)
      ));
    } catch (err) {
      console.error('Error removing property:', err);
      alert('Failed to remove property');
    }
  };

  const handleUpdateNote = async (propertyId: string, propertyType: 'listing' | 'rental', newNote: string) => {
    try {
      const response = await fetch('/api/saved-properties', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property_id: propertyId,
          property_type: propertyType,
          notes: newNote,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update note');
      }

      // Update local state
      setSavedProperties(prev => prev.map(sp =>
        sp.property_id === propertyId && sp.property_type === propertyType
          ? { ...sp, notes: newNote, updated_at: new Date().toISOString() }
          : sp
      ));

      setEditingNote(null);
      setNoteText('');
    } catch (err) {
      console.error('Error updating note:', err);
      alert('Failed to update note');
    }
  };

  const startEditingNote = (propertyId: string, currentNote: string | null) => {
    setEditingNote(propertyId);
    setNoteText(currentNote || '');
  };

  // Show loading while auth is being checked
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!user) {
    router.push('/?login=true');
    return null;
  }

  // Check if user has premium access
  if (user.tier !== 'premium') {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="max-w-md mx-auto text-center">
          <div className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-8 border border-gray-700">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-2xl font-bold text-black">+</span>
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Premium Feature</h2>
            <p className="text-gray-300 mb-6">
              Save and track your favorite properties with our premium plan. Get organized and never miss a property you love.
            </p>
            <button
              onClick={() => router.push('/insights')}
              className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold py-3 px-6 rounded-lg hover:from-emerald-600 hover:to-cyan-600 transition-colors"
            >
              Upgrade to Premium
            </button>
          </div>
        </div>
      </div>
    );
  }

  const filteredProperties = savedProperties
    .filter(sp => {
      if (filterType === 'all') return true;
      if (filterType === 'rental') return sp.property_type === 'rental';
      if (filterType === 'listing') return sp.property_type === 'listing' && !sp.property_data.soldPrice;
      return false;
    })
    .filter(sp =>
      searchQuery === '' ||
      sp.property_data.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sp.notes?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case 'date':
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        case 'price':
          const aPrice = a.property_type === 'rental'
            ? a.property_data.monthlyRent
            : (a.property_data.soldPrice || a.property_data.askingPrice || 0);
          const bPrice = b.property_type === 'rental'
            ? b.property_data.monthlyRent
            : (b.property_data.soldPrice || b.property_data.askingPrice || 0);
          aValue = aPrice || 0;
          bValue = bPrice || 0;
          break;
        case 'address':
          aValue = a.property_data.address || '';
          bValue = b.property_data.address || '';
          break;
        default:
          return 0;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });

  const getPropertyPrice = (propertyData: any, propertyType: string) => {
    if (propertyType === 'rental') {
      return `€${propertyData.monthlyRent?.toLocaleString()}/mo`;
    } else {
      return propertyData.soldPrice
        ? formatFullPrice(propertyData.soldPrice)
        : propertyData.askingPrice
          ? formatFullPrice(propertyData.askingPrice)
          : 'Price not available';
    }
  };

  const getPropertyTypeLabel = (propertyType: string, propertyData: any) => {
    if (propertyType === 'rental') return 'Rental';
    if (propertyData.soldPrice) return 'Sold Property';
    return 'For Sale';
  };

  const getPropertyTypeColor = (propertyType: string, propertyData: any) => {
    if (propertyType === 'rental') return 'bg-purple-600';
    if (propertyData.soldPrice) return 'bg-blue-600';
    return 'bg-rose-600';
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Saved Properties</h1>
              <p className="text-gray-400 mt-1">
                {filteredProperties.length} of {savedProperties.length} saved {savedProperties.length === 1 ? 'property' : 'properties'}
                {searchQuery && ` matching "${searchQuery}"`}
              </p>
            </div>

            <div className="flex items-center gap-4">
              {/* Search */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search properties..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64 px-3 py-2 pr-10 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
                {searchQuery ? (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-2.5 h-4 w-4 text-gray-400 hover:text-white transition-colors"
                    title="Clear search"
                  >
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                ) : (
                  <svg className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                )}
              </div>

              {/* Sort */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'date' | 'price' | 'address')}
                  className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="date">Date Saved</option>
                  <option value="price">Price</option>
                  <option value="address">Address</option>
                </select>
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="p-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
                  title={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </div>

              {/* Filter Tabs */}
              <div className="flex bg-gray-800 rounded-lg p-1">
                {(['all', 'listing', 'rental'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      filterType === type
                        ? 'bg-white text-black'
                        : 'text-gray-300 hover:text-white'
                    }`}
                  >
                  {type === 'all' ? 'All' : type === 'listing' ? 'For Sale' : 'Rentals'}
                  {type !== 'all' && (
                    <span className="ml-1 text-xs opacity-70">
                      ({savedProperties.filter(sp => {
                        if (type === 'rental') return sp.property_type === 'rental';
                        if (type === 'listing') return sp.property_type === 'listing' && !sp.property_data.soldPrice;
                        return false;
                      }).length})
                    </span>
                  )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-400">{error}</p>
            <button
              onClick={fetchSavedProperties}
              className="mt-4 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700"
            >
              Try Again
            </button>
          </div>
        ) : filteredProperties.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-2xl font-bold text-gray-400">•</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              {filterType === 'all' ? 'No saved properties yet' : `No saved ${filterType === 'listing' ? 'listings' : 'rentals'} yet`}
            </h3>
            <p className="text-gray-400 mb-6">
              {filterType === 'all'
                ? 'Start exploring properties and save the ones you love!'
                : `Start exploring ${filterType === 'listing' ? 'properties for sale' : 'rental properties'} and save the ones you love!`
              }
            </p>
            <button
              onClick={() => router.push('/map')}
              className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold rounded-lg hover:from-emerald-600 hover:to-cyan-600 transition-colors"
            >
              Explore Properties
            </button>
          </div>
        ) : (
          <div className="grid gap-6">
            {filteredProperties.map((savedProperty) => (
              <div
                key={`${savedProperty.property_id}-${savedProperty.property_type}`}
                className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-6 border border-gray-700 hover:border-gray-600 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Property Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${getPropertyTypeColor(savedProperty.property_type, savedProperty.property_data)}`}>
                            {getPropertyTypeLabel(savedProperty.property_type, savedProperty.property_data)}
                          </span>
                        <span className="text-2xl font-bold text-white">
                          {getPropertyPrice(savedProperty.property_data, savedProperty.property_type)}
                        </span>
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2 leading-tight">
                          {savedProperty.property_data.address}
                        </h3>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => startEditingNote(savedProperty.property_id, savedProperty.notes)}
                          className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors text-xs"
                          title="Edit note"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleUnsave(savedProperty.property_id, savedProperty.property_type)}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors text-xs"
                          title="Remove from saved"
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    {/* Property Details */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      {savedProperty.property_data.beds && (
                        <div className="text-center">
                          <div className="text-2xl font-bold text-white">{savedProperty.property_data.beds}</div>
                          <div className="text-xs text-gray-400">Bedrooms</div>
                        </div>
                      )}
                      {savedProperty.property_data.baths && (
                        <div className="text-center">
                          <div className="text-2xl font-bold text-white">{savedProperty.property_data.baths}</div>
                          <div className="text-xs text-gray-400">Bathrooms</div>
                        </div>
                      )}
                      {savedProperty.property_data.areaSqm && (
                        <div className="text-center">
                          <div className="text-2xl font-bold text-white">{savedProperty.property_data.areaSqm}</div>
                          <div className="text-xs text-gray-400">Sqm</div>
                        </div>
                      )}
                      {savedProperty.property_data.propertyType && (
                        <div className="text-center">
                          <div className="text-2xl font-bold text-white">{savedProperty.property_data.propertyType}</div>
                          <div className="text-xs text-gray-400">Type</div>
                        </div>
                      )}
                    </div>

                    {/* Notes Section */}
                    {editingNote === savedProperty.property_id ? (
                      <div className="border-t border-gray-700 pt-4">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            placeholder="Add a note..."
                            className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-gray-500"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleUpdateNote(savedProperty.property_id, savedProperty.property_type, noteText);
                              } else if (e.key === 'Escape') {
                                setEditingNote(null);
                                setNoteText('');
                              }
                            }}
                          />
                          <button
                            onClick={() => handleUpdateNote(savedProperty.property_id, savedProperty.property_type, noteText)}
                            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingNote(null);
                              setNoteText('');
                            }}
                            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : savedProperty.notes ? (
                      <div className="border-t border-gray-700 pt-4">
                        <p className="text-gray-300 italic">"{savedProperty.notes}"</p>
                      </div>
                    ) : null}

                    {/* Footer */}
                    <div className="flex items-center justify-between text-xs text-gray-500 mt-4 pt-4 border-t border-gray-700">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          Saved {new Date(savedProperty.created_at).toLocaleDateString()}
                        </span>
                        {savedProperty.metadata?.view_count && savedProperty.metadata.view_count > 1 && (
                          <span className="flex items-center gap-1">
                            Viewed {savedProperty.metadata.view_count} times
                          </span>
                        )}
                        {savedProperty.metadata?.last_viewed && (
                          <span className="flex items-center gap-1">
                            Last viewed {new Date(savedProperty.metadata.last_viewed).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={async () => {
                          // Update view count and last viewed
                          try {
                            await fetch('/api/saved-properties/view', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                property_id: savedProperty.property_id,
                                property_type: savedProperty.property_type,
                              }),
                            });
                          } catch (error) {
                            console.error('Failed to update view count:', error);
                          }
                          // Navigate to map
                          router.push(`/map?focus=${savedProperty.property_id}&type=${savedProperty.property_type}`);
                        }}
                        className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 transition-colors"
                      >
                        View on Map
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
