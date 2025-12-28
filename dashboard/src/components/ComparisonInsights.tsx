'use client';

import React, { useState } from 'react';

interface ComparisonInsightsProps {
  insights: {
    bestValue?: { index: number; reason: string };
    bestWalkability?: { index: number; reason: string };
    lowestMortgage?: { index: number; reason: string };
    bestTransit?: { index: number; reason: string };
    bestOverall?: { index: number; reason: string };
    bestInvestment?: { index: number; reason: string };
    bestFamily?: { index: number; reason: string };
    bestCommuter?: { index: number; reason: string };
    bestRentalYield?: { index: number; reason: string };
    fastestSale?: { index: number; reason: string };
    warnings: Array<{ index: number; message: string }>;
    highlights: Array<{ index: number; message: string }>;
    marketInsights: string[];
  };
  properties: any[];
}

export function ComparisonInsights({ insights, properties }: ComparisonInsightsProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [planningExpanded, setPlanningExpanded] = useState(false);

  const hasContent = insights.bestValue || insights.bestWalkability ||
                    insights.lowestMortgage || insights.bestTransit ||
                    insights.bestOverall || insights.bestInvestment ||
                    insights.bestFamily || insights.bestCommuter ||
                    insights.bestRentalYield || insights.fastestSale ||
                    insights.warnings.length > 0 || insights.highlights.length > 0 ||
                    (insights.marketInsights && insights.marketInsights.length > 0);

  if (!hasContent) return null;

  const getPropertyName = (index: number) => {
    const property = properties[index];
    return property?.address?.split(',')[0] || `Property ${index + 1}`;
  };

  return (
    <div className="bg-[var(--surface)] rounded-lg shadow-sm border border-[var(--border)] mb-8 overflow-hidden">
      {/* Header */}
      <div
        className="bg-gradient-to-r from-blue-900/20 to-indigo-900/20 px-6 py-4 border-b border-[var(--border)] cursor-pointer hover:bg-gradient-to-r hover:from-blue-900/30 hover:to-indigo-900/30 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-900/30 rounded-lg flex items-center justify-center">
              <span className="text-lg text-blue-300">i</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--foreground)]">AI-Generated Insights</h2>
              <p className="text-sm text-[var(--foreground-secondary)]">
                Key findings from comparing these {properties.length} properties
              </p>
            </div>
          </div>
          <button className="text-[var(--foreground-secondary)] hover:text-[var(--foreground)]">
            {isExpanded ? '▼' : '▶'}
          </button>
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-6 space-y-6 bg-[var(--surface)]">
          {/* Best Recommendations */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {insights.bestValue && (
              <div className="bg-emerald-900/20 border border-emerald-700/30 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-semibold text-emerald-300">Best Value</span>
        </div>
                <p className="text-sm text-emerald-200 font-medium">
                  {getPropertyName(insights.bestValue.index)}
                </p>
                <p className="text-xs text-emerald-400 mt-1">
                  {insights.bestValue.reason}
                </p>
              </div>
            )}

            {insights.bestWalkability && (
              <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-semibold text-blue-300">Best Walkability</span>
        </div>
                <p className="text-sm text-blue-200 font-medium">
                  {getPropertyName(insights.bestWalkability.index)}
                </p>
                <p className="text-xs text-blue-400 mt-1">
                  {insights.bestWalkability.reason}
                </p>
              </div>
            )}

            {insights.lowestMortgage && (
              <div className="bg-purple-900/20 border border-purple-700/30 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-semibold text-purple-300">Lowest Mortgage</span>
        </div>
                <p className="text-sm text-purple-200 font-medium">
                  {getPropertyName(insights.lowestMortgage.index)}
                </p>
                <p className="text-xs text-purple-400 mt-1">
                  {insights.lowestMortgage.reason}
                </p>
              </div>
            )}

            {insights.bestTransit && (
              <div className="bg-orange-900/20 border border-orange-700/30 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-semibold text-orange-300">Best Transit</span>
        </div>
                <p className="text-sm text-orange-200 font-medium">
                  {getPropertyName(insights.bestTransit.index)}
                </p>
                <p className="text-xs text-orange-400 mt-1">
                  {insights.bestTransit.reason}
                </p>
              </div>
            )}

            {insights.bestOverall && (
              <div className="bg-purple-900/20 border border-purple-700/30 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-semibold text-purple-300">Best Overall Value</span>
        </div>
                <p className="text-sm text-purple-200 font-medium">
                  {getPropertyName(insights.bestOverall.index)}
                </p>
                <p className="text-xs text-purple-400 mt-1">
                  {insights.bestOverall.reason}
                </p>
              </div>
            )}

            {insights.bestInvestment && (
              <div className="bg-cyan-900/20 border border-cyan-700/30 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-semibold text-cyan-300">Best Investment</span>
        </div>
                <p className="text-sm text-cyan-200 font-medium">
                  {getPropertyName(insights.bestInvestment.index)}
                </p>
                <p className="text-xs text-cyan-400 mt-1">
                  {insights.bestInvestment.reason}
                </p>
              </div>
            )}

            {insights.bestFamily && (
              <div className="bg-pink-900/20 border border-pink-700/30 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-semibold text-pink-300">Best for Families</span>
        </div>
                <p className="text-sm text-pink-200 font-medium">
                  {getPropertyName(insights.bestFamily.index)}
                </p>
                <p className="text-xs text-pink-400 mt-1">
                  {insights.bestFamily.reason}
                </p>
              </div>
            )}

            {insights.bestCommuter && (
              <div className="bg-indigo-900/20 border border-indigo-700/30 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-semibold text-indigo-300">Best for Commuters</span>
        </div>
                <p className="text-sm text-indigo-200 font-medium">
                  {getPropertyName(insights.bestCommuter.index)}
                </p>
                <p className="text-xs text-indigo-400 mt-1">
                  {insights.bestCommuter.reason}
                </p>
              </div>
            )}

            {insights.bestRentalYield && (
              <div className="bg-teal-900/20 border border-teal-700/30 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-semibold text-teal-300">Best Rental Yield</span>
        </div>
                <p className="text-sm text-teal-200 font-medium">
                  {getPropertyName(insights.bestRentalYield.index)}
                </p>
                <p className="text-xs text-teal-400 mt-1">
                  {insights.bestRentalYield.reason}
                </p>
              </div>
            )}

            {insights.fastestSale && (
              <div className="bg-lime-900/20 border border-lime-700/30 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-semibold text-lime-300">Fastest Sale Potential</span>
        </div>
                <p className="text-sm text-lime-200 font-medium">
                  {getPropertyName(insights.fastestSale.index)}
                </p>
                <p className="text-xs text-lime-400 mt-1">
                  {insights.fastestSale.reason}
                </p>
              </div>
            )}
          </div>

          {/* Warnings */}
          {insights.warnings.length > 0 && (
            <div className="bg-amber-900/20 border border-amber-700/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="font-semibold text-amber-300">Consider These Factors</span>
              </div>
              <div className="space-y-2">
                {insights.warnings.map((warning, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <span className="text-amber-600 mt-0.5">•</span>
                    <div>
                      <span className="text-sm font-medium text-amber-200">
                        {getPropertyName(warning.index)}:
                      </span>
                      <span className="text-sm text-amber-300 ml-1">
                        {warning.message}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Highlights */}
          {insights.highlights.length > 0 && (
            <div className="bg-green-900/20 border border-green-700/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="font-semibold text-green-300">Positive Highlights</span>
              </div>
              <div className="space-y-2">
                {insights.highlights.map((highlight, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <span className="text-green-400 mt-0.5">•</span>
                    <div>
                      <span className="text-sm font-medium text-green-200">
                        {getPropertyName(highlight.index)}:
                      </span>
                      <span className="text-sm text-green-300 ml-1">
                        {highlight.message}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Market Insights */}
          {insights.marketInsights && insights.marketInsights.length > 0 && (
            <div className="bg-slate-900/20 border border-slate-700/30 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="font-semibold text-slate-300">Market Overview</span>
              </div>
              <div className="space-y-1">
                {insights.marketInsights.map((insight, index) => (
                  <div key={index} className="text-sm text-slate-300">
                    • {insight}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Planning Applications Overview */}
          {(() => {
            // Collect all planning applications from all properties
            const allPlanningApps: Array<{
              propertyIndex: number;
              propertyName: string;
              application: any;
            }> = [];

            properties.forEach((property, index) => {
              if (property.enrichment?.planning?.applications) {
                property.enrichment.planning.applications.forEach((app: any) => {
                  allPlanningApps.push({
                    propertyIndex: index,
                    propertyName: getPropertyName(index),
                    application: app
                  });
                });
              }
            });

            return allPlanningApps.length > 0 ? (
              <div className="bg-slate-900/20 border border-slate-700/30 rounded-lg p-4">
                <div
                  className="flex justify-between items-center cursor-pointer hover:bg-slate-800/30 -m-4 p-4 rounded-lg transition-colors"
                  onClick={() => setPlanningExpanded(!planningExpanded)}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-slate-300">Planning Applications</span>
                    <span className="text-sm text-slate-400">
                      {allPlanningApps.length} application{allPlanningApps.length !== 1 ? 's' : ''} across all properties
                    </span>
                  </div>
                  <span className="text-sm text-slate-400">
                    {planningExpanded ? '▼' : '▶'}
                  </span>
                </div>

                {planningExpanded && (
                  <div className="mt-4 space-y-3">
                    {allPlanningApps.map((item, appIndex) => (
                      <div key={appIndex} className="border border-slate-700/50 rounded-lg p-3 bg-slate-800/20">
                        <div className="flex justify-between items-start mb-2">
                          <div className="text-sm font-medium text-slate-200">
                            {item.application.applicationNumber || 'Unknown'}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              item.application.status === 'Granted' ? 'bg-green-900/30 text-green-300' :
                              item.application.status === 'Under Consideration' ? 'bg-yellow-900/30 text-yellow-300' :
                              item.application.status === 'Rejected' ? 'bg-red-900/30 text-red-300' :
                              'bg-slate-900/30 text-slate-300'
                            }`}>
                              {item.application.status}
                            </span>
                            <span className="text-xs text-slate-400">
                              {item.application.distance}m away
                            </span>
                          </div>
                        </div>

                        <div className="text-xs text-slate-300 mb-1 font-medium">
                          {item.propertyName}:
                        </div>

                        <div className="text-xs text-slate-300 mb-2">
                          {item.application.description}
                        </div>

                        <div className="text-xs text-slate-400">
                          Type: {item.application.type} • Confidence: {item.application.confidence}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null;
          })()}

          {/* Footer note */}
          <div className="text-center pt-4 border-t border-slate-200">
            <p className="text-xs text-slate-500">
              Insights generated based on your 43,000+ property transactions database and live amenities data
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
