'use client';

import { Bed, Bath, Ruler, MapPin, Calendar } from 'lucide-react';
import { formatPrice, formatDate } from '@/lib/format';

export interface PropertyCardProps {
  address: string;
  beds?: number;
  baths?: number;
  areaSqm?: number;
  propertyType?: string;
  soldPrice?: number;
  askingPrice?: number;
  soldDate?: string;
  compact?: boolean;
}

export function PropertyCard({
  address,
  beds,
  baths,
  areaSqm,
  propertyType,
  soldPrice,
  askingPrice,
  soldDate,
  compact = false,
}: PropertyCardProps) {
  if (compact) {
    return (
      <div className="card-static">
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold truncate">{address}</h4>
            <p className="text-sm" style={{ color: 'var(--foreground-secondary)' }}>
              {beds && `${beds} bed`}
              {baths && ` • ${baths} bath`}
              {areaSqm && ` • ${areaSqm} sqm`}
              {propertyType && ` • ${propertyType}`}
            </p>
          </div>
          {(soldPrice || askingPrice) && (
            <p className="font-bold text-lg ml-4">
              {formatPrice(soldPrice || askingPrice!)}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="text-xl font-bold mb-4">{address}</h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {beds !== undefined && (
          <div className="stat-card">
            <p className="stat-label flex items-center gap-1">
              <Bed size={14} /> Bedrooms
            </p>
            <p className="stat-value" style={{ fontSize: '1.5rem' }}>{beds}</p>
          </div>
        )}

        {baths !== undefined && (
          <div className="stat-card">
            <p className="stat-label flex items-center gap-1">
              <Bath size={14} /> Bathrooms
            </p>
            <p className="stat-value" style={{ fontSize: '1.5rem' }}>{baths}</p>
          </div>
        )}

        {areaSqm !== undefined && (
          <div className="stat-card">
            <p className="stat-label flex items-center gap-1">
              <Ruler size={14} /> Area
            </p>
            <p className="stat-value" style={{ fontSize: '1.5rem' }}>{areaSqm}</p>
            <p className="text-xs" style={{ color: 'var(--foreground-secondary)' }}>sqm</p>
          </div>
        )}

        {propertyType && (
          <div className="stat-card">
            <p className="stat-label flex items-center gap-1">
              <MapPin size={14} /> Type
            </p>
            <p className="stat-value" style={{ fontSize: '1rem' }}>{propertyType}</p>
          </div>
        )}
      </div>

      {(soldPrice || askingPrice || soldDate) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {soldPrice && (
            <div className="stat-card">
              <p className="stat-label">Sold Price</p>
              <p className="stat-value" style={{ color: 'var(--accent)' }}>
                {formatPrice(soldPrice)}
              </p>
            </div>
          )}

          {askingPrice && (
            <div className="stat-card">
              <p className="stat-label">Asking Price</p>
              <p className="stat-value" style={{ color: 'var(--foreground-secondary)' }}>
                {formatPrice(askingPrice)}
              </p>
            </div>
          )}

          {soldDate && (
            <div className="stat-card">
              <p className="stat-label flex items-center gap-1">
                <Calendar size={14} /> Sold Date
              </p>
              <p className="stat-value" style={{ fontSize: '1rem' }}>
                {formatDate(soldDate)}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
