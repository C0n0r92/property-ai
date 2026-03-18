'use client';

import { Calendar, Home } from 'lucide-react';
import { formatPriceCompact } from '@/lib/format';

interface SalePoint {
  date: string;
  price: number;
  address: string;
}

export interface ComparableTrendCardProps {
  sales: SalePoint[];
  propertyPrice?: number;
}

export function ComparableTrendCard({
  sales,
  propertyPrice,
}: ComparableTrendCardProps) {
  // Sort by date
  const sortedSales = [...sales]
    .filter((s) => s.date && s.price)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (sortedSales.length < 4) {
    return null;
  }

  // Get price range for visual scaling
  const prices = sortedSales.map((s) => s.price);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IE', { month: 'short', year: '2-digit' });
  };

  // Get price range for visual scaling
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice || 1;

  // Calculate bar heights (20-80% range)
  const getBarHeight = (price: number) => {
    const normalized = (price - minPrice) / priceRange;
    return 20 + normalized * 60; // 20% to 80%
  };

  // Get date range
  const firstDate = new Date(sortedSales[0].date);
  const lastDate = new Date(sortedSales[sortedSales.length - 1].date);
  const monthsDiff = Math.round(
    (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
  );

  return (
    <div className="card" role="region" aria-label="Comparable sales trend analysis">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar size={20} style={{ color: 'var(--accent)' }} aria-hidden="true" />
          <h3 className="text-lg font-bold">Recent Sales Timeline</h3>
        </div>
        <span
          className="text-xs px-2 py-1 rounded-full"
          style={{ background: 'var(--surface-hover)', color: 'var(--foreground-muted)' }}
        >
          {sortedSales.length} comparable sales
        </span>
      </div>

      {/* Visual Timeline */}
      <div className="relative">
        {/* Bar Chart */}
        <div
          className="flex items-end justify-between gap-1 mb-2"
          style={{ height: '120px' }}
          role="img"
          aria-label={`${sortedSales.length} comparable sales over ${monthsDiff} months, prices ranging from ${formatPriceCompact(minPrice)} to ${formatPriceCompact(maxPrice)}`}
        >
          {sortedSales.slice(-12).map((sale, idx) => (
            <div
              key={idx}
              className="flex-1 flex flex-col items-center group relative"
            >
              {/* Tooltip on hover */}
              <div
                className="absolute bottom-full mb-2 px-2 py-1 rounded text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10"
                style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
              >
                <p className="font-semibold">{formatPriceCompact(sale.price)}</p>
                <p style={{ color: 'var(--foreground-muted)' }}>{formatDate(sale.date)}</p>
              </div>
              {/* Bar */}
              <div
                className="w-full rounded-t transition-all"
                style={{
                  height: `${getBarHeight(sale.price)}%`,
                  background:
                    propertyPrice && Math.abs(sale.price - propertyPrice) < propertyPrice * 0.05
                      ? 'var(--accent)'
                      : 'var(--border)',
                  minWidth: '8px',
                }}
              />
            </div>
          ))}
        </div>

        {/* Timeline axis */}
        <div
          className="flex justify-between text-xs pt-2"
          style={{ borderTop: '1px solid var(--border)', color: 'var(--foreground-muted)' }}
        >
          <span>{formatDate(sortedSales[0].date)}</span>
          <span>{formatDate(sortedSales[sortedSales.length - 1].date)}</span>
        </div>
      </div>

      {/* Summary Stats */}
      <div
        className="grid grid-cols-3 gap-4 mt-4 pt-4"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <div>
          <p className="text-xs" style={{ color: 'var(--foreground-muted)' }}>
            Sales Analyzed
          </p>
          <p className="text-lg font-bold flex items-center gap-1">
            <Home size={14} style={{ color: 'var(--foreground-muted)' }} />
            {sortedSales.length}
          </p>
        </div>
        <div>
          <p className="text-xs" style={{ color: 'var(--foreground-muted)' }}>
            Price Range
          </p>
          <p className="text-sm font-semibold" style={{ fontFamily: 'var(--font-mono)' }}>
            {formatPriceCompact(minPrice)} - {formatPriceCompact(maxPrice)}
          </p>
        </div>
        <div>
          <p className="text-xs" style={{ color: 'var(--foreground-muted)' }}>
            Time Period
          </p>
          <p className="text-sm font-semibold">
            {monthsDiff} months
          </p>
        </div>
      </div>

      {/* Insight */}
      <div
        className="mt-4 p-3 rounded-lg text-sm"
        style={{ background: 'var(--surface-hover)', color: 'var(--foreground-secondary)' }}
      >
        <p>
          Showing {sortedSales.length} similar properties that sold over {monthsDiff} months.
          {' '}Hover over bars to see individual sale prices.
          {' '}Check the <strong>Area Trend</strong> card for actual market movement.
        </p>
      </div>
    </div>
  );
}
