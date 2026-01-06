'use client';

import Link from 'next/link';
import { analytics } from '@/lib/analytics';

export function MapLink() {
  return (
    <div className="relative group w-full">
      {/* Background gradient effect */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 rounded-xl opacity-0 group-hover:opacity-100 blur transition-opacity duration-300"></div>

      <Link
        href="/map"
        className="relative block bg-gradient-to-br from-slate-800/90 via-slate-800/70 to-slate-900/90 backdrop-blur-md border border-slate-700/50 rounded-lg p-2 hover:border-blue-500/50 transition-all duration-300 group overflow-hidden w-full shadow-lg"
        onClick={() => analytics.pageViewed('map_from_blog')}
      >
        {/* Subtle inner glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl"></div>

        {/* Floating particles effect */}
        <div className="absolute top-3 right-3 w-1 h-1 bg-blue-400 rounded-full opacity-0 group-hover:opacity-100 animate-pulse"></div>
        <div className="absolute top-6 right-6 w-0.5 h-0.5 bg-purple-400 rounded-full opacity-0 group-hover:opacity-100 animate-pulse animation-delay-300"></div>
        <div className="absolute bottom-4 left-4 w-0.5 h-0.5 bg-blue-300 rounded-full opacity-0 group-hover:opacity-100 animate-pulse animation-delay-500"></div>

        <div className="flex items-center gap-2">
          {/* Icon */}
          <div className="relative flex-shrink-0">
            <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-md flex items-center justify-center shadow-lg group-hover:shadow-blue-500/25 transition-shadow duration-300">
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V7m0 0L9 4" />
              </svg>
            </div>
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <h3 className="text-xs font-semibold text-white group-hover:text-blue-200 transition-colors duration-300">
              Map
            </h3>
            <p className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors duration-300">
              43K+ properties
            </p>
          </div>

          {/* Arrow */}
          <svg className="w-3 h-3 text-slate-400 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </Link>
    </div>
  );
}
