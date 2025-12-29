'use client';

import Link from 'next/link';
import { analytics } from '@/lib/analytics';

export function MapLink() {
  return (
    <Link
      href="/map"
      className="block bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-6 hover:bg-white/20 hover:border-white/30 transition-all duration-200 group"
      onClick={() => analytics.pageViewed('map_from_blog')}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V7m0 0L9 4" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-white group-hover:text-blue-200 transition-colors">
            Explore Interactive Map
          </h3>
          <p className="text-xs text-blue-100 mt-0.5">
            View all properties with advanced filtering
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-blue-200 font-medium">View Map</span>
        <svg className="w-4 h-4 text-blue-200 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
}
