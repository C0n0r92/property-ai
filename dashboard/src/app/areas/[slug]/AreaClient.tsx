'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { formatFullPrice } from '@/lib/format';
import { slugToArea, areaToSlug } from '@/lib/areas';
import { AreaStructuredData } from '@/components/AreaStructuredData';
import { ShareButton } from '@/components/ShareButton';
import { analytics } from '@/lib/analytics';

interface AreaData {
  area: string;
  slug: string;
  stats: {
    totalSales: number;
    medianPrice: number;
    avgPrice: number;
    avgPricePerSqm: number;
    pctOverAsking: number;
    avgOverUnderPercent: number;
    avgOverUnderEuro: number;
    change6m: number;
    minPrice: number;
    maxPrice: number;
  } | null;
  recentSales: any[];
  monthlyTrend: any[];
  propertyTypes: any[];
  priceDistribution: any[];
  bedroomBreakdown: any[];
  yieldData?: {
    avgYield: number;
    medianRent: number;
    rentRange: { min: number; max: number };
    propertiesWithData: number;
    totalProperties: number;
    coverage: number;
    confidence: string;
  } | null;
  nearbyComparison?: any[];
  message?: string;
}

export default function AreaClient({ slug, initialData }: { slug: string; initialData: any }) {
  const [data, setData] = useState<any>(initialData);
  const [loading, setLoading] = useState(false);
  const areaName = slugToArea(slug) || 'Unknown Area';

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(`/api/areas/${slug}`);
        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error('Error loading data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [slug]);

  if (loading) {
    return (
      <div>
        <h1>Loading {areaName}...</h1>
      </div>
    );
  }

  if (!data?.stats) {
    return (
      <div>
        <h1>{areaName}</h1>
        <p>Data coming soon for this area.</p>
      </div>
    );
  }

  return (
      <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Structured Data for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Place",
            "name": areaName,
            "description": `Property market information for ${areaName}, Dublin. Based on ${data.stats.totalSales} property sales with average price of €${data.stats.avgPrice.toLocaleString()}.`
          })
        }}
      />

      {/* Header */}
      <div className="mb-8">
        <nav className="text-sm text-[var(--muted-foreground)] mb-4">
          <a href="/" className="hover:underline">Home</a>
          {' / '}
          <a href="/areas" className="hover:underline">Areas</a>
          {' / '}
          <span className="text-foreground">{areaName}</span>
        </nav>

        <h1 className="text-4xl font-bold mb-2">{areaName}</h1>
        <p className="text-xl text-[var(--foreground-secondary)] mb-4">
          Average price analysis based on {data.stats.totalSales.toLocaleString()} property sales
        </p>
        <div className="flex justify-end gap-3">
          <a
            href={`/map?area=${slug}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V7m0 0L9 4" />
            </svg>
            View on Map
          </a>
          <ShareButton
            areaName={areaName}
            medianPrice={data.stats.medianPrice}
            totalSales={data.stats.totalSales}
            url={`https://irishpropertydata.com/areas/${slug}`}
          />
        </div>
      </div>

      {/* Key Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
        <div className="bg-[var(--surface)] p-4 rounded-lg border border-[var(--border)]">
          <div className="text-sm text-[var(--muted-foreground)] flex items-center gap-1">
            Average Price
            <span className="text-xs text-[var(--muted-foreground)] cursor-help" title="The mathematical average of all property prices. Can be influenced by very high or low priced properties.">
              ⓘ
            </span>
          </div>
          <div className="text-2xl font-bold mt-2 text-[var(--foreground)]">{formatFullPrice(data.stats.avgPrice)}</div>
          <div className="text-xs text-[var(--muted-foreground)] mt-1">
            Average price
          </div>
        </div>
        <div className="bg-[var(--surface)] p-4 rounded-lg border border-[var(--border)]">
          <div className="text-sm text-[var(--muted-foreground)]">Avg €/sqm</div>
          <div className="text-2xl font-bold mt-2 text-[var(--foreground)]">
            {data.stats.avgPricePerSqm > 0 ? `€${data.stats.avgPricePerSqm.toLocaleString()}` : 'N/A'}
          </div>
          <div className="text-xs text-[var(--muted-foreground)] mt-1">
            € per sqm
          </div>
        </div>
        <div className="bg-[var(--surface)] p-4 rounded-lg border border-[var(--border)]">
          <div className="text-sm text-[var(--muted-foreground)]">% Over Asking</div>
          <div className={`text-2xl font-bold mt-2 ${data.stats.pctOverAsking > 50 ? 'text-green-600' : 'text-[var(--foreground)]'}`}>
            {data.stats.pctOverAsking}%
          </div>
          <div className="text-xs text-[var(--muted-foreground)] mt-1">
            % above asking
          </div>
        </div>
        <div className="bg-[var(--surface)] p-4 rounded-lg border border-[var(--border)]">
          <div className="text-sm text-[var(--muted-foreground)]">6mo Change</div>
          <div className={`text-2xl font-bold mt-2 ${data.stats.change6m >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {data.stats.change6m >= 0 ? '+' : ''}{data.stats.change6m}%
          </div>
          <div className="text-xs text-[var(--muted-foreground)] mt-1">
            6-month change
          </div>
        </div>
        <div className="bg-[var(--surface)] p-4 rounded-lg border border-[var(--border)]">
          <div className="text-sm text-[var(--muted-foreground)]">Avg Over/Under</div>
          <div className={`text-2xl font-bold mt-2 ${data.stats.avgOverUnderPercent > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {data.stats.avgOverUnderPercent > 0 ? '+' : ''}{(data.stats.avgOverUnderPercent || 0).toFixed(1)}%
          </div>
          <div className="text-xs text-[var(--muted-foreground)] mt-1">
            vs asking price
          </div>
        </div>
        <div className="bg-[var(--surface)] p-4 rounded-lg border border-[var(--border)]">
          <div className="text-sm text-[var(--muted-foreground)]">Avg € Over/Under</div>
          <div className={`text-2xl font-bold mt-2 whitespace-nowrap ${data.stats.avgOverUnderEuro > 0 ? 'text-green-600' : 'text-red-600'}`}>
            {data.stats.avgOverUnderEuro > 0 ? '+' : ''}€{Math.abs(data.stats.avgOverUnderEuro).toLocaleString()}
          </div>
          <div className="text-xs text-[var(--muted-foreground)] mt-1">
            € difference
          </div>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-[var(--surface)] p-4 rounded-lg border border-[var(--border)]">
          <div className="text-sm text-[var(--muted-foreground)]">Total Sales</div>
          <div className="text-2xl font-bold mt-2 text-[var(--foreground)]">{data.stats.totalSales.toLocaleString()}</div>
          <div className="text-xs text-[var(--muted-foreground)] mt-1">
            Properties analyzed
          </div>
        </div>
        <div className="bg-[var(--surface)] p-4 rounded-lg border border-[var(--border)]">
          <div className="text-sm text-[var(--muted-foreground)]">Most Common</div>
          <div className="text-2xl font-bold mt-2 text-[var(--foreground)]">
            {data.propertyTypes && data.propertyTypes.length > 0 ? data.propertyTypes[0].name : 'N/A'}
          </div>
          <div className="text-xs text-[var(--muted-foreground)] mt-1">
            Property type
          </div>
        </div>
        <div className="bg-[var(--surface)] p-4 rounded-lg border border-[var(--border)]">
          <div className="text-sm text-[var(--muted-foreground)]">Price Floor</div>
          <div className="text-2xl font-bold mt-2 text-[var(--foreground)]">{formatFullPrice(data.stats.minPrice)}</div>
          <div className="text-xs text-[var(--muted-foreground)] mt-1">
            Lowest recorded
          </div>
        </div>
        <div className="bg-[var(--surface)] p-4 rounded-lg border border-[var(--border)]">
          <div className="text-sm text-[var(--muted-foreground)]">Price Ceiling</div>
          <div className="text-2xl font-bold mt-2 text-[var(--foreground)]">{formatFullPrice(data.stats.maxPrice)}</div>
          <div className="text-xs text-[var(--muted-foreground)] mt-1">
            Highest recorded
          </div>
        </div>
      </div>

      {/* Investment Insights - Rental Yield */}
      {data.yieldData && (
        <div className="bg-gradient-to-br from-emerald-500/5 to-cyan-500/5 p-6 rounded-lg border border-emerald-500/20 mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-2xl font-semibold mb-2 flex items-center gap-2">
                💰 Investment Potential
                <span className="text-xs font-normal text-emerald-400 bg-emerald-500/20 px-2 py-1 rounded-full">
                  Exclusive Data
                </span>
              </h2>
              <p className="text-sm text-gray-600">
                Rental yield estimates based on {data.yieldData.propertiesWithData} properties ({data.yieldData.coverage}% coverage)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-sm text-gray-600 mb-1">Average Rental Yield</div>
              <div className="text-4xl font-bold text-emerald-400">{data.yieldData.avgYield}%</div>
              <div className="text-xs text-gray-500 mt-1">
                {data.yieldData.avgYield > 5 ? 'Excellent' : data.yieldData.avgYield > 4 ? 'Good' : 'Average'} for Dublin
              </div>
            </div>

            <div>
              <div className="text-sm text-gray-600 mb-1">Est. Monthly Rent</div>
              <div className="text-2xl font-bold">
                €{data.yieldData.rentRange.min.toLocaleString()} - €{data.yieldData.rentRange.max.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Median: €{data.yieldData.medianRent.toLocaleString()}/month
              </div>
            </div>

            <div>
              <div className="text-sm text-gray-600 mb-1">Data Confidence</div>
              <div className="flex items-center gap-2 mt-2">
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  data.yieldData.confidence === 'high'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {data.yieldData.confidence === 'high' ? '✓ High' : '~ Medium'}
                </div>
              </div>
              <div className="text-xs text-gray-500 mt-2">
                Based on actual rental listings
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
            <div className="text-sm text-gray-700">
              <strong>Investment Insight:</strong> {
                data.yieldData.avgYield > 5
                  ? `${areaName} offers above-average rental yields for Dublin, making it attractive for buy-to-let investors.`
                  : data.yieldData.avgYield > 4
                  ? `${areaName} provides solid rental yields typical of established Dublin areas.`
                  : `${areaName} yields are lower but may offer better capital appreciation potential.`
              }
            </div>
          </div>
        </div>
      )}

      {/* Nearby Areas Comparison */}
      {data.nearbyComparison && data.nearbyComparison.length > 0 && (
        <div className="bg-[var(--surface)] p-6 rounded-lg border border-[var(--border)] mb-8">
          <h2 className="text-2xl font-semibold mb-2 text-[var(--foreground)]">Compare with Similar Areas</h2>
          <p className="text-sm text-[var(--muted-foreground)] mb-6">
            Areas with similar price ranges to {areaName}
          </p>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 text-left text-sm">
                  <th className="pb-3 font-medium">Area</th>
                  <th className="pb-3 font-medium text-right">Average Price</th>
                  <th className="pb-3 font-medium text-right">vs {areaName}</th>
                  <th className="pb-3 font-medium text-right">€/sqm</th>
                  <th className="pb-3 font-medium text-right">Value</th>
                </tr>
              </thead>
              <tbody>
                {data.nearbyComparison.map((area: any, i: number) => {
                  const areaSlug = area.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
                  return (
                    <tr
                      key={i}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-3">
                        <a
                          href={`/areas/${areaSlug}`}
                          className="font-medium hover:text-blue-600 hover:underline"
                        >
                          {area.name}
                        </a>
                      </td>
                      <td className="py-3 text-right font-mono">
                        {formatFullPrice(area.avgPrice)}
                      </td>
                      <td className={`py-3 text-right font-mono text-sm ${
                        area.priceDiff > 0 ? 'text-red-400' : area.priceDiff < 0 ? 'text-emerald-400' : ''
                      }`}>
                        {area.priceDiff > 0 ? '+' : ''}{area.priceDiff}%
                      </td>
                      <td className="py-3 text-right font-mono text-sm text-gray-500">
                        {area.avgPricePerSqm > 0 ? `€${area.avgPricePerSqm.toLocaleString()}` : 'N/A'}
                      </td>
                      <td className="py-3 text-right">
                        {area.sqmDiff !== null && (
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            area.sqmDiff < -10 ? 'bg-emerald-500/20 text-emerald-400' :
                            area.sqmDiff > 10 ? 'bg-red-500/20 text-red-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {area.sqmDiff < -10 ? '🔥 Better value' :
                             area.sqmDiff > 10 ? 'More expensive' :
                             'Similar value'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Price Trend Chart */}
      {data.monthlyTrend && data.monthlyTrend.length > 0 && (
        <div className="bg-[var(--surface)] p-6 rounded-lg border border-[var(--border)] mb-8">
          <h2 className="text-2xl font-semibold mb-2 text-[var(--foreground)]">Price Trend Over Time</h2>
          <p className="text-sm text-[var(--muted-foreground)] mb-6">
            {data.stats.change6m >= 0
              ? `📈 Prices trending up ${data.stats.change6m}% over last 6 months`
              : `📉 Prices down ${Math.abs(data.stats.change6m)}% over last 6 months`
            }
          </p>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.monthlyTrend.map((t: any) => ({
                ...t,
                label: new Date(t.month + '-01').toLocaleDateString('en-IE', { month: 'short', year: '2-digit' }),
              }))}>
                <defs>
                  <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6B7280', fontSize: 12 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6B7280', fontSize: 12 }}
                  tickFormatter={(value) => `€${Math.round(value / 10000) * 10}k`}
                  domain={[200000, 'dataMax']}
                  interval={0}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#f9fafb',
                    padding: '12px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.3)',
                  }}
                  labelStyle={{
                    color: '#f9fafb',
                    fontWeight: '600',
                    marginBottom: '4px',
                  }}
                  itemStyle={{
                    color: '#f9fafb',
                  }}
                  formatter={(value: number | undefined, name: string | undefined, props: any) => [
                    formatFullPrice(value || 0),
                    `Typical Price (${props.payload.count} sales)`
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="median"
                  stroke="#2563EB"
                  strokeWidth={3}
                  fill="url(#colorPrice)"
                  dot={{ fill: '#2563EB', r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-8 mb-8">
        {/* Property Types */}
        {data.propertyTypes && data.propertyTypes.length > 0 && (
          <div className="bg-[var(--surface)] p-6 rounded-lg border border-[var(--border)]">
            <h2 className="text-2xl font-semibold mb-6 text-[var(--foreground)]">Property Types</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.propertyTypes.slice(0, 6)} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#6B7280', fontSize: 12 }}
                    width={100}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#f9fafb',
                      padding: '12px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.3)',
                    }}
                    labelStyle={{ color: '#f9fafb', fontWeight: '600' }}
                    itemStyle={{ color: '#f9fafb' }}
                    formatter={(value: number | undefined) => [(value || 0).toLocaleString(), 'Sales']}
                  />
                  <Bar dataKey="count" fill="#2563EB" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Sales Volume Over Time */}
        {data.monthlyTrend && data.monthlyTrend.length > 0 && (
          <div className="bg-[var(--surface)] p-6 rounded-lg border border-[var(--border)]">
            <h2 className="text-2xl font-semibold mb-6 text-[var(--foreground)]">Sales Volume</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.monthlyTrend.slice(-12).map((t: any) => ({
                  ...t,
                  label: new Date(t.month + '-01').toLocaleDateString('en-IE', { month: 'short', year: '2-digit' }),
                }))}>
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#6B7280', fontSize: 10 }}
                  />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#f9fafb',
                      padding: '12px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.3)',
                    }}
                    labelStyle={{ color: '#f9fafb', fontWeight: '600' }}
                    itemStyle={{ color: '#f9fafb' }}
                    formatter={(value: number | undefined) => [(value || 0).toLocaleString(), 'Sales']}
                  />
                  <Bar dataKey="count" fill="#059669" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Price Distribution & Bedroom Breakdown */}
      <div className="grid md:grid-cols-2 gap-8 mb-8">
        {/* Price Distribution */}
        {data.priceDistribution && data.priceDistribution.length > 0 && (
          <div className="bg-[var(--surface)] p-6 rounded-lg border border-[var(--border)]">
            <h2 className="text-2xl font-semibold mb-6 text-[var(--foreground)]">Price Distribution</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.priceDistribution}>
                  <XAxis
                    dataKey="range"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#6B7280', fontSize: 10 }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#f9fafb',
                      padding: '12px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.3)',
                    }}
                    labelStyle={{ color: '#f9fafb', fontWeight: '600' }}
                    itemStyle={{ color: '#f9fafb' }}
                    formatter={(value: number | undefined) => [(value || 0).toLocaleString(), 'Properties']}
                  />
                  <Bar dataKey="count" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Bedroom Breakdown */}
        {data.bedroomBreakdown && data.bedroomBreakdown.length > 0 && (
          <div className="bg-[var(--surface)] p-6 rounded-lg border border-[var(--border)]">
            <h2 className="text-2xl font-semibold mb-6 text-[var(--foreground)]">Typical Price by Bedrooms</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.bedroomBreakdown}>
                  <XAxis
                    dataKey="bedrooms"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#6B7280', fontSize: 12 }}
                    label={{ value: 'Bedrooms', position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#6B7280', fontSize: 12 }}
                    tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#f9fafb',
                      padding: '12px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.3)',
                    }}
                    labelStyle={{ color: '#f9fafb', fontWeight: '600' }}
                    itemStyle={{ color: '#f9fafb' }}
                    formatter={(value: number | undefined) => [formatFullPrice(value || 0), 'Typical Price']}
                  />
                  <Bar dataKey="medianPrice" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Recent Sales Table */}
      {data.recentSales && data.recentSales.length > 0 && (
        <div className="bg-[var(--surface)] p-6 rounded-lg border border-[var(--border)] mb-8">
          <h2 className="text-2xl font-semibold mb-6 text-[var(--foreground)]">Recent Property Sales</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 text-left text-sm">
                  <th className="pb-3 font-medium flex items-center gap-1">
                    Address
                    <svg className="w-3 h-3 text-blue-600 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </th>
                  <th className="pb-3 font-medium text-right">Type</th>
                  <th className="pb-3 font-medium text-right">Beds</th>
                  <th className="pb-3 font-medium text-right">Asking</th>
                  <th className="pb-3 font-medium text-right">Sold</th>
                  <th className="pb-3 font-medium text-right">Over/Under</th>
                  <th className="pb-3 font-medium text-right">Date</th>
                </tr>
              </thead>
              <tbody>
                {data.recentSales.slice(0, 20).map((sale: any, i: number) => (
                  <tr
                    key={i}
                    className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                      sale.latitude && sale.longitude ? 'cursor-pointer' : ''
                    }`}
                    title={sale.latitude && sale.longitude ? 'Click to view on map' : 'Location data not available'}
                    onClick={() => {
                      if (sale.latitude && sale.longitude) {
                        window.open(`/map?focus=${encodeURIComponent(sale.address)}&type=listing`, '_blank');
                      }
                    }}
                  >
                    <td className="py-3 max-w-xs truncate text-blue-600 hover:underline flex items-center gap-2">
                      {sale.address}
                      {sale.latitude && sale.longitude && (
                        <svg className="w-3 h-3 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )}
                    </td>
                    <td className="py-3 text-right text-sm text-gray-600">
                      {sale.propertyType || 'N/A'}
                    </td>
                    <td className="py-3 text-right text-sm text-gray-600">
                      {sale.bedrooms || 'N/A'}
                    </td>
                    <td className="py-3 text-right font-mono text-sm">
                      {formatFullPrice(sale.askingPrice)}
                    </td>
                    <td className="py-3 text-right font-mono font-semibold">
                      {formatFullPrice(sale.soldPrice)}
                    </td>
                    <td className={`py-3 text-right font-mono ${
                      sale.overUnderPercent >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {sale.overUnderPercent >= 0 ? '+' : ''}{sale.overUnderPercent}%
                    </td>
                    <td className="py-3 text-right text-sm text-gray-600">
                      {new Date(sale.soldDate).toLocaleDateString('en-IE', {
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* FAQ Section for SEO */}
      <div className="bg-[var(--surface)] p-6 rounded-lg border border-[var(--border)] mb-8">
        <h2 className="text-2xl font-semibold mb-6 text-[var(--foreground)]">Frequently Asked Questions</h2>

        <div className="space-y-6">
          <div>
            <h3 className="font-semibold text-lg mb-2">What is the average house price in {areaName}?</h3>
            <p className="text-[var(--foreground-secondary)]">
              Based on {data.stats.totalSales.toLocaleString()} property sales, the average house price in {areaName} is{' '}
              <strong className="text-[var(--foreground)]">{formatFullPrice(data.stats.avgPrice)}</strong>.
              Prices range from {formatFullPrice(data.stats.minPrice)} to {formatFullPrice(data.stats.maxPrice)}.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-2">Are {areaName} properties going over asking price?</h3>
            <p className="text-[var(--foreground-secondary)]">
              Yes, approximately <strong className="text-[var(--foreground)]">{data.stats.pctOverAsking}%</strong> of properties in{' '}
              {areaName} sell above their asking price. On average, properties sell{' '}
              <strong className="text-[var(--foreground)]">{data.stats.avgOverUnderPercent}%</strong>{' '}
              ({data.stats.avgOverUnderEuro >= 0 ? '+' : ''}€{formatFullPrice(Math.abs(data.stats.avgOverUnderEuro))}) {' '}
              {data.stats.avgOverUnderPercent >= 0 ? 'over' : 'under'} asking price.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-2">How have {areaName} property prices changed recently?</h3>
            <p className="text-[var(--foreground-secondary)]">
              Over the past 6 months, property prices in {areaName} have{' '}
              {data.stats.change6m >= 0 ? 'increased' : 'decreased'} by{' '}
              <strong className="text-[var(--foreground)]">{Math.abs(data.stats.change6m)}%</strong>.
            </p>
          </div>

          {data.propertyTypes && data.propertyTypes.length > 0 && (
            <div>
              <h3 className="font-semibold text-lg mb-2">What types of properties are in {areaName}?</h3>
            <p className="text-[var(--foreground-secondary)]">
              The most common property type in {areaName} is{' '}
              <strong className="text-[var(--foreground)]">{data.propertyTypes[0].name}</strong> ({data.propertyTypes[0].count} sales).
              {data.propertyTypes.length > 1 && (
                <> Other popular types include {data.propertyTypes.slice(1, 3).map((pt: any) => pt.name).join(' and ')}.</>
              )}
            </p>
            </div>
          )}
        </div>
      </div>

      {/* Related Research */}
      <div className="bg-[var(--surface)] p-6 rounded-lg border border-[var(--border)] mb-8">
        <h2 className="text-2xl font-semibold mb-6 text-[var(--foreground)]">Market Research & Analysis</h2>
        <p className="text-[var(--muted-foreground)] mb-6">
          Deep-dive research and analysis related to {areaName} and Dublin's property market.
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          <a
            href="/blog/dublin-property-market-q4-2024"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <h3 className="font-semibold mb-2">Dublin Property Market Q4 2024</h3>
            <p className="text-sm text-gray-600">Comprehensive market analysis including {areaName} performance data.</p>
          </a>
          <a
            href="/blog/properties-over-asking-dublin"
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <h3 className="font-semibold mb-2">Over Asking Price Analysis</h3>
            <p className="text-sm text-gray-600">Market demand indicators and bidding competition in Dublin areas.</p>
          </a>
        </div>
        <div className="mt-6 text-center">
          <a
            href="/blog"
            className="text-blue-600 hover:underline font-medium"
          >
            View All Research →
          </a>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 p-6 rounded-lg border border-blue-500/20">
        <div className="text-center py-8">
          <h2 className="text-2xl font-bold mb-4 text-[var(--foreground)]">Explore More Dublin Areas</h2>
          <p className="text-[var(--muted-foreground)] mb-6 max-w-2xl mx-auto">
            Compare {areaName} with other Dublin neighborhoods and discover the best areas for your budget.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/areas"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              View All Areas
            </a>
            <a
              href="/map"
              className="px-6 py-3 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Explore Interactive Map
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
