'use client';

import { useState, useCallback, useRef } from 'react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useRouter } from 'next/navigation';
import {
  LogOut,
  Search,
  TrendingUp,
  TrendingDown,
  Minus,
  Home,
  BarChart3,
  Clock,
  Target,
  Download,
  Loader2,
  MapPin,
  ChevronDown,
} from 'lucide-react';
import Link from 'next/link';
import { formatPriceCompact } from '@/lib/format';

interface AreaData {
  area: string;
  medianPrice: number;
  averagePrice: number;
  pricePerSqm: number;
  totalSold: number;
  avgDaysOnMarket: number;
  askingVsSoldDelta: number;
  mostCommonType: string;
  trendDirection: 'up' | 'down' | 'stable';
  monthOverMonthChange: number;
}

// Dublin areas for dropdown
const DUBLIN_AREAS = [
  'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D6W', 'D7', 'D8', 'D9', 'D10',
  'D11', 'D12', 'D13', 'D14', 'D15', 'D16', 'D17', 'D18', 'D20', 'D22', 'D24',
  'Blackrock', 'Dun Laoghaire', 'Dalkey', 'Killiney', 'Sandyford', 'Dundrum',
  'Rathfarnham', 'Templeogue', 'Terenure', 'Rathmines', 'Ranelagh', 'Donnybrook',
  'Ballsbridge', 'Clontarf', 'Drumcondra', 'Glasnevin', 'Cabra', 'Phibsborough',
  'Lucan', 'Clondalkin', 'Tallaght', 'Swords', 'Malahide', 'Howth',
];

function AreasContent() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { showToast } = useToast();
  const reportRef = useRef<HTMLDivElement>(null);
  const [selectedArea, setSelectedArea] = useState<string>('');
  const [areaData, setAreaData] = useState<AreaData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const loadAreaData = useCallback(async (area: string) => {
    if (!area) return;

    setLoading(true);
    setError(null);

    try {
      // Import and use the analytics service
      const { getAreaStatistics } = await import('@/lib/agent-analytics');
      const stats = await getAreaStatistics(area);

      if (stats) {
        setAreaData(stats);
      } else {
        setError(`No property data found for "${area}". Try selecting a different area or check the spelling.`);
        setAreaData(null);
      }
    } catch (err) {
      console.error('Area data load error:', err);
      const message = err instanceof Error ? err.message : 'Failed to load area data';
      setError(`${message}. Please try again or select a different area.`);
      setAreaData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleAreaSelect = (area: string) => {
    setSelectedArea(area);
    setSearchQuery(area);
    setShowDropdown(false);
    loadAreaData(area);
  };

  const filteredAreas = DUBLIN_AREAS.filter(area =>
    area.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp size={16} style={{ color: 'var(--positive)' }} />;
      case 'down':
        return <TrendingDown size={16} style={{ color: 'var(--negative)' }} />;
      default:
        return <Minus size={16} style={{ color: 'var(--foreground-secondary)' }} />;
    }
  };

  const getTrendColor = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return 'var(--positive)';
      case 'down':
        return 'var(--negative)';
      default:
        return 'var(--foreground-secondary)';
    }
  };

  const downloadPDF = async () => {
    if (!reportRef.current || !areaData) return;

    setDownloadingPDF(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const element = reportRef.current;
      const opt = {
        margin: 10,
        filename: `area-brief-${areaData.area.replace(/\s+/g, '_')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, allowTaint: true },
        jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
      };
      await html2pdf().set(opt).from(element).save();
      showToast('PDF downloaded successfully', 'success');
    } catch (err) {
      console.error('PDF download error:', err);
      showToast('Failed to generate PDF. Please try again.', 'error');
    } finally {
      setDownloadingPDF(false);
    }
  };

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
                <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>Area Intelligence</p>
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
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Area Intelligence</h2>
          <p style={{ color: 'var(--foreground-secondary)' }}>
            Become an instant expert on any Dublin area with comprehensive market statistics
          </p>
        </div>

        {/* Area Search */}
        <div className="card mb-8">
          <div className="relative">
            <div className="relative">
              <MapPin
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--foreground-muted)' }}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                placeholder="Search for an area (e.g., 'D4', 'Blackrock', 'Dundrum')"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
                className="w-full pl-12 pr-12 py-3 rounded-lg focus:outline-none focus:border-[var(--accent)]"
              />
              <ChevronDown
                size={18}
                className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer"
                style={{ color: 'var(--foreground-muted)' }}
                onClick={() => setShowDropdown(!showDropdown)}
              />
            </div>

            {/* Dropdown */}
            {showDropdown && filteredAreas.length > 0 && (
              <div
                className="absolute top-full left-0 right-0 mt-2 max-h-64 overflow-y-auto rounded-lg z-50"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                {filteredAreas.map((area) => (
                  <button
                    key={area}
                    onClick={() => handleAreaSelect(area)}
                    className="w-full text-left px-4 py-3 transition"
                    style={{
                      borderBottom: '1px solid var(--border)',
                      background: selectedArea === area ? 'var(--accent-bg)' : 'transparent',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = selectedArea === area ? 'var(--accent-bg)' : 'transparent'}
                  >
                    <span className="font-medium">{area}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Popular Areas */}
          <div className="mt-4">
            <p className="text-xs mb-2" style={{ color: 'var(--foreground-muted)' }}>Popular areas:</p>
            <div className="flex flex-wrap gap-2">
              {['D4', 'D6', 'D2', 'Blackrock', 'Dundrum', 'Malahide'].map((area) => (
                <button
                  key={area}
                  onClick={() => handleAreaSelect(area)}
                  className={`chip ${selectedArea === area ? 'chip-active' : ''}`}
                >
                  {area}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="card text-center py-12">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" style={{ color: 'var(--accent)' }} />
            <p style={{ color: 'var(--foreground-secondary)' }}>Loading area statistics...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="card" style={{ background: 'var(--negative-bg)', borderLeft: '4px solid var(--negative)' }}>
            <p style={{ color: 'var(--negative)' }}>{error}</p>
          </div>
        )}

        {/* Area Statistics */}
        {areaData && !loading && (
          <div className="space-y-6" ref={reportRef}>
            {/* Header with Trend */}
            <div className="card" style={{ borderLeft: `4px solid ${getTrendColor(areaData.trendDirection)}` }}>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                <div>
                  <p className="stat-label mb-1">AREA OVERVIEW</p>
                  <h3 className="text-3xl font-bold mb-2">{areaData.area}</h3>
                  <p style={{ color: 'var(--foreground-secondary)' }}>
                    {areaData.totalSold} properties sold • Most common: {areaData.mostCommonType}
                  </p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg" style={{ background: 'var(--surface-hover)' }}>
                  {getTrendIcon(areaData.trendDirection)}
                  <div>
                    <p className="font-bold" style={{ color: getTrendColor(areaData.trendDirection) }}>
                      {areaData.monthOverMonthChange > 0 ? '+' : ''}{areaData.monthOverMonthChange}%
                    </p>
                    <p className="text-xs" style={{ color: 'var(--foreground-muted)' }}>3-month trend</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Key Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="stat-card">
                <p className="stat-label flex items-center gap-1">
                  <Home size={14} /> Median Price
                </p>
                <p className="stat-value" style={{ color: 'var(--accent)' }}>
                  {formatPriceCompact(areaData.medianPrice)}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--foreground-secondary)' }}>
                  Avg: {formatPriceCompact(areaData.averagePrice)}
                </p>
              </div>

              <div className="stat-card">
                <p className="stat-label flex items-center gap-1">
                  <Target size={14} /> Price/sqm
                </p>
                <p className="stat-value">€{areaData.pricePerSqm.toLocaleString()}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--foreground-secondary)' }}>
                  Per square meter
                </p>
              </div>

              <div className="stat-card">
                <p className="stat-label flex items-center gap-1">
                  <Clock size={14} /> Days on Market
                </p>
                <p className="stat-value">{areaData.avgDaysOnMarket}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--foreground-secondary)' }}>
                  Average
                </p>
              </div>

              <div className="stat-card">
                <p className="stat-label flex items-center gap-1">
                  <TrendingUp size={14} /> vs Asking
                </p>
                <p className="stat-value" style={{ color: areaData.askingVsSoldDelta >= 0 ? 'var(--positive)' : 'var(--negative)' }}>
                  {areaData.askingVsSoldDelta >= 0 ? '+' : ''}{areaData.askingVsSoldDelta}%
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--foreground-secondary)' }}>
                  {areaData.askingVsSoldDelta >= 0 ? 'Over asking' : 'Under asking'}
                </p>
              </div>
            </div>

            {/* Market Insight Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="insight-card accent">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <BarChart3 size={18} style={{ color: 'var(--accent)' }} />
                  Market Activity
                </h4>
                <p style={{ color: 'var(--foreground-secondary)' }}>
                  {areaData.totalSold} properties have sold in this area. The market is currently
                  {areaData.trendDirection === 'up' ? ' trending upward with prices increasing.' :
                   areaData.trendDirection === 'down' ? ' trending downward with price softening.' :
                   ' stable with consistent pricing.'}
                </p>
              </div>

              <div className="insight-card positive">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Target size={18} style={{ color: 'var(--positive)' }} />
                  Pricing Guidance
                </h4>
                <p style={{ color: 'var(--foreground-secondary)' }}>
                  Properties in {areaData.area} typically sell for {formatPriceCompact(areaData.pricePerSqm)}/sqm.
                  {areaData.askingVsSoldDelta >= 0
                    ? ` Expect competition - properties are going ${areaData.askingVsSoldDelta}% over asking.`
                    : ` There may be room for negotiation - properties selling below asking.`}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-4 no-print">
              <button
                className="btn-primary flex items-center gap-2"
                onClick={downloadPDF}
                disabled={downloadingPDF}
              >
                {downloadingPDF ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download size={18} />
                    Download Area Brief (PDF)
                  </>
                )}
              </button>
              <button
                className="btn-secondary flex items-center gap-2"
                onClick={() => router.push('/dashboard/valuation')}
              >
                <Search size={18} />
                Search Properties in {areaData.area}
              </button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!selectedArea && !loading && !error && (
          <div className="card text-center py-12">
            <MapPin size={48} className="mx-auto mb-4" style={{ color: 'var(--foreground-muted)' }} />
            <h3 className="text-xl font-semibold mb-2">Select an Area</h3>
            <p style={{ color: 'var(--foreground-secondary)' }}>
              Choose a Dublin area from the dropdown above to view comprehensive market statistics
            </p>
          </div>
        )}
      </main>
    </>
  );
}

export default function AreasPage() {
  return (
    <ProtectedRoute>
      <AreasContent />
    </ProtectedRoute>
  );
}
