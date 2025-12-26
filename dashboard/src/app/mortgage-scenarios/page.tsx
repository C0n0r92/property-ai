'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { MortgageScenario } from '@/types/mortgage';
import { formatCurrency, formatMonthsAsYears } from '@/lib/mortgage/formatters';
import { Calculator, TrendingUp, Trash2, ExternalLink, Calendar, Euro } from 'lucide-react';

export default function MortgageScenariosPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [scenarios, setScenarios] = useState<MortgageScenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      fetchScenarios();
    }
  }, [user]);

  const fetchScenarios = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/mortgage/scenarios?limit=50');
      if (!response.ok) {
        throw new Error('Failed to fetch mortgage scenarios');
      }
      const data = await response.json();
      setScenarios(data.scenarios || data || []);
    } catch (err) {
      console.error('Error fetching scenarios:', err);
      setError('Failed to load mortgage scenarios');
    } finally {
      setLoading(false);
    }
  };

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
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Saved Mortgage Scenarios</h1>
              <p className="text-gray-400 mt-1">
                {scenarios.length} saved {scenarios.length === 1 ? 'scenario' : 'scenarios'}
              </p>
            </div>
            <button
              onClick={() => router.push('/mortgage-calc')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <Calculator className="w-4 h-4" />
              New Scenario
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Loading mortgage scenarios...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-400 mb-4">{error}</p>
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
      </div>
    </div>
  );
}
