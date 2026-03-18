'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useRouter } from 'next/navigation';
import {
  Search,
  LogOut,
  AlertCircle,
  Loader2,
  Download,
  RotateCcw,
  Clock,
  Bookmark,
  BookmarkCheck,
} from 'lucide-react';
import Link from 'next/link';

// Import components
import { PropertyCard } from '@/components/PropertyCard';
import { ValuationSummary } from '@/components/ValuationSummary';
import { MarketStats, createMarketStatsFromData } from '@/components/MarketStats';
import { ComparableGrid, ComparableProperty } from '@/components/ComparableGrid';
import { ComparableTrendCard } from '@/components/ComparableTrendCard';
import { DealAssessment, DealVerdict } from '@/components/DealAssessment';
import { OverUnderAskingCard } from '@/components/OverUnderAskingCard';
import { YieldAnalysisCard } from '@/components/YieldAnalysisCard';
import { MarketPositionCard } from '@/components/MarketPositionCard';
import { BiddingWarsCard } from '@/components/BiddingWarsCard';
import { AreaTrendCard } from '@/components/AreaTrendCard';
import { LocationInsightCard } from '@/components/LocationInsightCard';
import { WalkabilityCard } from '@/components/WalkabilityCard';
import { PlanningInsightCard } from '@/components/PlanningInsightCard';
import { ExtensionValueCard } from '@/components/ExtensionValueCard';
import { NearbyAmenitiesCard } from '@/components/NearbyAmenitiesCard';
import { SeasonalTrendsCard } from '@/components/SeasonalTrendsCard';
import { QuarterlyTrendsCard } from '@/components/QuarterlyTrendsCard';
import { TimeToSellCard } from '@/components/TimeToSellCard';
import { SizeValueCard } from '@/components/SizeValueCard';
import { formatPrice } from '@/lib/format';
import type { WalkabilityScore } from '@/types/amenities';
import type { PlanningInsight, PropertyPlanningHistory } from '@/types/planning';
import type { LocationInsights } from '@/lib/location-insights';
import type { ExtensionValueResult } from '@/lib/extension-value';

// Type definitions for API responses
interface PropertyMatch {
  address: string;
  beds?: number;
  baths?: number;
  type?: string;
  price?: number;
}

interface ApiComparable {
  address: string;
  soldPrice?: number;
  askingPrice?: number;
  overUnderPercent?: number;
  beds?: number;
  baths?: number;
  areaSqm?: number;
  propertyType?: string;
  distance?: number;
  scrapedAt?: string;
  daysSinceSold?: number;
}

interface YieldAnalysis {
  estimatedMonthlyRent: number;
  grossYield: number;
  confidence: 'high' | 'medium' | 'low';
  areaMedianYield: number | null;
  rentalDataPoints: number;
}

interface MarketPosition {
  activeListingsCount: number;
  avgActiveAskingPrice: number;
  avgDaysOnMarket: number | null;
  priceVsActiveListings: number | null;
  priceDropPercent?: number | null;
  avgPriceReduction?: number | null;
  staleListingPercent?: number | null;
}

interface BiddingWars {
  percentOverAsking: number;
  avgPremium: number;
  highestPremium: number;
  totalSalesAnalyzed: number;
}

interface AreaTrend {
  change6m: number;
  areaName: string;
}

// Lazy-loaded data interfaces
interface AmenitiesData {
  walkabilityScore: WalkabilityScore;
  amenities: import('@/types/amenities').Amenity[];
}

interface PlanningData {
  insight: PlanningInsight;
  propertyHistory: PropertyPlanningHistory;
}

interface SearchResult {
  property: {
    address: string;
    beds?: number;
    baths?: number;
    areaSqm?: number;
    propertyType?: string;
    soldPrice?: number;
    askingPrice?: number;
    latitude?: number;
    longitude?: number;
    overUnderPercent?: number;
    dublinPostcode?: string;
    yieldEstimate?: {
      grossYield: number;
      monthlyRent: number;
      confidence: 'high' | 'medium' | 'low';
      dataPoints: number;
    };
    deal?: {
      verdict: DealVerdict;
      assessment: string;
    };
  };
  comparables: ComparableProperty[];
  stats: {
    medianPrice: number;
    averagePrice: number;
    minPrice: number;
    maxPrice: number;
    medianPricePerSqm: number;
    averagePricePerSqm: number;
    medianOverAskingPercent: number;
    averageOverAskingPercent: number;
    count: number;
  };
  yieldAnalysis?: YieldAnalysis | null;
  marketPosition?: MarketPosition | null;
  biddingWars?: BiddingWars | null;
  areaTrend?: AreaTrend | null;
  locationInsights?: LocationInsights | null;
  extensionValue?: ExtensionValueResult | null;
  seasonalTrends?: {
    monthlyStats: { month: string; medianPrice: number; medianOverUnder: number; salesCount: number }[];
    cheapestMonths: string[];
    expensiveMonths: string[];
    bestDealMonths: string[];
    avgPrice: number;
    totalSalesAnalyzed: number;
  } | null;
  quarterlyTrends?: {
    quarters: { quarter: string; medianPrice: number; salesCount: number; change: number | null }[];
    overallChange: number | null;
    periodStart: string;
    periodEnd: string;
    totalSalesAnalyzed: number;
  } | null;
  timeToSellTrends?: {
    monthlyStats: { month: string; medianDays: number; salesCount: number }[];
    fastestMonths: string[];
    slowestMonths: string[];
    avgDays: number;
    totalSalesAnalyzed: number;
  } | null;
  pricePerSqmTrends?: {
    bracketStats: { name: string; min: number; max: number; medianPricePerSqm: number | null; count: number }[];
    overallMedianPricePerSqm: number;
    totalAnalyzed: number;
    postcode: string;
    propertyType: string;
  } | null;
}

function ValuationContent() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { showToast } = useToast();
  const reportRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [multipleMatches, setMultipleMatches] = useState<PropertyMatch[]>([]);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [savingProperty, setSavingProperty] = useState(false);
  const [propertySaved, setPropertySaved] = useState(false);

  // Lazy-loaded data states
  const [amenitiesData, setAmenitiesData] = useState<AmenitiesData | null>(null);
  const [planningData, setPlanningData] = useState<PlanningData | null>(null);
  const [loadingAmenities, setLoadingAmenities] = useState(false);
  const [loadingPlanning, setLoadingPlanning] = useState(false);

  // Load recent searches from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setRecentSearches(parsed);
        }
      } catch {
        // Invalid JSON, ignore
      }
    }
  }, []);

  // Save recent searches to localStorage when updated
  useEffect(() => {
    if (recentSearches.length > 0) {
      localStorage.setItem('recentSearches', JSON.stringify(recentSearches));
    }
  }, [recentSearches]);

  // Search function that can take an optional address to avoid race conditions
  const performSearch = useCallback(async (address: string) => {
    if (!address.trim()) {
      setError('Please enter an address');
      return;
    }

    if (!user) {
      setError('You must be logged in to search');
      return;
    }

    setLoading(true);
    setError(null);
    setMultipleMatches([]);

    try {
      const { createClient } = await import('@/lib/supabase');
      const supabase = createClient();
      const { data: sessionData } = await supabase.auth.getSession();

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (sessionData.session?.access_token) {
        headers['Authorization'] = `Bearer ${sessionData.session.access_token}`;
      }

      const response = await fetch(`/api/search?q=${encodeURIComponent(address)}`, {
        credentials: 'include',
        headers,
      });

      if (!response.ok) {
        if (response.status === 401) {
          setError('Your session has expired. Please log in again.');
          return;
        }
        if (response.status === 429) {
          setError('You have reached your search limit for this month. Please upgrade your plan.');
          return;
        }
        setError(`Error: ${response.statusText}`);
        return;
      }

      const data = await response.json();

      if (data.found === false && data.multiple) {
        setMultipleMatches(data.matches);
        setError(null);
        setResult(null);
      } else if (data.found) {
        // Transform comparables to match component interface
        const transformedComparables: ComparableProperty[] = (data.comparables || []).map((c: ApiComparable) => ({
          address: c.address,
          soldPrice: c.soldPrice || c.askingPrice,
          askingPrice: c.askingPrice,
          overUnderPercent: c.overUnderPercent,
          beds: c.beds,
          baths: c.baths,
          areaSqm: c.areaSqm,
          propertyType: c.propertyType,
          distance: c.distance,
          soldDate: c.scrapedAt,
          daysSinceSold: c.daysSinceSold || Math.floor((Date.now() - new Date(c.scrapedAt || Date.now()).getTime()) / (1000 * 60 * 60 * 24)),
          pricePerSqm: c.areaSqm && c.areaSqm > 0 ? Math.round((c.soldPrice || c.askingPrice || 0) / c.areaSqm) : undefined,
        }));

        setResult({
          property: data.property,
          comparables: transformedComparables,
          stats: data.stats,
          yieldAnalysis: data.yieldAnalysis,
          marketPosition: data.marketPosition,
          biddingWars: data.biddingWars,
          areaTrend: data.areaTrend,
          locationInsights: data.locationInsights,
          extensionValue: data.extensionValue,
        });
        setMultipleMatches([]);
        // Reset lazy-loaded data
        setAmenitiesData(null);
        setPlanningData(null);

        // Add to recent searches (use callback form to avoid stale closure)
        setRecentSearches(prev => {
          if (prev.includes(address)) return prev;
          return [address, ...prev].slice(0, 5);
        });
      } else {
        setError(data.error || 'Property not found');
        setResult(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Wrapper that uses current searchQuery state
  const handleSearch = useCallback(() => {
    performSearch(searchQuery);
  }, [performSearch, searchQuery]);

  // Lazy load amenities and planning data after search completes
  useEffect(() => {
    if (!result?.property.latitude || !result?.property.longitude) {
      return;
    }

    const lat = result.property.latitude;
    const lng = result.property.longitude;
    const address = result.property.address;
    const postcode = result.property.dublinPostcode;

    // Fetch amenities data
    const fetchAmenitiesData = async () => {
      setLoadingAmenities(true);
      try {
        const { createClient } = await import('@/lib/supabase');
        const supabase = createClient();
        const { data: sessionData } = await supabase.auth.getSession();

        const headers: Record<string, string> = {};
        if (sessionData.session?.access_token) {
          headers['Authorization'] = `Bearer ${sessionData.session.access_token}`;
        }

        const response = await fetch(
          `/api/amenities?lat=${lat}&lng=${lng}&radius=1000`,
          { credentials: 'include', headers }
        );

        if (response.ok) {
          const data = await response.json();
          setAmenitiesData({
            walkabilityScore: data.walkabilityScore,
            amenities: data.amenities || [],
          });
        }
      } catch (error) {
        console.error('Failed to fetch amenities:', error);
      } finally {
        setLoadingAmenities(false);
      }
    };

    // Fetch planning data
    const fetchPlanningData = async () => {
      setLoadingPlanning(true);
      try {
        const { createClient } = await import('@/lib/supabase');
        const supabase = createClient();
        const { data: sessionData } = await supabase.auth.getSession();

        const headers: Record<string, string> = {};
        if (sessionData.session?.access_token) {
          headers['Authorization'] = `Bearer ${sessionData.session.access_token}`;
        }

        const params = new URLSearchParams({
          lat: lat.toString(),
          lng: lng.toString(),
          address: address,
          radius: '150',
        });
        if (postcode) {
          params.set('postcode', postcode);
        }

        const response = await fetch(
          `/api/planning?${params}`,
          { credentials: 'include', headers }
        );

        if (response.ok) {
          const data = await response.json();
          setPlanningData({
            insight: data.insight,
            propertyHistory: data.propertyHistory,
          });
        }
      } catch (error) {
        console.error('Failed to fetch planning data:', error);
      } finally {
        setLoadingPlanning(false);
      }
    };

    // Fetch both in parallel
    fetchAmenitiesData();
    fetchPlanningData();
  }, [result?.property.latitude, result?.property.longitude, result?.property.address, result?.property.dublinPostcode]);

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const downloadPDF = async () => {
    if (!reportRef.current || !result) return;

    setDownloadingPDF(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const element = reportRef.current;
      const opt = {
        margin: 10,
        filename: `valuation-${result.property.address.replace(/\s+/g, '_')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, allowTaint: true },
        jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
      };
      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error('PDF download error:', err);
      setError('Failed to generate PDF. Please try again.');
    } finally {
      setDownloadingPDF(false);
    }
  };

  const clearSearch = () => {
    setResult(null);
    setSearchQuery('');
    setMultipleMatches([]);
    setError(null);
    setPropertySaved(false);
  };

  const handleSaveProperty = async () => {
    if (!result || !user) return;

    setSavingProperty(true);
    try {
      const { saveProperty } = await import('@/lib/saved-properties');
      const propertyPrice = result.property.soldPrice || result.property.askingPrice || 0;

      const response = await saveProperty(user.id, {
        address: result.property.address,
        beds: result.property.beds,
        baths: result.property.baths,
        areaSqm: result.property.areaSqm,
        propertyType: result.property.propertyType,
        price: propertyPrice,
        propertyData: result.property as unknown as Record<string, unknown>,
        lastValuation: result.property.deal && result.stats ? {
          medianPrice: result.stats.medianPrice,
          verdict: result.property.deal.verdict,
        } : undefined,
      });

      if (response.success) {
        setPropertySaved(true);
        showToast('Property saved to your collection', 'success');
      } else {
        showToast(response.error || 'Failed to save property', 'error');
      }
    } catch (err) {
      console.error('Save property error:', err);
      showToast('Failed to save property. Please try again.', 'error');
    } finally {
      setSavingProperty(false);
    }
  };

  // Calculate additional metrics for display
  const propertyPrice = result?.property.soldPrice || result?.property.askingPrice || 0;
  const propertyPricePerSqm = result?.property.areaSqm && result.property.areaSqm > 0
    ? Math.round(propertyPrice / result.property.areaSqm)
    : undefined;
  const pricePerSqmDiff = propertyPricePerSqm && result?.stats?.medianPricePerSqm
    ? ((propertyPricePerSqm - result.stats.medianPricePerSqm) / result.stats.medianPricePerSqm) * 100
    : undefined;

  // Calculate estimated value range
  const estimatedLow = result?.stats?.medianPrice ? Math.round(result.stats.medianPrice * 0.9) : 0;
  const estimatedHigh = result?.stats?.medianPrice ? Math.round(result.stats.medianPrice * 1.1) : 0;

  // Determine confidence level
  const confidence = result?.stats?.count && result.stats.count >= 10 ? 'high'
    : result?.stats?.count && result.stats.count >= 5 ? 'medium' : 'low';

  return (
    <>
      {/* Navigation */}
      <nav className="sticky top-0 z-50 backdrop-blur" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-80 transition">
              <div className="w-10 h-10 rounded-lg text-white flex items-center justify-center font-bold" style={{ background: 'var(--gradient-primary)' }}>G</div>
              <div>
                <h1 className="text-lg font-bold">Gaff Intel</h1>
                <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>Property Valuation</p>
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm hidden sm:block" style={{ color: 'var(--foreground-secondary)' }}>{user?.email}</span>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 text-sm transition"
              style={{ color: 'var(--foreground-secondary)' }}
            >
              <LogOut size={18} />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Property Valuation</h2>
          <p className="mb-6" style={{ color: 'var(--foreground-secondary)' }}>
            Search any Dublin property to get instant comparable analysis and market intelligence
          </p>

          <div className="card">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--foreground-muted)' }}
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter property address (e.g., '42 Main Street, Dublin 4')"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
                  className="w-full pl-12 pr-4 py-3 rounded-lg focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={loading}
                className="btn-primary flex items-center justify-center gap-2 whitespace-nowrap px-8"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search size={18} />
                    Search
                  </>
                )}
              </button>
            </div>

            {/* Recent Searches */}
            {recentSearches.length > 0 && !result && (
              <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                <p className="text-xs mb-2 flex items-center gap-1" style={{ color: 'var(--foreground-muted)' }}>
                  <Clock size={12} /> Recent searches
                </p>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((search, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setSearchQuery(search);
                        performSearch(search);
                      }}
                      className="chip text-xs"
                    >
                      {search}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div style={{ marginTop: '1rem', background: 'var(--negative-bg)', border: '1px solid var(--negative)', borderRadius: '12px', padding: '1rem', display: 'flex', gap: '0.75rem' }}>
                <AlertCircle style={{ color: 'var(--negative)', flexShrink: 0, marginTop: '0.125rem' }} size={20} />
                <p style={{ fontSize: '0.875rem', color: 'var(--negative)' }}>{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Multiple Matches Selection */}
        {multipleMatches.length > 0 && (
          <div className="card mb-8" style={{ background: 'var(--surface-hover)' }}>
            <h3 className="text-lg font-semibold mb-4">Multiple Properties Found</h3>
            <p style={{ color: 'var(--foreground-secondary)', marginBottom: '1.5rem' }}>
              {multipleMatches.length} properties match your search. Please select one:
            </p>
            <div className="space-y-3">
              {multipleMatches.map((match, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setSearchQuery(match.address);
                    setMultipleMatches([]);
                    setResult(null);
                    performSearch(match.address);
                  }}
                  className="card-static text-left w-full transition hover:border-[var(--accent)]"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold">{match.address}</p>
                      <p style={{ color: 'var(--foreground-secondary)', fontSize: '0.875rem' }}>
                        {match.beds} bed • {match.baths} bath • {match.type}
                      </p>
                    </div>
                    <p className="font-semibold">{match.price ? formatPrice(match.price) : 'N/A'}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results Section */}
        {result && (
          <div ref={reportRef}>
            {/* Over/Under Asking Card - Most Prominent */}
            {result.property.soldPrice && result.property.askingPrice && result.property.overUnderPercent !== undefined && (
              <div className="mb-6 animate-in">
                <OverUnderAskingCard
                  soldPrice={result.property.soldPrice}
                  askingPrice={result.property.askingPrice}
                  overUnderPercent={result.property.overUnderPercent}
                  areaAvgOverUnder={result.biddingWars?.avgPremium}
                  areaPercentOverAsking={result.biddingWars?.percentOverAsking}
                />
              </div>
            )}

            {/* Deal Assessment */}
            {result.property.deal && result.stats && (
              <div className="mb-6 animate-in animate-delay-1">
                <DealAssessment
                  verdict={result.property.deal.verdict}
                  assessment={result.property.deal.assessment}
                  percentDiff={result.stats.medianPrice > 0
                    ? ((propertyPrice - result.stats.medianPrice) / result.stats.medianPrice) * 100
                    : undefined
                  }
                  confidence={confidence}
                  pricePerSqmDiff={pricePerSqmDiff}
                  medianPrice={result.stats.medianPrice}
                  propertyPrice={propertyPrice}
                />
              </div>
            )}

            {/* Property Card & Valuation Summary Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Property Overview */}
              <div className="animate-in animate-delay-2">
                <PropertyCard
                  address={result.property.address}
                  beds={result.property.beds}
                  baths={result.property.baths}
                  areaSqm={result.property.areaSqm}
                  propertyType={result.property.propertyType}
                  soldPrice={result.property.soldPrice}
                  askingPrice={result.property.askingPrice}
                />
              </div>

              {/* Valuation Summary */}
              {result.stats && (
                <div className="animate-in animate-delay-2">
                  <ValuationSummary
                    estimatedValue={result.stats.medianPrice}
                    lowEstimate={estimatedLow}
                    highEstimate={estimatedHigh}
                    confidence={confidence}
                    comparableCount={result.stats.count}
                    pricePerSqm={propertyPricePerSqm}
                    areaMedian={result.stats.medianPrice}
                  />
                </div>
              )}
            </div>

            {/* Investment & Market Position Row */}
            {(result.yieldAnalysis || result.marketPosition) && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Yield Analysis */}
                {result.yieldAnalysis && (
                  <div className="animate-in animate-delay-3">
                    <YieldAnalysisCard
                      estimatedMonthlyRent={result.yieldAnalysis.estimatedMonthlyRent}
                      grossYield={result.yieldAnalysis.grossYield}
                      confidence={result.yieldAnalysis.confidence}
                      areaMedianYield={result.yieldAnalysis.areaMedianYield}
                      rentalDataPoints={result.yieldAnalysis.rentalDataPoints}
                    />
                  </div>
                )}

                {/* Market Position */}
                {result.marketPosition && (
                  <div className="animate-in animate-delay-3">
                    <MarketPositionCard
                      activeListingsCount={result.marketPosition.activeListingsCount}
                      avgActiveAskingPrice={result.marketPosition.avgActiveAskingPrice}
                      avgDaysOnMarket={result.marketPosition.avgDaysOnMarket}
                      priceVsActiveListings={result.marketPosition.priceVsActiveListings}
                      propertyPrice={propertyPrice}
                      priceDropPercent={result.marketPosition.priceDropPercent}
                      avgPriceReduction={result.marketPosition.avgPriceReduction}
                      staleListingPercent={result.marketPosition.staleListingPercent}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Location & Walkability Row */}
            {result.property.latitude && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Location Insights */}
                {result.locationInsights && (
                  <div className="animate-in animate-delay-3">
                    <LocationInsightCard
                      nearestStation={result.locationInsights.nearestStation}
                      transportPremium={result.locationInsights.transportPremium}
                    />
                  </div>
                )}

                {/* Walkability Score - only show when loading or have data */}
                {(loadingAmenities || amenitiesData?.walkabilityScore) && (
                  <div className="animate-in animate-delay-3">
                    <WalkabilityCard
                      walkabilityScore={amenitiesData?.walkabilityScore || {
                        score: 0,
                        rating: 'Low',
                        breakdown: { transport: 0, education: 0, healthcare: 0, shopping: 0, leisure: 0, services: 0 },
                      }}
                      isLoading={loadingAmenities}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Nearby Amenities - show when we have amenities data */}
            {result.property.latitude && (loadingAmenities || (amenitiesData?.amenities && amenitiesData.amenities.length > 0)) && (
              <div className="mb-6 animate-in animate-delay-3">
                <NearbyAmenitiesCard
                  amenities={amenitiesData?.amenities || []}
                  isLoading={loadingAmenities}
                />
              </div>
            )}

            {/* Planning & Extension Value Row */}
            {(loadingPlanning || planningData || result.extensionValue) && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Planning Insights - only show when loading or have actual data */}
                {loadingPlanning ? (
                  <div className="animate-in animate-delay-3">
                    <PlanningInsightCard
                      insight={{
                        recentApprovals: 0,
                        pendingApplications: 0,
                        largeDevNearby: false,
                        developmentTrend: 'stable',
                        propertyHistory: [],
                      }}
                      propertyHistory={{
                        hasApprovedWork: false,
                        workTypes: [],
                        mostRecentApproval: null,
                        totalApprovals: 0,
                      }}
                      isLoading={true}
                    />
                  </div>
                ) : planningData ? (
                  <div className="animate-in animate-delay-3">
                    <PlanningInsightCard
                      insight={planningData.insight}
                      propertyHistory={planningData.propertyHistory}
                    />
                  </div>
                ) : null}

                {/* Extension Value Calculator (houses only) */}
                {result.extensionValue && (
                  <div className="animate-in animate-delay-3">
                    <ExtensionValueCard
                      extensionValue={result.extensionValue}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Area Trend - Show 6-month price movement */}
            {result.areaTrend && result.stats && (
              <div className="mb-6 animate-in animate-delay-4">
                <AreaTrendCard
                  change6m={result.areaTrend.change6m}
                  areaName={result.areaTrend.areaName}
                  medianPrice={result.stats.medianPrice}
                />
              </div>
            )}

            {/* Bidding Wars Intelligence */}
            {result.biddingWars && (
              <div className="mb-6 animate-in animate-delay-4">
                <BiddingWarsCard
                  percentOverAsking={result.biddingWars.percentOverAsking}
                  avgPremium={result.biddingWars.avgPremium}
                  highestPremium={result.biddingWars.highestPremium}
                  totalSalesAnalyzed={result.biddingWars.totalSalesAnalyzed}
                  areaName={result.property.dublinPostcode || undefined}
                />
              </div>
            )}

            {/* Market Statistics */}
            {result.stats && (
              <div className="mb-6 animate-in animate-delay-4">
                <MarketStats
                  title="Market Context"
                  stats={createMarketStatsFromData({
                    medianPrice: result.stats.medianPrice,
                    medianPricePerSqm: result.stats.medianPricePerSqm,
                    medianOverAskingPercent: result.stats.medianOverAskingPercent,
                    count: result.stats.count,
                    avgDaysOnMarket: result.marketPosition?.avgDaysOnMarket ?? undefined,
                  })}
                  columns={4}
                />
              </div>
            )}

            {/* Time-Based Trends Section */}
            {(result.seasonalTrends || result.quarterlyTrends) && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Quarterly Price Trends */}
                {result.quarterlyTrends && (
                  <div className="animate-in animate-delay-4">
                    <QuarterlyTrendsCard
                      quarters={result.quarterlyTrends.quarters}
                      overallChange={result.quarterlyTrends.overallChange}
                      periodStart={result.quarterlyTrends.periodStart}
                      periodEnd={result.quarterlyTrends.periodEnd}
                      totalSalesAnalyzed={result.quarterlyTrends.totalSalesAnalyzed}
                    />
                  </div>
                )}

                {/* Seasonal Trends */}
                {result.seasonalTrends && (
                  <div className="animate-in animate-delay-4">
                    <SeasonalTrendsCard
                      monthlyStats={result.seasonalTrends.monthlyStats}
                      cheapestMonths={result.seasonalTrends.cheapestMonths}
                      expensiveMonths={result.seasonalTrends.expensiveMonths}
                      bestDealMonths={result.seasonalTrends.bestDealMonths}
                      avgPrice={result.seasonalTrends.avgPrice}
                      totalSalesAnalyzed={result.seasonalTrends.totalSalesAnalyzed}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Time to Sell & Size Value Row */}
            {(result.timeToSellTrends || result.pricePerSqmTrends) && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Time to Sell */}
                {result.timeToSellTrends && (
                  <div className="animate-in animate-delay-4">
                    <TimeToSellCard
                      monthlyStats={result.timeToSellTrends.monthlyStats}
                      fastestMonths={result.timeToSellTrends.fastestMonths}
                      slowestMonths={result.timeToSellTrends.slowestMonths}
                      avgDays={result.timeToSellTrends.avgDays}
                      totalSalesAnalyzed={result.timeToSellTrends.totalSalesAnalyzed}
                    />
                  </div>
                )}

                {/* Size Value Analysis */}
                {result.pricePerSqmTrends && (
                  <div className="animate-in animate-delay-4">
                    <SizeValueCard
                      bracketStats={result.pricePerSqmTrends.bracketStats}
                      overallMedianPricePerSqm={result.pricePerSqmTrends.overallMedianPricePerSqm}
                      totalAnalyzed={result.pricePerSqmTrends.totalAnalyzed}
                      postcode={result.pricePerSqmTrends.postcode}
                      propertyType={result.pricePerSqmTrends.propertyType}
                      propertySqm={result.property.areaSqm}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Comparable Sales Timeline */}
            {result.comparables.length >= 4 && (
              <div className="mb-6 animate-in animate-delay-4">
                <ComparableTrendCard
                  sales={result.comparables
                    .filter((c) => c.soldDate && c.soldPrice)
                    .map((c) => ({
                      date: c.soldDate as string,
                      price: c.soldPrice,
                      address: c.address,
                    }))}
                  propertyPrice={propertyPrice}
                />
              </div>
            )}

            {/* Comparable Properties */}
            <div className="mb-6 animate-in animate-delay-4">
              <ComparableGrid
                comparables={result.comparables}
                title="Comparable Sales"
                showSortControls={true}
                maxDisplay={5}
              />
            </div>

            {/* Property Analysis Insight */}
            {result.property.areaSqm && propertyPrice && result.stats && (
              <div className="insight-card accent mb-6">
                <h4 className="font-semibold mb-3">Property Analysis</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                  <div>
                    <p className="font-semibold" style={{ color: 'var(--foreground)' }}>Price per sqm comparison:</p>
                    <p>
                      This property: {formatPrice(propertyPricePerSqm || 0)}/sqm vs
                      {' '}{formatPrice(result.stats.medianPricePerSqm)}/sqm market median
                    </p>
                  </div>
                  {pricePerSqmDiff !== undefined && (
                    <div>
                      <p className="font-semibold" style={{ color: 'var(--foreground)' }}>Difference:</p>
                      <p style={{ color: pricePerSqmDiff < 0 ? 'var(--positive)' : pricePerSqmDiff > 0 ? 'var(--warning)' : 'var(--foreground-secondary)' }}>
                        {pricePerSqmDiff < 0
                          ? `${Math.abs(pricePerSqmDiff).toFixed(1)}% cheaper per sqm than area median`
                          : pricePerSqmDiff > 0
                          ? `${pricePerSqmDiff.toFixed(1)}% more expensive per sqm than area median`
                          : 'At area median price per sqm'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Actions Section */}
            <div className="flex flex-wrap gap-4 no-print">
              <button
                onClick={downloadPDF}
                disabled={downloadingPDF}
                className="btn-primary flex items-center gap-2"
              >
                {downloadingPDF ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download size={18} />
                    Download PDF Report
                  </>
                )}
              </button>
              <button
                className="btn-secondary flex items-center gap-2"
                onClick={handleSaveProperty}
                disabled={savingProperty || propertySaved}
                style={propertySaved ? { color: 'var(--positive)' } : undefined}
              >
                {savingProperty ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Saving...
                  </>
                ) : propertySaved ? (
                  <>
                    <BookmarkCheck size={18} />
                    Saved
                  </>
                ) : (
                  <>
                    <Bookmark size={18} />
                    Save Property
                  </>
                )}
              </button>
              <button
                onClick={clearSearch}
                className="btn-secondary flex items-center gap-2"
              >
                <RotateCcw size={18} />
                New Search
              </button>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

export default function ValuationPage() {
  return (
    <ProtectedRoute>
      <ValuationContent />
    </ProtectedRoute>
  );
}
