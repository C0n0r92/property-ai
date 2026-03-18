'use client';

import { useState } from 'react';
import { MapPin, Calendar, ArrowUpDown, ChevronDown } from 'lucide-react';
import { formatPrice, formatDistance } from '@/lib/format';

export interface ComparableProperty {
  address: string;
  soldPrice: number;
  askingPrice?: number;
  overUnderPercent?: number;
  beds?: number;
  baths?: number;
  areaSqm?: number;
  propertyType?: string;
  distance?: number;
  soldDate?: string;
  daysSinceSold?: number;
  pricePerSqm?: number;
}

export interface ComparableGridProps {
  comparables: ComparableProperty[];
  title?: string;
  showSortControls?: boolean;
  maxDisplay?: number;
}

type SortKey = 'price' | 'pricePerSqm' | 'distance' | 'date';

export function ComparableGrid({
  comparables,
  title = 'Comparable Properties',
  showSortControls = true,
  maxDisplay,
}: ComparableGridProps) {
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortAsc, setSortAsc] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const sortedComparables = [...comparables].sort((a, b) => {
    let aVal: number, bVal: number;

    switch (sortKey) {
      case 'price':
        aVal = a.soldPrice;
        bVal = b.soldPrice;
        break;
      case 'pricePerSqm':
        aVal = a.pricePerSqm || 0;
        bVal = b.pricePerSqm || 0;
        break;
      case 'distance':
        aVal = a.distance || 0;
        bVal = b.distance || 0;
        break;
      case 'date':
        aVal = a.daysSinceSold || 0;
        bVal = b.daysSinceSold || 0;
        break;
      default:
        return 0;
    }

    return sortAsc ? aVal - bVal : bVal - aVal;
  });

  const displayLimit = maxDisplay || 10;
  const displayedComparables = showAll ? sortedComparables : sortedComparables.slice(0, displayLimit);
  const hasMore = sortedComparables.length > displayLimit;

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === 'distance' || key === 'date'); // Default ascending for distance/date
    }
  };

  if (comparables.length === 0) {
    return (
      <div className="card">
        <h3 className="text-xl font-bold mb-4">{title}</h3>
        <p style={{ color: 'var(--foreground-secondary)' }}>
          No comparable properties found in this area.
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h3 className="text-xl font-bold">
          {title} ({comparables.length})
        </h3>

        {showSortControls && (
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'date' as SortKey, label: 'Date' },
              { key: 'price' as SortKey, label: 'Price' },
              { key: 'pricePerSqm' as SortKey, label: '€/sqm' },
              { key: 'distance' as SortKey, label: 'Distance' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => handleSort(key)}
                className={`chip flex items-center gap-1 ${sortKey === key ? 'chip-active' : ''}`}
              >
                {label}
                {sortKey === key && (
                  <ArrowUpDown size={12} style={{ transform: sortAsc ? 'rotate(180deg)' : 'none' }} />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        {displayedComparables.map((comp, idx) => (
          <div
            key={idx}
            className="card-static transition hover:border-[var(--accent)]"
          >
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
              {/* Property Info */}
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold mb-1 truncate">{comp.address}</h4>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                  {comp.beds !== undefined && <span>{comp.beds} bed</span>}
                  {comp.baths !== undefined && <span>{comp.baths} bath</span>}
                  {comp.areaSqm && <span>{comp.areaSqm} sqm</span>}
                  {comp.propertyType && <span>{comp.propertyType}</span>}
                </div>

                <div className="flex flex-wrap gap-3 mt-2 text-xs" style={{ color: 'var(--foreground-muted)' }}>
                  {comp.distance !== undefined && (
                    <span className="flex items-center gap-1">
                      <MapPin size={12} />
                      {formatDistance(comp.distance)}
                    </span>
                  )}
                  {comp.daysSinceSold !== undefined && (
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      {comp.daysSinceSold} days ago
                    </span>
                  )}
                </div>
              </div>

              {/* Price Info */}
              <div className="text-right sm:ml-4 flex-shrink-0">
                <p className="font-bold text-lg">{formatPrice(comp.soldPrice)}</p>
                {comp.pricePerSqm && (
                  <p className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
                    {formatPrice(comp.pricePerSqm)}/sqm
                  </p>
                )}
                {comp.overUnderPercent !== undefined && (
                  <p
                    className="text-sm font-medium"
                    style={{
                      color: comp.overUnderPercent >= 0 ? 'var(--positive)' : 'var(--negative)',
                    }}
                  >
                    {comp.overUnderPercent >= 0 ? '+' : ''}{comp.overUnderPercent.toFixed(1)}% vs asking
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {hasMore && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="btn-secondary w-full mt-4 flex items-center justify-center gap-2"
        >
          <ChevronDown size={18} />
          Show All {sortedComparables.length} Properties
        </button>
      )}
    </div>
  );
}
