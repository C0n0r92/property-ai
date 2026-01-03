'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useComparison } from '@/contexts/ComparisonContext';
import { PropertyComparisonTable } from '@/components/PropertyComparisonTable';
import { ComparisonInsights } from '@/components/ComparisonInsights';
import { ShareButton } from '@/components/ShareButton';
import { useAuth } from '@/components/auth/AuthProvider';
import { LoginModal } from '@/components/auth/LoginModal';
import { analytics } from '@/lib/analytics';
import Link from 'next/link';

type ExpandedSections = {
  price: boolean;
  details: boolean;
  mortgage: boolean;
  location: boolean;
  planning: boolean;
  investment: boolean;
};

// Section toggle component
function SectionControls({ expandedSections, onToggle }: {
  expandedSections: ExpandedSections;
  onToggle: (section: keyof ExpandedSections) => void;
}) {
  const sections = [
    { key: 'price', label: 'Price & Value', icon: '💰' },
    { key: 'details', label: 'Property Details', icon: '🏠' },
    { key: 'mortgage', label: 'Mortgage Estimate', icon: '💳' },
    { key: 'location', label: 'Location & Walkability', icon: '📍' },
    { key: 'planning', label: 'Planning & Development', icon: '🏗️' },
    { key: 'investment', label: 'Investment Metrics', icon: '📊' }
  ];

  return (
    <div className="bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4 mb-6">
      <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">Display Sections</h3>
      <div className="flex flex-wrap gap-2">
        {sections.map((section) => (
          <button
            key={section.key}
            onClick={() => onToggle(section.key as keyof ExpandedSections)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              expandedSections[section.key as keyof ExpandedSections]
                ? 'bg-blue-600 text-white'
                : 'bg-[var(--background)] text-[var(--foreground-secondary)] hover:bg-[var(--surface-hover)]'
            }`}
          >
            <span>{section.icon}</span>
            <span>{section.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ComparePageContent() {
  const router = useRouter();
  const { user } = useAuth();
  const { comparedProperties, count, clearComparison } = useComparison();
  const [enrichedData, setEnrichedData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Handle hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Check if user needs to login to access comparison (2+ properties)
  const needsLogin = count >= 2 && !user;

  // Section expansion state
  const [expandedSections, setExpandedSections] = useState<ExpandedSections>({
    price: true,
    details: true,
    mortgage: true,
    location: true,
    planning: true,
    investment: true
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Fetch enriched comparison data when properties change
  useEffect(() => {
    if (comparedProperties.length === 0) {
      setEnrichedData(null);
      return;
    }

    async function fetchEnrichedData() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/comparison', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ properties: comparedProperties })
        });

        if (!response.ok) {
          throw new Error('Failed to fetch comparison data');
        }

        const data = await response.json();
        setEnrichedData(data);
      } catch (err) {
        console.error('Comparison fetch error:', err);
        setError('Failed to load comparison data');
      } finally {
        setLoading(false);
      }
    }

    fetchEnrichedData();
  }, [comparedProperties]);

  // Show login gate for users with 2+ properties who aren't logged in
  if (mounted && needsLogin) {
    return (
      <>
        <div className="min-h-screen bg-slate-50">
          <div className="max-w-7xl mx-auto px-4 py-16 text-center">
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 mb-8">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold mb-4">Sign in to Compare Properties</h1>
              <p className="text-slate-600 mb-6 max-w-2xl mx-auto">
                Create a free account to unlock the full comparison tool. Compare up to 5 properties
                side-by-side with market intelligence, mortgage calculations, and more.
              </p>
              <div className="space-y-4">
                <button
                  onClick={() => {
                    analytics.registrationStarted('save_prompt');
                    setShowLoginModal(true);
                  }}
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium transition-colors"
                >
                  Sign In / Create Account
                </button>
                <p className="text-sm text-slate-500">
                  You have {count} properties ready to compare
                </p>
              </div>

              {/* Benefits */}
              <div className="mt-8 pt-8 border-t border-slate-200">
                <h3 className="text-sm font-semibold text-slate-700 mb-4">Free account includes:</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                    Compare 5 properties
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                    3 free location alerts
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                    Save properties
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                    Viewing history
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
      </>
    );
  }

  // Show empty state only after hydration and when no properties
  if (mounted && count === 0 && !loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8 mb-8">
            <h1 className="text-3xl font-bold mb-4">Property Comparison Tool</h1>
            <p className="text-slate-600 mb-6 max-w-2xl mx-auto">
              Compare up to 5 properties side-by-side with comprehensive market intelligence,
              mortgage calculations, walkability scores, and planning data.
            </p>
            <Link
              href="/map"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Browse Properties on Map
            </Link>
          </div>

          {/* Feature highlights */}
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">M</span>
              </div>
              <h3 className="font-semibold mb-2">Market Intelligence</h3>
              <p className="text-sm text-slate-600">Compare prices, market positions, and competition levels</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">W</span>
              </div>
              <h3 className="font-semibold mb-2">Walkability & Amenities</h3>
              <p className="text-sm text-slate-600">See transport access, nearby schools, shops, and services</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-slate-200">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">P</span>
              </div>
              <h3 className="font-semibold mb-2">Planning & Development</h3>
              <p className="text-sm text-slate-600">Check for nearby planning applications and future developments</p>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-slate-500">
              Start by adding properties to compare from the map or area pages
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <div className="bg-[var(--surface)] border-b border-[var(--border)] sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="text-[var(--foreground-secondary)] hover:text-[var(--foreground)] text-sm"
              >
                ← Back
              </button>
              <h1 className="text-2xl font-bold text-[var(--foreground)]">
                Property Comparison
              </h1>
              <span className="text-sm text-[var(--foreground-secondary)]">
                {count} of 5 properties
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {/* Export PDF logic */}}
                className="px-4 py-2 bg-[var(--surface-hover)] hover:bg-[var(--accent)] text-[var(--foreground-secondary)] hover:text-white rounded-lg border border-[var(--border)] hover:border-[var(--accent)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!enrichedData}
              >
                Export PDF
              </button>
              <button
                onClick={() => {
                  if (navigator.share) {
                    navigator.share({
                      title: 'Property Comparison',
                      text: `Comparing ${count} Dublin properties`,
                      url: window.location.href
                    });
                  } else {
                    navigator.clipboard.writeText(window.location.href);
                    alert('Link copied to clipboard!');
                  }
                }}
                className="px-4 py-2 bg-[var(--surface-hover)] hover:bg-[var(--accent)] text-[var(--foreground-secondary)] hover:text-white rounded-lg border border-[var(--border)] hover:border-[var(--accent)] transition-colors"
              >
                Share
              </button>
              <button
                onClick={clearComparison}
                className="text-sm text-red-400 hover:text-red-300 px-3 py-1.5 rounded border border-red-800 hover:bg-red-900/20"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Section Controls */}
      {enrichedData && (
        <div className="max-w-7xl mx-auto px-4 py-4">
          <SectionControls expandedSections={expandedSections} onToggle={toggleSection} />
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600">Loading comprehensive property data...</p>
            <p className="text-sm text-slate-500 mt-2">This may take a moment as we analyze market intelligence, amenities, and planning data</p>
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-red-600 mb-4">{error}</p>
            <button onClick={() => window.location.reload()} className="btn-primary">
              Retry
            </button>
          </div>
        ) : enrichedData ? (
          <>
            {/* Insights Banner */}
            {enrichedData.insights && (
              <ComparisonInsights
                insights={enrichedData.insights}
                properties={enrichedData.properties}
              />
            )}

            {/* Comparison Table */}
            <PropertyComparisonTable
              properties={enrichedData.properties}
              expandedSections={expandedSections}
              onToggleSection={toggleSection}
            />
          </>
        ) : null}
      </div>
    </div>
  );
}

export default function ComparePage() {
  return <ComparePageContent />;
}
