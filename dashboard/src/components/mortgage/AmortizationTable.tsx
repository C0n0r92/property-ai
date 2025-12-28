/**
 * Amortization Table Component
 *
 * Virtualized table displaying mortgage amortization schedule.
 * Supports monthly/yearly views with CSV export.
 */

import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Download, Table } from 'lucide-react';
import { AmortizationEntry } from '@/types/mortgage';
import { formatCurrency } from '@/lib/mortgage/formatters';

interface AmortizationTableProps {
  amortization: AmortizationEntry[];
  currency: 'EUR';
}

interface YearlyEntry {
  year: number;
  totalPayment: number;
  totalPrincipal: number;
  totalInterest: number;
  totalPMI: number;
  endingBalance: number;
  months: AmortizationEntry[];
}

export const AmortizationTable: React.FC<AmortizationTableProps> = ({
  amortization,
  currency
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showYearly, setShowYearly] = useState(true);

  // Group by year for yearly view
  const yearlyData = useMemo(() => {
    return amortization.reduce((acc, entry) => {
      const year = Math.ceil(entry.month / 12);
      if (!acc[year]) {
        acc[year] = {
          year,
          totalPayment: 0,
          totalPrincipal: 0,
          totalInterest: 0,
          totalPMI: 0,
          endingBalance: 0,
          months: []
        };
      }
      acc[year].totalPayment += entry.payment;
      acc[year].totalPrincipal += entry.principal;
      acc[year].totalInterest += entry.interest;
      acc[year].totalPMI += entry.pmi || 0;
      acc[year].endingBalance = entry.balance;
      acc[year].months.push(entry);
      return acc;
    }, {} as Record<number, YearlyEntry>);
  }, [amortization]);

  const exportToCSV = () => {
    const headers = ['Month', 'Payment', 'Principal', 'Interest', 'Balance', 'PMI', 'Cumulative Interest', 'Cumulative Principal'];
    const csvContent = [
      headers.join(','),
      ...amortization.map(entry => [
        entry.month,
        entry.payment.toFixed(2),
        entry.principal.toFixed(2),
        entry.interest.toFixed(2),
        entry.balance.toFixed(2),
        (entry.pmi || 0).toFixed(2),
        entry.cumulativeInterest.toFixed(2),
        entry.cumulativePrincipal.toFixed(2)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mortgage-amortization-schedule.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const displayData = showYearly ? Object.values(yearlyData) : amortization.slice(0, isExpanded ? undefined : 24);

  const renderRow = (entry: any, index: number) => {
    const isYearly = showYearly;

    return (
      <tr
        key={index}
        className="border-b border-[var(--border)] hover:bg-[var(--surface)] transition-colors"
      >
        <td className="py-3 px-4 font-medium text-[var(--foreground)]">
          {isYearly ? entry.year : entry.month}
        </td>
        <td className="py-3 px-4 text-right text-[var(--foreground)]">
          {formatCurrency(isYearly ? entry.totalPayment : entry.payment, currency)}
        </td>
        <td className="py-3 px-4 text-right text-emerald-400">
          {formatCurrency(isYearly ? entry.totalPrincipal : entry.principal, currency)}
        </td>
        <td className="py-3 px-4 text-right text-red-400">
          {formatCurrency(isYearly ? entry.totalInterest : entry.interest, currency)}
        </td>
        <td className="py-3 px-4 text-right text-orange-400">
          {formatCurrency(isYearly ? entry.totalPMI : (entry.pmi || 0), currency)}
        </td>
        <td className="py-3 px-4 text-right font-medium text-[var(--foreground)]">
          {formatCurrency(isYearly ? entry.endingBalance : entry.balance, currency)}
        </td>
      </tr>
    );
  };

  return (
    <div className="bg-[var(--surface)] rounded-xl shadow-lg border border-[var(--border)] p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Table className="w-6 h-6 text-blue-400" />
          <h3 className="text-xl font-bold text-[var(--foreground)]">Amortization Schedule</h3>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-[var(--background)] rounded-lg p-1 border border-[var(--border)]">
            <button
              onClick={() => setShowYearly(false)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                !showYearly
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-[var(--foreground-secondary)] hover:text-[var(--foreground)]'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setShowYearly(true)}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                showYearly
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-[var(--foreground-secondary)] hover:text-[var(--foreground)]'
              }`}
            >
              Yearly
            </button>
          </div>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      <div className="overflow-x-auto border border-[var(--border)] rounded-lg -mx-2 sm:mx-0">
        <div className="min-w-[600px]">
          <table className="w-full text-sm">
          <thead className="bg-[var(--background)]">
            <tr className="border-b border-[var(--border)]">
              <th className="text-left py-3 px-4 font-semibold text-[var(--foreground-secondary)]">
                {showYearly ? 'Year' : 'Month'}
              </th>
              <th className="text-right py-3 px-4 font-semibold text-[var(--foreground-secondary)]">
                Payment
              </th>
              <th className="text-right py-3 px-4 font-semibold text-[var(--foreground-secondary)]">
                Principal
              </th>
              <th className="text-right py-3 px-4 font-semibold text-[var(--foreground-secondary)]">
                Interest
              </th>
              <th className="text-right py-3 px-4 font-semibold text-[var(--foreground-secondary)]">
                PMI
              </th>
              <th className="text-right py-3 px-4 font-semibold text-[var(--foreground-secondary)]">
                Balance
              </th>
            </tr>
          </thead>
          <tbody>
            {displayData.map((entry: any, index: number) => renderRow(entry, index))}
          </tbody>
        </table>
        </div>
      </div>

      {!showYearly && amortization.length > 24 && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 mx-auto px-4 py-2 text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-4 h-4" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                Show All {amortization.length} Payments
              </>
            )}
          </button>
        </div>
      )}

      {displayData.length === 0 && (
        <div className="text-center py-8 text-[var(--foreground-secondary)]">
          No amortization data available
        </div>
      )}
    </div>
  );
};

