'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { SavedProperty } from '@/types/supabase';
import { MortgageScenario } from '@/types/mortgage';
import { formatFullPrice } from '@/lib/format';
import { formatCurrency, formatMonthsAsYears } from '@/lib/mortgage/formatters';
import { Calculator, TrendingUp, Trash2, ExternalLink, Calendar, Euro, Bookmark } from 'lucide-react';
import { HeroSection } from '@/components/HeroSection';

export default function SavedPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'properties' | 'scenarios'>('properties');

  // Properties state
  const [savedProperties, setSavedProperties] = useState<SavedProperty[]>([]);
  const [propertiesLoading, setPropertiesLoading] = useState(true);
  const [propertiesError, setPropertiesError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'listing' | 'rental' | 'sold'>('all');
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'price' | 'address'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Mortgage scenarios state
  const [scenarios, setScenarios] = useState<MortgageScenario[]>([]);
  const [scenariosLoading, setScenariosLoading] = useState(true);
  const [scenariosError, setScenariosError] = useState<string | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchSavedProperties();
      fetchScenarios();
    }
  }, [user]);

  const fetchSavedProperties = async () => {
    try {
      setPropertiesLoading(true);
      const response = await fetch('/api/saved-properties');
      if (!response.ok) {
        throw new Error('Failed to fetch saved properties');
      }
      const data = await response.json();
      setSavedProperties(data.properties || []);
      console.log('Loaded saved properties:', data.properties?.length || 0, 'properties');
    } catch (err) {
      console.error('Error fetching saved properties:', err);
      setPropertiesError('Failed to load saved properties');
    } finally {
      setPropertiesLoading(false);
    }
  };

  const fetchScenarios = async () => {
    try {
      setScenariosLoading(true);
      const response = await fetch('/api/mortgage/scenarios?limit=50');
      if (!response.ok) {
        throw new Error('Failed to fetch mortgage scenarios');
      }
      const data = await response.json();
      setScenarios(data.scenarios || []);
    } catch (err) {
      console.error('Error fetching scenarios:', err);
      setScenariosError('Failed to load mortgage scenarios');
    } finally {
      setScenariosLoading(false);
    }
  };

  const handleCalculateMortgage = (propertyData: any, propertyType: string) => {
    console.log('Calculating mortgage for property:', propertyData, 'Type:', propertyType);
    console.log('Property address:', propertyData.address);

    // Calculate mortgage parameters from property data
    let homeValue = 0;
    if (propertyType === 'rental') {
      homeValue = (propertyData.monthlyRent || 0) * 240; // Estimate home value based on rental (20 year equivalent)
    } else {
      homeValue = propertyData.soldPrice || propertyData.askingPrice || propertyData.price || 0;
    }

    // Ensure we have a valid home value
    if (homeValue <= 0) {
      alert('Unable to calculate mortgage: Property price not available');
      return;
    }

    const downPayment = Math.max(homeValue * 0.1, 20000); // 10% down or €20k minimum
    const loanAmount = Math.max(homeValue - downPayment, 0);

    console.log('Calculated values:', { homeValue, downPayment, loanAmount });

    // Build URL with pre-filled parameters
    const params = new URLSearchParams({
      homeValue: homeValue.toString(),
      downPayment: downPayment.toString(),
      loanAmount: loanAmount.toString(),
      interestRate: '3.5', // Default rate
      loanTerm: '30', // Default term
      propertyType: propertyData.propertyType || 'Apartment',
      address: encodeURIComponent(propertyData.address || ''),
    });

    const url = `/mortgage-calc?${params.toString()}`;
    console.log('Navigating to:', url);

    // Navigate to mortgage calculator with pre-filled data
    router.push(url);
  };

  const handleUnsave = async (propertyId: string, propertyType: 'listing' | 'rental' | 'sold') => {
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

  // Mortgage scenario functions
  const deleteScenario = async (scenarioId: string) => {
    if (!confirm('Are you sure you want to delete this mortgage scenario?')) {
      return;
    }

    try {
      const response = await fetch(`/api/mortgage/scenarios/${scenarioId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete scenario');
      }

      // Remove from local state
      setScenarios(prev => prev.filter(s => s.id !== scenarioId));
    } catch (err) {
      console.error('Error deleting scenario:', err);
      alert('Failed to delete mortgage scenario');
    }
  };

  const loadScenario = (scenario: MortgageScenario) => {
    // Build URL with scenario data
    const params = new URLSearchParams({
      homeValue: scenario.inputs.homeValue.toString(),
      downPayment: scenario.inputs.downPayment.toString(),
      loanAmount: scenario.inputs.loanAmount.toString(),
      interestRate: scenario.inputs.interestRate.toString(),
      loanTerm: scenario.inputs.loanTerm.toString(),
    });

    // Navigate to mortgage calculator with pre-filled data
    router.push(`/mortgage-calc?${params.toString()}`);
  };

  const shareScenario = (scenario: MortgageScenario) => {
    // Build shareable URL with scenario data
    const params = new URLSearchParams({
      homeValue: scenario.inputs.homeValue.toString(),
      downPayment: scenario.inputs.downPayment.toString(),
      loanAmount: scenario.inputs.loanAmount.toString(),
      interestRate: scenario.inputs.interestRate.toString(),
      loanTerm: scenario.inputs.loanTerm.toString(),
      address: encodeURIComponent(scenario.name || ''),
    });

    const shareUrl = `${window.location.origin}/mortgage-calc?${params.toString()}`;

    // Copy to clipboard
    navigator.clipboard.writeText(shareUrl).then(() => {
      alert('Mortgage scenario link copied to clipboard!');
    }).catch(() => {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Mortgage scenario link copied to clipboard!');
    });
  };

  // Computed properties for filtering
  const filteredProperties = savedProperties.filter(property => {
    const matchesType = filterType === 'all' || property.property_type === filterType;
    const matchesSearch = searchQuery === '' ||
      property.property?.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      property.property_id.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesType && matchesSearch;
  }).sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'date':
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        break;
      case 'price':
        const aPrice = a.property?.soldPrice || a.property?.askingPrice || a.property?.monthlyRent || 0;
        const bPrice = b.property?.soldPrice || b.property?.askingPrice || b.property?.monthlyRent || 0;
        comparison = aPrice - bPrice;
        break;
      case 'address':
        comparison = (a.property?.address || a.property_id).localeCompare(b.property?.address || b.property_id);
        break;
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });

  // Handle saving notes
  const handleSaveNote = async (propertyId: string) => {
    try {
      const response = await fetch('/api/saved-properties/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          property_id: propertyId,
          notes: noteText,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save note');
      }

      // Update local state
      setSavedProperties(prev => prev.map(sp =>
        sp.property_id === propertyId ? { ...sp, notes: noteText } : sp
      ));

      setEditingNote(null);
      setNoteText('');
    } catch (err) {
      console.error('Error saving note:', err);
      alert('Failed to save note');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <HeroSection
        title="Saved Items"
        description={
          activeTab === 'properties'
            ? `${savedProperties.length} saved ${savedProperties.length === 1 ? 'property' : 'properties'}`
            : `${scenarios.length} saved ${scenarios.length === 1 ? 'scenario' : 'scenarios'}`
        }
        tabs={
          <div className="flex bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('properties')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'properties'
                  ? 'bg-emerald-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              Properties ({savedProperties.length})
            </button>
            <button
              onClick={() => setActiveTab('scenarios')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'scenarios'
                  ? 'bg-emerald-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              Mortgage Scenarios ({scenarios.length})
            </button>
          </div>
        }
      />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === 'properties' ? (
          // Properties Tab
          <>
            {propertiesLoading ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-400">Loading saved properties...</p>
              </div>
            ) : propertiesError ? (
              <div className="text-center py-12">
                <p className="text-red-400 mb-4">{propertiesError}</p>
                <button
                  onClick={fetchSavedProperties}
                  className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700"
                >
                  Try Again
                </button>
              </div>
            ) : savedProperties.length === 0 ? (
              <div className="text-center py-12">
                <Bookmark className="w-16 h-16 text-gray-600 mx-auto mb-6" />
                <h3 className="text-xl font-semibold text-white mb-2">No saved properties yet</h3>
                <p className="text-gray-400 mb-6">
                  Start exploring properties on the map and save the ones you're interested in
                </p>
                <button
                  onClick={() => router.push('/map')}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-2 mx-auto"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V7m0 0L9 4" />
                  </svg>
                  Explore Property Map
                </button>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredProperties.map((savedProperty) => (
                  <div
                    key={`${savedProperty.property_id}-${savedProperty.property_type}`}
                    className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-6 border border-gray-700 hover:border-gray-600 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-white text-lg mb-2 leading-tight">
                          {savedProperty.property?.address || savedProperty.property_id}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {new Date(savedProperty.created_at).toLocaleDateString()}
                          <span className="inline-flex items-center gap-1">
                            <span className={`inline-block w-2 h-2 rounded-full ${
                              savedProperty.property_type === 'listing' ? 'bg-blue-500' :
                              savedProperty.property_type === 'rental' ? 'bg-green-500' : 'bg-orange-500'
                            }`}></span>
                            {savedProperty.property_type === 'listing' ? 'For Sale' :
                             savedProperty.property_type === 'rental' ? 'For Rent' : 'Sold'}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleUnsave(savedProperty.property_id, savedProperty.property_type)}
                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Remove from saved"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>

                    {savedProperty.property && (
                      <div className="space-y-3 mb-4">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400 text-sm">Price</span>
                          <span className="text-white font-semibold">
                            {savedProperty.property_type === 'rental'
                              ? `€${savedProperty.property.monthlyRent?.toLocaleString()}/month`
                              : formatFullPrice(savedProperty.property.soldPrice || savedProperty.property.askingPrice || 0)
                            }
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400 text-sm">Bedrooms</span>
                          <span className="text-white font-semibold">{savedProperty.property.bedrooms || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400 text-sm">Property Type</span>
                          <span className="text-white font-semibold">{savedProperty.property.propertyType || 'N/A'}</span>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 mb-4">
                      <button
                        onClick={() => handleCalculateMortgage(savedProperty.property, savedProperty.property_type)}
                        className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors flex items-center justify-center gap-1"
                      >
                        <Calculator className="w-3 h-3" />
                        Calculate Mortgage
                      </button>
                      <button
                        onClick={() => router.push(`/property/${savedProperty.property_type}/${savedProperty.property_id}`)}
                        className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
                      >
                        View Details
                      </button>
                    </div>

                    {editingNote === savedProperty.property_id ? (
                      <div className="border-t border-gray-700 pt-4">
                        <textarea
                          value={noteText}
                          onChange={(e) => setNoteText(e.target.value)}
                          placeholder="Add a note about this property..."
                          rows={3}
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                        />
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => handleSaveNote(savedProperty.property_id)}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-sm transition-colors"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingNote(null)}
                            className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm transition-colors"
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
                        <button
                          onClick={() => setEditingNote(editingNote === savedProperty.property_id ? null : savedProperty.property_id)}
                          className="text-gray-400 hover:text-white transition-colors"
                        >
                          {savedProperty.notes ? 'Edit Note' : 'Add Note'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          // Scenarios Tab
          <>
            {scenariosLoading ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-400">Loading mortgage scenarios...</p>
              </div>
            ) : scenariosError ? (
              <div className="text-center py-12">
                <p className="text-red-400 mb-4">{scenariosError}</p>
                <button
                  onClick={fetchScenarios}
                  className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700"
                >
                  Try Again
                </button>
              </div>
            ) : scenarios.length === 0 ? (
              <div className="text-center py-12">
                <Calculator className="w-16 h-16 text-gray-600 mx-auto mb-6" />
                <h3 className="text-xl font-semibold text-white mb-2">No saved mortgage scenarios yet</h3>
                <p className="text-gray-400 mb-6">
                  Start by creating and saving mortgage scenarios in the calculator
                </p>
                <button
                  onClick={() => router.push('/mortgage-calc')}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 mx-auto"
                >
                  <Calculator className="w-4 h-4" />
                  Open Mortgage Calculator
                </button>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {scenarios.map((scenario) => (
                  <div
                    key={scenario.id}
                    className="bg-gray-900/50 backdrop-blur-xl rounded-xl p-6 border border-gray-700 hover:border-gray-600 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-white text-lg mb-2 leading-tight">
                          {scenario.name}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
                          <Calendar className="w-3 h-3" />
                          {new Date(scenario.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <button
                          onClick={() => shareScenario(scenario)}
                          className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="Share this scenario"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteScenario(scenario.id)}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Delete scenario"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Key metrics */}
                    <div className="space-y-3 mb-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-sm">Monthly Payment</span>
                        <span className="text-white font-semibold">
                          {formatCurrency(scenario.results.monthlyPayment)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-sm">Total Interest</span>
                        <span className="text-orange-400 font-semibold">
                          {formatCurrency(scenario.results.totalInterest)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-sm">Payoff Time</span>
                        <span className="text-blue-400 font-semibold">
                          {formatMonthsAsYears(scenario.results.payoffMonths)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-sm">Home Value</span>
                        <span className="text-emerald-400 font-semibold">
                          {formatCurrency(scenario.inputs.homeValue)}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <button
                      onClick={() => loadScenario(scenario)}
                      className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 font-medium"
                    >
                      <Calculator className="w-4 h-4" />
                      Load Scenario
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
