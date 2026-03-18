'use client';

import { Ruler, Hammer, Info, Loader2 } from 'lucide-react';
import { formatPrice } from '@/lib/format';
import type { ExtensionValueResult } from '@/lib/extension-value';

export interface ExtensionValueCardProps {
  extensionValue: ExtensionValueResult;
  isLoading?: boolean;
}

export function ExtensionValueCard({
  extensionValue,
  isLoading = false,
}: ExtensionValueCardProps) {
  if (isLoading) {
    return (
      <div className="card h-full flex items-center justify-center">
        <Loader2 className="animate-spin" size={24} style={{ color: 'var(--foreground-muted)' }} />
        <span className="ml-2" style={{ color: 'var(--foreground-muted)' }}>Calculating extension values...</span>
      </div>
    );
  }

  return (
    <div className="card h-full" role="region" aria-label="Extension value calculator">
      <div className="flex items-center gap-2 mb-4">
        <Hammer size={20} style={{ color: 'var(--accent)' }} aria-hidden="true" />
        <h3 className="text-lg font-bold">Extension Value Calculator</h3>
      </div>

      {/* Area Context */}
      <div
        className="p-3 rounded-lg mb-4"
        style={{ background: 'var(--surface-hover)' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Based on {extensionValue.postcode} house prices</p>
            <p className="text-xs" style={{ color: 'var(--foreground-muted)' }}>
              {extensionValue.sampleSize.toLocaleString()} properties analyzed
            </p>
          </div>
          <div className="text-right">
            <p className="stat-label">MEDIAN PRICE</p>
            <p
              className="text-xl font-bold"
              style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}
            >
              {formatPrice(extensionValue.pricePerSqm)}/sqm
            </p>
          </div>
        </div>
      </div>

      {/* Extension Types Table */}
      <div className="space-y-2">
        {extensionValue.extensions.map((ext) => (
          <div
            key={ext.type.id}
            className="flex items-center justify-between p-3 rounded-lg transition-colors"
            style={{ background: 'var(--surface-hover)' }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ background: 'var(--accent-bg)' }}
              >
                <Ruler size={18} style={{ color: 'var(--accent)' }} />
              </div>
              <div>
                <p className="font-medium">{ext.type.name}</p>
                <p className="text-xs" style={{ color: 'var(--foreground-muted)' }}>
                  {ext.type.sqm} sqm • {ext.type.description}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p
                className="text-lg font-bold"
                style={{ color: 'var(--positive)', fontFamily: 'var(--font-mono)' }}
              >
                +{formatPrice(ext.estimatedValue)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Disclaimer */}
      <div
        className="flex items-start gap-2 mt-4 pt-4 text-xs"
        style={{ borderTop: '1px solid var(--border)', color: 'var(--foreground-muted)' }}
      >
        <Info size={14} className="flex-shrink-0 mt-0.5" />
        <p>
          Estimated values based on median price per sqm for {extensionValue.propertyType.toLowerCase()}s in {extensionValue.postcode}.
          Actual values depend on quality of finish, planning constraints, and market conditions.
        </p>
      </div>
    </div>
  );
}
