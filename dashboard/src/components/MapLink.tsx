'use client';

import Link from 'next/link';
import { analytics } from '@/lib/analytics';

export function MapLink() {
  return (
    <div className="relative group">
      {/* Background gradient effect */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 rounded-2xl opacity-0 group-hover:opacity-100 blur transition-opacity duration-300"></div>

      <Link
        href="/map"
        className="relative block bg-gradient-to-br from-slate-800/80 via-slate-800/60 to-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-2xl p-6 hover:border-blue-500/50 transition-all duration-300 group overflow-hidden"
        onClick={() => analytics.pageViewed('map_from_blog')}
      >
        {/* Subtle inner glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>

        {/* Floating particles effect */}
        <div className="absolute top-3 right-3 w-1 h-1 bg-blue-400 rounded-full opacity-0 group-hover:opacity-100 animate-pulse"></div>
        <div className="absolute top-6 right-6 w-0.5 h-0.5 bg-purple-400 rounded-full opacity-0 group-hover:opacity-100 animate-pulse animation-delay-300"></div>
        <div className="absolute bottom-4 left-4 w-0.5 h-0.5 bg-blue-300 rounded-full opacity-0 group-hover:opacity-100 animate-pulse animation-delay-500"></div>

        <div className="relative flex items-start justify-between">
          {/* Left side - Icon and text */}
          <div className="flex items-start gap-4 flex-1">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg group-hover:shadow-blue-500/25 transition-shadow duration-300">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V7m0 0L9 4" />
                </svg>
              </div>
              {/* Pulsing ring effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-400 to-purple-400 rounded-xl opacity-0 group-hover:opacity-20 blur-sm group-hover:animate-pulse transition-opacity duration-300"></div>
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="text-lg font-bold text-white mb-1 group-hover:text-blue-200 transition-colors duration-300">
                Explore Interactive Map
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-3 group-hover:text-slate-300 transition-colors duration-300">
                Discover 43,000+ properties with advanced filtering, pricing insights, and market analysis
              </p>

              {/* Feature highlights */}
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5 text-blue-400">
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                  <span>Real-time data</span>
                </div>
                <div className="flex items-center gap-1.5 text-purple-400">
                  <div className="w-1.5 h-1.5 bg-purple-400 rounded-full"></div>
                  <span>Advanced filters</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right side - CTA button */}
          <div className="flex-shrink-0 ml-4">
            <div className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-4 py-2 rounded-lg font-medium text-sm transition-all duration-300 group-hover:shadow-lg group-hover:shadow-blue-500/25 transform group-hover:scale-105">
              <span>View Map</span>
              <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
