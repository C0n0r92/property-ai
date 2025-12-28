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
                { category: 'Small', avgPricePerSqm: 6234, avgEfficiencyRatio: 2.6585 },
                { category: 'Medium', avgPricePerSqm: 5504, avgEfficiencyRatio: 1.4377 },
                { category: 'Large', avgPricePerSqm: 5580, avgEfficiencyRatio: 0.5917 },
                { category: 'Extra Large', avgPricePerSqm: 6090, avgEfficiencyRatio: 0.1344 }
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
          Small properties achieve 2.66 bedrooms per square meter while commanding premium pricing
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
