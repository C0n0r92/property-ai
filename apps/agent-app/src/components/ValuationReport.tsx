'use client';

import { forwardRef } from 'react';
import { Home, MapPin, TrendingUp, BarChart3, Target, CheckCircle } from 'lucide-react';
import type { ComparableProperty } from './ComparableGrid';
import type { DealVerdict } from './DealAssessment';
import { formatPrice, formatDate } from '@/lib/format';

export interface ValuationReportProps {
  property: {
    address: string;
    beds?: number;
    baths?: number;
    areaSqm?: number;
    propertyType?: string;
    soldPrice?: number;
    askingPrice?: number;
  };
  comparables: ComparableProperty[];
  stats: {
    medianPrice: number;
    averagePrice: number;
    minPrice: number;
    maxPrice: number;
    medianPricePerSqm: number;
    averagePricePerSqm: number;
    medianOverAskingPercent: number;
    count: number;
  };
  deal?: {
    verdict: DealVerdict;
    assessment: string;
  };
  generatedAt?: Date;
  agentName?: string;
  agentCompany?: string;
}

/**
 * Professional A4 PDF Report Template
 * This component is designed to be printed/exported to PDF
 * Hidden on screen, used only for PDF generation
 */
export const ValuationReport = forwardRef<HTMLDivElement, ValuationReportProps>(
  function ValuationReport(
    {
      property,
      comparables,
      stats,
      deal,
      generatedAt = new Date(),
      agentName,
      agentCompany,
    },
    ref
  ) {
    const getVerdictLabel = (verdict: DealVerdict) => {
      switch (verdict) {
        case 'great_deal': return 'Excellent Value';
        case 'good_value': return 'Good Value';
        case 'fair_price': return 'Fair Market Value';
        case 'above_market': return 'Above Market';
        case 'premium': return 'Premium Price';
        default: return 'Assessment Pending';
      }
    };

    const propertyPrice = property.soldPrice || property.askingPrice || 0;
    const propertyPricePerSqm = property.areaSqm && property.areaSqm > 0
      ? Math.round(propertyPrice / property.areaSqm)
      : null;

    return (
      <div
        ref={ref}
        className="bg-white text-gray-900"
        style={{
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: '12px',
          lineHeight: '1.5',
          width: '210mm',
          minHeight: '297mm',
          padding: '15mm',
          boxSizing: 'border-box',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', paddingBottom: '15px', borderBottom: '2px solid #3B82F6' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '14px' }}>
                G
              </div>
              <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#1a1a1a' }}>Gaff Intel</span>
            </div>
            <p style={{ color: '#6b7280', fontSize: '11px' }}>Professional Property Valuation Report</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '11px', color: '#6b7280' }}>Generated: {formatDate(generatedAt)}</p>
            {agentName && (
              <p style={{ fontSize: '11px', color: '#6b7280' }}>
                {agentName}{agentCompany ? ` | ${agentCompany}` : ''}
              </p>
            )}
          </div>
        </div>

        {/* Property Title */}
        <div style={{ marginBottom: '20px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1a1a1a', marginBottom: '8px' }}>
            {property.address}
          </h1>
          <div style={{ display: 'flex', gap: '16px', color: '#6b7280', fontSize: '12px' }}>
            {property.beds !== undefined && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Home size={14} /> {property.beds} Bedrooms
              </span>
            )}
            {property.baths !== undefined && (
              <span>{property.baths} Bathrooms</span>
            )}
            {property.areaSqm && (
              <span>{property.areaSqm} sqm</span>
            )}
            {property.propertyType && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={14} /> {property.propertyType}
              </span>
            )}
          </div>
        </div>

        {/* Valuation Summary Box */}
        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <div>
              <p style={{ color: '#6b7280', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                {property.soldPrice ? 'Sold Price' : 'Asking Price'}
              </p>
              <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#3B82F6' }}>
                {formatPrice(propertyPrice)}
              </p>
            </div>
            <div>
              <p style={{ color: '#6b7280', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                Market Median
              </p>
              <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#1a1a1a' }}>
                {formatPrice(stats.medianPrice)}
              </p>
            </div>
            <div>
              <p style={{ color: '#6b7280', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                Assessment
              </p>
              <p style={{
                fontSize: '16px',
                fontWeight: 'bold',
                color: deal?.verdict === 'great_deal' || deal?.verdict === 'good_value' ? '#22C55E'
                  : deal?.verdict === 'premium' || deal?.verdict === 'above_market' ? '#EF4444'
                  : '#3B82F6'
              }}>
                {deal ? getVerdictLabel(deal.verdict) : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Market Context */}
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 'bold', color: '#1a1a1a', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart3 size={16} color="#3B82F6" />
            Market Context
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px' }}>
            <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '6px', textAlign: 'center' }}>
              <p style={{ color: '#6b7280', fontSize: '10px', marginBottom: '4px' }}>Comparables</p>
              <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#1a1a1a' }}>{stats.count}</p>
            </div>
            <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '6px', textAlign: 'center' }}>
              <p style={{ color: '#6b7280', fontSize: '10px', marginBottom: '4px' }}>Price/sqm</p>
              <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#1a1a1a' }}>{formatPrice(stats.medianPricePerSqm)}</p>
            </div>
            <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '6px', textAlign: 'center' }}>
              <p style={{ color: '#6b7280', fontSize: '10px', marginBottom: '4px' }}>vs Asking</p>
              <p style={{ fontSize: '18px', fontWeight: 'bold', color: stats.medianOverAskingPercent >= 0 ? '#22C55E' : '#EF4444' }}>
                {stats.medianOverAskingPercent > 0 ? '+' : ''}{stats.medianOverAskingPercent.toFixed(1)}%
              </p>
            </div>
            <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '6px', textAlign: 'center' }}>
              <p style={{ color: '#6b7280', fontSize: '10px', marginBottom: '4px' }}>Price Range</p>
              <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#1a1a1a' }}>
                {formatPrice(stats.minPrice)} - {formatPrice(stats.maxPrice)}
              </p>
            </div>
          </div>
        </div>

        {/* Property Analysis */}
        {propertyPricePerSqm && (
          <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '6px', padding: '12px', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '12px', fontWeight: 'bold', color: '#1E40AF', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Target size={14} />
              Property Analysis
            </h3>
            <p style={{ color: '#1E40AF', fontSize: '11px' }}>
              This property&apos;s price per sqm ({formatPrice(propertyPricePerSqm)}) is
              {propertyPricePerSqm < stats.medianPricePerSqm
                ? ` ${((1 - propertyPricePerSqm / stats.medianPricePerSqm) * 100).toFixed(1)}% below`
                : propertyPricePerSqm > stats.medianPricePerSqm
                ? ` ${((propertyPricePerSqm / stats.medianPricePerSqm - 1) * 100).toFixed(1)}% above`
                : ' at'}
              {' '}the market median of {formatPrice(stats.medianPricePerSqm)}/sqm.
            </p>
          </div>
        )}

        {/* Comparable Sales Table */}
        <div style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 'bold', color: '#1a1a1a', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={16} color="#3B82F6" />
            Comparable Sales ({comparables.length})
          </h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
            <thead>
              <tr style={{ background: '#F8FAFC' }}>
                <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #E2E8F0', color: '#6b7280', fontWeight: '600' }}>Address</th>
                <th style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #E2E8F0', color: '#6b7280', fontWeight: '600' }}>Beds</th>
                <th style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #E2E8F0', color: '#6b7280', fontWeight: '600' }}>sqm</th>
                <th style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #E2E8F0', color: '#6b7280', fontWeight: '600' }}>Price</th>
                <th style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #E2E8F0', color: '#6b7280', fontWeight: '600' }}>€/sqm</th>
                <th style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #E2E8F0', color: '#6b7280', fontWeight: '600' }}>vs Ask</th>
              </tr>
            </thead>
            <tbody>
              {comparables.slice(0, 10).map((comp, idx) => (
                <tr key={idx} style={{ background: idx % 2 === 0 ? 'white' : '#FAFAFA' }}>
                  <td style={{ padding: '8px', borderBottom: '1px solid #E2E8F0', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {comp.address}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #E2E8F0' }}>
                    {comp.beds || '-'}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #E2E8F0' }}>
                    {comp.areaSqm || '-'}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #E2E8F0', fontWeight: '600' }}>
                    {formatPrice(comp.soldPrice)}
                  </td>
                  <td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #E2E8F0' }}>
                    {comp.pricePerSqm ? formatPrice(comp.pricePerSqm) : '-'}
                  </td>
                  <td style={{
                    padding: '8px',
                    textAlign: 'center',
                    borderBottom: '1px solid #E2E8F0',
                    color: comp.overUnderPercent !== undefined
                      ? (comp.overUnderPercent >= 0 ? '#22C55E' : '#EF4444')
                      : '#6b7280'
                  }}>
                    {comp.overUnderPercent !== undefined
                      ? `${comp.overUnderPercent >= 0 ? '+' : ''}${comp.overUnderPercent.toFixed(1)}%`
                      : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Assessment Summary */}
        {deal && (
          <div style={{
            background: deal.verdict === 'great_deal' || deal.verdict === 'good_value' ? '#F0FDF4'
              : deal.verdict === 'premium' || deal.verdict === 'above_market' ? '#FEF2F2'
              : '#EFF6FF',
            border: `1px solid ${
              deal.verdict === 'great_deal' || deal.verdict === 'good_value' ? '#BBF7D0'
              : deal.verdict === 'premium' || deal.verdict === 'above_market' ? '#FECACA'
              : '#BFDBFE'
            }`,
            borderRadius: '6px',
            padding: '12px',
            marginBottom: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <CheckCircle size={16} color={
                deal.verdict === 'great_deal' || deal.verdict === 'good_value' ? '#22C55E'
                : deal.verdict === 'premium' || deal.verdict === 'above_market' ? '#EF4444'
                : '#3B82F6'
              } />
              <h3 style={{
                fontSize: '14px',
                fontWeight: 'bold',
                color: deal.verdict === 'great_deal' || deal.verdict === 'good_value' ? '#166534'
                  : deal.verdict === 'premium' || deal.verdict === 'above_market' ? '#991B1B'
                  : '#1E40AF'
              }}>
                {getVerdictLabel(deal.verdict)}
              </h3>
            </div>
            <p style={{
              fontSize: '11px',
              color: deal.verdict === 'great_deal' || deal.verdict === 'good_value' ? '#166534'
                : deal.verdict === 'premium' || deal.verdict === 'above_market' ? '#991B1B'
                : '#1E40AF'
            }}>
              {deal.assessment}
            </p>
          </div>
        )}

        {/* Footer */}
        <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '12px', marginTop: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '20px', height: '20px', background: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '10px' }}>
                G
              </div>
              <span style={{ fontSize: '10px', color: '#6b7280' }}>
                Powered by Gaff Intel | gaffintel.ie
              </span>
            </div>
            <p style={{ fontSize: '9px', color: '#9CA3AF' }}>
              This report is for informational purposes only and does not constitute a formal valuation.
              Data sourced from publicly available property records.
            </p>
          </div>
        </div>
      </div>
    );
  }
);
