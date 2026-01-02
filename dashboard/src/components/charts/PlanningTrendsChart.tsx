'use client';

import React from 'react';
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface PlanningTrendsChartProps {
  data: Array<{
    year: number;
    applications: number;
    approved: number;
    approvalRate: number;
  }>;
  className?: string;
  height?: number;
}

export function PlanningTrendsChart({ data, className = "", height = 300 }: PlanningTrendsChartProps) {
  return (
    <div className={`w-full ${className}`} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="year"
            tick={{ fill: 'var(--foreground-secondary)', fontSize: 12 }}
            axisLine={{ stroke: 'var(--border)' }}
          />
          <YAxis
            yAxisId="left"
            tick={{ fill: 'var(--foreground-secondary)', fontSize: 12 }}
            axisLine={{ stroke: 'var(--border)' }}
            label={{ value: 'Applications', angle: -90, position: 'insideLeft' }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fill: 'var(--foreground-secondary)', fontSize: 12 }}
            axisLine={{ stroke: 'var(--border)' }}
            domain={[0, 100]}
            label={{ value: 'Approval Rate %', angle: 90, position: 'insideRight' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              color: 'var(--foreground)'
            }}
            formatter={(value: number, name: string) => {
              if (name === 'Approval Rate') return [`${value}%`, name];
              return [value, name];
            }}
          />
          <Legend />

          {/* Bar chart for applications */}
          <Bar
            yAxisId="left"
            dataKey="applications"
            fill="rgba(59, 130, 246, 0.6)"
            name="Applications"
            radius={[2, 2, 0, 0]}
          />

          {/* Line chart for approval rate */}
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="approvalRate"
            stroke="#10b981"
            strokeWidth={3}
            dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
            name="Approval Rate"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
