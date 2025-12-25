/**
 * PayoffTimeline Component
 *
 * Detailed timeline visualization showing loan payoff progress with multiple metrics.
 */

import React from 'react';
import { TrendingUp, Calendar, DollarSign, Target, PieChart, Home } from 'lucide-react';
import { Tooltip } from './Tooltip';
import { getTooltip, getTooltipTitle } from '@/lib/mortgage/glossary';
import { useAnimatedNumber, useAnimatedPercentage, useAnimatedCurrency } from '@/hooks/useAnimatedNumber';
import { AnimatedProgressBar } from './AnimatedProgressBar';
import { formatCurrency, formatMonthsAsYears } from '@/lib/mortgage/formatters';

interface PayoffTimelineProps {
  loanAmount: number;
  currentBalance: number;
  monthsSincePurchase: number;
  totalPayoffMonths: number;
  monthlyPayment: number;
  extraPayment: number;
  currentAge: number;
  currency: 'EUR';
  interestRate: number;
  loanTerm: number;
  purchaseDate: string;
  paymentFrequency: 'monthly' | 'biweekly';
  oneTimePayment: number;
  downPayment: number;
  homeValue: number;
  onPurchaseDateChange?: (date: string) => void;
}

export const PayoffTimeline: React.FC<PayoffTimelineProps> = ({
  loanAmount,
  currentBalance,
  monthsSincePurchase,
  totalPayoffMonths,
  monthlyPayment,
  extraPayment,
  currentAge,
  currency,
  interestRate,
  loanTerm,
  purchaseDate,
  paymentFrequency,
  oneTimePayment,
  downPayment,
  homeValue,
  onPurchaseDateChange
}) => {
  const equityBuilt = loanAmount - currentBalance;
  const equityPercentage = (equityBuilt / loanAmount) * 100;
  const progressPercentage = (monthsSincePurchase / totalPayoffMonths) * 100;
  const remainingMonths = totalPayoffMonths - monthsSincePurchase;
  const ageAtPayoff = currentAge + Math.floor(remainingMonths / 12);

  // Animated values with shorter delays for faster feedback
  const animatedEquityPercentage = useAnimatedPercentage(equityPercentage, { duration: 800, delay: 100 });
  const animatedEquityBuilt = useAnimatedCurrency(equityBuilt, currency, { duration: 800, delay: 200 });
  const animatedRemainingMonths = useAnimatedNumber(remainingMonths, { duration: 600, delay: 300 });
  const animatedMonthlyPayment = useAnimatedCurrency(monthlyPayment + extraPayment, currency, { duration: 600, delay: 400 });
  const animatedProgressPercentage = useAnimatedPercentage(progressPercentage, { duration: 1000, delay: 150 });

  const yearsMonthsFromMonths = (months: number) => {
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    if (years === 0) return `${remainingMonths}mo`;
    if (remainingMonths === 0) return `${years}y`;
    return `${years}y ${remainingMonths}mo`;
  };

  return (
    <div className="bg-[var(--surface)] rounded-xl shadow-lg border border-[var(--border)] p-6">
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-4 rounded-2xl shadow-lg">
            <TrendingUp className="w-7 h-7 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-[var(--foreground)] flex items-center gap-2">
              Detailed Progress & Breakdown
              {onPurchaseDateChange && (
                <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded-full">
                  Interactive
                </span>
              )}
            </h3>
            <p className="text-[var(--foreground-secondary)] text-sm mt-1">
              Timeline, milestones, and monthly allocation
              {onPurchaseDateChange && (
                <span className="block text-xs text-emerald-400 mt-1">
                  Tip: Change the purchase date below to see how it affects your progress
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Loan Details Summary */}
      <div className="mb-8 bg-gradient-to-r from-slate-900/50 to-blue-900/20 rounded-xl p-6 border border-slate-700/50">
        <h4 className="text-lg font-bold text-[var(--foreground)] mb-4 flex items-center gap-2">
          <Home className="w-5 h-5 text-blue-400" />
          Loan Details
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-medium text-[var(--foreground-secondary)]">Home Value:</span>
            <div className="font-bold text-[var(--foreground)]">{formatCurrency(homeValue, currency)}</div>
          </div>
          <div>
            <span className="font-medium text-[var(--foreground-secondary)]">Down Payment:</span>
            <div className="font-bold text-[var(--foreground)]">
              {formatCurrency(downPayment, currency)}
              <span className="text-xs text-[var(--foreground-secondary)] ml-1">
                ({((downPayment / homeValue) * 100).toFixed(1)}%)
              </span>
            </div>
          </div>
          <div>
            <span className="font-medium text-[var(--foreground-secondary)]">Loan Term:</span>
            <div className="font-bold text-[var(--foreground)]">{loanTerm} years</div>
          </div>
          <div>
            <span className="font-medium text-[var(--foreground-secondary)]">Interest Rate:</span>
            <div className="font-bold text-[var(--foreground)]">{interestRate}%</div>
          </div>
          <div>
            <span className="font-medium text-[var(--foreground-secondary)]">Payment Frequency:</span>
            <div className="font-bold text-[var(--foreground)] capitalize">{paymentFrequency}</div>
          </div>
          <div>
            <label className="font-medium text-[var(--foreground-secondary)] block mb-1 flex items-center gap-1">
              Purchase Date
              {onPurchaseDateChange && (
                <span className="text-xs text-emerald-400 font-normal">(editable)</span>
              )}
            </label>
            {onPurchaseDateChange ? (
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => onPurchaseDateChange(e.target.value)}
                className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            ) : (
              <div className="font-bold text-[var(--foreground)]">
                {new Date(purchaseDate).toLocaleDateString('en-IE')}
              </div>
            )}
          </div>
          {oneTimePayment > 0 && (
            <div>
              <span className="font-medium text-[var(--foreground-secondary)]">One-time Payment:</span>
              <div className="font-bold text-[var(--foreground)]">{formatCurrency(oneTimePayment, currency)}</div>
            </div>
          )}
        </div>
      </div>

      {/* Timeline Visualization */}
      <div className="relative">
        <div className="flex items-center justify-between text-sm text-[var(--foreground-secondary)] mb-2">
          <span>Loan Start</span>
          <span>Current Progress</span>
          <span>Payoff Complete</span>
        </div>

        {/* Animated Progress Bar */}
        <div className="relative w-full bg-[var(--border)] rounded-full h-4 mb-4 overflow-hidden">
          <div
            className="absolute top-0 left-0 h-4 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-1500 ease-out"
            style={{ width: `${Math.max(animatedProgressPercentage.value || progressPercentage, 2)}%` }}
          />

          {/* Current Position Marker */}
          <div
            className="absolute top-0 h-4 w-1 bg-white border-2 border-blue-600 rounded-full transform -translate-x-0.5 transition-all duration-1500 ease-out"
            style={{ left: `${Math.max(animatedProgressPercentage.value || progressPercentage, 2)}%` }}
          />

          {/* Shimmer effect during animation */}
          {animatedProgressPercentage.isAnimating && (
            <div className="absolute top-0 left-0 h-full w-full bg-gradient-to-r from-transparent via-blue-400/20 to-transparent animate-pulse" />
          )}
        </div>

        {/* Timeline Labels */}
        <div className="flex justify-between text-xs text-[var(--foreground-secondary)]">
          <span>{formatCurrency(loanAmount, currency)}</span>
          <span className="font-medium text-blue-400">
            {formatCurrency(currentBalance, currency)} remaining
          </span>
          <span>{formatCurrency(0, currency)}</span>
        </div>
      </div>

      {/* Key Milestones */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-900/20 to-blue-800/10 rounded-xl p-4 border border-blue-700/20">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-blue-300">Time Elapsed</span>
          </div>
          <div className="text-lg font-bold text-blue-400">
            {yearsMonthsFromMonths(monthsSincePurchase)}
          </div>
          <div className="text-xs text-blue-300 mt-1">
            {monthsSincePurchase} payments made
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-900/20 to-emerald-800/10 rounded-xl p-4 border border-emerald-700/20">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-medium text-emerald-300">Principal Paid</span>
          </div>
          <div className="text-lg font-bold text-emerald-400">
            {animatedEquityBuilt.value}
          </div>
          <div className="text-xs text-emerald-300 mt-1">
            {((equityBuilt / loanAmount) * 100).toFixed(1)}% of original loan
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-900/20 to-purple-800/10 rounded-xl p-4 border border-purple-700/20">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium text-purple-300 flex items-center">
              Interest Paid
              <Tooltip
                content={getTooltip('totalInterest')}
                title={getTooltipTitle('totalInterest')}
                iconClassName="w-3 h-3 text-purple-400 hover:text-purple-300 cursor-help ml-1"
                maxWidth="max-w-lg"
              />
            </span>
          </div>
          <div className="text-lg font-bold text-purple-400">
            {formatCurrency((monthlyPayment * monthsSincePurchase) - equityBuilt, currency)}
          </div>
          <div className="text-xs text-purple-300 mt-1">
            Total interest to date
          </div>
        </div>
      </div>

      {/* Monthly Breakdown Chart */}
      <div className="mt-6">
        <h4 className="text-sm font-medium text-[var(--foreground)] mb-3">Current Monthly Allocation</h4>
        <div className="space-y-2">
          {/* Calculate current month's principal vs interest */}
          {(() => {
            const monthlyRate = interestRate / 100 / 12; // Use actual interest rate
            const currentInterest = currentBalance * monthlyRate;
            const currentPrincipal = monthlyPayment - currentInterest;
            const totalPayment = monthlyPayment + extraPayment;

            return (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-sm text-[var(--foreground)] flex items-center">
                      Interest
                      <Tooltip
                        content={getTooltip('interest')}
                        title={getTooltipTitle('interest')}
                        iconClassName="w-3 h-3 text-[var(--foreground-secondary)] hover:text-red-400 cursor-help ml-1"
                        maxWidth="max-w-lg"
                      />
                    </span>
                  </div>
                  <span className="text-sm font-medium">{formatCurrency(currentInterest, currency)}</span>
                </div>
                <div className="w-full bg-[var(--border)] rounded-full h-2 mb-3">
                  <div
                    className="bg-red-500 h-2 rounded-full transition-all duration-1000"
                    style={{ width: `${(currentInterest / totalPayment) * 100}%` }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-sm text-[var(--foreground)] flex items-center">
                      Principal
                      <Tooltip
                        content={getTooltip('principal')}
                        title={getTooltipTitle('principal')}
                        iconClassName="w-3 h-3 text-[var(--foreground-secondary)] hover:text-blue-400 cursor-help ml-1"
                        maxWidth="max-w-lg"
                      />
                    </span>
                  </div>
                  <span className="text-sm font-medium">{formatCurrency(currentPrincipal, currency)}</span>
                </div>
                <div className="w-full bg-[var(--border)] rounded-full h-2 mb-3">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-1000"
                    style={{ width: `${(currentPrincipal / totalPayment) * 100}%` }}
                  />
                </div>

                {extraPayment > 0 && (
                  <>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                        <span className="text-sm text-[var(--foreground)]">Extra Principal</span>
                      </div>
                      <span className="text-sm font-medium">{formatCurrency(extraPayment, currency)}</span>
                    </div>
                    <div className="w-full bg-[var(--border)] rounded-full h-2">
                      <div
                        className="bg-emerald-500 h-2 rounded-full transition-all duration-1000"
                        style={{ width: `${(extraPayment / totalPayment) * 100}%` }}
                      />
                    </div>
                  </>
                )}
              </>
            );
          })()}
        </div>
      </div>

      {/* Home Equity Breakdown */}
      <div className="mt-6 pt-6 border-t border-[var(--border)]">
        <div className="flex items-center gap-2 mb-4">
          <PieChart className="w-5 h-5 text-blue-400" />
          <h4 className="text-lg font-semibold text-[var(--foreground)]">Home Equity Breakdown</h4>
        </div>

        <div className="flex items-center justify-between mb-4">
          {/* Simple circular progress indicator */}
          <div className="relative w-20 h-20">
            <svg className="w-20 h-20 transform -rotate-90">
              <circle
                cx="40"
                cy="40"
                r="32"
                stroke="var(--border)"
                strokeWidth="8"
                fill="none"
              />
              <circle
                cx="40"
                cy="40"
                r="32"
                stroke="#3b82f6"
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${(equityPercentage / 100) * 201.06} 201.06`}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold text-[var(--foreground)]">{equityPercentage.toFixed(0)}%</span>
            </div>
          </div>

          {/* Equity stats */}
          <div className="flex-1 ml-6 space-y-3">
            <div className="flex items-center justify-between p-2 bg-blue-900/20 rounded-lg border border-blue-700/30">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-sm font-medium text-blue-300">Equity Built</span>
              </div>
              <div className="text-sm font-bold text-blue-400">{animatedEquityBuilt.value}</div>
            </div>

            <div className="flex items-center justify-between p-2 bg-slate-900/50 rounded-lg border border-slate-700/50">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-slate-400 rounded-full"></div>
                <span className="text-sm font-medium text-[var(--foreground-secondary)]">Remaining Balance</span>
              </div>
              <div className="text-sm font-bold text-[var(--foreground-secondary)]">{formatCurrency(currentBalance, currency)}</div>
            </div>
          </div>
        </div>

        {monthsSincePurchase > 0 && (
          <div className="mt-3 p-3 bg-emerald-900/20 border border-emerald-700/30 rounded-lg">
            <div className="flex items-center gap-2">
              <Home className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-medium text-emerald-300">
                Building {formatCurrency(equityBuilt / monthsSincePurchase, currency)}/month in equity
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
