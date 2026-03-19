'use client';

import Link from 'next/link';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { areaToSlug } from '@/lib/areas';
import { formatFullPrice } from '@/lib/format';
import { Search, Home } from 'lucide-react';

interface TopArea {
  name: string;
  slug: string;
  medianPrice: number;
  change6m: number;
  overAskingPct: number;
  salesCount: number;
  county: string;
}

interface HomepageClientProps {
  topAreas: TopArea[];
  totalProperties: number;
}

const POPULAR_AREAS = [
  { name: 'Dublin 15', slug: 'dublin-15' },
  { name: 'Lucan', slug: 'lucan' },
  { name: 'Swords', slug: 'swords' },
  { name: 'Ranelagh', slug: 'ranelagh' },
  { name: 'Cork City', slug: 'cork-city' },
  { name: 'Galway', slug: 'galway' },
];

export default function HomepageClient({ topAreas, totalProperties }: HomepageClientProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    // Try to match with area slug
    const slug = areaToSlug(searchQuery);
    if (slug) {
      router.push(`/areas/${slug}`);
    } else {
      router.push(`/map?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleAreaClick = (slug: string) => {
    router.push(`/areas/${slug}`);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* HERO SECTION */}
      <section className="relative bg-white overflow-hidden border-b border-gray-100">
        {/* Subtle top gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-50/40 via-white to-white pointer-events-none" />

        <div className="relative max-w-4xl mx-auto px-6 pt-24 pb-20 text-center">
          {/* Eyebrow badge */}
          <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full mb-7">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-xs font-semibold text-emerald-900">
              Data from Ireland's Property Price Register — updated daily
            </span>
          </div>

          {/* Main heading */}
          <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight text-gray-900 mb-5 leading-tight">
            What Did That House<br />
            <em className="not-italic text-indigo-600">Actually Sell For?</em>
          </h1>

          {/* Subheading */}
          <p className="text-lg text-gray-500 max-w-lg mx-auto mb-10 leading-relaxed">
            Real sale prices from {Math.floor(totalProperties / 1000)}k+ Irish transactions. See what homes sold for, track area trends, and make confident offers.{' '}
            <span className="text-emerald-500 font-semibold">Free to search.</span>
          </p>

          {/* Search bar */}
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-5">
            <div
              className={`flex items-center bg-white border-2 rounded-2xl shadow-lg transition-all duration-200 ${
                isFocused
                  ? 'border-indigo-600 shadow-indigo-200/50'
                  : 'border-gray-200 shadow-gray-200/60'
              }`}
            >
              <div className="pl-5 pr-3">
                <Search className="w-5 h-5 text-gray-400" />
              </div>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder="Search by area, address or Eircode..."
                className="flex-1 py-4 px-2 text-base text-gray-900 placeholder-gray-400 bg-transparent border-none outline-none"
              />
              <button
                type="submit"
                className="m-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-xl transition-colors"
              >
                Search
              </button>
            </div>
          </form>

          {/* Popular chips */}
          <div className="flex items-center justify-center gap-2 flex-wrap mb-14">
            <span className="text-xs font-medium text-gray-400">Popular:</span>
            {POPULAR_AREAS.map((area) => (
              <button
                key={area.slug}
                onClick={() => handleAreaClick(area.slug)}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-full hover:border-indigo-600 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
              >
                {area.name}
              </button>
            ))}
          </div>

          {/* Stats strip */}
          <div className="max-w-2xl mx-auto bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-gray-200">
              <div className="px-6 py-5 text-center">
                <div className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                  <span className="text-indigo-600">{Math.floor(totalProperties / 1000)}</span>k+
                </div>
                <div className="text-xs text-gray-400 font-medium mt-1">Property transactions</div>
              </div>
              <div className="px-6 py-5 text-center">
                <div className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                  <span className="text-indigo-600">307</span>
                </div>
                <div className="text-xs text-gray-400 font-medium mt-1">Dublin areas covered</div>
              </div>
              <div className="px-6 py-5 text-center">
                <div className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Daily</div>
                <div className="text-xs text-gray-400 font-medium mt-1">Data updates</div>
              </div>
              <div className="px-6 py-5 text-center">
                <div className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Free</div>
                <div className="text-xs text-gray-400 font-medium mt-1">No sign-up required</div>
              </div>
            </div>
          </div>

          {/* How it works strip */}
          <div className="flex items-center justify-center gap-2 mt-8 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center">
                <span className="text-xs font-bold text-indigo-600">1</span>
              </div>
              <span className="text-sm text-gray-500 font-medium">Search your area</span>
            </div>
            <span className="text-gray-300 text-lg">→</span>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center">
                <span className="text-xs font-bold text-indigo-600">2</span>
              </div>
              <span className="text-sm text-gray-500 font-medium">See actual sale prices</span>
            </div>
            <span className="text-gray-300 text-lg">→</span>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center">
                <span className="text-xs font-bold text-indigo-600">3</span>
              </div>
              <span className="text-sm text-gray-500 font-medium">Make a confident offer</span>
            </div>
          </div>

          {/* PPR attribution */}
          <p className="text-xs text-gray-400 mt-6">
            Prices sourced from the{' '}
            <a
              href="https://www.propertypriceregister.ie"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 font-medium hover:underline"
            >
              Property Price Register
            </a>{' '}
            — Ireland's official record of residential property sales.
          </p>
        </div>
      </section>

      {/* DATA PREVIEW SECTION */}
      <section className="bg-gray-50 border-t border-gray-200 py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="text-xs font-bold uppercase tracking-widest text-indigo-600 mb-2">
              Live Market Data
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-2">
              What you'll see when you search
            </h2>
            <p className="text-base text-gray-500">
              Real prices, real trends — no estimates or guesswork.
            </p>
          </div>

          {/* Area cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
            {topAreas.map((area) => (
              <Link
                key={area.slug}
                href={`/areas/${area.slug}`}
                className="bg-white border border-gray-200 rounded-2xl p-6 hover:border-indigo-600 hover:shadow-lg hover:shadow-indigo-200/30 hover:-translate-y-1 transition-all cursor-pointer group"
              >
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <div className="text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                      {area.name}
                    </div>
                    <div className="text-xs text-gray-400 font-medium">{area.county}</div>
                  </div>
                  <Home className="w-5 h-5 text-indigo-400" />
                </div>

                <div className="text-3xl font-extrabold text-gray-900 tracking-tight my-3">
                  {formatFullPrice(area.medianPrice)}
                </div>

                <div className="flex gap-2 flex-wrap mb-4">
                  {area.change6m > 0 ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-900 text-xs font-semibold rounded-full">
                      ↑ {area.change6m.toFixed(1)}% (6mo)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-900 text-xs font-semibold rounded-full">
                      ↓ {Math.abs(area.change6m).toFixed(1)}% (6mo)
                    </span>
                  )}
                  {area.overAskingPct >= 60 ? (
                    <span className="px-2.5 py-1 bg-amber-100 text-amber-900 text-xs font-semibold rounded-full">
                      {area.overAskingPct}% over asking
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 bg-indigo-50 text-indigo-900 text-xs font-semibold rounded-full">
                      {area.overAskingPct}% over asking
                    </span>
                  )}
                </div>

                <div className="flex justify-between items-center text-xs text-gray-400 pt-3 border-t border-gray-100">
                  <span>{area.salesCount.toLocaleString()} sales tracked</span>
                  <span className="text-indigo-600 font-semibold group-hover:underline">
                    View area →
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {/* View all link */}
          <div className="text-center">
            <Link
              href="/areas"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:border-indigo-600 hover:text-indigo-600 transition-all"
            >
              Browse all 307 areas ›
            </Link>
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section className="bg-white py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="text-xs font-bold uppercase tracking-widest text-indigo-600 mb-2">
              What you can do
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-2">
              Everything an Irish buyer needs
            </h2>
            <p className="text-base text-gray-500">
              Free tools built on real transaction data.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-7 rounded-2xl border border-gray-100">
              <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center text-2xl mb-4">
                🗺️
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Interactive Price Map</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                Explore {Math.floor(totalProperties / 1000)}k+ sold properties on a live map. Filter by area, price, beds, and date.
              </p>
            </div>

            <div className="p-7 rounded-2xl border border-gray-100">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center text-2xl mb-4">
                📊
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Area Price Trends</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                12-month price history, over-asking rates, and price per m² for every Dublin neighbourhood.
              </p>
            </div>

            <div className="p-7 rounded-2xl border border-gray-100">
              <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center text-2xl mb-4">
                🏗️
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Planning Permissions</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                See planning applications near any property — extensions, developments, and refusals.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="bg-gray-900 py-20 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-4xl font-extrabold text-white mb-3 tracking-tight">
            Start searching — it's free
          </h2>
          <p className="text-base text-gray-400 mb-8">
            No sign-up required. See what homes actually sold for in your area.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link
              href="/map"
              className="px-7 py-3.5 bg-white text-gray-900 font-bold text-sm rounded-xl hover:bg-gray-100 transition-colors"
            >
              Search Now →
            </Link>
            <Link
              href="/pricing"
              className="px-7 py-3.5 bg-transparent text-white font-semibold text-sm rounded-xl border-2 border-gray-700 hover:border-gray-500 transition-colors"
            >
              See Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-gray-900 border-t border-gray-800 py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-sm text-gray-500">
            © 2025 Irish Property Data · Data from the Property Price Register
          </div>
          <div className="flex gap-6">
            <Link href="/about" className="text-sm text-gray-500 hover:text-white transition-colors">
              About
            </Link>
            <Link href="/pricing" className="text-sm text-gray-500 hover:text-white transition-colors">
              Pricing
            </Link>
            <Link href="/blog" className="text-sm text-gray-500 hover:text-white transition-colors">
              Blog
            </Link>
            <Link href="/privacy" className="text-sm text-gray-500 hover:text-white transition-colors">
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
