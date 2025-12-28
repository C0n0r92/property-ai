'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

interface ChartWrapperProps {
  children: React.ReactNode;
}

export function ChartWrapper({ children }: ChartWrapperProps) {
  return <>{children}</>;
}

export function OverAskingChart() {
  return (
    <ChartWrapper>
      <div className="my-8">
        <div className="h-80 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={[
                { type: 'Apartments', rate: 85.0, properties: '11,448' },
                { type: 'Semi-Detached', rate: 86.2, properties: '12,316' },
                { type: 'Terraced', rate: 85.5, properties: '10,047' },
                { type: 'Detached', rate: 69.6, properties: '3,470' }
              ]}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <XAxis
                dataKey="type"
                angle={-45}
                textAnchor="end"
                height={80}
                fontSize={11}
              />
              <YAxis
                label={{ value: 'Over-Asking Rate (%)', angle: -90, position: 'insideLeft' }}
                fontSize={12}
              />
              <Tooltip
                formatter={(value) => [value + '%', 'Over-Asking Rate']}
              />
              <Bar dataKey="rate" fill="#2563EB" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-sm text-slate-600 text-center">
          Semi-detached houses show the highest over-asking rates at 86.2%
        </p>
      </div>
    </ChartWrapper>
  );
}

export function DistanceChart() {
  return (
    <div className="my-8 p-4 border rounded-lg bg-gray-50">
      <p className="text-center">Distance Chart Component Loaded</p>
      <div className="h-80 bg-blue-100 flex items-center justify-center">
        <span className="text-gray-600">Chart would render here</span>
      </div>
    </div>
  );
}

export function ThreeBedChart() {
  return (
    <div className="my-8 p-4 border rounded-lg bg-green-50">
      <p className="text-center">3-Bed Chart Component Loaded</p>
      <div className="h-80 bg-green-100 flex items-center justify-center">
        <span className="text-gray-600">Chart would render here</span>
      </div>
    </div>
  );
}

export function ChristmasPriceChart() {
  return (
    <ChartWrapper>
      <div className="my-8">
        <div className="h-80 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={[
                { day: 'Dec 20', price: 545584, volume: 286, overAsking: 4.06 },
                { day: 'Dec 21', price: 500992, volume: 201, overAsking: 3.72 },
                { day: 'Dec 22', price: 482540, volume: 141, overAsking: 1.15 },
                { day: 'Dec 23', price: 536650, volume: 50, overAsking: 3.72 },
                { day: 'Dec 24', price: 466333, volume: 3, overAsking: 10.59 },
                { day: 'Dec 25', price: 0, volume: 0, overAsking: 0 },
                { day: 'Dec 26', price: 0, volume: 0, overAsking: 0 },
                { day: 'Dec 28', price: 830000, volume: 1, overAsking: 14.48 },
                { day: 'Dec 29', price: 482000, volume: 5, overAsking: 7.35 },
                { day: 'Dec 30', price: 462750, volume: 4, overAsking: -6.28 },
                { day: 'Dec 31', price: 617667, volume: 3, overAsking: 3.23 }
              ]}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <XAxis
                dataKey="day"
                angle={-45}
                textAnchor="end"
                height={80}
                fontSize={11}
              />
              <YAxis
                yAxisId="price"
                label={{ value: 'Average Price (€)', angle: -90, position: 'insideLeft' }}
                fontSize={12}
                tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
              />
              <YAxis
                yAxisId="volume"
                orientation="right"
                label={{ value: 'Volume', angle: 90, position: 'insideRight' }}
                fontSize={12}
              />
              <Tooltip
                formatter={(value, name) => {
                  if (name === 'Average Price') return [`€${value.toLocaleString()}`, name];
                  if (name === 'Volume') return [value, name];
                  if (name === 'Over-asking Rate') return [`${value}%`, name];
                  return [value, name];
                }}
              />
              <Line
                yAxisId="price"
                type="monotone"
                dataKey="price"
                stroke="#2563EB"
                strokeWidth={2}
                name="Average Price"
                connectNulls={false}
              />
              <Line
                yAxisId="volume"
                type="monotone"
                dataKey="volume"
                stroke="#DC2626"
                strokeWidth={2}
                name="Volume"
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-sm text-slate-600 text-center">
          December house prices showed a distinct dip during Christmas week, with minimal activity on Dec 25
        </p>
      </div>
    </ChartWrapper>
  );
}

// New charts for the recent blogs
export function YieldCurveChart() {
  return (
    <ChartWrapper>
      <div className="my-8">
        <div className="h-80 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={[
                { bracket: 'Under €300k', yield: 11.52, count: 3906 },
                { bracket: '€300k-€400k', yield: 9.04, count: 7172 },
                { bracket: '€400k-€500k', yield: 7.83, count: 6241 },
                { bracket: '€500k-€700k', yield: 6.57, count: 6087 },
                { bracket: 'Over €700k', yield: 4.88, count: 3830 }
              ]}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <XAxis
                dataKey="bracket"
                angle={-45}
                textAnchor="end"
                height={80}
                fontSize={11}
              />
              <YAxis
                label={{ value: 'Gross Yield (%)', angle: -90, position: 'insideLeft' }}
                fontSize={12}
              />
              <Tooltip
                formatter={(value, name) => [`${value}${name === 'yield' ? '%' : ''}`, name === 'yield' ? 'Gross Yield' : name === 'count' ? 'Properties' : name]}
              />
              <Line
                type="monotone"
                dataKey="yield"
                stroke="#2563EB"
                strokeWidth={3}
                name="yield"
                dot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-sm text-slate-600 text-center">
          The yield curve shows dramatic inverse relationship - cheaper properties deliver 2.4x higher returns
        </p>
      </div>
    </ChartWrapper>
  );
}

export function BedroomPerformanceChart() {
  return (
    <ChartWrapper>
      <div className="my-8">
        <div className="h-80 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={[
                { bedrooms: '1', overRate: 83.3, avgPremium: 9.7 },
                { bedrooms: '2', overRate: 85.3, avgPremium: 11.2 },
                { bedrooms: '3', overRate: 87.4, avgPremium: 10.4 },
                { bedrooms: '4', overRate: 79.3, avgPremium: 9.4 },
                { bedrooms: '5', overRate: 68.4, avgPremium: 9.4 }
              ]}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <XAxis
                dataKey="bedrooms"
                label={{ value: 'Number of Bedrooms', position: 'insideBottom', offset: -5 }}
                fontSize={12}
              />
              <YAxis
                label={{ value: 'Over-Asking Rate (%)', angle: -90, position: 'insideLeft' }}
                fontSize={12}
              />
              <Tooltip
                formatter={(value, name) => [`${value}${name === 'overRate' || name === 'avgPremium' ? '%' : ''}`, name === 'overRate' ? 'Over-Asking Rate' : name === 'avgPremium' ? 'Avg Premium' : name]}
              />
              <Bar dataKey="overRate" fill="#2563EB" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-sm text-slate-600 text-center">
          3-bedroom properties achieve the highest over-asking success rate at 87.4%
        </p>
      </div>
    </ChartWrapper>
  );
}

export function D4PremiumChart() {
  return (
    <ChartWrapper>
      <div className="my-8">
        <div className="h-80 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={[
                { bedrooms: '1', d4Price: 375000, restPrice: 275000, premium: 36.4 },
                { bedrooms: '2', d4Price: 520000, restPrice: 365000, premium: 42.5 },
                { bedrooms: '3', d4Price: 850000, restPrice: 472000, premium: 80.1 },
                { bedrooms: '4', d4Price: 1355000, restPrice: 710278, premium: 90.8 },
                { bedrooms: '5', d4Price: 2000000, restPrice: 969162, premium: 106.4 }
              ]}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <XAxis
                dataKey="bedrooms"
                label={{ value: 'Number of Bedrooms', position: 'insideBottom', offset: -5 }}
                fontSize={12}
              />
              <YAxis
                label={{ value: 'Premium (%)', angle: -90, position: 'insideLeft' }}
                fontSize={12}
              />
              <Tooltip
                formatter={(value, name) => [`${value}${name === 'premium' ? '%' : ''}`, 'D4 Premium']}
              />
              <Line
                type="monotone"
                dataKey="premium"
                stroke="#DC2626"
                strokeWidth={3}
                name="premium"
                dot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-sm text-slate-600 text-center">
          D4 premium escalates exponentially from 36.4% for 1-beds to 106.4% for 5-beds
        </p>
      </div>
    </ChartWrapper>
  );
}

// New charts for January and Rental blogs
export function JanuaryVolumeChart() {
  return (
    <ChartWrapper>
      <div className="my-8">
        <div className="h-80 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={[
                { period: 'Dec 2024', volume: 1038, overRate: 82.9 },
                { period: 'Jan 2025', volume: 764, overRate: 83.0 },
                { period: 'Feb 2025', volume: 848, overRate: 83.4 }
              ]}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <XAxis
                dataKey="period"
                fontSize={12}
              />
              <YAxis
                yAxisId="volume"
                label={{ value: 'Properties Sold', angle: -90, position: 'insideLeft' }}
                fontSize={12}
              />
              <YAxis
                yAxisId="overRate"
                orientation="right"
                label={{ value: 'Over-Asking Rate (%)', angle: 90, position: 'insideRight' }}
                fontSize={12}
              />
              <Tooltip
                formatter={(value, name) => [
                  name === 'volume' ? value : `${value}%`,
                  name === 'volume' ? 'Properties Sold' : 'Over-Asking Rate'
                ]}
              />
              <Bar
                yAxisId="volume"
                dataKey="volume"
                fill="#2563EB"
                name="volume"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-sm text-slate-600 text-center">
          January 2025 shows 26% volume decline from December while maintaining strong over-asking rates
        </p>
      </div>
    </ChartWrapper>
  );
}

export function RentalPricingChart() {
  return (
    <ChartWrapper>
      <div className="my-8">
        <div className="h-80 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={[
                { bedrooms: '1', medianRent: 1925, medianYield: 8.4 },
                { bedrooms: '2', medianRent: 2550, medianYield: 8.2 },
                { bedrooms: '3', medianRent: 3000, medianYield: 7.5 },
                { bedrooms: '4', medianRent: 3931, medianYield: 6.3 },
                { bedrooms: '5', medianRent: 7767, medianYield: 5.7 }
              ]}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <XAxis
                dataKey="bedrooms"
                label={{ value: 'Bedrooms', position: 'insideBottom', offset: -5 }}
                fontSize={12}
              />
              <YAxis
                label={{ value: 'Median Rent (€)', angle: -90, position: 'insideLeft' }}
                fontSize={12}
                tickFormatter={(value) => `€${value}`}
              />
              <Tooltip
                formatter={(value, name) => [
                  name === 'medianRent' ? `€${value.toLocaleString()}` : `${value}%`,
                  name === 'medianRent' ? 'Median Rent' : 'Median Yield'
                ]}
              />
              <Bar
                dataKey="medianRent"
                fill="#2563EB"
                name="medianRent"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-sm text-slate-600 text-center">
          Rental prices increase significantly with bedroom count, from €1,925 (1-bed) to €7,767 (5-bed)
        </p>
      </div>
    </ChartWrapper>
  );
}

export function TopRentalAreasChart() {
  return (
    <ChartWrapper>
      <div className="my-8">
        <div className="h-80 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={[
                { area: 'D22', medianYield: 9.5, medianRent: 2700 },
                { area: 'D11', medianYield: 9.1, medianRent: 2670 },
                { area: 'D15', medianYield: 8.9, medianRent: 3000 },
                { area: 'D1', medianYield: 8.7, medianRent: 2600 },
                { area: 'D24', medianYield: 8.6, medianRent: 2500 },
                { area: 'D12', medianYield: 8.5, medianRent: 3350 },
                { area: 'D2', medianYield: 8.3, medianRent: 3175 },
                { area: 'D13', medianYield: 8.2, medianRent: 3350 }
              ]}
              margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
            >
              <XAxis
                dataKey="area"
                angle={-45}
                textAnchor="end"
                height={60}
                fontSize={11}
              />
              <YAxis
                label={{ value: 'Median Yield (%)', angle: -90, position: 'insideLeft' }}
                fontSize={12}
              />
              <Tooltip
                formatter={(value, name) => [
                  name === 'medianYield' ? `${value}%` : `€${value}`,
                  name === 'medianYield' ? 'Median Yield' : 'Median Rent'
                ]}
              />
              <Bar
                dataKey="medianYield"
                fill="#10B981"
                name="medianYield"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-sm text-slate-600 text-center">
          D22 leads with 9.5% median yields, followed by D11 (9.1%) and D15 (8.9%)
        </p>
      </div>
    </ChartWrapper>
  );
}

export function Q2VsQ1Chart() {
  const chartData = [
    { quarter: 'Q1', avgPrice: 550377, avgOverAsk: 6.09, count: 8904 },
    { quarter: 'Q2', avgPrice: 542110, avgOverAsk: 6.98, count: 9693 }
  ];

  return (
    <ChartWrapper>
      <div className="my-8">
        <div className="h-80 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <XAxis dataKey="quarter" fontSize={12} />
              <YAxis
                yAxisId="price"
                orientation="left"
                label={{ value: 'Average Price (€)', angle: -90, position: 'insideLeft' }}
                fontSize={12}
              />
              <YAxis
                yAxisId="overAsk"
                orientation="right"
                label={{ value: 'Over-Asking (%)', angle: 90, position: 'insideRight' }}
                fontSize={12}
              />
              <Tooltip
                formatter={(value, name) => {
                  if (name === 'avgPrice') return [`€${value.toLocaleString()}`, 'Average Price'];
                  if (name === 'avgOverAsk') return [`${value}%`, 'Over-Asking Rate'];
                  return [value, name];
                }}
              />
              <Bar yAxisId="price" dataKey="avgPrice" fill="#2563EB" name="avgPrice" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="overAsk" dataKey="avgOverAsk" fill="#DC2626" name="avgOverAsk" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-sm text-slate-600 text-center">
          Q2 shows 8.86% higher transaction volume despite 1.5% lower prices, with improved over-asking rates
        </p>
      </div>
    </ChartWrapper>
  );
}

export function MonthlyTrendChart() {
  const monthlyData = [
    { month: 'Jan', avgPrice: 560226, avgOverAsk: 6.29 },
    { month: 'Feb', avgPrice: 546174, avgOverAsk: 6.00 },
    { month: 'Mar', avgPrice: 546369, avgOverAsk: 6.01 },
    { month: 'Apr', avgPrice: 528614, avgOverAsk: 6.93 },
    { month: 'May', avgPrice: 540048, avgOverAsk: 6.80 },
    { month: 'Jun', avgPrice: 555758, avgOverAsk: 7.20 }
  ];

  return (
    <ChartWrapper>
      <div className="my-8">
        <div className="h-80 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={monthlyData}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <XAxis dataKey="month" fontSize={12} />
              <YAxis
                yAxisId="price"
                orientation="left"
                label={{ value: 'Average Price (€)', angle: -90, position: 'insideLeft' }}
                fontSize={12}
              />
              <YAxis
                yAxisId="overAsk"
                orientation="right"
                label={{ value: 'Over-Asking (%)', angle: 90, position: 'insideRight' }}
                fontSize={12}
              />
              <Tooltip
                formatter={(value, name) => {
                  if (name === 'avgPrice') return [`€${value.toLocaleString()}`, 'Average Price'];
                  if (name === 'avgOverAsk') return [`${value}%`, 'Over-Asking Rate'];
                  return [value, name];
                }}
              />
              <Line yAxisId="price" type="monotone" dataKey="avgPrice" stroke="#2563EB" strokeWidth={2} name="avgPrice" />
              <Line yAxisId="overAsk" type="monotone" dataKey="avgOverAsk" stroke="#DC2626" strokeWidth={2} name="avgOverAsk" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-sm text-slate-600 text-center">
          Monthly trends show April as the lowest priced month with highest over-asking rates
        </p>
      </div>
    </ChartWrapper>
  );
}

export function RentalYieldChart() {
  const yieldData = [
    { type: 'Apartment', avgYield: 8.75, avgRent: 2504 },
    { type: 'Semi-D', avgYield: 7.21, avgRent: 3235 },
    { type: 'Detached', avgYield: 5.70, avgRent: 3822 },
    { type: 'Duplex', avgYield: 9.11, avgRent: 2880 }
  ];

  return (
    <ChartWrapper>
      <div className="my-8">
        <div className="h-80 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={yieldData}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <XAxis
                dataKey="type"
                angle={-45}
                textAnchor="end"
                height={80}
                fontSize={11}
              />
              <YAxis
                yAxisId="yield"
                orientation="left"
                label={{ value: 'Gross Yield (%)', angle: -90, position: 'insideLeft' }}
                fontSize={12}
              />
              <YAxis
                yAxisId="rent"
                orientation="right"
                label={{ value: 'Monthly Rent (€)', angle: 90, position: 'insideRight' }}
                fontSize={12}
              />
              <Tooltip
                formatter={(value, name) => {
                  if (name === 'avgYield') return [`${value}%`, 'Gross Yield'];
                  if (name === 'avgRent') return [`€${value}`, 'Monthly Rent'];
                  return [value, name];
                }}
              />
              <Bar yAxisId="yield" dataKey="avgYield" fill="#2563EB" name="avgYield" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="rent" dataKey="avgRent" fill="#DC2626" name="avgRent" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-sm text-slate-600 text-center">
          Duplex properties offer the highest yields at 9.11%, while detached homes provide the highest rents
        </p>
      </div>
    </ChartWrapper>
  );
}

export function YieldDistributionChart() {
  const distributionData = [
    { bracket: 'Under 4%', count: 877, percentage: 3.22 },
    { bracket: '4-5%', count: 1509, percentage: 5.54 },
    { bracket: '5-6%', count: 2885, percentage: 10.59 },
    { bracket: '6-7%', count: 4508, percentage: 16.55 },
    { bracket: '7%+', count: 17457, percentage: 64.1 }
  ];

  return (
    <ChartWrapper>
      <div className="my-8">
        <div className="h-80 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={distributionData}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <XAxis dataKey="bracket" fontSize={11} />
              <YAxis
                label={{ value: 'Properties (%)', angle: -90, position: 'insideLeft' }}
                fontSize={12}
              />
              <Tooltip
                formatter={(value) => [`${value}%`, 'Percentage']}
              />
              <Bar dataKey="percentage" fill="#2563EB" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-sm text-slate-600 text-center">
          64.1% of Dublin rental properties yield over 7%, indicating strong rental market performance
        </p>
      </div>
    </ChartWrapper>
  );
}

export function SizeEfficiencyChart() {
  return (
    <ChartWrapper>
      <div className="my-8">
        <div className="w-full mb-4" style={{ height: '320px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={[
                { category: 'Small', avgPricePerSqm: 5830, avgEfficiencyRatio: 0.0306 },
                { category: 'Medium', avgPricePerSqm: 5166, avgEfficiencyRatio: 0.0301 },
                { category: 'Large', avgPricePerSqm: 5300, avgEfficiencyRatio: 0.0265 },
                { category: 'Extra Large', avgPricePerSqm: 5855, avgEfficiencyRatio: 0.0198 }
              ]}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <XAxis
                dataKey="category"
                angle={-45}
                textAnchor="end"
                height={80}
                fontSize={11}
              />
              <YAxis
                yAxisId="left"
                label={{ value: 'Bedrooms/㎡', angle: -90, position: 'insideLeft' }}
                fontSize={12}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                label={{ value: 'Price/㎡ (€)', angle: 90, position: 'insideRight' }}
                fontSize={12}
              />
              <Tooltip
                formatter={(value, name) => {
                  if (name === 'avgEfficiencyRatio') return [value, 'Bedrooms/㎡'];
                  if (name === 'avgPricePerSqm') return [`€${value}`, 'Price/㎡'];
                  return [value, name];
                }}
              />
              <Bar yAxisId="left" dataKey="avgEfficiencyRatio" fill="#2563EB" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="right" dataKey="avgPricePerSqm" fill="#DC2626" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-sm text-slate-600 text-center">
          Small properties achieve 0.031 bedrooms per square meter, showing higher efficiency than larger properties
        </p>
      </div>
    </ChartWrapper>
  );
}

export function PostcodeEfficiencyChart() {
  return (
    <ChartWrapper>
      <div className="my-8">
        <div className="w-full mb-4" style={{ height: '320px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={[
                { postcode: 'D18', avgEfficiency: 5.0532, avgPricePerSqm: 5792 },
                { postcode: 'D10', avgEfficiency: 3.9227, avgPricePerSqm: 4408 },
                { postcode: 'D12', avgEfficiency: 3.1711, avgPricePerSqm: 5572 },
                { postcode: 'D22', avgEfficiency: 3.1700, avgPricePerSqm: 4269 },
                { postcode: 'D17', avgEfficiency: 3.1681, avgPricePerSqm: 4252 },
                { postcode: 'D1', avgEfficiency: 2.4295, avgPricePerSqm: 6025 },
                { postcode: 'D20', avgEfficiency: 2.2281, avgPricePerSqm: 4938 },
                { postcode: 'D15', avgEfficiency: 2.0890, avgPricePerSqm: 4691 }
              ]}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <XAxis
                dataKey="postcode"
                angle={-45}
                textAnchor="end"
                height={80}
                fontSize={11}
              />
              <YAxis
                label={{ value: 'Bedrooms/㎡', angle: -90, position: 'insideLeft' }}
                fontSize={12}
              />
              <Tooltip
                formatter={(value, name) => {
                  if (name === 'avgEfficiency') return [value, 'Bedrooms/㎡'];
                  if (name === 'avgPricePerSqm') return [`€${value}`, 'Price/㎡'];
                  return [value, name];
                }}
              />
              <Line
                type="monotone"
                dataKey="avgEfficiency"
                stroke="#2563EB"
                strokeWidth={3}
                dot={{ fill: '#2563EB', strokeWidth: 2, r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-sm text-slate-600 text-center">
          Dublin 18 leads with 5.05 bedrooms per square meter, showing highest space efficiency
        </p>
      </div>
    </ChartWrapper>
  );
}

export function YearOverYearPricesChart() {
  return (
    <ChartWrapper>
      <div className="my-8">
        <div className="w-full mb-4" style={{ height: '320px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={[
                { year: 2021, avgPrice: 488242, medianPrice: 400000, avgPricePerSqm: 4258 },
                { year: 2022, avgPrice: 510545, medianPrice: 410000, avgPricePerSqm: 4578 },
                { year: 2023, avgPrice: 520365, medianPrice: 420000, avgPricePerSqm: 4782 },
                { year: 2024, avgPrice: 559856, medianPrice: 460000, avgPricePerSqm: 5045 },
                { year: 2025, avgPrice: 595203, medianPrice: 497000, avgPricePerSqm: 5380 }
              ]}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <XAxis dataKey="year" fontSize={12} />
              <YAxis
                yAxisId="price"
                label={{ value: 'Price (€)', angle: -90, position: 'insideLeft' }}
                fontSize={12}
                tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
              />
              <YAxis
                yAxisId="sqm"
                orientation="right"
                label={{ value: 'Price/㎡ (€)', angle: 90, position: 'insideRight' }}
                fontSize={12}
              />
              <Tooltip
                formatter={(value, name) => {
                  if (name === 'avgPrice' || name === 'medianPrice') return [`€${value.toLocaleString()}`, name];
                  if (name === 'avgPricePerSqm') return [`€${value.toLocaleString()}`, 'Price/㎡'];
                  return [value, name];
                }}
              />
              <Bar
                yAxisId="price"
                dataKey="avgPrice"
                fill="#DC2626"
                name="Average Property Price"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                yAxisId="price"
                dataKey="medianPrice"
                fill="#2563EB"
                name="Median Property Price"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                yAxisId="sqm"
                dataKey="avgPricePerSqm"
                fill="#16A34A"
                name="Average Price per m²"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-sm text-slate-600 text-center">
          Dublin property prices showed clear year-over-year increases, with the biggest jump in 2024 (€40k rise)
        </p>
      </div>
    </ChartWrapper>
  );
}

export function PropertyTypeComparisonChart() {
  return (
    <ChartWrapper>
      <div className="my-8">
        <div className="w-full mb-4" style={{ height: '320px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={[
                { year: 2021, Detached: 0, 'Semi-D': 0, Apartment: 0 },
                { year: 2022, Detached: 4.6, 'Semi-D': 2.2, Apartment: 1.4 },
                { year: 2023, Detached: 1.9, 'Semi-D': 3.3, Apartment: 1.4 },
                { year: 2024, Detached: 5.6, 'Semi-D': 4.2, Apartment: 1.4 },
                { year: 2025, Detached: 4.0, 'Semi-D': 3.0, Apartment: 0.8 }
              ]}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <XAxis dataKey="year" fontSize={12} />
              <YAxis
                label={{ value: 'Year-over-Year % Change', angle: -90, position: 'insideLeft' }}
                fontSize={12}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip
                formatter={(value, name) => [`${value}%`, `${name} YoY Change`]}
              />
              <Line
                type="monotone"
                dataKey="Detached"
                stroke="#DC2626"
                strokeWidth={4}
                dot={{ fill: '#DC2626', strokeWidth: 2, r: 6 }}
                name="Detached"
              />
              <Line
                type="monotone"
                dataKey="Semi-D"
                stroke="#2563EB"
                strokeWidth={4}
                dot={{ fill: '#2563EB', strokeWidth: 2, r: 6 }}
                name="Semi-Detached"
              />
              <Line
                type="monotone"
                dataKey="Apartment"
                stroke="#16A34A"
                strokeWidth={4}
                dot={{ fill: '#16A34A', strokeWidth: 2, r: 6 }}
                name="Apartment"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-sm text-slate-600 text-center">
          Year-over-year percentage changes show detached houses had the most volatile growth pattern
        </p>
      </div>
    </ChartWrapper>
  );
}

// Charts for Blog 4: 3-Bed Sweet Spot
export function ThreeBedPropertyTypeChart() {
  return (
    <ChartWrapper>
      <div className="my-8">
        <div className="h-80 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={[
                { type: 'Semi-Detached', percentage: 39.5, avgPrice: 544655 },
                { type: 'Terrace', percentage: 32.1, avgPrice: 511303 },
                { type: 'End of Terrace', percentage: 13.0, avgPrice: 482594 },
                { type: 'Apartment', percentage: 5.3, avgPrice: 517047 },
                { type: 'Detached', percentage: 3.1, avgPrice: 731431 },
                { type: 'Duplex', percentage: 3.4, avgPrice: 404559 }
              ]}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <XAxis
                dataKey="type"
                angle={-45}
                textAnchor="end"
                height={80}
                fontSize={11}
              />
              <YAxis
                label={{ value: 'Market Share (%)', angle: -90, position: 'insideLeft' }}
                fontSize={12}
              />
              <Tooltip
                formatter={(value, name) => [`${value}${name === 'percentage' ? '%' : ''}`, name === 'percentage' ? 'Market Share' : 'Avg Price']}
              />
              <Bar dataKey="percentage" fill="#2563EB" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-sm text-slate-600 text-center">
          Semi-detached houses dominate the 3-bed market at 39.5%, followed by terraced properties at 32.1%
        </p>
      </div>
    </ChartWrapper>
  );
}

export function ThreeBedAreaPerformanceChart() {
  return (
    <ChartWrapper>
      <div className="my-8">
        <div className="h-80 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={[
                { area: 'D24', overRate: 91.4, avgPremium: 12.03 },
                { area: 'D22', overRate: 91.3, avgPremium: 12.16 },
                { area: 'D12', overRate: 87.9, avgPremium: 13.39 },
                { area: 'D11', overRate: 86.1, avgPremium: 12.50 },
                { area: 'D15', overRate: 83.6, avgPremium: 8.82 },
                { area: 'D5', overRate: 84.6, avgPremium: 10.63 },
                { area: 'D16', overRate: 82.4, avgPremium: 8.84 },
                { area: 'D9', overRate: 81.1, avgPremium: 9.83 }
              ]}
              margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
            >
              <XAxis
                dataKey="area"
                angle={-45}
                textAnchor="end"
                height={60}
                fontSize={11}
              />
              <YAxis
                label={{ value: 'Over-Asking Rate (%)', angle: -90, position: 'insideLeft' }}
                fontSize={12}
              />
              <Tooltip
                formatter={(value, name) => [`${value}${name === 'overRate' ? '%' : ''}`, name === 'overRate' ? 'Over-Asking Rate' : 'Avg Premium']}
              />
              <Bar dataKey="overRate" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-sm text-slate-600 text-center">
          D24 and D22 lead with over-asking rates above 91% for 3-bedroom properties
        </p>
      </div>
    </ChartWrapper>
  );
}

// Charts for Blog 5: Commuter Distance
export function DistancePriceChart() {
  return (
    <ChartWrapper>
      <div className="my-8">
        <div className="h-80 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={[
                { ring: '0-5km', medianPrice: 460000, avgPrice: 586336 },
                { ring: '5-10km', medianPrice: 475000, avgPrice: 561817 },
                { ring: '10-15km', medianPrice: 440000, avgPrice: 567443 },
                { ring: '15-25km', medianPrice: 415500, avgPrice: 465268 }
              ]}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <XAxis dataKey="ring" fontSize={12} />
              <YAxis
                label={{ value: 'Price (€)', angle: -90, position: 'insideLeft' }}
                fontSize={12}
                tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(value) => [`€${value.toLocaleString()}`, 'Price']}
              />
              <Bar dataKey="medianPrice" fill="#2563EB" name="Median Price" radius={[4, 4, 0, 0]} />
              <Bar dataKey="avgPrice" fill="#DC2626" name="Average Price" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-sm text-slate-600 text-center">
          5-10km ring offers highest median prices (€475k), while city center (0-5km) shows greatest price variation
        </p>
      </div>
    </ChartWrapper>
  );
}

export function DistanceOverAskingChart() {
  return (
    <ChartWrapper>
      <div className="my-8">
        <div className="h-80 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={[
                { ring: '0-5km', overRate: 75.0, avgPremium: 11.77 },
                { ring: '5-10km', overRate: 80.7, avgPremium: 10.33 },
                { ring: '10-15km', overRate: 77.6, avgPremium: 9.78 },
                { ring: '15-25km', overRate: 71.4, avgPremium: 8.55 }
              ]}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <XAxis dataKey="ring" fontSize={12} />
              <YAxis
                label={{ value: 'Over-Asking Rate (%)', angle: -90, position: 'insideLeft' }}
                fontSize={12}
              />
              <Tooltip
                formatter={(value, name) => [`${value}${name === 'overRate' ? '%' : ''}`, name === 'overRate' ? 'Over-Asking Rate' : 'Avg Premium']}
              />
              <Line
                type="monotone"
                dataKey="overRate"
                stroke="#10B981"
                strokeWidth={3}
                dot={{ r: 6 }}
                name="overRate"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-sm text-slate-600 text-center">
          5-10km ring shows highest over-asking success (80.7%), while suburbs beyond 15km show lower rates
        </p>
      </div>
    </ChartWrapper>
  );
}

// Charts for Blog 6: Seller's Market Strategy
export function SellerAreaPerformanceChart() {
  return (
    <ChartWrapper>
      <div className="my-8">
        <div className="h-80 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={[
                { area: 'D10', overRate: 91.3, avgPremium: 13.97 },
                { area: 'D24', overRate: 90.0, avgPremium: 11.55 },
                { area: 'D22', overRate: 89.6, avgPremium: 12.69 },
                { area: 'D12', overRate: 87.5, avgPremium: 13.97 },
                { area: 'D11', overRate: 85.7, avgPremium: 11.78 },
                { area: 'D20', overRate: 84.6, avgPremium: 11.45 },
                { area: 'D5', overRate: 83.1, avgPremium: 10.76 },
                { area: 'D15', overRate: 82.5, avgPremium: 9.34 }
              ]}
              margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
            >
              <XAxis
                dataKey="area"
                angle={-45}
                textAnchor="end"
                height={60}
                fontSize={11}
              />
              <YAxis
                label={{ value: 'Over-Asking Rate (%)', angle: -90, position: 'insideLeft' }}
                fontSize={12}
              />
              <Tooltip
                formatter={(value, name) => [`${value}${name === 'overRate' ? '%' : ''}`, name === 'overRate' ? 'Over-Asking Rate' : 'Avg Premium']}
              />
              <Bar dataKey="overRate" fill="#DC2626" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-sm text-slate-600 text-center">
          D10 leads seller performance with 91.3% over-asking success rate, demonstrating strong buyer competition
        </p>
      </div>
    </ChartWrapper>
  );
}

// Charts for Blog 15: Bidding Wars
export function BiddingWarsAreaChart() {
  return (
    <ChartWrapper>
      <div className="my-8">
        <div className="h-80 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={[
                { area: 'D10', overRate: 91.3, avgPremium: 13.97 },
                { area: 'D24', overRate: 90.0, avgPremium: 11.55 },
                { area: 'D22', overRate: 89.6, avgPremium: 12.69 },
                { area: 'D12', overRate: 87.5, avgPremium: 13.97 },
                { area: 'D11', overRate: 85.7, avgPremium: 11.78 },
                { area: 'D20', overRate: 84.6, avgPremium: 11.45 },
                { area: 'D5', overRate: 83.1, avgPremium: 10.76 },
                { area: 'D15', overRate: 82.5, avgPremium: 9.34 }
              ]}
              margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
            >
              <XAxis
                dataKey="area"
                angle={-45}
                textAnchor="end"
                height={60}
                fontSize={11}
              />
              <YAxis
                label={{ value: 'Over-Asking Rate (%)', angle: -90, position: 'insideLeft' }}
                fontSize={12}
              />
              <Tooltip
                formatter={(value, name) => [`${value}${name === 'overRate' ? '%' : ''}`, name === 'overRate' ? 'Over-Asking Rate' : 'Avg Premium']}
              />
              <Bar dataKey="overRate" fill="#DC2626" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-sm text-slate-600 text-center">
          D10 leads with 91.3% over-asking success, followed by D24 (90.0%) and D22 (89.6%) in intense bidding war areas
        </p>
      </div>
    </ChartWrapper>
  );
}

export function UnderAskingAreaChart() {
  return (
    <ChartWrapper>
      <div className="my-8">
        <div className="h-80 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={[
                { area: 'D4', underRate: 23.2, avgDiscount: 7.41 },
                { area: 'D6', underRate: 21.2, avgDiscount: 7.90 },
                { area: 'D2', underRate: 20.5, avgDiscount: 5.86 },
                { area: 'D1', underRate: 19.1, avgDiscount: 8.46 },
                { area: 'D7', underRate: 17.6, avgDiscount: 7.42 },
                { area: 'D3', underRate: 16.6, avgDiscount: 7.78 },
                { area: 'D13', underRate: 16.5, avgDiscount: 5.39 },
                { area: 'D8', underRate: 15.8, avgDiscount: 8.91 }
              ]}
              margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
            >
              <XAxis
                dataKey="area"
                angle={-45}
                textAnchor="end"
                height={60}
                fontSize={11}
              />
              <YAxis
                label={{ value: 'Under-Asking Rate (%)', angle: -90, position: 'insideLeft' }}
                fontSize={12}
              />
              <Tooltip
                formatter={(value, name) => [`${value}${name === 'underRate' ? '%' : ''}`, name === 'underRate' ? 'Under-Asking Rate' : 'Avg Discount']}
              />
              <Bar dataKey="underRate" fill="#059669" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-sm text-slate-600 text-center">
          D4 shows the weakest competition with 23.2% of properties selling under asking price
        </p>
      </div>
    </ChartWrapper>
  );
}

export function PriceBracketCompetitionChart() {
  return (
    <ChartWrapper>
      <div className="my-8">
        <div className="h-80 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={[
                { bracket: '€400k-€500k', overRate: 82.7, competitionLevel: 72.4 },
                { bracket: '€500k-€600k', overRate: 82.7, competitionLevel: 72.1 },
                { bracket: '€600k-€700k', overRate: 81.8, competitionLevel: 70.1 },
                { bracket: '€300k-€400k', overRate: 80.4, competitionLevel: 68.7 },
                { bracket: '€700k-€900k', overRate: 78.5, competitionLevel: 63.8 },
                { bracket: 'Under €300k', overRate: 72.0, competitionLevel: 54.6 },
                { bracket: 'Over €900k', overRate: 68.0, competitionLevel: 44.0 }
              ]}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <XAxis
                dataKey="bracket"
                angle={-45}
                textAnchor="end"
                height={80}
                fontSize={11}
              />
              <YAxis
                label={{ value: 'Competition Level', angle: -90, position: 'insideLeft' }}
                fontSize={12}
              />
              <Tooltip
                formatter={(value, name) => [`${value}${name === 'overRate' ? '%' : ''}`, name === 'overRate' ? 'Over-Asking Rate' : 'Competition Level']}
              />
              <Bar dataKey="competitionLevel" fill="#7C3AED" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-sm text-slate-600 text-center">
          €400k-€500k bracket experiences the most intense competition with a 72.4 competition level
        </p>
      </div>
    </ChartWrapper>
  );
}

export function BiddingWarPremiumChart() {
  return (
    <ChartWrapper>
      <div className="my-8">
        <div className="h-80 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={[
                { range: '0-5%', percentage: 27.7, label: 'Mild' },
                { range: '5-10%', percentage: 28.6, label: 'Moderate' },
                { range: '10-15%', percentage: 21.3, label: 'Strong' },
                { range: '15-20%', percentage: 11.6, label: 'Intense' },
                { range: '20%+', percentage: 10.9, label: 'Extreme' }
              ]}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <XAxis dataKey="label" fontSize={12} />
              <YAxis
                label={{ value: 'Bidding Wars (%)', angle: -90, position: 'insideLeft' }}
                fontSize={12}
              />
              <Tooltip
                formatter={(value) => [`${value}%`, 'Percentage of Bidding Wars']}
              />
              <Bar dataKey="percentage" fill="#F59E0B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-sm text-slate-600 text-center">
          Most bidding wars (49.9%) fall into moderate to strong categories with 5-15% premiums
        </p>
      </div>
    </ChartWrapper>
  );
}

// Charts for Blog 16: Bidding War Costs
export function PremiumPaybackChart() {
  return (
    <ChartWrapper>
      <div className="my-8">
        <div className="h-80 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={[
                {
                  "premiumPercent": 5,
                  "premiumAmount": 22500,
                  "extraMonthlyPayment": 85.87979654343758,
                  "paybackYears": 21.83284166319181,
                  "extraTotalInterest": 11791.726755637705
                },
                {
                  "premiumPercent": 10,
                  "premiumAmount": 45000,
                  "extraMonthlyPayment": 171.75959308687516,
                  "paybackYears": 21.83284166319181,
                  "extraTotalInterest": 23583.45351127535
                },
                {
                  "premiumPercent": 15,
                  "premiumAmount": 67500,
                  "extraMonthlyPayment": 257.6393896303125,
                  "paybackYears": 21.83284166319183,
                  "extraTotalInterest": 35375.18026691323
                },
                {
                  "premiumPercent": 20,
                  "premiumAmount": 90000,
                  "extraMonthlyPayment": 343.51918617374986,
                  "paybackYears": 21.83284166319184,
                  "extraTotalInterest": 47166.90702255038
                },
                {
                  "premiumPercent": 30,
                  "premiumAmount": 135000,
                  "extraMonthlyPayment": 515.278779260625,
                  "paybackYears": 21.83284166319183,
                  "extraTotalInterest": 70750.36053382527
                }
              ]}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <XAxis
                dataKey="premiumPercent"
                label={{ value: 'Premium Percentage', position: 'insideBottom', offset: -5 }}
                fontSize={12}
              />
              <YAxis
                yAxisId="payback"
                label={{ value: 'Payback Years', angle: -90, position: 'insideLeft' }}
                fontSize={12}
              />
              <YAxis
                yAxisId="monthly"
                orientation="right"
                label={{ value: 'Extra Monthly (€)', angle: 90, position: 'insideRight' }}
                fontSize={12}
              />
              <Tooltip
                formatter={(value, name) => [
                  name === 'paybackYears' ? `${value.toFixed(1)} years` : `€${value.toFixed(0)}`,
                  name === 'paybackYears' ? 'Payback Period' : 'Extra Monthly Payment'
                ]}
              />
              <Line
                yAxisId="payback"
                type="monotone"
                dataKey="paybackYears"
                stroke="#DC2626"
                strokeWidth={3}
                name="paybackYears"
                dot={{ r: 6 }}
              />
              <Line
                yAxisId="monthly"
                type="monotone"
                dataKey="extraMonthlyPayment"
                stroke="#2563EB"
                strokeWidth={3}
                name="extraMonthlyPayment"
                dot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-sm text-slate-600 text-center">
          Even modest bidding war premiums take over 21 years to break even through mortgage repayments
        </p>
      </div>
    </ChartWrapper>
  );
}

export function BreakEvenChart() {
  return (
    <ChartWrapper>
      <div className="my-8">
        <div className="h-80 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={[
                {
                  "years": 1,
                  "netCostOfPremium": 448650
                },
                {
                  "years": 3,
                  "netCostOfPremium": 445827.28500000003
                },
                {
                  "years": 5,
                  "netCostOfPremium": 442832.66665649996
                },
                {
                  "years": 10,
                  "netCostOfPremium": 434523.7629295144
                },
                {
                  "years": 15,
                  "netCostOfPremium": 424891.4662529655
                },
                {
                  "years": 20,
                  "netCostOfPremium": 413724.9944398763
                }
              ]}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <XAxis
                dataKey="years"
                label={{ value: 'Years Held', position: 'insideBottom', offset: -5 }}
                fontSize={12}
              />
              <YAxis
                label={{ value: 'Unrecovered Premium (€)', angle: -90, position: 'insideLeft' }}
                fontSize={12}
                tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(value) => [`€${value.toLocaleString()}`, 'Unrecovered Premium Amount']}
              />
              <Line
                type="monotone"
                dataKey="netCostOfPremium"
                stroke="#DC2626"
                strokeWidth={3}
                dot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-sm text-slate-600 text-center">
          Property appreciation recovers only €31,275 of a €45,000 premium after 20 years at 3% growth
        </p>
      </div>
    </ChartWrapper>
  );
}

export function OpportunityCostChart() {
  return (
    <ChartWrapper>
      <div className="my-8">
        <div className="h-80 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={[
                {
                  "premiumRange": "5% Premium",
                  "extraMonthly": 72,
                  "totalExtraInterest": 9880,
                  "premiumAmount": 22500
                },
                {
                  "premiumRange": "10% Premium",
                  "extraMonthly": 144,
                  "totalExtraInterest": 19761,
                  "premiumAmount": 45000
                },
                {
                  "premiumRange": "15% Premium",
                  "extraMonthly": 216,
                  "totalExtraInterest": 29641,
                  "premiumAmount": 67500
                },
                {
                  "premiumRange": "20% Premium",
                  "extraMonthly": 288,
                  "totalExtraInterest": 39521,
                  "premiumAmount": 90000
                },
                {
                  "premiumRange": "30% Premium",
                  "extraMonthly": 432,
                  "totalExtraInterest": 59282,
                  "premiumAmount": 135000
                }
              ]}
              margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
            >
              <XAxis
                dataKey="premiumRange"
                fontSize={12}
              />
              <YAxis
                yAxisId="monthly"
                orientation="left"
                label={{ value: 'Extra Monthly Payment (€)', angle: -90, position: 'insideLeft' }}
                fontSize={12}
              />
              <YAxis
                yAxisId="interest"
                orientation="right"
                label={{ value: 'Total Extra Interest (€)', angle: 90, position: 'insideRight' }}
                fontSize={12}
                tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(value, name) => [
                  name === 'extraMonthly' ? `€${value}/month` : `€${value.toLocaleString()}`,
                  name === 'extraMonthly' ? 'Extra Monthly Payment' : 'Total Extra Interest'
                ]}
              />
              <Bar yAxisId="monthly" dataKey="extraMonthly" fill="#DC2626" name="extraMonthly" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="interest" dataKey="totalExtraInterest" fill="#2563EB" name="totalExtraInterest" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-sm text-slate-600 text-center">
          Monthly cost burden: €72-€432 extra mortgage payments for 30 years, plus €9,880-€59,282 in extra interest
        </p>
      </div>
    </ChartWrapper>
  );
}

export function AreaPremiumChart() {
  return (
    <ChartWrapper>
      <div className="my-8">
        <div className="h-80 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={[
                {
                  "area": "D3",
                  "avgPremium": 15.288160261651672,
                  "count": 1223
                },
                {
                  "area": "D12",
                  "avgPremium": 13.981713586291322,
                  "count": 1634
                },
                {
                  "area": "D10",
                  "avgPremium": 13.971653746770027,
                  "count": 387
                },
                {
                  "area": "D22",
                  "avgPremium": 12.6923794871795,
                  "count": 975
                },
                {
                  "area": "D1",
                  "avgPremium": 12.088532289628192,
                  "count": 511
                },
                {
                  "area": "D11",
                  "avgPremium": 11.784846029173456,
                  "count": 1234
                },
                {
                  "area": "D24",
                  "avgPremium": 11.554595786379235,
                  "count": 2041
                },
                {
                  "area": "D20",
                  "avgPremium": 11.454653465346551,
                  "count": 303
                },
                {
                  "area": "D6",
                  "avgPremium": 11.31860887096776,
                  "count": 992
                },
                {
                  "area": "D6W",
                  "avgPremium": 10.944984374999999,
                  "count": 640
                }
              ]}
              margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
            >
              <XAxis
                dataKey="area"
                angle={-45}
                textAnchor="end"
                height={60}
                fontSize={11}
              />
              <YAxis
                label={{ value: 'Average Premium (%)', angle: -90, position: 'insideLeft' }}
                fontSize={12}
              />
              <Tooltip
                formatter={(value, name) => [`${value.toFixed(1)}${name === 'avgPremium' ? '%' : ''}`, name === 'avgPremium' ? 'Average Premium' : 'Bidding Wars']}
              />
              <Bar dataKey="avgPremium" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-sm text-slate-600 text-center">
          D3 leads with 15.3% average bidding war premiums, adding significant monthly costs to mortgage payments
        </p>
      </div>
    </ChartWrapper>
  );
}

// Charts for Blog 16: Bidding War Costs
export function PremiumDistributionChart() {
  return (
    <ChartWrapper>
      <div className="my-8">
        <div className="h-80 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={[
                { range: '0-5%', percentage: 27.7, count: 7182, avgPremium: 2.63 },
                { range: '5-10%', percentage: 28.6, count: 7394, avgPremium: 7.28 },
                { range: '10-15%', percentage: 21.3, count: 5510, avgPremium: 12.21 },
                { range: '15-20%', percentage: 11.6, count: 2994, avgPremium: 17.11 },
                { range: '20%+', percentage: 10.9, count: 2810, avgPremium: 30.94 }
              ]}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <XAxis dataKey="range" fontSize={12} />
              <YAxis
                yAxisId="percentage"
                label={{ value: 'Properties (%)', angle: -90, position: 'insideLeft' }}
                fontSize={12}
              />
              <YAxis
                yAxisId="avgPremium"
                orientation="right"
                label={{ value: 'Average Premium (%)', angle: 90, position: 'insideRight' }}
                fontSize={12}
              />
              <Tooltip
                formatter={(value, name) => {
                  let formattedValue = value;
                  let label = name;

                  if (name === 'percentage') {
                    formattedValue = `${value}%`;
                    label = 'Percentage of Bidding Wars';
                  } else if (name === 'avgPremium') {
                    formattedValue = `${value}%`;
                    label = 'Average Premium';
                  } else {
                    label = 'Count';
                  }

                  return [formattedValue, label];
                }}
              />
              <Bar yAxisId="percentage" dataKey="percentage" fill="#2563EB" name="percentage" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-sm text-slate-600 text-center">
          Over 43% of bidding wars result in premiums exceeding 10%, with extreme competitions driving significant overpayments
        </p>
      </div>
    </ChartWrapper>
  );
}

// Charts for Blog 1: Asking Price Strategy
export function AskingPriceAreaChart() {
  return (
    <ChartWrapper>
      <div className="my-8">
        <div className="h-80 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={[
                { area: 'D10', overRate: 91.3, avgPremium: 13.97 },
                { area: 'D24', overRate: 90.0, avgPremium: 11.55 },
                { area: 'D22', overRate: 89.6, avgPremium: 12.69 },
                { area: 'D12', overRate: 87.5, avgPremium: 13.97 },
                { area: 'D11', overRate: 85.7, avgPremium: 11.78 },
                { area: 'D20', overRate: 84.6, avgPremium: 11.45 },
                { area: 'D5', overRate: 83.1, avgPremium: 10.76 },
                { area: 'D15', overRate: 82.5, avgPremium: 9.34 }
              ]}
              margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
            >
              <XAxis
                dataKey="area"
                angle={-45}
                textAnchor="end"
                height={60}
                fontSize={11}
              />
              <YAxis
                label={{ value: 'Over-Asking Rate (%)', angle: -90, position: 'insideLeft' }}
                fontSize={12}
              />
              <Tooltip
                formatter={(value, name) => [`${value}${name === 'overRate' ? '%' : ''}`, name === 'overRate' ? 'Over-Asking Rate' : 'Avg Premium']}
              />
              <Bar dataKey="overRate" fill="#2563EB" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-sm text-slate-600 text-center">
          D10 leads with 91.3% over-asking success rate, followed by D24 (90.0%) and D22 (89.6%)
        </p>
      </div>
    </ChartWrapper>
  );
}

export function AskingPriceBracketChart() {
  return (
    <ChartWrapper>
      <div className="my-8">
        <div className="h-80 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={[
                { bracket: '€400k-€500k', overRate: 82.7, avgPremium: 10.71 },
                { bracket: '€500k-€600k', overRate: 82.7, avgPremium: 10.39 },
                { bracket: '€600k-€700k', overRate: 81.8, avgPremium: 10.37 },
                { bracket: '€300k-€400k', overRate: 80.4, avgPremium: 10.57 },
                { bracket: 'Over €700k', overRate: 73.2, avgPremium: 13.46 },
                { bracket: 'Under €300k', overRate: 72.0, avgPremium: 8.19 }
              ]}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <XAxis
                dataKey="bracket"
                angle={-45}
                textAnchor="end"
                height={80}
                fontSize={11}
              />
              <YAxis
                label={{ value: 'Over-Asking Rate (%)', angle: -90, position: 'insideLeft' }}
                fontSize={12}
              />
              <Tooltip
                formatter={(value, name) => [`${value}${name === 'overRate' ? '%' : ''}`, name === 'overRate' ? 'Over-Asking Rate' : 'Avg Premium']}
              />
              <Bar dataKey="overRate" fill="#2563EB" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-sm text-slate-600 text-center">
          €400k-€600k bracket shows highest over-asking success at 82.7%, with luxury properties achieving highest premiums
        </p>
      </div>
    </ChartWrapper>
  );
}
