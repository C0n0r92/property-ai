'use client';

import React from 'react';
import { RadarChart as RechartsRadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';

interface RadarChartProps {
  data: Array<{
    subject: string;
    score: number;
    fullMark?: number;
  }>;
  className?: string;
  height?: number;
}

export function RadarChart({ data, className = "", height = 300 }: RadarChartProps) {
  // Transform walkability breakdown data to radar chart format
  const transformData = (walkabilityData: any) => {
    return [
      { subject: 'Transport', score: walkabilityData.transport || 0, fullMark: 10 },
      { subject: 'Shopping', score: walkabilityData.shopping || 0, fullMark: 10 },
      { subject: 'Education', score: walkabilityData.education || 0, fullMark: 10 },
      { subject: 'Healthcare', score: walkabilityData.healthcare || 0, fullMark: 10 },
      { subject: 'Leisure', score: walkabilityData.leisure || 0, fullMark: 10 },
      { subject: 'Services', score: walkabilityData.services || 0, fullMark: 10 },
    ];
  };

  // Support both direct data array and walkability breakdown object
  const chartData = Array.isArray(data) ? data : transformData(data);

  return (
    <div className={`w-full ${className}`} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsRadarChart data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
          <PolarGrid gridType="polygon" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: 'var(--foreground-secondary)', fontSize: 12 }}
            className="text-[var(--foreground-secondary)]"
          />
          <PolarRadiusAxis
            angle={0}
            domain={[0, 10]}
            tick={{ fill: 'var(--foreground-muted)', fontSize: 10 }}
            tickCount={6}
            axisLine={false}
          />
          <Radar
            name="Walkability Score"
            dataKey="score"
            stroke="rgb(34, 197, 94)"
            fill="rgba(34, 197, 94, 0.1)"
            fillOpacity={0.3}
            strokeWidth={2}
            dot={{ fill: 'rgb(34, 197, 94)', strokeWidth: 2, r: 4 }}
          />
        </RechartsRadarChart>
      </ResponsiveContainer>
    </div>
  );
}
