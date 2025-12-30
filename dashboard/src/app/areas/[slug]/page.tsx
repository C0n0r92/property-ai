'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { formatFullPrice } from '@/lib/format';
import { slugToArea, areaToSlug } from '@/lib/areas';
import { AreaStructuredData } from '@/components/AreaStructuredData';
import { ShareButton } from '@/components/ShareButton';

interface AreaData {
  area: string;
  slug: string;
  stats: {
    totalSales: number;
    medianPrice: number;
    avgPrice: number;
    avgPricePerSqm: number;
    pctOverAsking: number;
    avgOverUnder: number;
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

export default function AreaPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const areaName = slugToArea(slug);
  
  const [data, setData] = useState<AreaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Sorted sales data - must be before any conditional returns
  const sortedSales = useMemo(() => {
    if (!data?.recentSales) return [];
    
    const salesCopy = [...data.recentSales];
    return salesCopy.sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      switch (sortField) {
        case 'type':
          aValue = a.propertyType || '';
          bValue = b.propertyType || '';
          break;
        case 'beds':
          aValue = a.bedrooms || 0;
          bValue = b.bedrooms || 0;
          break;
        case 'asking':
          aValue = a.askingPrice || 0;
          bValue = b.askingPrice || 0;
          break;
        case 'sold':
          aValue = a.soldPrice || 0;
          bValue = b.soldPrice || 0;
          break;
        case 'overUnder':
          aValue = a.overUnderPercent || 0;
          bValue = b.overUnderPercent || 0;
          break;
        case 'date':
          aValue = new Date(a.soldDate).getTime();
          bValue = new Date(b.soldDate).getTime();
          break;
        default:
          return 0;
      }
      
      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });
  }, [data?.recentSales, sortField, sortDirection]);
  
  useEffect(() => {
    if (!slug) return;
    
    async function fetchData() {
      try {
        const response = await fetch(`/api/areas/${slug}`);
        
        if (!response.ok) {
          setError('Failed to load area data');
          return;
        }
        
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError('Error loading data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
  }, [slug]);
  
  if (!areaName) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-bold mb-4">Area Not Found</h1>
        <p className="text-[var(--muted-foreground)] mb-8">
          The area you're looking for doesn't exist.
        </p>
        <Link href="/areas" className="text-[var(--primary)] hover:underline">
          View all Dublin areas
        </Link>
      </div>
    );
  }
  
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-8">
          <div className="h-8 bg-[var(--muted)] rounded w-64"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="card h-24"></div>
            ))}
          </div>
          <div className="card h-80"></div>
        </div>
      </div>
    );
  }
  
  if (error || !data) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-bold mb-4">Error Loading Data</h1>
        <p className="text-[var(--muted-foreground)]">
          {error || 'Unable to load data for this area.'}
        </p>
      </div>
    );
  }
  
  if (!data.stats) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-bold mb-4">{areaName}</h1>
        <p className="text-[var(--muted-foreground)]">
          No property data available for this area yet.
        </p>
        <Link href="/areas" className="text-[var(--primary)] hover:underline mt-4 inline-block">
          View other Dublin areas
        </Link>
      </div>
    );
  }
  
  const { stats, recentSales, monthlyTrend, propertyTypes, priceDistribution, bedroomBreakdown, yieldData, nearbyComparison } = data;
  
  // Format trend data for charts
  const trendData = monthlyTrend.map((t: any) => ({
    ...t,
    label: new Date(t.month + '-01').toLocaleDateString('en-IE', { month: 'short', year: '2-digit' }),
  }));
  
  // Sort function for table
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };
  
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Structured Data for SEO */}
      <AreaStructuredData
        areaName={areaName}
        medianPrice={stats.medianPrice}
        totalSales={stats.totalSales}
        avgPricePerSqm={stats.avgPricePerSqm}
        pctOverAsking={stats.pctOverAsking}
        change6m={stats.change6m}
        recentSales={recentSales.slice(0, 5)}
        yieldData={yieldData}
      />
      
      {/* Header */}
      <div className="mb-8">
        <nav className="text-sm text-[var(--muted-foreground)] mb-4">
          <Link href="/" className="hover:underline">Home</Link>
          {' / '}
          <Link href="/areas" className="hover:underline">Areas</Link>
          {' / '}
          <span className="text-foreground">{areaName}</span>
        </nav>
        
        <h1 className="text-4xl font-bold mb-2">{areaName} House Prices 2025</h1>
        <p className="text-xl text-[var(--muted-foreground)] mb-4">
          Complete market analysis based on {stats.totalSales.toLocaleString()} property sales
        </p>
        <div className="flex justify-end">
          <ShareButton
            areaName={areaName}
            medianPrice={stats.medianPrice}
            totalSales={stats.totalSales}
            url={`https://irishpropertydata.com/areas/${slug}`}
          />
        </div>
      </div>
      
      {/* Key Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="card">
          <div className="stat-label flex items-center gap-1">
            Typical Price
            <span className="text-xs text-[var(--muted-foreground)] cursor-help" title="The middle price - half of properties sold for more, half for less. More accurate than average as it's not affected by extreme prices.">
              ⓘ
            </span>
          </div>
          <div className="stat-value mt-2">{formatFullPrice(stats.medianPrice)}</div>
          <div className="text-xs text-[var(--muted-foreground)] mt-1">
            Half sold for more, half for less
          </div>
        </div>
        <div className="card">
          <div className="stat-label">Avg €/sqm</div>
          <div className="stat-value mt-2">
            {stats.avgPricePerSqm > 0 ? `€${stats.avgPricePerSqm.toLocaleString()}` : 'N/A'}
          </div>
          <div className="text-xs text-[var(--muted-foreground)] mt-1">
            Price per square meter
          </div>
        </div>
        <div className="card">
          <div className="stat-label">% Over Asking</div>
          <div className={`stat-value mt-2 ${stats.pctOverAsking > 50 ? 'price-positive' : ''}`}>
            {stats.pctOverAsking}%
          </div>
          <div className="text-xs text-[var(--muted-foreground)] mt-1">
            Sold above asking
          </div>
        </div>
        <div className="card">
          <div className="stat-label">6mo Change</div>
          <div className={`stat-value mt-2 ${stats.change6m >= 0 ? 'price-positive' : 'price-negative'}`}>
            {stats.change6m >= 0 ? '+' : ''}{stats.change6m}%
          </div>
          <div className="text-xs text-[var(--muted-foreground)] mt-1">
            Price trend
          </div>
        </div>
      </div>
      
      {/* Additional Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="card">
          <div className="stat-label">Total Sales</div>
          <div className="stat-value mt-2">{stats.totalSales.toLocaleString()}</div>
          <div className="text-xs text-[var(--muted-foreground)] mt-1">
            Properties analyzed
          </div>
        </div>
        <div className="card">
          <div className="stat-label">Most Common</div>
          <div className="stat-value mt-2 text-lg">
            {propertyTypes.length > 0 ? propertyTypes[0].name : 'N/A'}
          </div>
          <div className="text-xs text-[var(--muted-foreground)] mt-1">
            Property type
          </div>
        </div>
        <div className="card">
          <div className="stat-label">Price Floor</div>
          <div className="stat-value mt-2 text-lg">{formatFullPrice(stats.minPrice)}</div>
          <div className="text-xs text-[var(--muted-foreground)] mt-1">
            Lowest recorded
          </div>
        </div>
        <div className="card">
          <div className="stat-label">Price Ceiling</div>
          <div className="stat-value mt-2 text-lg">{formatFullPrice(stats.maxPrice)}</div>
          <div className="text-xs text-[var(--muted-foreground)] mt-1">
            Highest recorded
          </div>
        </div>
      </div>
      
      {/* Investment Insights - Rental Yield */}
      {yieldData && (
        <div className="card mb-8 bg-gradient-to-br from-emerald-500/5 to-cyan-500/5 border-emerald-500/20">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-2xl font-semibold mb-2 flex items-center gap-2">
                💰 Investment Potential
                <span className="text-xs font-normal text-emerald-400 bg-emerald-500/20 px-2 py-1 rounded-full">
                  Exclusive Data
                </span>
              </h2>
              <p className="text-sm text-[var(--muted-foreground)]">
                Rental yield estimates based on {yieldData.propertiesWithData} properties ({yieldData.coverage}% coverage)
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-sm text-[var(--muted-foreground)] mb-1">Average Rental Yield</div>
              <div className="text-4xl font-bold text-emerald-400">{yieldData.avgYield}%</div>
              <div className="text-xs text-[var(--muted-foreground)] mt-1">
                {yieldData.avgYield > 5 ? 'Excellent' : yieldData.avgYield > 4 ? 'Good' : 'Average'} for Dublin
              </div>
            </div>
            
            <div>
              <div className="text-sm text-[var(--muted-foreground)] mb-1">Est. Monthly Rent</div>
              <div className="text-2xl font-bold">
                €{yieldData.rentRange.min.toLocaleString()} - €{yieldData.rentRange.max.toLocaleString()}
              </div>
              <div className="text-xs text-[var(--muted-foreground)] mt-1">
                Median: €{yieldData.medianRent.toLocaleString()}/month
              </div>
            </div>
            
            <div>
              <div className="text-sm text-[var(--muted-foreground)] mb-1">Data Confidence</div>
              <div className="flex items-center gap-2 mt-2">
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  yieldData.confidence === 'high' 
                    ? 'bg-emerald-500/20 text-emerald-400' 
                    : 'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {yieldData.confidence === 'high' ? '✓ High' : '~ Medium'}
                </div>
              </div>
              <div className="text-xs text-[var(--muted-foreground)] mt-2">
                Based on actual rental listings
              </div>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-[var(--background)]/50 rounded-lg border border-[var(--border)]">
            <div className="text-sm text-[var(--muted-foreground)]">
              <strong>Investment Insight:</strong> {
                yieldData.avgYield > 5 
                  ? `${areaName} offers above-average rental yields for Dublin, making it attractive for buy-to-let investors.`
                  : yieldData.avgYield > 4
                  ? `${areaName} provides solid rental yields typical of established Dublin areas.`
                  : `${areaName} yields are lower but may offer better capital appreciation potential.`
              }
            </div>
          </div>
        </div>
      )}
      
      {/* Nearby Areas Comparison */}
      {nearbyComparison && nearbyComparison.length > 0 && (
        <div className="card mb-8">
          <h2 className="text-2xl font-semibold mb-2">Compare with Similar Areas</h2>
          <p className="text-sm text-[var(--muted-foreground)] mb-6">
            Areas with similar price ranges to {areaName}
          </p>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-[var(--muted-foreground)] text-sm">
                  <th className="pb-3 font-medium">Area</th>
                  <th className="pb-3 font-medium text-right">Typical Price</th>
                  <th className="pb-3 font-medium text-right">vs {areaName}</th>
                  <th className="pb-3 font-medium text-right">€/sqm</th>
                  <th className="pb-3 font-medium text-right">Value</th>
                </tr>
              </thead>
              <tbody>
                {nearbyComparison.map((area: any, i: number) => {
                  const areaSlug = areaToSlug(area.name);
                  return (
                    <tr 
                      key={i} 
                      className="border-b border-[var(--border)] hover:bg-[var(--muted)] transition-colors"
                    >
                      <td className="py-3">
                        <Link 
                          href={`/areas/${areaSlug}`}
                          className="font-medium hover:text-[var(--primary)] hover:underline"
                        >
                          {area.name}
                        </Link>
                      </td>
                      <td className="py-3 text-right font-mono">
                        {formatFullPrice(area.medianPrice)}
                      </td>
                      <td className={`py-3 text-right font-mono text-sm ${
                        area.priceDiff > 0 ? 'text-red-400' : area.priceDiff < 0 ? 'text-emerald-400' : ''
                      }`}>
                        {area.priceDiff > 0 ? '+' : ''}{area.priceDiff}%
                      </td>
                      <td className="py-3 text-right font-mono text-sm text-[var(--muted-foreground)]">
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
      {trendData.length > 0 && (
        <div className="card mb-8">
          <h2 className="text-2xl font-semibold mb-2">Price Trend Over Time</h2>
          <p className="text-sm text-[var(--muted-foreground)] mb-6">
            {stats.change6m >= 0 
              ? `📈 Prices trending up ${stats.change6m}% over last 6 months`
              : `📉 Prices down ${Math.abs(stats.change6m)}% over last 6 months`
            }
          </p>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
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
        {propertyTypes.length > 0 && (
          <div className="card">
            <h2 className="text-2xl font-semibold mb-6">Property Types</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={propertyTypes.slice(0, 6)} layout="vertical">
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
        {trendData.length > 0 && (
          <div className="card">
            <h2 className="text-2xl font-semibold mb-6">Sales Volume</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData.slice(-12)}>
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
        {priceDistribution.length > 0 && (
          <div className="card">
            <h2 className="text-2xl font-semibold mb-6">Price Distribution</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={priceDistribution}>
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
        {bedroomBreakdown.length > 0 && (
          <div className="card">
            <h2 className="text-2xl font-semibold mb-6">Typical Price by Bedrooms</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bedroomBreakdown}>
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
      {recentSales.length > 0 && (
        <div className="card mb-8">
          <h2 className="text-2xl font-semibold mb-6">Recent Property Sales</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-[var(--muted-foreground)] text-sm">
                  <th className="pb-3 font-medium">Address</th>
                  <th 
                    className="pb-3 font-medium text-right cursor-pointer hover:text-[var(--foreground)] transition-colors select-none"
                    onClick={() => handleSort('type')}
                  >
                    Type {sortField === 'type' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="pb-3 font-medium text-right cursor-pointer hover:text-[var(--foreground)] transition-colors select-none"
                    onClick={() => handleSort('beds')}
                  >
                    Beds {sortField === 'beds' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="pb-3 font-medium text-right cursor-pointer hover:text-[var(--foreground)] transition-colors select-none"
                    onClick={() => handleSort('asking')}
                  >
                    Asking {sortField === 'asking' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="pb-3 font-medium text-right cursor-pointer hover:text-[var(--foreground)] transition-colors select-none"
                    onClick={() => handleSort('sold')}
                  >
                    Sold {sortField === 'sold' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="pb-3 font-medium text-right cursor-pointer hover:text-[var(--foreground)] transition-colors select-none"
                    onClick={() => handleSort('overUnder')}
                  >
                    Over/Under {sortField === 'overUnder' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th 
                    className="pb-3 font-medium text-right cursor-pointer hover:text-[var(--foreground)] transition-colors select-none"
                    onClick={() => handleSort('date')}
                  >
                    Date {sortField === 'date' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedSales.slice(0, 20).map((sale: any, i: number) => (
                  <tr 
                    key={i} 
                    className="border-b border-[var(--border)] hover:bg-[var(--muted)] transition-colors"
                  >
                    <td className="py-3 max-w-xs truncate">{sale.address}</td>
                    <td className="py-3 text-right text-sm text-[var(--muted-foreground)]">
                      {sale.propertyType || 'N/A'}
                    </td>
                    <td className="py-3 text-right text-sm text-[var(--muted-foreground)]">
                      {sale.bedrooms || 'N/A'}
                    </td>
                    <td className="py-3 text-right font-mono text-sm">
                      {formatFullPrice(sale.askingPrice)}
                    </td>
                    <td className="py-3 text-right font-mono font-semibold">
                      {formatFullPrice(sale.soldPrice)}
                    </td>
                    <td className={`py-3 text-right font-mono ${
                      sale.overUnderPercent >= 0 ? 'price-positive' : 'price-negative'
                    }`}>
                      {sale.overUnderPercent >= 0 ? '+' : ''}{sale.overUnderPercent}%
                    </td>
                    <td className="py-3 text-right text-sm text-[var(--muted-foreground)]">
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
      <div className="card mb-8">
        <h2 className="text-2xl font-semibold mb-6">Frequently Asked Questions</h2>
        
        <div className="space-y-6">
          <div>
            <h3 className="font-semibold text-lg mb-2">What is the typical house price in {areaName}?</h3>
            <p className="text-[var(--muted-foreground)]">
              Based on {stats.totalSales.toLocaleString()} property sales, the typical house price in {areaName} is{' '}
              <strong className="text-foreground">{formatFullPrice(stats.medianPrice)}</strong> (half sold for more, half for less). 
              Prices range from {formatFullPrice(stats.minPrice)} to {formatFullPrice(stats.maxPrice)}.
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold text-lg mb-2">Are {areaName} properties going over asking price?</h3>
            <p className="text-[var(--muted-foreground)]">
              Yes, approximately <strong className="text-foreground">{stats.pctOverAsking}%</strong> of properties in{' '}
              {areaName} sell above their asking price. On average, properties sell{' '}
              <strong className="text-foreground">{stats.avgOverUnder}%</strong>{' '}
              {stats.avgOverUnder >= 0 ? 'over' : 'under'} asking price.
            </p>
          </div>
          
          <div>
            <h3 className="font-semibold text-lg mb-2">How have {areaName} property prices changed recently?</h3>
            <p className="text-[var(--muted-foreground)]">
              Over the past 6 months, property prices in {areaName} have{' '}
              {stats.change6m >= 0 ? 'increased' : 'decreased'} by{' '}
              <strong className="text-foreground">{Math.abs(stats.change6m)}%</strong>.
            </p>
          </div>
          
          {propertyTypes.length > 0 && (
            <div>
              <h3 className="font-semibold text-lg mb-2">What types of properties are in {areaName}?</h3>
              <p className="text-[var(--muted-foreground)]">
                The most common property type in {areaName} is{' '}
                <strong className="text-foreground">{propertyTypes[0].name}</strong> ({propertyTypes[0].count} sales).
                {propertyTypes.length > 1 && (
                  <> Other popular types include {propertyTypes.slice(1, 3).map((pt: any) => pt.name).join(' and ')}.</>
                )}
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* Related Research */}
      <div className="card mb-8">
        <h2 className="text-2xl font-semibold mb-6">Market Research & Analysis</h2>
        <p className="text-[var(--muted-foreground)] mb-6">
          Deep-dive research and analysis related to {areaName} and Dublin's property market.
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          <Link
            href="/blog/dublin-property-market-q4-2024"
            className="p-4 border border-[var(--border)] rounded-lg hover:bg-[var(--muted)] transition-colors"
          >
            <h3 className="font-semibold mb-2">Dublin Property Market Q4 2024</h3>
            <p className="text-sm text-[var(--muted-foreground)]">Comprehensive market analysis including {areaName} performance data.</p>
          </Link>
          <Link
            href="/blog/properties-over-asking-dublin"
            className="p-4 border border-[var(--border)] rounded-lg hover:bg-[var(--muted)] transition-colors"
          >
            <h3 className="font-semibold mb-2">Over Asking Price Analysis</h3>
            <p className="text-sm text-[var(--muted-foreground)]">Market demand indicators and bidding competition in Dublin areas.</p>
          </Link>
        </div>
        <div className="mt-6 text-center">
          <Link
            href="/blog"
            className="text-[var(--primary)] hover:underline font-medium"
          >
            View All Research →
          </Link>
        </div>
      </div>

      {/* CTA Section */}
      <div className="card bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/20">
        <div className="text-center py-8">
          <h2 className="text-2xl font-bold mb-4">Explore More Dublin Areas</h2>
          <p className="text-[var(--muted-foreground)] mb-6 max-w-2xl mx-auto">
            Compare {areaName} with other Dublin neighborhoods and discover the best areas for your budget.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/areas"
              className="px-6 py-3 bg-[var(--primary)] text-white rounded-lg hover:opacity-90 transition-opacity font-medium"
            >
              View All Areas
            </Link>
            <Link
              href="/map"
              className="px-6 py-3 bg-[var(--muted)] rounded-lg hover:bg-[var(--muted)]/80 transition-colors font-medium"
            >
              Explore Interactive Map
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
