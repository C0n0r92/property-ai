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
