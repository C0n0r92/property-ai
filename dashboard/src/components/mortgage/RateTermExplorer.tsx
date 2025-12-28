/**
 * RateTermExplorer Component
 *
 * Interactive sliders to explore different interest rates, loan terms,
 * down payments, and extra payments with real-time calculations.
 */

import React, { useState, useMemo } from 'react';
import { Sliders, TrendingUp, DollarSign, Clock, Bookmark, User } from 'lucide-react';
import { MortgageInputs } from '@/types/mortgage';
import { calculateMortgage } from '@/lib/mortgage-calculator';
import { formatCurrency, formatMonthsAsYears } from '@/lib/mortgage/formatters';

interface RateTermExplorerProps {
  baseInputs: MortgageInputs;
  currency: 'EUR';
  baseScenario?: {
    totalInterest: number;
    payoffMonths: number;
  };
  onSaveScenario?: (scenario: any) => void;
}

export const RateTermExplorer: React.FC<RateTermExplorerProps> = ({
  baseInputs,
  currency,
  baseScenario: propBaseScenario,
  onSaveScenario
}) => {
  // Slider states
  const [exploreRate, setExploreRate] = useState(baseInputs.interestRate);
  const [exploreTerm, setExploreTerm] = useState(baseInputs.loanTerm);
  const [exploreDownPayment, setExploreDownPayment] = useState(
    ((baseInputs.downPayment || 0) / (baseInputs.homeValue || 1)) * 100
  );
  const [exploreExtraPayment, setExploreExtraPayment] = useState(baseInputs.extraPayment || 0);

  // Calculate base scenario
  const baseScenario = useMemo(() => {
    try {
      const result = calculateMortgage(baseInputs);
      return {
        monthlyPayment: result.monthlyPayment,
        totalInterest: result.totalInterest,
        payoffMonths: result.payoffMonths,
        totalPayments: result.totalPayment
      };
    } catch (error) {
      console.error('Error calculating base scenario:', error);
      return {
        monthlyPayment: 0,
        totalInterest: 0,
        payoffMonths: baseInputs.loanTerm * 12,
        totalPayments: 0
      };
    }
  }, [baseInputs]);

  // Calculate explored scenario
  const exploredScenario = useMemo(() => {
    try {
      // Create modified inputs based on slider values
      const homeValue = baseInputs.homeValue;
      const newDownPayment = (exploreDownPayment / 100) * homeValue;
      const newLoanAmount = homeValue - newDownPayment;

      const modifiedInputs: MortgageInputs = {
        ...baseInputs,
        interestRate: exploreRate,
        loanTerm: exploreTerm,
        downPayment: newDownPayment,
        loanAmount: newLoanAmount,
        extraPayment: exploreExtraPayment
      };

      const result = calculateMortgage(modifiedInputs);
      return {
        monthlyPayment: result.monthlyPayment,
        totalInterest: result.totalInterest,
        payoffMonths: result.payoffMonths,
        totalPayments: result.totalPayment
      };
    } catch (error) {
      console.error('Error calculating explored scenario:', error);
      return {
        monthlyPayment: 0,
        totalInterest: 0,
        payoffMonths: exploreTerm * 12,
        totalPayments: 0
      };
    }
  }, [baseInputs, exploreRate, exploreTerm, exploreDownPayment, exploreExtraPayment]);

  // Calculate differences
  const monthlyDiff = exploredScenario.monthlyPayment - baseScenario.monthlyPayment;
  const interestDiff = exploredScenario.totalInterest - baseScenario.totalInterest;
  const timeDiff = exploredScenario.payoffMonths - baseScenario.payoffMonths;

  // Calculate ages at payoff
  const currentAge = baseInputs.currentAge;
  const baseAgeAtPayoff = currentAge + Math.floor(baseScenario.payoffMonths / 12);
  const exploredAgeAtPayoff = currentAge + Math.floor(exploredScenario.payoffMonths / 12);
  const ageDiff = exploredAgeAtPayoff - baseAgeAtPayoff;

  const formatDifference = (value: number, isCurrency: boolean = false, isTime: boolean = false) => {
    if (value === 0) return '—';
    const sign = value > 0 ? '+' : '';

    if (isTime) {
      const months = Math.abs(value);
      const years = Math.floor(months / 12);
      const remainingMonths = months % 12;
      let timeStr = '';
      if (years > 0) timeStr += `${years}y `;
      if (remainingMonths > 0) timeStr += `${remainingMonths}mo`;
      return `${sign}${timeStr}`;
    }

    if (isCurrency) {
      return `${sign}${formatCurrency(Math.abs(value), currency)}`;
    }

    return `${sign}${Math.abs(value).toFixed(2)}`;
  };

  const getDifferenceColor = (value: number, inverse: boolean = false) => {
    if (value === 0) return 'text-[var(--foreground-secondary)]';
    const isPositive = value > 0;
    const isBad = inverse ? !isPositive : isPositive;
    return isBad ? 'text-red-400' : 'text-emerald-400';
  };

  const saveCurrentScenario = () => {
    const scenario = {
      name: `${exploreRate}% - ${exploreTerm}yr - ${exploreDownPayment.toFixed(1)}% down`,
      inputs: {
        ...baseInputs,
        interestRate: exploreRate,
        loanTerm: exploreTerm,
        downPayment: (exploreDownPayment / 100) * baseInputs.homeValue,
        loanAmount: baseInputs.homeValue - ((exploreDownPayment / 100) * baseInputs.homeValue),
        extraPayment: exploreExtraPayment
      },
      results: exploredScenario,
      timestamp: new Date().toISOString()
    };

    if (onSaveScenario) {
      onSaveScenario(scenario);
    } else {
      // Save to localStorage as fallback
      const saved = JSON.parse(localStorage.getItem('savedScenarios') || '[]');
      saved.push(scenario);
      localStorage.setItem('savedScenarios', JSON.stringify(saved));
      alert('Scenario saved!');
    }
  };

  return (
    <div className="bg-[var(--surface)] rounded-xl shadow-lg border border-[var(--border)] p-6">
      <div className="flex items-center gap-4 mb-6">
        <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-4 rounded-2xl shadow-lg">
          <Sliders className="w-7 h-7 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-[var(--foreground)]">
            Rate & Term Explorer
          </h3>
          <p className="text-[var(--foreground-secondary)] text-sm mt-1">
            Explore how different rates and terms affect your mortgage
          </p>
        </div>
      </div>

      {/* Sliders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
        {/* Interest Rate Slider */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-[var(--foreground)]">Interest Rate</label>
            <span className="text-lg font-bold text-purple-400">{exploreRate.toFixed(2)}%</span>
          </div>
          <input
            type="range"
            min="2"
            max="8"
            step="0.1"
            value={exploreRate}
            onChange={(e) => setExploreRate(parseFloat(e.target.value))}
            className="w-full h-2 bg-[var(--border)] rounded-lg appearance-none cursor-pointer accent-purple-500"
          />
          <div className="flex justify-between text-xs text-[var(--foreground-secondary)]">
            <span>2%</span>
            <span>8%</span>
          </div>
        </div>

        {/* Loan Term Slider */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-[var(--foreground)]">Loan Term</label>
            <span className="text-lg font-bold text-indigo-400">{exploreTerm} years</span>
          </div>
          <input
            type="range"
            min="10"
            max="40"
            step="5"
            value={exploreTerm}
            onChange={(e) => setExploreTerm(parseInt(e.target.value))}
            className="w-full h-2 bg-[var(--border)] rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
          <div className="flex justify-between text-xs text-[var(--foreground-secondary)]">
            <span>10yr</span>
            <span>40yr</span>
          </div>
        </div>

        {/* Down Payment Slider */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-[var(--foreground)]">Down Payment</label>
            <span className="text-lg font-bold text-emerald-400">{exploreDownPayment.toFixed(1)}%</span>
          </div>
          <input
            type="range"
            min="5"
            max="50"
            step="1"
            value={exploreDownPayment}
            onChange={(e) => setExploreDownPayment(parseFloat(e.target.value))}
            className="w-full h-2 bg-[var(--border)] rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
          <div className="flex justify-between text-xs text-[var(--foreground-secondary)]">
            <span>5%</span>
            <span>50%</span>
          </div>
        </div>

        {/* Extra Monthly Payment Slider */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-[var(--foreground)]">Extra Monthly Payment</label>
            <span className="text-lg font-bold text-orange-400">{formatCurrency(exploreExtraPayment, currency)}</span>
          </div>
          <input
            type="range"
            min="0"
            max="1000"
            step="25"
            value={exploreExtraPayment}
            onChange={(e) => setExploreExtraPayment(parseInt(e.target.value))}
            className="w-full h-2 bg-[var(--border)] rounded-lg appearance-none cursor-pointer accent-orange-500"
          />
          <div className="flex justify-between text-xs text-[var(--foreground-secondary)]">
            <span>{formatCurrency(0, currency)}</span>
            <span>{formatCurrency(1000, currency)}</span>
          </div>
        </div>
      </div>

      {/* Comparison Results */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
        {/* Monthly Payment */}
        <div className="bg-gradient-to-br from-purple-900/20 to-purple-800/10 rounded-xl p-4 sm:p-6 text-center border border-purple-700/20">
          <div className="flex items-center justify-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
            <span className="text-xs sm:text-sm font-medium text-purple-300">Monthly Payment</span>
          </div>
          <div className="text-lg sm:text-2xl font-bold text-purple-400 mb-1">
            {formatCurrency(exploredScenario.monthlyPayment, currency)}
          </div>
          <div className={`text-xs sm:text-sm font-medium ${getDifferenceColor(monthlyDiff, true)}`}>
            {formatDifference(monthlyDiff, true)}
          </div>
        </div>

        {/* Total Interest */}
        <div className="bg-gradient-to-br from-orange-900/20 to-orange-800/10 rounded-xl p-4 sm:p-6 text-center border border-orange-700/20">
          <div className="flex items-center justify-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-orange-400" />
            <span className="text-xs sm:text-sm font-medium text-orange-300">Total Interest</span>
          </div>
          <div className="text-lg sm:text-2xl font-bold text-orange-400 mb-1">
            {formatCurrency(exploredScenario.totalInterest, currency)}
          </div>
          <div className={`text-xs sm:text-sm font-medium ${getDifferenceColor(interestDiff, true)}`}>
            {formatDifference(interestDiff, true)}
          </div>
        </div>

        {/* Payoff Time */}
        <div className="bg-gradient-to-br from-blue-900/20 to-blue-800/10 rounded-xl p-4 sm:p-6 text-center border border-blue-700/20">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
            <span className="text-xs sm:text-sm font-medium text-blue-300">Payoff Time</span>
          </div>
          <div className="text-lg sm:text-2xl font-bold text-blue-400 mb-1">
            {formatMonthsAsYears(exploredScenario.payoffMonths)}
          </div>
          <div className={`text-xs sm:text-sm font-medium ${getDifferenceColor(timeDiff, true)}`}>
            {formatDifference(timeDiff, false, true)}
          </div>
        </div>

        {/* Age at Payoff */}
        <div className="bg-gradient-to-br from-emerald-900/20 to-emerald-800/10 rounded-xl p-4 sm:p-6 text-center border border-emerald-700/20">
          <div className="flex items-center justify-center gap-2 mb-2">
            <User className="w-5 h-5 text-emerald-400" />
            <span className="text-sm font-medium text-emerald-300">Age at Payoff</span>
          </div>
          <div className="text-2xl font-bold text-emerald-400 mb-1">
            {exploredAgeAtPayoff} years
          </div>
          <div className={`text-sm font-medium ${getDifferenceColor(ageDiff, true)}`}>
            {formatDifference(ageDiff)} years
          </div>
        </div>
      </div>

      {/* Extra Payment Quick Reference */}
      <div className="mb-6 p-4 bg-gradient-to-r from-orange-900/20 to-amber-900/10 rounded-xl border border-orange-700/20">
        <div className="flex items-center gap-2 mb-3">
          <DollarSign className="w-4 h-4 text-orange-400" />
          <h4 className="text-sm font-semibold text-orange-300">Extra Payment Quick Reference</h4>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[100, 200, 500].map((amount) => {
            // Calculate impact for this amount
            const homeValue = baseInputs.homeValue;
            const downPayment = (exploreDownPayment / 100) * homeValue;
            const loanAmount = homeValue - downPayment;
            const monthlyRate = exploreRate / 100 / 12;
            const totalMonths = exploreTerm * 12;

            const baseMonthlyPayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / (Math.pow(1 + monthlyRate, totalMonths) - 1);
            const totalMonthlyPayment = baseMonthlyPayment + amount;

            let newPayoffMonths = totalMonths;
            if (amount > 0 && totalMonthlyPayment > loanAmount * monthlyRate) {
              newPayoffMonths = -Math.log(1 - (loanAmount * monthlyRate) / totalMonthlyPayment) / Math.log(1 + monthlyRate);
            }

            const monthsSaved = totalMonths - newPayoffMonths;
            const baseInterest = (baseMonthlyPayment * totalMonths) - loanAmount;
            const newInterest = (totalMonthlyPayment * newPayoffMonths) - loanAmount;
            const interestSaved = baseInterest - newInterest;

            return (
              <div key={amount} className="bg-[var(--background)] rounded-lg p-3 text-center border border-orange-700/30 hover:shadow-sm transition-all">
                <div className="text-sm font-bold text-orange-400 mb-1">
                  +{formatCurrency(amount, currency)}
                </div>
                <div className="text-xs text-[var(--foreground-secondary)] mb-1">
                  {Math.floor(monthsSaved / 12)}y {Math.round(monthsSaved % 12)}mo faster
                </div>
                <div className="text-xs text-emerald-400 font-medium">
                  {formatCurrency(Math.max(0, interestSaved), currency)} saved
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-3 text-center">
          <p className="text-xs text-orange-300">
            Tip: Use the Extra Monthly Payment slider above to explore any amount
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center gap-4">
        <button
          onClick={saveCurrentScenario}
          className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
        >
          <Bookmark className="w-4 h-4" />
          Save This Scenario
        </button>
      </div>

      {/* Summary */}
      <div className="mt-6 p-4 bg-gradient-to-r from-slate-900/50 to-blue-900/20 rounded-xl border border-slate-700/50">
        <div className="text-sm text-[var(--foreground)] text-center">
          <strong>Quick Summary:</strong> {exploreRate}% rate, {exploreTerm}-year term, {exploreDownPayment.toFixed(1)}% down →
          <span className={getDifferenceColor(monthlyDiff, true)}> {formatDifference(monthlyDiff, true)} monthly</span>,
          <span className={getDifferenceColor(interestDiff, true)}> {formatDifference(interestDiff, true)} total interest</span>
        </div>
      </div>
    </div>
  );
};
