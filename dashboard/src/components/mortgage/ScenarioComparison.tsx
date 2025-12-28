/**
 * ScenarioComparison Component
 *
 * Full comparison table with charts comparing saved scenarios.
 */

import React, { useMemo } from 'react';
import { BarChart3, TrendingUp, X } from 'lucide-react';
import { MortgageScenario, MortgageInputs, MortgageResults } from '@/types/mortgage';
import { formatCurrency, formatMonthsAsYears } from '@/lib/mortgage/formatters';

interface ScenarioComparisonProps {
  scenarios: MortgageScenario[];
  onRemoveScenario: (id: string) => void;
  currency: 'EUR';
  currentCalculation?: MortgageResults | null;
  currentInputs?: MortgageInputs;
}

/**
 * Check if two mortgage inputs are essentially the same
 */
function inputsMatch(inputs1: MortgageInputs, inputs2: MortgageInputs): boolean {
  // Compare key fields that affect the calculation
  return (
    Math.abs(inputs1.loanAmount - inputs2.loanAmount) < 0.01 &&
    Math.abs(inputs1.interestRate - inputs2.interestRate) < 0.01 &&
    inputs1.loanTerm === inputs2.loanTerm &&
    Math.abs(inputs1.extraPayment - inputs2.extraPayment) < 0.01 &&
    Math.abs(inputs1.oneTimePayment - inputs2.oneTimePayment) < 0.01 &&
    inputs1.paymentFrequency === inputs2.paymentFrequency &&
    inputs1.purchaseDate === inputs2.purchaseDate &&
    inputs1.extraPaymentStartsNow === inputs2.extraPaymentStartsNow
  );
}

export const ScenarioComparison: React.FC<ScenarioComparisonProps> = ({
  scenarios,
  onRemoveScenario,
  currency,
  currentCalculation,
  currentInputs
}) => {
  // Check if current calculation matches any saved scenario
  const currentMatchesSaved = useMemo(() => {
    if (!currentCalculation || !currentInputs || scenarios.length === 0) {
      return false;
    }
    return scenarios.some(scenario => inputsMatch(scenario.inputs, currentInputs));
  }, [currentCalculation, currentInputs, scenarios]);

  // Create a combined list with current calculation if it doesn't match
  const allScenarios = useMemo(() => {
    const list: Array<MortgageScenario & { isCurrent?: boolean }> = [...scenarios];
    
    if (currentCalculation && currentInputs && !currentMatchesSaved) {
      // Add current calculation at the beginning
      list.unshift({
        id: 'current-calculation',
        name: 'Current Calculation',
        inputs: currentInputs,
        results: currentCalculation,
        createdAt: new Date(),
        updatedAt: new Date(),
        isCurrent: true
      });
    }
    
    return list;
  }, [scenarios, currentCalculation, currentInputs, currentMatchesSaved]);

  if (allScenarios.length === 0) return null;

  const maxInterest = Math.max(...allScenarios.map(s => s.results.totalInterest));

  return (
    <div className="bg-[var(--surface)] rounded-xl shadow-lg border border-[var(--border)] p-4 sm:p-6">
      <div className="flex items-center gap-3 mb-6">
        <BarChart3 className="w-6 h-6 text-purple-400" />
        <h3 className="text-xl font-bold text-[var(--foreground)]">Scenario Comparison</h3>
      </div>

      <div className="space-y-4">
        {allScenarios.map((scenario, index) => (
          <div key={scenario.id} className={`border rounded-xl p-4 ${
            scenario.isCurrent 
              ? 'border-blue-500/50 bg-blue-900/10' 
              : 'border-[var(--border)] bg-[var(--background)]'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-[var(--foreground)] flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${
                  scenario.isCurrent ? 'bg-blue-500 ring-2 ring-blue-400' :
                  index === 0 ? 'bg-blue-500' :
                  index === 1 ? 'bg-emerald-500' :
                  index === 2 ? 'bg-purple-500' : 'bg-orange-500'
                }`} />
                {scenario.name}
                {scenario.isCurrent && (
                  <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded-full">
                    Current
                  </span>
                )}
              </h4>
              {!scenario.isCurrent && (
                <button
                  onClick={() => onRemoveScenario(scenario.id)}
                  className="text-[var(--foreground-secondary)] hover:text-red-400 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
              <div className="text-center">
                <div className="text-sm text-[var(--foreground-secondary)] mb-1">Monthly Payment</div>
                <div className="font-bold text-[var(--foreground)]">
                  {formatCurrency(scenario.results.monthlyPayment, currency)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-[var(--foreground-secondary)] mb-1">Total Interest</div>
                <div className="font-bold text-red-400">
                  {formatCurrency(scenario.results.totalInterest, currency)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-[var(--foreground-secondary)] mb-1">Payoff Time</div>
                <div className="font-bold text-blue-400">
                  {formatMonthsAsYears(scenario.results.payoffMonths)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-[var(--foreground-secondary)] mb-1">Interest Saved</div>
                <div className="font-bold text-emerald-400">
                  {formatCurrency(scenario.results.savings, currency)}
                </div>
              </div>
            </div>

            {/* Interest comparison bar */}
            <div className="w-full bg-[var(--border)] rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all duration-1000 ${
                  scenario.isCurrent ? 'bg-blue-500 ring-2 ring-blue-400' :
                  index === 0 ? 'bg-blue-500' :
                  index === 1 ? 'bg-emerald-500' :
                  index === 2 ? 'bg-purple-500' : 'bg-orange-500'
                }`}
                style={{ width: `${(scenario.results.totalInterest / maxInterest) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {allScenarios.length > 1 && (
        <div className="mt-6 p-4 bg-purple-900/20 border border-purple-700/30 rounded-xl">
          <div className="flex items-start gap-3">
            <div className="bg-purple-500 rounded-full p-1">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <div>
              <h4 className="font-semibold text-purple-300 mb-1">Best Option</h4>
              <p className="text-sm text-purple-200">
                {(() => {
                  const bestScenario = allScenarios.reduce((best, current) =>
                    current.results.totalInterest < best.results.totalInterest ? current : best
                  );
                  return `"${bestScenario.name}" saves the most interest with ${formatCurrency(bestScenario.results.savings, currency)} in total savings.`;
                })()}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
