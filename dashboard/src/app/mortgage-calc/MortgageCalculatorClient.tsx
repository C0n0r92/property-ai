/**
 * Mortgage Calculator Client Component
 *
 * Interactive mortgage calculator with all client-side logic.
 * Uses React hooks and handles all user interactions.
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Calculator, TrendingUp, Save, RotateCcw, Target, Share2 } from 'lucide-react';
import { HeroSection } from '@/components/HeroSection';
import { useAuth } from '@/components/auth/AuthProvider';
import { LoginModal } from '@/components/auth/LoginModal';
import { MortgageInputs, MortgageCalculationResponse, MortgageScenario, DEFAULT_MORTGAGE_INPUTS } from '@/types/mortgage';
import { calculateMortgage } from '@/lib/mortgage-calculator';
import { LOAN_TERMS, PAYMENT_FREQUENCIES, DEBOUNCE_DELAYS } from '@/lib/mortgage/constants';
import { formatCurrency, formatMonthsAsYears } from '@/lib/mortgage/formatters';
import { getTooltip } from '@/lib/mortgage/glossary';

// Components
import { NumberInput } from '@/components/mortgage/NumberInput';
import { LabelWithTooltip } from '@/components/mortgage/Tooltip';
import { AmortizationTable } from '@/components/mortgage/AmortizationTable';
import { EquityProgressBar } from '@/components/mortgage/AnimatedProgressBar';
import { RateTermExplorer } from '@/components/mortgage/RateTermExplorer';
import { PayoffTimeline } from '@/components/mortgage/PayoffTimeline';
import { ScenarioComparison } from '@/components/mortgage/ScenarioComparison';

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default function MortgageCalculatorClient() {
  const { user } = useAuth();
  const searchParams = useSearchParams();

  // Form state
  const [inputs, setInputs] = useState<MortgageInputs>(DEFAULT_MORTGAGE_INPUTS);
  const [scenarios, setScenarios] = useState<MortgageScenario[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Results state
  const [calculation, setCalculation] = useState<MortgageCalculationResponse | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Property context from URL
  const [propertyAddress, setPropertyAddress] = useState<string | null>(null);

  // Login modal state
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Success notification state
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Show success notification
  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 4000); // Auto-hide after 4 seconds
  };

  // Pre-fill form from URL parameters (from property cards)
  useEffect(() => {
    const homeValue = searchParams.get('homeValue');
    const downPayment = searchParams.get('downPayment');
    const loanAmount = searchParams.get('loanAmount');
    const interestRate = searchParams.get('interestRate');
    const loanTerm = searchParams.get('loanTerm');
    const address = searchParams.get('address');

    console.log('Mortgage calculator URL params:', { homeValue, downPayment, loanAmount, interestRate, loanTerm, address });

    // Set property address if provided
    if (address) {
      try {
        // Handle double encoding by decoding twice
        let decodedAddress = decodeURIComponent(address);
        try {
          // Try to decode again in case of double encoding
          decodedAddress = decodeURIComponent(decodedAddress);
        } catch (secondError) {
          // If second decode fails, use the first decode result
        }
        setPropertyAddress(decodedAddress);
        console.log('Property address set:', decodedAddress);
        console.log('propertyAddress state should now be:', decodedAddress);
      } catch (error) {
        console.error('Error decoding address:', error);
        setPropertyAddress(address);
      }
    } else {
      console.log('No address parameter found in URL');
      setPropertyAddress(null);
    }

    if (homeValue || downPayment || loanAmount || interestRate || loanTerm) {
      console.log('Pre-filling mortgage calculator with URL parameters');
      setInputs(prev => ({
        ...prev,
        homeValue: homeValue ? parseFloat(homeValue) : prev.homeValue,
        downPayment: downPayment ? parseFloat(downPayment) : prev.downPayment,
        loanAmount: loanAmount ? parseFloat(loanAmount) : prev.loanAmount,
        interestRate: interestRate ? parseFloat(interestRate) : prev.interestRate,
        loanTerm: loanTerm ? parseInt(loanTerm) : prev.loanTerm,
      }));
    }
  }, [searchParams]);

  // Debug: Log current propertyAddress state
  console.log('Current propertyAddress state:', propertyAddress);

  // Debounce calculation to avoid excessive API calls
  const debouncedInputs = useDebounce(inputs, DEBOUNCE_DELAYS.calculation);

  // Calculate mortgage when inputs change
  useEffect(() => {
    const performCalculation = async () => {
      setIsCalculating(true);
      try {
        const result = calculateMortgage(debouncedInputs);
        setCalculation(result);
        setErrors({}); // Clear errors on successful calculation
      } catch (error) {
        console.error('Calculation error:', error);
        setErrors({ calculation: 'Failed to calculate mortgage. Please check your inputs.' });
      } finally {
        setIsCalculating(false);
      }
    };

    performCalculation();
  }, [debouncedInputs]);

  // Load scenarios on mount (if authenticated)
  useEffect(() => {
    if (user) {
      loadScenarios();
    } else {
      // Load from localStorage for non-auth users
      const saved = localStorage.getItem('mortgage-calculator-scenarios');
      if (saved) {
        try {
          const localScenarios = JSON.parse(saved);
          setScenarios(localScenarios);
        } catch (error) {
          console.error('Error loading local scenarios:', error);
        }
      }
    }
  }, [user]);

  const loadScenarios = async () => {
    try {
      const response = await fetch('/api/mortgage/scenarios?limit=50');
      if (response.ok) {
        const data = await response.json();
        setScenarios(data.scenarios || []);
      }
    } catch (error) {
      console.error('Error loading scenarios:', error);
    }
  };

  const saveScenario = async () => {
    if (!calculation) return;

    // Check if user is authenticated
    if (!user) {
      // Open login modal instead of browser popup
      setIsLoginModalOpen(true);
      return;
    }

    setIsSaving(true);
    try {
      // Save to database for authenticated users
      const scenarioName = propertyAddress
        ? `${propertyAddress} - ${new Date().toLocaleDateString()}`
        : `Mortgage Scenario ${scenarios.length + 1}`;

      const response = await fetch('/api/mortgage/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: scenarioName,
          inputs,
          results: calculation
        })
      });

      if (response.ok) {
        await loadScenarios(); // Refresh scenarios
        showSuccess('Mortgage scenario saved successfully!');
      } else {
        throw new Error('Failed to save scenario');
      }
    } catch (error) {
      console.error('Error saving scenario:', error);
      alert('Failed to save mortgage scenario. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const loadScenario = (scenario: MortgageScenario) => {
    setInputs(scenario.inputs);
  };

  const shareCalculation = () => {
    // Build shareable URL with current calculation data
    const params = new URLSearchParams({
      homeValue: inputs.homeValue.toString(),
      downPayment: inputs.downPayment.toString(),
      loanAmount: inputs.loanAmount.toString(),
      interestRate: inputs.interestRate.toString(),
      loanTerm: inputs.loanTerm.toString(),
    });

    if (propertyAddress) {
      params.set('address', encodeURIComponent(propertyAddress));
    }

    const shareUrl = `${window.location.origin}/mortgage-calc?${params.toString()}`;

    // Try modern clipboard API first
    if (navigator.share) {
      navigator.share({
        title: 'Mortgage Calculation',
        text: `Check out this mortgage calculation: ${propertyAddress || 'Property'}`,
        url: shareUrl,
      }).catch(() => {
        // Fallback to clipboard
        fallbackCopy(shareUrl);
      });
    } else {
      fallbackCopy(shareUrl);
    }
  };

  const fallbackCopy = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      alert('Mortgage calculation link copied to clipboard!');
    }).catch(() => {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Mortgage calculation link copied to clipboard!');
    });
  };

  const deleteScenario = async (scenarioId: string) => {
    if (user) {
      try {
        const response = await fetch(`/api/mortgage/scenarios/${scenarioId}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          await loadScenarios();
        }
      } catch (error) {
        console.error('Error deleting scenario:', error);
      }
    } else {
      // Delete from localStorage
      const updatedScenarios = scenarios.filter(s => s.id !== scenarioId);
      setScenarios(updatedScenarios);
      localStorage.setItem('mortgage-calculator-scenarios', JSON.stringify(updatedScenarios));
    }
  };

  const updateInput = (field: keyof MortgageInputs, value: number | string | boolean) => {
    setInputs(prev => ({ ...prev, [field]: value }));
  };

  const resetCalculator = () => {
    setInputs(DEFAULT_MORTGAGE_INPUTS);
    setCalculation(null);
  };

  // Calculate equity percentage
  const equityPercentage = useMemo(() => {
    if (!calculation) return 0;
    return ((inputs.homeValue - inputs.downPayment - calculation.currentBalance) /
            (inputs.homeValue - inputs.downPayment)) * 100;
  }, [calculation, inputs]);

  return (
    <>
      <div className="min-h-screen bg-[var(--background)]">
      <HeroSection
        title="Mortgage Calculator"
        subtitle={propertyAddress ? `for ${propertyAddress}` : undefined}
        description="Plan your home loan with confidence. Compare scenarios and explore rates."
        variant="centered"
        features={[
          { label: 'Calculations', icon: <Calculator className="w-3.5 h-3.5 text-blue-300" /> },
          { label: 'Comparison', icon: <TrendingUp className="w-3.5 h-3.5 text-emerald-300" /> },
          { label: 'Planning', icon: <Target className="w-3.5 h-3.5 text-purple-300" /> }
        ]}
      >
        {/* Property context if available */}
        {(searchParams.get('homeValue') || searchParams.get('loanAmount')) && (
          <div className="flex items-center gap-2 bg-blue-500/20 backdrop-blur-sm rounded-lg px-3 py-2 border border-blue-400/30">
            <span className="text-sm">🏠</span>
            <span className="text-blue-200 text-sm">
              {propertyAddress ? `For ${propertyAddress}` : 'Pre-filled data'}
            </span>
            <button
              onClick={() => {
                setInputs(DEFAULT_MORTGAGE_INPUTS);
                setPropertyAddress(null);
                window.history.replaceState({}, '', '/mortgage-calc');
              }}
              className="ml-2 px-2 py-0.5 bg-blue-600/50 hover:bg-blue-600/70 text-blue-200 hover:text-white rounded text-xs transition-colors"
              title="Reset to default values"
            >
              ✕
            </button>
          </div>
        )}
      </HeroSection>

      {/* Success Notification */}
      {successMessage && (
        <div className="max-w-7xl mx-auto px-4 pt-4 relative z-20">
          <div className="bg-emerald-500/20 border border-emerald-500/50 rounded-xl p-4 flex items-center gap-3 shadow-lg backdrop-blur-sm">
            <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-emerald-100 font-medium">{successMessage}</p>
            <button
              onClick={() => setSuccessMessage(null)}
              className="ml-auto text-emerald-300 hover:text-emerald-100 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-6 relative z-10">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Input Panel */}
          <div className="lg:col-span-1">
            <div className="bg-[var(--surface)] rounded-xl shadow-lg border border-[var(--border)] p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-[var(--foreground)]">Loan Details</h2>
                <button
                  onClick={resetCalculator}
                  className="flex items-center gap-2 px-3 py-1 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </button>
              </div>

              {/* Saved Scenarios - Integrated at top */}
              {scenarios.length > 0 && (
                <div className="mb-6 pb-6 border-b border-[var(--border)]">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-2">
                      <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                      Saved Scenarios ({scenarios.length})
                    </h3>
                    <Link
                      href="/saved?tab=scenarios"
                      className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                    >
                      View All
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {scenarios.slice(0, 3).map((scenario) => (
                      <div key={scenario.id} className="flex items-center justify-between p-2 bg-[var(--background)] rounded-lg border border-[var(--border)]">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-[var(--foreground)] truncate">{scenario.name}</div>
                          <div className="text-xs text-[var(--foreground-secondary)]">
                            {formatCurrency(scenario.results.monthlyPayment)}/mo • {formatMonthsAsYears(scenario.results.payoffMonths)}
                          </div>
                        </div>
                        <div className="flex gap-1.5 ml-2">
                          <button
                            onClick={() => loadScenario(scenario)}
                            className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs transition-colors flex items-center gap-1"
                            title="Load scenario"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Load
                          </button>
                          <button
                            onClick={() => deleteScenario(scenario.id)}
                            className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs transition-colors flex items-center gap-1"
                            title="Delete scenario"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                    {scenarios.length > 3 && (
                      <div className="text-center pt-1">
                        <Link
                          href="/saved?tab=scenarios"
                          className="text-xs text-[var(--foreground-secondary)] hover:text-[var(--foreground)] transition-colors"
                        >
                          View {scenarios.length - 3} more →
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {/* Home Value */}
                <div>
                  <LabelWithTooltip
                    label="Home Value"
                    tooltip={getTooltip('homeValue')}
                    title="Home Value"
                  />
                  <NumberInput
                    value={inputs.homeValue}
                    onChange={(value) => updateInput('homeValue', value)}
                    prefix="€"
                    placeholder="400,000"
                  />
                </div>

                {/* Down Payment */}
                <div>
                  <LabelWithTooltip
                    label="Down Payment"
                    tooltip={getTooltip('downPayment')}
                    title="Down Payment"
                  />
                  <NumberInput
                    value={inputs.downPayment}
                    onChange={(value) => updateInput('downPayment', value)}
                    prefix="€"
                    placeholder="80,000"
                  />
                </div>

                {/* Loan Amount (calculated) */}
                <div>
                  <LabelWithTooltip
                    label="Loan Amount"
                    tooltip={getTooltip('loanAmount')}
                    title="Loan Amount"
                  />
                  <div className="px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)]">
                    €{inputs.homeValue - inputs.downPayment}
                  </div>
                </div>

                {/* Interest Rate */}
                <div>
                  <LabelWithTooltip
                    label="Interest Rate (%)"
                    tooltip={getTooltip('interestRate')}
                    title="Interest Rate"
                  />
                  <NumberInput
                    value={inputs.interestRate}
                    onChange={(value) => updateInput('interestRate', value)}
                    suffix="%"
                    placeholder="3.5"
                    step={0.1}
                  />
                </div>

                {/* Loan Term */}
                <div>
                  <LabelWithTooltip
                    label="Loan Term"
                    tooltip={getTooltip('loanTerm')}
                    title="Loan Term"
                  />
                  <select
                    value={inputs.loanTerm}
                    onChange={(e) => updateInput('loanTerm', parseInt(e.target.value))}
                    className="w-full px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {LOAN_TERMS.map(term => (
                      <option key={term} value={term}>{term} years</option>
                    ))}
                  </select>
                </div>

                {/* Payment Frequency */}
                <div>
                  <LabelWithTooltip
                    label="Payment Frequency"
                    tooltip={getTooltip('paymentFrequency')}
                    title="Payment Frequency"
                  />
                  <select
                    value={inputs.paymentFrequency}
                    onChange={(e) => updateInput('paymentFrequency', e.target.value as 'monthly' | 'biweekly')}
                    className="w-full px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {PAYMENT_FREQUENCIES.map(freq => (
                      <option key={freq.value} value={freq.value}>{freq.label}</option>
                    ))}
                  </select>
                </div>

                {/* Extra Payment */}
                <div>
                  <LabelWithTooltip
                    label="Extra Monthly Payment"
                    tooltip={getTooltip('extraPayment')}
                    title="Extra Payment"
                  />
                  <NumberInput
                    value={inputs.extraPayment}
                    onChange={(value) => updateInput('extraPayment', value)}
                    prefix="€"
                    placeholder="0"
                  />
                </div>

                {/* One-time Payment */}
                <div>
                  <LabelWithTooltip
                    label="One-Time Extra Payment"
                    tooltip={getTooltip('oneTimePayment')}
                    title="One-Time Payment"
                  />
                  <NumberInput
                    value={inputs.oneTimePayment}
                    onChange={(value) => updateInput('oneTimePayment', value)}
                    prefix="€"
                    placeholder="0"
                  />
                  {inputs.oneTimePayment > 0 && (
                    <input
                      type="date"
                      value={inputs.oneTimePaymentDate}
                      onChange={(e) => updateInput('oneTimePaymentDate', e.target.value)}
                      className="w-full mt-2 px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  )}
                </div>

                {/* Current Age */}
                <div>
                  <LabelWithTooltip
                    label="Current Age"
                    tooltip={getTooltip('currentAge')}
                    title="Current Age"
                  />
                  <NumberInput
                    value={inputs.currentAge}
                    onChange={(value) => updateInput('currentAge', value)}
                    placeholder="35"
                  />
                </div>

                {/* Purchase Date */}
                <div>
                  <LabelWithTooltip
                    label="Purchase Date"
                    tooltip={getTooltip('purchaseDate')}
                    title="Purchase Date"
                  />
                  <input
                    type="date"
                    value={inputs.purchaseDate}
                    onChange={(e) => updateInput('purchaseDate', e.target.value)}
                    className="w-full px-4 py-3 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Save Scenario Button */}
                {calculation && (
                  <div className="mt-6 space-y-3">
                    <button
                      onClick={saveScenario}
                      disabled={isSaving}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
                    >
                      {isSaving ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      {user ? 'Save Scenario' : 'Login to Save'}
                    </button>

                    {/* Share Button */}
                    <button
                      onClick={shareCalculation}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors border border-blue-500"
                    >
                      <Share2 className="w-4 h-4" />
                      Share Calculation
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-2 space-y-6">
            {isCalculating && (
              <div className="bg-[var(--surface)] rounded-xl shadow-lg border border-[var(--border)] p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
                <p className="text-[var(--foreground-secondary)]">Calculating mortgage...</p>
              </div>
            )}

            {calculation && !isCalculating && (
              <>
                {/* Key Metrics */}
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-[var(--surface)] rounded-xl shadow-lg border border-[var(--border)] p-6 text-center">
                    <div className="text-2xl font-bold text-blue-400 mb-2">
                      {formatCurrency(calculation.monthlyPayment)}
                    </div>
                    <div className="text-sm text-[var(--foreground-secondary)]">Monthly Payment</div>
                  </div>

                  <div className="bg-[var(--surface)] rounded-xl shadow-lg border border-[var(--border)] p-6 text-center">
                    <div className="text-2xl font-bold text-emerald-400 mb-2">
                      {formatMonthsAsYears(calculation.payoffMonths)}
                    </div>
                    <div className="text-sm text-[var(--foreground-secondary)]">Time to Pay Off</div>
                  </div>

                  <div className="bg-[var(--surface)] rounded-xl shadow-lg border border-[var(--border)] p-6 text-center">
                    <div className="text-2xl font-bold text-purple-400 mb-2">
                      {formatCurrency(calculation.totalInterest)}
                    </div>
                    <div className="text-sm text-[var(--foreground-secondary)]">Total Interest</div>
                  </div>
                </div>

                {/* Rate & Term Explorer */}
                <RateTermExplorer
                  baseInputs={inputs}
                  currency="EUR"
                  baseScenario={{
                    totalInterest: calculation.totalInterest,
                    payoffMonths: calculation.payoffMonths
                  }}
                  onSaveScenario={saveScenario}
                />

                {/* Full Loan Progress Timeline */}
                <PayoffTimeline
                  loanAmount={inputs.loanAmount}
                  currentBalance={calculation.currentBalance}
                  monthsSincePurchase={calculation.monthsSincePurchase}
                  totalPayoffMonths={calculation.payoffMonths}
                  monthlyPayment={calculation.monthlyPayment}
                  extraPayment={inputs.extraPayment}
                  currentAge={inputs.currentAge}
                  currency="EUR"
                  interestRate={inputs.interestRate}
                  loanTerm={inputs.loanTerm}
                  purchaseDate={inputs.purchaseDate}
                  paymentFrequency={inputs.paymentFrequency}
                  oneTimePayment={inputs.oneTimePayment}
                  downPayment={inputs.downPayment}
                  homeValue={inputs.homeValue}
                  onPurchaseDateChange={(date) => updateInput('purchaseDate', date)}
                />

                {/* Scenario Comparison */}
                <ScenarioComparison
                  scenarios={scenarios}
                  onRemoveScenario={deleteScenario}
                  currency="EUR"
                  currentCalculation={calculation}
                  currentInputs={inputs}
                />

                {/* Amortization Table */}
                <AmortizationTable
                  amortization={calculation.amortization}
                  currency="EUR"
                />

              </>
            )}

            {errors.calculation && (
              <div className="bg-red-900/20 border border-red-700 rounded-xl p-4">
                <p className="text-red-400">{errors.calculation}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Floating Calculate Button */}
      <div className="fixed bottom-6 right-6 lg:hidden z-50">
        <button
          onClick={() => {
            // Trigger calculation by updating inputs with same values
            setInputs(prev => ({ ...prev }));
          }}
          disabled={isCalculating}
          className={`p-4 rounded-full shadow-2xl transition-all duration-300 transform ${
            isCalculating
              ? 'bg-gray-600 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white hover:scale-110 active:scale-95'
          }`}
        >
          {isCalculating ? (
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <Calculator className="w-6 h-6" />
          )}
        </button>
      </div>
    </div>
    <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
    </>
  );
}
